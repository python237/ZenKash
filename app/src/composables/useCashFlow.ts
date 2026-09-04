/**
 * Cash Flow Composable
 *
 * Reactive bridge between the stores and `services/cash-flow`. It assembles the
 * three ingredients of a runway — current balances, scheduled movements and
 * habitual spending — and hands them to the pure layer.
 *
 * The habitual spending deserves a word: history already *contains* the
 * recurring charges that were posted, so feeding both the rules and the raw
 * historical average would count rent twice. The drift is therefore the
 * historical consumption **minus** what the active rules represent per month.
 * @module composables/useCashFlow
 */

import type { CashFlowInput, ForecastEvent, ForecastWallet } from 'src/types/cash-flow';
import type { RecurringOccurrence, RecurringTransaction } from 'src/types/recurring-transaction';
import type { Wallet } from 'src/types/wallet';
import {
    endOfMonth,
    startOfMonth,
    toFlows,
    type AnalyticsContext,
} from 'src/services/analytics';
import { forecast } from 'src/services/cash-flow';
import { useDebtStore } from 'src/stores/debt';
import { useGameTransfers } from './useGameTransfers';
import { useCurrency } from './useCurrency';

/** Horizons the screen offers, in days. */
export const HORIZON_OPTIONS = [30, 60, 90] as const;

/** Complete months the habitual spending is averaged over. */
const SPENDING_SAMPLE_MONTHS = 3;

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
     * currency. Only expenses: income is not part of the spending drift.
     */
    const recurringMonthlyByWallet = computed(() => {
        const byWallet: Record<string, number> = {};

        for (const rule of recurringStore.activeItems as RecurringTransaction[]) {
            if (rule.type !== 'expense') continue;
            const perMonth =
                (rule.amount * MONTHLY_FACTOR[rule.frequency]) / Math.max(1, rule.intervalCount);
            byWallet[rule.walletId] = (byWallet[rule.walletId] ?? 0) + perMonth;
        }

        return byWallet;
    });

    /**
     * Habitual daily spending per wallet: everything consumed over the sample,
     * minus what the recurring rules already schedule, spread over a month.
     */
    const dailyDrift = computed<Record<string, number>>(() => {
        if (!includeDrift.value) return {};

        const flows = toFlows(transactionStore.transactions, context.value);
        const start = startOfMonth(
            new Date(now.value.getFullYear(), now.value.getMonth() - SPENDING_SAMPLE_MONTHS, 1),
        );
        const end = endOfMonth(new Date(now.value.getFullYear(), now.value.getMonth() - 1, 1));
        if (end < start) return {};

        // Consumption only: a project injection or a game deposit is not a
        // habit that keeps draining the wallet.
        const consumed: Record<string, number> = {};
        for (const flow of flows) {
            if (flow.nature !== 'consumption' || !flow.walletId) continue;
            if (flow.date < start || flow.date > end) continue;
            consumed[flow.walletId] = (consumed[flow.walletId] ?? 0) + flow.originalAmount;
        }

        const drift: Record<string, number> = {};
        for (const wallet of wallets.value) {
            const monthly = (consumed[wallet.id] ?? 0) / SPENDING_SAMPLE_MONTHS;
            const scheduled = recurringMonthlyByWallet.value[wallet.id] ?? 0;
            drift[wallet.id] = Math.max(0, monthly - scheduled) / DAYS_PER_MONTH;
        }

        return drift;
    });

    const input = computed<CashFlowInput>(() => ({
        now: now.value,
        horizonDays: horizonDays.value,
        currency: defaultCurrency.value,
        wallets: wallets.value,
        events: events.value,
        dailyDrift: dailyDrift.value,
    }));

    /** The projected runway of every wallet. */
    const projection = computed(() => forecast(input.value, { convert }));

    /** Habitual spending per month, all wallets, for display. */
    const monthlyDrift = computed(() =>
        wallets.value.reduce(
            (sum: number, wallet: ForecastWallet) =>
                sum +
                convert((dailyDrift.value[wallet.id] ?? 0) * DAYS_PER_MONTH, wallet.currency),
            0,
        ),
    );

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

    return { projection, horizonDays, includeDrift, monthlyDrift, loadAll };
}
