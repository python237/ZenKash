/**
 * Cash Flow Composable
 *
 * Reactive bridge between the stores and `services/cash-flow`. It assembles the
 * three ingredients of a runway — current balances, scheduled movements and
 * habitual spending — and hands them to the pure layer.
 *
 * The habitual flows deserve a word: history already *contains* the recurring
 * charges and income that were posted, so feeding both the rules and the raw
 * historical figure would count rent (or salary) twice. Each habit is
 * therefore the median month of the sample **minus** what the active rules
 * represent per month.
 *
 * Spending and income are not shaped the same way: spending trickles out every
 * day, income lands in lumps. Spending is spread as a daily drift; income is
 * placed once a month on the day it usually arrives, so the low point before
 * payday stays visible.
 * @module composables/useCashFlow
 */

import type { CashFlowInput, ForecastEvent, ForecastWallet } from 'src/types/cash-flow';
import type { RecurringOccurrence, RecurringTransaction } from 'src/types/recurring-transaction';
import type { Wallet } from 'src/types/wallet';
import type { Transaction } from 'src/types/transaction';
import { toFlows, type AnalyticsContext } from 'src/services/analytics';
import { median } from 'src/services/net-worth-forecast';
import { forecast } from 'src/services/cash-flow';
import { useDebtStore } from 'src/stores/debt';
import { useGameTransfers } from './useGameTransfers';
import { useCurrency } from './useCurrency';

/** Horizons the screen offers, in days. */
export const HORIZON_OPTIONS = [30, 60, 90] as const;

/**
 * Complete months the habits are measured on, at most. Six months and a median
 * keep a one-off purchase (or bonus) from bending the forecast.
 */
const SAMPLE_MONTHS = 6;

/** Average number of days per month, used to turn a monthly figure into a daily one. */
const DAYS_PER_MONTH = 30.44;

/** Occurrences per month of each recurring frequency. */
const MONTHLY_FACTOR: Record<RecurringTransaction['frequency'], number> = {
    weekly: DAYS_PER_MONTH / 7,
    monthly: 1,
    yearly: 1 / 12,
};

/**
 * Provides the reactive cash-flow forecast.
 * @returns The forecast, its controls and the store loader
 */
export function useCashFlow() {
    const { convert, walletCurrency, defaultCurrency } = useCurrency();
    const { classifyTransfer } = useGameTransfers();

    const transactionStore = useTransactionStore();
    const categoryStore = useCategoryStore();
    const walletStore = useWalletStore();
    const settingsStore = useSettingsStore();
    const exchangeRateStore = useExchangeRateStore();
    const gameStore = useGameStore();
    const debtStore = useDebtStore();
    const recurringStore = useRecurringTransactionStore();

    /** Reference "today", captured once so every figure agrees on the horizon. */
    const now = ref(new Date());

    /** Days projected. */
    const horizonDays = ref<number>(90);

    /** Whether habitual spending is projected on top of the scheduled movements. */
    const includeDrift = ref(true);

    const context = computed<AnalyticsContext>(() => ({
        convert,
        walletCurrency,
        category: (id: string) => categoryStore.getCategoryById(id),
        debtDirection: (id: string) => debtStore.getDirection(id),
        classifyGameTransfer: classifyTransfer,
    }));

    /** Wallets the forecast runs on, game platforms excluded as in every report. */
    const wallets = computed<ForecastWallet[]>(() =>
        walletStore.nonGameWallets.map((wallet: Wallet) => ({
            id: wallet.id,
            currency: wallet.currency,
            balance: wallet.balance,
        })),
    );

    /** Scheduled movements over the horizon, signed in each wallet's currency. */
    const events = computed<ForecastEvent[]>(() => {
        const until = new Date(now.value);
        until.setDate(until.getDate() + horizonDays.value);

        return recurringStore
            .upcoming(until)
            .map((occurrence: RecurringOccurrence, index: number) => ({
                id: `${occurrence.recurringId}:${index}`,
                date: occurrence.date,
                walletId: occurrence.walletId,
                amount: occurrence.type === 'expense' ? -occurrence.amount : occurrence.amount,
                kind: 'recurring' as const,
                label: occurrence.description,
            }));
    });

    /**
     * What the active rules represent per month, per wallet, in that wallet's
     * currency.
     * @param type - Rule type to sum
     * @returns Monthly amount per wallet
     */
    function recurringMonthlyByWallet(type: RecurringTransaction['type']): Record<string, number> {
        const byWallet: Record<string, number> = {};

        for (const rule of recurringStore.activeItems as RecurringTransaction[]) {
            if (rule.type !== type) continue;
            const perMonth =
                (rule.amount * MONTHLY_FACTOR[rule.frequency]) / Math.max(1, rule.intervalCount);
            byWallet[rule.walletId] = (byWallet[rule.walletId] ?? 0) + perMonth;
        }

        return byWallet;
    }

    /** Complete months the habits are measured on: up to six, never more than the history. */
    const sampleMonths = computed(() => {
        const transactions = transactionStore.transactions as Transaction[];
        if (transactions.length === 0) return 0;
        const first = transactions.reduce(
            (min: Date, tx: Transaction) => (tx.date < min ? tx.date : min),
            transactions[0]!.date,
        );
        const history =
            (now.value.getFullYear() - first.getFullYear()) * 12 +
            (now.value.getMonth() - first.getMonth());
        return Math.max(0, Math.min(SAMPLE_MONTHS, history));
    });

    /**
     * Position of a date in the sample, 0 being its oldest month.
     * @param date - Any date
     * @returns The month index, outside `[0, sampleMonths)` when not sampled
     */
    function sampleIndex(date: Date): number {
        const first = now.value.getMonth() - sampleMonths.value;
        return (date.getFullYear() - now.value.getFullYear()) * 12 + (date.getMonth() - first);
    }

    /**
     * Adds an amount to a wallet's month in a per-wallet monthly series.
     * @param series - Series being filled
     * @param walletId - Wallet concerned
     * @param date - Date of the movement
     * @param amount - Amount to add, in the wallet currency
     */
    function addToSeries(
        series: Record<string, number[]>,
        walletId: string,
        date: Date,
        amount: number,
    ): void {
        const index = sampleIndex(date);
        if (index < 0 || index >= sampleMonths.value) return;
        const months = (series[walletId] ??= new Array<number>(sampleMonths.value).fill(0));
        months[index]! += amount;
    }

    /** Flows of the sample period. */
    const sampleFlows = computed(() =>
        toFlows(transactionStore.transactions, context.value).filter((flow) => {
            const index = sampleIndex(flow.date);
            return flow.walletId && index >= 0 && index < sampleMonths.value;
        }),
    );

    /**
     * Everyday spending of a typical month, all wallets, in the default
     * currency: the median month of consumption, less what the recurring rules
     * already schedule. Medians are not additive, so it is measured on the
     * total and only then shared out between wallets.
     */
    const habitualSpending = computed(() => {
        if (!includeDrift.value || sampleMonths.value === 0) {
            return { monthly: 0, shares: {}, months: [] };
        }

        // Consumption only: a project injection or a game deposit is not a
        // habit that keeps draining the wallet.
        const totals = new Array<number>(sampleMonths.value).fill(0);
        const byWallet: Record<string, number> = {};
        for (const flow of sampleFlows.value) {
            if (flow.nature !== 'consumption' || !flow.walletId) continue;
            totals[sampleIndex(flow.date)]! += flow.amount;
            byWallet[flow.walletId] = (byWallet[flow.walletId] ?? 0) + flow.amount;
        }

        const scheduledByWallet = recurringMonthlyByWallet('expense');
        const scheduled = wallets.value.reduce(
            (sum: number, wallet: ForecastWallet) =>
                sum + convert(scheduledByWallet[wallet.id] ?? 0, wallet.currency),
            0,
        );

        // Shared out between the forecast wallets only: what a closed wallet
        // used to spend still counts in the median and lands on the open ones
        const consumed = wallets.value.reduce(
            (sum: number, wallet: ForecastWallet) => sum + (byWallet[wallet.id] ?? 0),
            0,
        );
        const shares: Record<string, number> = {};
        for (const wallet of wallets.value) {
            shares[wallet.id] = consumed > 0 ? (byWallet[wallet.id] ?? 0) / consumed : 0;
        }

        // Each sampled month with its total, so the screen can show its work
        const months = totals.map((total, index) => ({
            date: new Date(
                now.value.getFullYear(),
                now.value.getMonth() - sampleMonths.value + index,
                1,
            ),
            total,
        }));

        return { monthly: Math.max(0, median(totals) - scheduled), shares, months };
    });

    /**
     * Average monthly net transfer out of each wallet, in its own currency,
     * between forecast wallets only. Without it a mobile-money wallet topped
     * up from cash every week would look like it drains to zero. The mean
     * (not the median) keeps the sum at zero: transfers move money, they never
     * create or destroy it.
     */
    const transferDrift = computed<Record<string, number>>(() => {
        const drift: Record<string, number> = {};
        if (!includeDrift.value || sampleMonths.value === 0) return drift;

        const ids = new Set(wallets.value.map((wallet: ForecastWallet) => wallet.id));
        for (const tx of transactionStore.transactions as Transaction[]) {
            if (tx.type !== 'transfer') continue;
            if (!ids.has(tx.fromWalletId) || !ids.has(tx.toWalletId)) continue;
            const index = sampleIndex(tx.date);
            if (index < 0 || index >= sampleMonths.value) continue;
            const from = walletStore.getWalletById(tx.fromWalletId)!;
            const to = walletStore.getWalletById(tx.toWalletId)!;
            drift[from.id] = (drift[from.id] ?? 0) + tx.amount / sampleMonths.value;
            drift[to.id] =
                (drift[to.id] ?? 0) -
                exchangeRateStore.convertWithDefault(tx.amount, from.currency, to.currency) /
                    sampleMonths.value;
        }

        return drift;
    });

    /**
     * Habitual daily net outflow per wallet, in its own currency: its share of
     * the everyday spending plus its usual net transfers.
     */
    const dailyDrift = computed<Record<string, number>>(() => {
        if (!includeDrift.value) return {};

        const { monthly, shares } = habitualSpending.value;
        const drift: Record<string, number> = {};
        for (const wallet of wallets.value) {
            const spending = exchangeRateStore.convertWithDefault(
                monthly * (shares[wallet.id] ?? 0),
                defaultCurrency.value,
                wallet.currency,
            );
            drift[wallet.id] = (spending + (transferDrift.value[wallet.id] ?? 0)) / DAYS_PER_MONTH;
        }

        return drift;
    });

    /**
     * Habitual income per wallet: the median month of income, minus what the
     * recurring rules already schedule, with the day of the month it usually
     * lands on (median day of each month's largest income).
     */
    const habitualIncome = computed(() => {
        const result: { walletId: string; monthly: number; day: number }[] = [];
        if (!includeDrift.value || sampleMonths.value === 0) return result;

        const earned: Record<string, number[]> = {};
        // Largest income of each month, per wallet: it marks the payday
        const largest: Record<string, Record<string, { amount: number; day: number }>> = {};
        for (const flow of sampleFlows.value) {
            if (flow.nature !== 'earning' || !flow.walletId) continue;
            addToSeries(earned, flow.walletId, flow.date, flow.originalAmount);
            const month = `${flow.date.getFullYear()}-${flow.date.getMonth()}`;
            const byMonth = (largest[flow.walletId] ??= {});
            const best = byMonth[month];
            if (!best || flow.originalAmount > best.amount) {
                byMonth[month] = { amount: flow.originalAmount, day: flow.date.getDate() };
            }
        }

        const scheduled = recurringMonthlyByWallet('income');
        for (const wallet of wallets.value) {
            const monthly = median(earned[wallet.id] ?? []) - (scheduled[wallet.id] ?? 0);
            if (monthly <= 0) continue;
            const days = Object.values(largest[wallet.id] ?? {})
                .map((entry) => entry.day)
                .sort((a, b) => a - b);
            const day = days[Math.floor((days.length - 1) / 2)] ?? 1;
            result.push({ walletId: wallet.id, monthly, day });
        }

        return result;
    });

    /** Habitual income placed on its usual day, month after month, over the horizon. */
    const incomeEvents = computed<ForecastEvent[]>(() => {
        const until = new Date(now.value);
        until.setDate(until.getDate() + horizonDays.value);
        const events: ForecastEvent[] = [];

        for (const income of habitualIncome.value) {
            for (let offset = 0; ; offset += 1) {
                const year = now.value.getFullYear();
                const month = now.value.getMonth() + offset;
                const lastDay = new Date(year, month + 1, 0).getDate();
                const date = new Date(year, month, Math.min(income.day, lastDay), 12);
                if (date > until) break;
                if (date <= now.value) continue;
                events.push({
                    id: `habit:${income.walletId}:${offset}`,
                    date,
                    walletId: income.walletId,
                    amount: income.monthly,
                    kind: 'habitualIncome',
                });
            }
        }

        return events;
    });

    const input = computed<CashFlowInput>(() => ({
        now: now.value,
        horizonDays: horizonDays.value,
        currency: defaultCurrency.value,
        wallets: wallets.value,
        events: [...events.value, ...incomeEvents.value],
        dailyDrift: dailyDrift.value,
    }));

    /** The projected runway of every wallet. */
    const projection = computed(() => forecast(input.value, { convert }));

    /** Everyday spending per month, all wallets, for display. */
    const monthlyDrift = computed(() => habitualSpending.value.monthly);

    /** Consumption of each sampled month, oldest first, for display. */
    const spendingMonths = computed(() => habitualSpending.value.months);

    /**
     * Loads every store the forecast reads from.
     * @returns Promise resolving when all stores are loaded
     */
    async function loadAll(): Promise<void> {
        await Promise.all([
            settingsStore.loadSettings(),
            exchangeRateStore.loadAll(),
            walletStore.loadAll(),
            categoryStore.loadAll(),
            transactionStore.loadAll(),
            gameStore.loadAll(),
            debtStore.loadAll(),
            recurringStore.loadAll(),
        ]);
        now.value = new Date();
    }

    /** Habitual income per month, all wallets, for display. */
    const monthlyIncome = computed(() =>
        habitualIncome.value.reduce(
            (sum, income) => sum + convert(income.monthly, walletCurrency(income.walletId)),
            0,
        ),
    );

    return {
        projection,
        horizonDays,
        includeDrift,
        monthlyDrift,
        monthlyIncome,
        sampleMonths,
        spendingMonths,
        loadAll,
    };
}
