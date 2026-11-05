/**
 * Net Worth Forecast Composable
 *
 * Reactive bridge between the stores and `services/net-worth-forecast`. It
 * measures the sampled months, values the assets at future dates and hands
 * everything to the pure layer.
 * @module composables/useNetWorthForecast
 */

import type { AnalyticsContext } from 'src/services/analytics';
import type { DebtWithStats } from 'src/types/debt';
import { toFlows } from 'src/services/analytics';
import { resaleValueAt } from 'src/services/asset-valuation';
import {
    MIN_HISTORY_MONTHS,
    completeMonthsOfHistory,
    forecastNetWorth,
    monthlyNets,
    nextMilestone,
} from 'src/services/net-worth-forecast';
import { useAssetStore } from 'src/stores/asset';
import { useDebtStore } from 'src/stores/debt';
import { useNetWorthStore } from 'src/stores/net-worth';
import { useGameTransfers } from './useGameTransfers';
import { useCurrency } from './useCurrency';

/** Past months shown before the projection. */
const HISTORY_POINTS = 6;

/**
 * Provides the reactive net worth projection.
 * @returns The projection, its controls, the history and the store loader
 */
export function useNetWorthForecast() {
    const { convert, walletCurrency } = useCurrency();
    const { classifyTransfer } = useGameTransfers();

    const transactionStore = useTransactionStore();
    const categoryStore = useCategoryStore();
    const walletStore = useWalletStore();
    const settingsStore = useSettingsStore();
    const exchangeRateStore = useExchangeRateStore();
    const gameStore = useGameStore();
    const investmentStore = useInvestmentStore();
    const debtStore = useDebtStore();
    const assetStore = useAssetStore();
    const netWorthStore = useNetWorthStore();

    /** Reference "today", captured once so every figure agrees. */
    const now = ref(new Date());

    /** Months projected. */
    const horizonMonths = ref<number>(12);

    /** Complete months the savings are measured on. */
    const sampleMonths = ref<number>(6);

    const context = computed<AnalyticsContext>(() => ({
        convert,
        walletCurrency,
        category: (id: string) => categoryStore.getCategoryById(id),
        debtDirection: (id: string) => debtStore.getDirection(id),
        classifyGameTransfer: classifyTransfer,
    }));

    const flows = computed(() => toFlows(transactionStore.transactions, context.value));

    /** Complete months of history available. */
    const historyMonths = computed(() => completeMonthsOfHistory(flows.value, now.value));

    /** Whether there is enough history to project anything. */
    const isReady = computed(() => historyMonths.value >= MIN_HISTORY_MONTHS);

    /** Sample actually used: never longer than the history. */
    const effectiveSample = computed(() => Math.min(sampleMonths.value, historyMonths.value));

    const current = computed(() => netWorthStore.computeCurrent());

    const projection = computed(() =>
        forecastNetWorth({
            now: now.value,
            horizonMonths: horizonMonths.value,
            currentTotal: current.value.total,
            currentAssets: current.value.assets,
            monthlyNets: monthlyNets(flows.value, now.value, effectiveSample.value),
            assetsAt: (date: Date) =>
                assetStore.owned.reduce(
                    (sum, asset) => sum + convert(resaleValueAt(asset, date), asset.currency),
                    0,
                ),
        }),
    );

    /** Net worth of the past months (snapshots), then today, oldest first. */
    const history = computed(() => {
        const period = `${now.value.getFullYear()}-${String(now.value.getMonth() + 1).padStart(2, '0')}`;
        const past = netWorthStore.snapshots
            .filter((s) => s.period < period)
            .slice(-HISTORY_POINTS)
            .map((s) => ({ date: s.date, total: s.total }));
        return [...past, { date: now.value, total: current.value.total }];
    });

    /** Next round figure, when the most likely path reaches it within the horizon. */
    const milestone = computed(() => {
        const target = nextMilestone(current.value.total);
        if (target === null) return null;
        const point = projection.value.points.find((p) => p.central >= target);
        return point ? { amount: target, date: point.date } : null;
    });

    /** Open debts falling due within the horizon. */
    const debtsDue = computed(() => {
        const end = projection.value.points.at(-1)?.date ?? now.value;
        return [...debtStore.receivables, ...debtStore.payables].filter(
            (d: DebtWithStats) => d.dueDate && d.dueDate <= end,
        ).length;
    });

    /**
     * Loads every store the projection reads from.
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
            investmentStore.loadAll(),
            debtStore.loadAll(),
            assetStore.loadAll(),
            netWorthStore.loadAll(),
        ]);
        now.value = new Date();
    }

    return {
        horizonMonths,
        sampleMonths,
        historyMonths,
        isReady,
        effectiveSample,
        current,
        projection,
        history,
        milestone,
        debtsDue,
        loadAll,
    };
}
