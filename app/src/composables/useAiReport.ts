/**
 * AI Report Composable
 *
 * Assembles the financial snapshot handed to `services/ai-report`, and delivers
 * the generated text off the device.
 *
 * ⚠️ This is the app's only outbound data path — everything else is offline by
 * design. Two rules it enforces:
 * - nothing leaves without the user seeing the exact text first (the dialog owns
 *   that step, this composable never sends on its own);
 * - delivery goes through the system share sheet, so the user picks the
 *   destination app themselves and the app is not bound to one provider.
 * @module composables/useAiReport
 */

import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import type { Category } from 'src/types/category';
import type { MasterCategory } from 'src/types/master-category';
import type { RecurringTransaction } from 'src/types/recurring-transaction';
import type { BudgetWithStats } from 'src/types/budget';
import type { NetWorthSnapshot } from 'src/types/net-worth-snapshot';
import type { NormalizedFlow } from 'src/types/analytics';
import type { SavingsGoalWithStats } from 'src/types/savings-goal';
import type { InvestmentItem } from 'src/types/investment';
import type { Project } from 'src/types/project';
import type { Wallet } from 'src/types/wallet';
import type {
    AiReportData,
    AiReportOptions,
    ReportAsset,
    ReportEntry,
    ReportGoal,
    ReportGroup,
    ReportMonth,
    ReportMonthEntries,
} from 'src/types/ai-report';
import {
    aggregateBy,
    bucketsFor,
    buildComparison,
    endOfMonth,
    startOfMonth,
    summarize,
    toFlows,
    type AnalyticsContext,
} from 'src/services/analytics';
import { buildAiReport } from 'src/services/ai-report';
import { useBudgetStore } from 'src/stores/budget';
import { useNetWorthStore } from 'src/stores/net-worth';
import { useSavingsGoalStore } from 'src/stores/savings-goal';
import { useCurrency } from './useCurrency';

/** Master categories listed per direction; enough signal without bloating the prompt. */
const GROUP_LIMIT = 8;

/** Individually listed income transactions, newest first, to bound the prompt size. */
const INCOME_LIMIT = 40;

/** Where the user is sent when no share sheet is available. */
const CHATGPT_URL = 'https://chatgpt.com/';

/** Outcome of a delivery attempt, so the UI can tell the user what happened. */
export type DeliveryResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Provides the report generator and the delivery helpers.
 * @returns Report generation and delivery functions
 */
export function useAiReport() {
    const { t, locale } = useI18n();
    const { defaultCurrency, formatCurrency, formatPercent, convert, walletCurrency } =
        useCurrency();

    const transactionStore = useTransactionStore();
    const categoryStore = useCategoryStore();
    const masterCategoryStore = useMasterCategoryStore();
    const walletStore = useWalletStore();
    const settingsStore = useSettingsStore();
    const exchangeRateStore = useExchangeRateStore();
    const gameStore = useGameStore();
    const budgetStore = useBudgetStore();
    const netWorthStore = useNetWorthStore();
    const recurringStore = useRecurringTransactionStore();
    const investmentStore = useInvestmentStore();
    const projectStore = useProjectStore();
    const savingsGoalStore = useSavingsGoalStore();
    const { classifyTransfer } = useGameTransfers();

    const context = computed<AnalyticsContext>(() => ({
        convert,
        walletCurrency,
        category: (id: string) => categoryStore.getCategoryById(id),
        classifyGameTransfer: classifyTransfer,
    }));

    /**
     * Formats a month for the report tables.
     * @param date - Any date inside the month
     * @returns The localized month label
     */
    function monthLabel(date: Date): string {
        return new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(
            date,
        );
    }

    /**
     * Builds grouped lines by master category for one flow direction.
     * @param flows - Flows of the window
     * @param direction - Direction to keep
     * @returns The lines, largest first, capped to {@link GROUP_LIMIT}
     */
    function groupsFor(flows: NormalizedFlow[], direction: 'in' | 'out'): ReportGroup[] {
        // The expense side lists consumption only; allocations are reported as
        // their own total so they are never read as spending.
        const directional = flows.filter(
            (flow) =>
                flow.direction === direction &&
                (direction === 'in' || flow.nature !== 'allocation'),
        );
        const buckets = aggregateBy(directional, (flow) => flow.masterCategoryId ?? 'other');
        const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0);

        return buckets.slice(0, GROUP_LIMIT).map((bucket) => {
            const masterCategory =
                bucket.key === 'other'
                    ? undefined
                    : (masterCategoryStore.getMasterCategoryById(bucket.key) as
                          | MasterCategory
                          | undefined);
            return {
                name: masterCategory?.name ?? t('analytics.other'),
                amount: bucket.amount,
                percent: total > 0 ? (bucket.amount / total) * 100 : 0,
            };
        });
    }

    /**
     * Formats a date for the individually listed transactions.
     * @param date - The transaction date
     * @returns A short localized date
     */
    function dayLabel(date: Date): string {
        return new Intl.DateTimeFormat(locale.value, { day: '2-digit', month: '2-digit' }).format(
            date,
        );
    }

    /**
     * Turns a flow into an individually listed entry.
     * @param flow - The flow to describe
     * @returns The entry, labelled by its description or its category
     */
    function toEntry(flow: NormalizedFlow): ReportEntry {
        const category = flow.categoryId
            ? (categoryStore.getCategoryById(flow.categoryId) as Category | undefined)
            : undefined;

        return {
            date: dayLabel(flow.date),
            label: flow.description ?? category?.name ?? t(`analytics.groups.${flow.group}`),
            category: category?.name,
            amount: flow.amount,
        };
    }

    /**
     * Collects savings goals and their progress, converted to the default currency.
     * @returns The goals, furthest from completion last
     */
    function collectGoals(): ReportGoal[] {
        return savingsGoalStore.goalsWithStats.map((goal: SavingsGoalWithStats) => ({
            name: goal.name,
            current: convert(goal.currentAmount, goal.currency),
            target: convert(goal.targetAmount, goal.currency),
            percent: goal.percent,
            requiredMonthly:
                goal.requiredMonthly !== null
                    ? convert(goal.requiredMonthly, goal.currency)
                    : undefined,
            monthsLeft: goal.monthsLeft ?? undefined,
        }));
    }

    /**
     * Collects the detailed net worth: every wallet, investment and project.
     *
     * Game wallets are included but flagged by their own name, since their money
     * may be locked on the platform.
     * @returns The holdings, wallets first
     */
    function collectAssets(): ReportAsset[] {
        const assets: ReportAsset[] = walletStore.wallets.map((wallet: Wallet) => ({
            name: wallet.name,
            kind: 'wallet' as const,
            value: convert(wallet.balance, wallet.currency),
        }));

        for (const item of investmentStore.items as InvestmentItem[]) {
            const stats = investmentStore.getItemStats(item.id);
            assets.push({
                name: item.label,
                kind: 'investment',
                value: convert(item.quantity * item.currentRate, item.currency),
                invested: stats ? convert(stats.totalInvested, item.currency) : undefined,
            });
        }

        for (const project of projectStore.projects as Project[]) {
            assets.push({
                name: project.name,
                kind: 'project',
                value: project.totalInvested,
                dividends: project.totalDividends,
            });
        }

        return assets.filter((asset) => asset.value !== 0);
    }

    /**
     * Groups the expenses above the threshold by month, largest first.
     * @param flows - Flows of the window
     * @param threshold - Minimum amount for an expense to be listed
     * @returns One entry list per month, most recent month first
     */
    function collectLargeExpenses(
        flows: NormalizedFlow[],
        threshold: number,
    ): ReportMonthEntries[] {
        const byMonth = new Map<string, { label: string; entries: ReportEntry[] }>();

        const large = flows
            .filter(
                (flow) =>
                    flow.direction === 'out' &&
                    flow.nature === 'consumption' &&
                    flow.amount >= threshold,
            )
            .sort((a, b) => b.amount - a.amount);

        for (const flow of large) {
            const key = `${flow.date.getFullYear()}-${flow.date.getMonth()}`;
            const bucket = byMonth.get(key);
            if (bucket) {
                bucket.entries.push(toEntry(flow));
            } else {
                byMonth.set(key, { label: monthLabel(flow.date), entries: [toEntry(flow)] });
            }
        }

        // Most recent month first, matching how the other sections read.
        return [...byMonth.entries()]
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([, bucket]) => bucket);
    }

    /**
     * Collects the financial snapshot for the requested window.
     * @param options - User-controlled report options
     * @returns The snapshot the report is built from
     */
    function collect(options: AiReportOptions): AiReportData {
        const now = new Date();
        const range = {
            start: startOfMonth(new Date(now.getFullYear(), now.getMonth() - (options.window - 1), 1)),
            end: endOfMonth(now),
        };

        // Every family is included: an assistant needs the whole picture, not the
        // slice the user happens to be browsing.
        const flows = toFlows(transactionStore.transactions, context.value).filter((flow) => {
            const time = flow.date.getTime();
            return time >= range.start.getTime() && time <= range.end.getTime();
        });

        const totals = summarize(flows, range, now);
        const buckets = bucketsFor(range, 'month');
        const months: ReportMonth[] = buildComparison(flows, buckets, 'month').map((point) => ({
            label: monthLabel(point.start),
            inflow: point.inflow,
            outflow: point.spending,
            net: point.net,
            savings: point.inflow - point.spending,
            savingsRate: point.savingsRate,
        }));

        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const commitments = recurringStore.activeItems.map((item: RecurringTransaction) => {
            const category = categoryStore.getCategoryById(item.categoryId) as Category | undefined;
            return {
                name: category?.name ?? t('recurring.title'),
                amount: convert(item.amount, walletCurrency(item.walletId)),
                frequency: t(`recurring.${item.frequency}`),
                direction: item.type === 'income' ? ('in' as const) : ('out' as const),
            };
        });

        const budgets = budgetStore
            .getBudgetsWithStats(currentMonth)
            .map((budget: BudgetWithStats) => ({
                name: budget.category?.name ?? budget.masterCategory?.name ?? '-',
                amount: budget.amount,
                spent: budget.spent,
                percentUsed: budget.percentUsed,
            }));

        // Income is listed individually so the assistant can see where money comes
        // from; the list is capped and the cap is disclosed in the report.
        const incomeFlows = flows
            .filter((flow) => flow.direction === 'in')
            .sort((a, b) => b.date.getTime() - a.date.getTime());
        const incomeTotalCount = incomeFlows.length;
        const incomes = incomeFlows.slice(0, INCOME_LIMIT).map(toEntry);

        const netWorth = netWorthStore
            .series(options.window)
            .map((snapshot: NetWorthSnapshot) => ({
                label: monthLabel(snapshot.date),
                total: snapshot.total,
            }));

        return {
            currency: defaultCurrency.value,
            periodLabel: `${monthLabel(range.start)} – ${monthLabel(range.end)}`,
            totals: {
                inflow: totals.inflow,
                spending: totals.spending,
                allocated: totals.allocated,
                net: totals.net,
                savingsRate: totals.savingsRate,
            },
            months,
            expenseGroups: groupsFor(flows, 'out'),
            incomeGroups: groupsFor(flows, 'in'),
            commitments,
            budgets,
            netWorth,
            goals: collectGoals(),
            assets: collectAssets(),
            incomes,
            incomeTotalCount,
            largeExpenses: collectLargeExpenses(flows, options.largeExpenseThreshold),
        };
    }

    /**
     * Generates the report text for the given options.
     * @param options - User-controlled report options
     * @returns The report, ready to be reviewed and sent
     */
    function generate(options: AiReportOptions): string {
        return buildAiReport(collect(options), options, {
            amount: formatCurrency,
            percent: (value: number) => formatPercent(value),
        });
    }

    /**
     * Copies text to the clipboard, falling back to a hidden textarea on the
     * platforms where the async clipboard API is unavailable.
     * @param text - The text to copy
     * @returns Whether the copy succeeded
     */
    async function copyToClipboard(text: string): Promise<boolean> {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch {
            // Falls through to the legacy path below.
        }

        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const copied = document.execCommand('copy');
            document.body.removeChild(textarea);
            return copied;
        } catch {
            return false;
        }
    }

    /**
     * Hands the report to the system share sheet so the user picks the
     * destination app. Falls back to the clipboard plus an open ChatGPT tab when
     * no share sheet is available (desktop browsers).
     * @param text - The report to deliver
     * @returns What actually happened, for the confirmation message
     */
    async function share(text: string): Promise<DeliveryResult> {
        if (Capacitor.isNativePlatform()) {
            try {
                await Share.share({ title: t('aiReport.title'), text, dialogTitle: t('aiReport.shareWith') });
                return 'shared';
            } catch {
                // The plugin also throws when the user dismisses the sheet, so a
                // failure here is not necessarily an error worth surfacing.
                return 'cancelled';
            }
        }

        if (typeof navigator.share === 'function') {
            try {
                await navigator.share({ title: t('aiReport.title'), text });
                return 'shared';
            } catch {
                return 'cancelled';
            }
        }

        const copied = await copyToClipboard(text);
        if (!copied) return 'failed';
        window.open(CHATGPT_URL, '_blank', 'noopener');
        return 'copied';
    }

    /**
     * Loads every store the report reads from.
     * @returns Promise that resolves once all data is in memory
     */
    async function loadAll(): Promise<void> {
        await Promise.all([
            settingsStore.loadSettings(),
            exchangeRateStore.loadAll(),
            walletStore.loadAll(),
            transactionStore.loadAll(),
            categoryStore.loadAll(),
            masterCategoryStore.loadAll(),
            gameStore.loadAll(),
            budgetStore.loadAll(),
            netWorthStore.loadAll(),
            recurringStore.loadAll(),
            investmentStore.loadAll(),
            projectStore.loadAll(),
            savingsGoalStore.loadAll(),
        ]);
    }

    return { generate, share, copyToClipboard, loadAll };
}
