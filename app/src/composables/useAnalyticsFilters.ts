/**
 * Analytics Filters Composable
 *
 * Holds the filter state of the analytics screens. The state lives at module
 * scope (like `useNavigation`) so it is shared by every tab and survives
 * navigation: the user never re-enters a selection when switching views or
 * coming back from a drill-down.
 * @module composables/useAnalyticsFilters
 */

import type {
    AnalyticsFilters,
    BreakdownDimension,
    DateRange,
    FlowGroup,
    Granularity,
    PeriodPreset,
} from 'src/types/analytics';

/** Period shortcuts offered as chips, in display order. */
export const PERIOD_PRESETS: PeriodPreset[] = [
    'currentMonth',
    'last3Months',
    'last6Months',
    'last12Months',
    'yearToDate',
];

/** Flow families offered in the filter sheet, in display order. */
export const FLOW_GROUPS: FlowGroup[] = ['expense', 'income', 'game', 'project', 'fee', 'debt'];

/** Bucket sizes offered for the evolution and comparison views, in display order. */
export const GRANULARITIES: Granularity[] = ['week', 'month', 'quarter'];

/**
 * Builds the default filter state: the last three months of expenses, grouped
 * by master category.
 * @returns A fresh filter state
 */
function createDefaultFilters(): AnalyticsFilters {
    return {
        preset: 'last3Months',
        customRange: null,
        granularity: 'month',
        groups: ['expense'],
        masterCategoryIds: [],
        categoryIds: [],
        walletIds: [],
        amountMin: null,
        amountMax: null,
        search: '',
        dimension: 'masterCategory',
    };
}

/** Shared filter state, intentionally at module scope. */
const filters = ref<AnalyticsFilters>(createDefaultFilters());

/**
 * Provides the shared analytics filter state and the operations the UI performs
 * on it.
 * @returns The filter state plus its mutators
 */
export function useAnalyticsFilters() {
    /** Number of filters narrowing the data, ignoring period and grouping. */
    const activeFilterCount = computed(() => {
        const state = filters.value;
        let count = 0;
        if (state.masterCategoryIds.length > 0) count += 1;
        if (state.categoryIds.length > 0) count += 1;
        if (state.walletIds.length > 0) count += 1;
        if (state.amountMin !== null || state.amountMax !== null) count += 1;
        if (state.search.trim() !== '') count += 1;
        if (state.groups.length !== 1 || state.groups[0] !== 'expense') count += 1;
        return count;
    });

    /**
     * Selects a period shortcut.
     * @param preset - The preset to activate
     */
    function setPreset(preset: PeriodPreset): void {
        filters.value.preset = preset;
        if (preset !== 'custom') filters.value.customRange = null;
    }

    /**
     * Selects an explicit date range and switches to the custom preset.
     * @param range - The range to apply
     */
    function setCustomRange(range: DateRange): void {
        filters.value.customRange = range;
        filters.value.preset = 'custom';
    }

    /**
     * Changes the dimension breakdown rows are grouped by.
     * @param dimension - The dimension to group by
     */
    function setDimension(dimension: BreakdownDimension): void {
        filters.value.dimension = dimension;
    }

    /**
     * Changes the bucket size of the time series.
     * @param granularity - The bucket size to apply
     */
    function setGranularity(granularity: Granularity): void {
        filters.value.granularity = granularity;
    }

    /**
     * Drills into a master category: restricts the data to it and regroups the
     * rows by category.
     * @param masterCategoryId - The master category to focus on
     */
    function drillIntoMasterCategory(masterCategoryId: string): void {
        filters.value.masterCategoryIds = [masterCategoryId];
        filters.value.categoryIds = [];
        filters.value.dimension = 'category';
    }

    /** Leaves a drill-down and goes back to the master category level. */
    function clearDrill(): void {
        filters.value.masterCategoryIds = [];
        filters.value.categoryIds = [];
        filters.value.dimension = 'masterCategory';
    }

    /** Restores every filter to its default value. */
    function resetFilters(): void {
        filters.value = createDefaultFilters();
    }

    return {
        filters,
        activeFilterCount,
        setPreset,
        setCustomRange,
        setDimension,
        setGranularity,
        drillIntoMasterCategory,
        clearDrill,
        resetFilters,
    };
}
