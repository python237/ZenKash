/**
 * Analytics Composable
 *
 * Reactive bridge between the stores and the pure aggregation layer in
 * `services/analytics`. Screens read computed values from here and never
 * aggregate transactions themselves, so every analytics tab reports the same
 * numbers from the same rules.
 * @module composables/useAnalytics
 */

import type { Category } from 'src/types/category';
import type { MasterCategory } from 'src/types/master-category';
import type {
    AggregateBucket,
    AnalyticsFilters,
    BreakdownRow,
    DateRange,
    NormalizedFlow,
    SeriesPoint,
    TimeBucket,
} from 'src/types/analytics';
import { CHART_COLORS, MAX_SERIES, OTHER_COLOR, colorAt } from 'src/services/chart';
import {
    aggregateBy,
    bucketsFor,
    buildSeries,
    computeDelta,
    foldToLimit,
    resolvePreviousRange,
    resolveRange,
    selectFlows,
    summarize,
    toFlows,
    type AnalyticsContext,
} from 'src/services/analytics';
import { useAnalyticsFilters } from './useAnalyticsFilters';
import { useCurrency } from './useCurrency';

/** Prefix used to build the synthetic keys of flows without a category. */
const GROUP_KEY_PREFIX = 'group:';

/**
 * Maps an entity identifier to a palette slot.
 *
 * The slot follows the entity, not its rank, so changing a filter never
 * repaints the rows that survive it. Collisions walk forward to the next free
 * slot, which keeps adjacent slices distinguishable.
 * @param id - Entity identifier
 * @param taken - Slots already used by previous rows
 * @returns The hex color assigned to the entity
 */
function stableColor(id: string, taken: Set<number>): string {
    let hash = 0;
    for (let i = 0; i < id.length; i += 1) {
        hash = (hash * 31 + id.charCodeAt(i)) % 100003;
    }

    for (let offset = 0; offset < MAX_SERIES; offset += 1) {
        const slot = (hash + offset) % MAX_SERIES;
        if (!taken.has(slot)) {
            taken.add(slot);
            return colorAt(slot);
        }
    }

    return colorAt(hash % CHART_COLORS.length);
}

/**
 * Provides the reactive analytics dataset: resolved period, filtered flows,
 * summaries and breakdown rows.
 * @returns The analytics dataset and its loader
 */
export function useAnalytics() {
    const { t, locale } = useI18n();
    const { filters } = useAnalyticsFilters();
    const { convert, walletCurrency } = useCurrency();

    const transactionStore = useTransactionStore();
    const categoryStore = useCategoryStore();
    const masterCategoryStore = useMasterCategoryStore();
    const walletStore = useWalletStore();
    const settingsStore = useSettingsStore();
    const exchangeRateStore = useExchangeRateStore();
    const gameStore = useGameStore();
    const { classifyTransfer } = useGameTransfers();

    /**
     * Reference "now". Captured once per page visit so every computed value in a
     * session agrees on where the period ends.
     */
    const now = ref(new Date());

    const context = computed<AnalyticsContext>(() => ({
        convert,
        walletCurrency,
        category: (id: string) => categoryStore.getCategoryById(id),
        classifyGameTransfer: classifyTransfer,
    }));

    /** Every transaction expanded into normalized, converted flows. */
    const allFlows = computed(() => toFlows(transactionStore.transactions, context.value));

    /** The period the filters resolve to. */
    const range = computed(() => resolveRange(filters.value, now.value));

    /** The equally long period right before {@link range}. */
    const previousRange = computed(() => resolvePreviousRange(filters.value, now.value));

    /** Flows of the selected period matching every filter. */
    const flows = computed(() => selectFlows(allFlows.value, filters.value, range.value));

    /** Flows of the previous period, used for comparisons. */
    const previousFlows = computed(() =>
        selectFlows(allFlows.value, filters.value, previousRange.value),
    );

    /** Headline figures of the selected period. */
    const summary = computed(() => summarize(flows.value, range.value, now.value));

    /** Headline figures of the previous period. */
    const previousSummary = computed(() => summarize(previousFlows.value, previousRange.value));

    /** Change in spending against the previous period. */
    const outflowDelta = computed(() =>
        computeDelta(summary.value.outflow, previousSummary.value.outflow),
    );

    /** Change in the net balance against the previous period. */
    const netDelta = computed(() => computeDelta(summary.value.net, previousSummary.value.net));

    /**
     * Returns the grouping key of a flow for the active dimension.
     *
     * Flows without the requested dimension (a game transfer has no category,
     * for instance) fall back to a synthetic per-family key, so the rows always
     * add up to the period total instead of silently dropping money.
     * @param flow - The flow to key
     * @returns The grouping key
     */
    function keyOf(flow: NormalizedFlow): string {
        const dimension = filters.value.dimension;

        if (dimension === 'wallet') {
            return flow.walletId ?? `${GROUP_KEY_PREFIX}unknown`;
        }
        if (dimension === 'category') {
            return flow.categoryId ?? `${GROUP_KEY_PREFIX}${flow.group}`;
        }
        return flow.masterCategoryId ?? `${GROUP_KEY_PREFIX}${flow.group}`;
    }

    /**
     * Resolves the label, icon and own color of a grouping key.
     * @param key - The grouping key
     * @returns Display attributes of the key
     */
    function describeKey(key: string): {
        name: string;
        icon?: string | undefined;
        ownColor?: string | undefined;
        drillable: boolean;
    } {
        if (key === 'other') {
            return { name: t('analytics.other'), icon: 'more_horiz', drillable: false };
        }

        if (key.startsWith(GROUP_KEY_PREFIX)) {
            const group = key.slice(GROUP_KEY_PREFIX.length);
            return {
                name: t(`analytics.groups.${group}`),
                icon: 'help_outline',
                drillable: false,
            };
        }

        const dimension = filters.value.dimension;

        if (dimension === 'wallet') {
            const wallet = walletStore.getWalletById(key);
            return {
                name: wallet?.name ?? t('analytics.unknown'),
                icon: wallet?.icon,
                drillable: false,
            };
        }

        if (dimension === 'category') {
            const category = categoryStore.getCategoryById(key) as Category | undefined;
            return {
                name: category?.name ?? t('analytics.unknown'),
                icon: category?.icon,
                drillable: false,
            };
        }

        const masterCategory = masterCategoryStore.getMasterCategoryById(key) as
            | MasterCategory
            | undefined;
        return {
            name: masterCategory?.name ?? t('analytics.unknown'),
            icon: masterCategory?.icon,
            ownColor: masterCategory?.color,
            drillable: true,
        };
    }

    /** Aggregated buckets of the selected period, largest first, capped. */
    const buckets = computed<AggregateBucket[]>(() =>
        foldToLimit(aggregateBy(flows.value, keyOf), MAX_SERIES),
    );

    /** Breakdown rows ready to render, with labels, colors and shares. */
    const breakdownRows = computed<BreakdownRow[]>(() => {
        const total = buckets.value.reduce((sum, bucket) => sum + bucket.amount, 0);
        const taken = new Set<number>();

        return buckets.value.map((bucket) => {
            const described = describeKey(bucket.key);
            const color =
                bucket.key === 'other'
                    ? OTHER_COLOR
                    : (described.ownColor ?? stableColor(bucket.key, taken));

            return {
                ...bucket,
                name: described.name,
                icon: described.icon,
                color,
                percent: total > 0 ? (bucket.amount / total) * 100 : 0,
                drillable: described.drillable,
            };
        });
    });

    /** Flows of the selected period, grouped by the active dimension key. */
    const flowsByKey = computed(() => {
        const grouped = new Map<string, NormalizedFlow[]>();
        for (const flow of flows.value) {
            const key = keyOf(flow);
            const list = grouped.get(key);
            if (list) {
                list.push(flow);
            } else {
                grouped.set(key, [flow]);
            }
        }
        return grouped;
    });

    /** The largest single outgoing flows of the period. */
    const topOutflows = computed(() =>
        flows.value
            .filter((flow) => flow.direction === 'out')
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5),
    );

    /** Series keys of the period, in display order, `'other'` last. */
    const seriesKeys = computed(() => breakdownRows.value.map((row) => row.key));

    /** Color of each series key, shared by every tab so a color means one entity. */
    const colorByKey = computed(
        () => new Map(breakdownRows.value.map((row) => [row.key, row.color])),
    );

    /** Label of each series key. */
    const nameByKey = computed(() => new Map(breakdownRows.value.map((row) => [row.key, row.name])));

    /**
     * Maps a flow to its series key, folding everything outside the top keys
     * into `'other'` so the stacked series match the breakdown rows exactly.
     * @param flow - The flow to map
     * @returns The series key
     */
    function seriesKeyOf(flow: NormalizedFlow): string {
        const key = keyOf(flow);
        return colorByKey.value.has(key) ? key : 'other';
    }

    /** Time buckets covering the selected period at the chosen granularity. */
    const timeBuckets = computed(() => bucketsFor(range.value, filters.value.granularity));

    /** Evolution series: one point per bucket, split by the active dimension. */
    const series = computed<SeriesPoint[]>(() =>
        buildSeries(
            flows.value,
            timeBuckets.value,
            filters.value.granularity,
            seriesKeys.value,
            seriesKeyOf,
        ),
    );

    /**
     * Selects flows over a range while overriding part of the filter state.
     *
     * The comparison view needs incoming flows even when the user is browsing
     * expenses, without disturbing the shared filters.
     * @param target - The range to select over
     * @param overrides - Filter fields to override
     * @returns The matching flows, most recent first
     */
    function selectIn(
        target: DateRange,
        overrides: Partial<AnalyticsFilters> = {},
    ): NormalizedFlow[] {
        return selectFlows(allFlows.value, { ...filters.value, ...overrides }, target);
    }

    /**
     * Formats a time bucket for chart axes and tables.
     * @param bucket - The bucket to label
     * @returns A short localized label
     */
    function bucketLabel(bucket: TimeBucket): string {
        const granularity = filters.value.granularity;

        if (granularity === 'week') {
            return new Intl.DateTimeFormat(locale.value, {
                day: 'numeric',
                month: 'short',
            }).format(bucket.start);
        }

        if (granularity === 'quarter') {
            const quarter = Math.floor(bucket.start.getMonth() / 3) + 1;
            return `${t('analytics.quarterShort')}${quarter} ${bucket.start.getFullYear()}`;
        }

        return new Intl.DateTimeFormat(locale.value, {
            month: 'short',
            year: '2-digit',
        }).format(bucket.start);
    }

    /** Whether the selected period contains no flow at all. */
    const isEmpty = computed(() => flows.value.length === 0);

    /**
     * Human-readable label of a flow, used in transaction lists.
     * @param flow - The flow to label
     * @returns The description, or the category name as a fallback
     */
    function labelOf(flow: NormalizedFlow): string {
        if (flow.description) return flow.description;
        if (flow.categoryId) {
            const category = categoryStore.getCategoryById(flow.categoryId) as Category | undefined;
            if (category) return category.name;
        }
        return t(`analytics.groups.${flow.group}`);
    }

    /**
     * Loads every store the analytics screens depend on.
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
        ]);
        now.value = new Date();
    }

    return {
        range,
        previousRange,
        flows,
        summary,
        previousSummary,
        outflowDelta,
        netDelta,
        breakdownRows,
        flowsByKey,
        topOutflows,
        isEmpty,
        seriesKeys,
        colorByKey,
        nameByKey,
        timeBuckets,
        series,
        selectIn,
        bucketLabel,
        labelOf,
        loadAll,
    };
}
