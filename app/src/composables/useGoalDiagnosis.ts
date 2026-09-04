/**
 * Goal Diagnosis Composable
 *
 * Reactive bridge between the stores and `services/goal-diagnosis`. It measures
 * what actually happened — net saved per complete month, spending, liquid
 * balance, recurring charges ahead — and hands those figures to the pure layer.
 *
 * It deliberately does **not** go through `useAnalytics`: that composable is
 * bound to the analytics screen's shared filter state, and a diagnosis must
 * never change because the user narrowed a chart to one category.
 * @module composables/useGoalDiagnosis
 */

import type { NormalizedFlow } from 'src/types/analytics';
import type { RecurringOccurrence } from 'src/types/recurring-transaction';
import type { Wallet } from 'src/types/wallet';
import type { GoalDiagnosisInput } from 'src/types/goal-diagnosis';
import {
    endOfMonth,
    startOfMonth,
    summarize,
    toFlows,
    type AnalyticsContext,
} from 'src/services/analytics';
import { SAMPLE_MONTHS, diagnose } from 'src/services/goal-diagnosis';
import { useSavingsGoalStore } from 'src/stores/savings-goal';
import { useDebtStore } from 'src/stores/debt';
import { useGameTransfers } from './useGameTransfers';
import { useCurrency } from './useCurrency';

/** Horizon used to sum the recurring charges already committed. */
const COMMITMENT_DAYS = 30;

/**
 * Provides the reactive financial diagnosis of the savings goals.
 * @returns The diagnosis, its measured inputs and the store loader
 */
export function useGoalDiagnosis() {
    const { convert, walletCurrency, defaultCurrency } = useCurrency();
    const { classifyTransfer } = useGameTransfers();

    const goalStore = useSavingsGoalStore();
    const transactionStore = useTransactionStore();
    const categoryStore = useCategoryStore();
    const walletStore = useWalletStore();
    const settingsStore = useSettingsStore();
    const exchangeRateStore = useExchangeRateStore();
    const gameStore = useGameStore();
    const debtStore = useDebtStore();
    const recurringStore = useRecurringTransactionStore();

    /** Reference "today", captured once so every figure agrees on the period. */
    const now = ref(new Date());

    const context = computed<AnalyticsContext>(() => ({
        convert,
        walletCurrency,
        category: (id: string) => categoryStore.getCategoryById(id),
        debtDirection: (id: string) => debtStore.getDirection(id),
        classifyGameTransfer: classifyTransfer,
    }));

    /** Every transaction expanded into normalized, converted flows. */
    const allFlows = computed(() => toFlows(transactionStore.transactions, context.value));

    /**
     * The complete months to measure, most recent first excluded: the running
     * month is still incomplete and would understate both figures.
     */
    const sampleRanges = computed(() => {
        const flows = allFlows.value;
        if (flows.length === 0) return [];

        const earliest = flows.reduce(
            (min: Date, flow: NormalizedFlow) => (flow.date < min ? flow.date : min),
            flows[0]!.date,
        );

        const ranges = [];
        for (let offset = 1; offset <= SAMPLE_MONTHS; offset += 1) {
            const month = new Date(now.value.getFullYear(), now.value.getMonth() - offset, 1);
            // Months before the first transaction are not "months without
            // savings", they are months without data — averaging them in would
            // drag the capacity to zero.
            if (endOfMonth(month) < earliest) break;
            ranges.push({ start: startOfMonth(month), end: endOfMonth(month) });
        }

        return ranges.reverse();
    });

    /**
     * Net saved and money consumed, one entry per complete month.
     *
     * Months without a single recorded flow are dropped: an untracked month is
     * missing data, not a month where nothing was saved, and counting it as a
     * zero would drag the median down.
     */
    const monthlyFigures = computed(() =>
        sampleRanges.value
            .map((range) => {
                const flows = allFlows.value.filter(
                    (flow: NormalizedFlow) => flow.date >= range.start && flow.date <= range.end,
                );
                return summarize(flows, range, now.value);
            })
            .filter((month) => month.count > 0),
    );

    /**
     * Balance available to fund goals. Game wallets are excluded, as everywhere
     * else in the reports.
     */
    const liquidBalance = computed(() =>
        walletStore.nonGameWallets.reduce(
            (sum: number, wallet: Wallet) => sum + convert(wallet.balance, wallet.currency),
            0,
        ),
    );

    /** Recurring charges, net of recurring income, falling due within the horizon. */
    const commitments = computed(() => {
        const until = new Date(now.value);
        until.setDate(until.getDate() + COMMITMENT_DAYS);

        return recurringStore
            .upcoming(until)
            .reduce((sum: number, occurrence: RecurringOccurrence) => {
                const amount = convert(occurrence.amount, walletCurrency(occurrence.walletId));
                return occurrence.type === 'expense' ? sum + amount : sum - amount;
            }, 0);
    });

    const input = computed<GoalDiagnosisInput>(() => ({
        currency: defaultCurrency.value,
        monthlyNet: monthlyFigures.value.map((month) => month.net),
        monthlySpending: monthlyFigures.value.map((month) => month.spending),
        liquidBalance: liquidBalance.value,
        commitments: Math.max(0, commitments.value),
        commitmentDays: COMMITMENT_DAYS,
        now: now.value,
    }));

    /** The financial read on every open goal. */
    const diagnosis = computed(() =>
        diagnose(goalStore.goalsWithStats, input.value, { convert }),
    );

    /**
     * Loads every store the diagnosis reads from.
     * @returns Promise resolving when all stores are loaded
     */
    async function loadAll(): Promise<void> {
        await Promise.all([
            settingsStore.loadSettings(),
            exchangeRateStore.loadAll(),
            goalStore.loadAll(),
            walletStore.loadAll(),
            categoryStore.loadAll(),
            transactionStore.loadAll(),
            gameStore.loadAll(),
            debtStore.loadAll(),
            recurringStore.loadAll(),
        ]);
        now.value = new Date();
    }

    return { diagnosis, input, liquidBalance, commitments, loadAll };
}
