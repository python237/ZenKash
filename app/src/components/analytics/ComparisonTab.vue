<template>
    <div>
        <GranularityChips class="q-mb-md" />

        <!-- The comparison always needs both directions, whatever the tab filter says -->
        <div class="text-caption text-grey-6 q-mb-md">
            {{ t('analytics.comparisonScopeHint') }}
        </div>

        <!-- Headline figures -->
        <div class="stats-grid q-mb-md">
            <q-card class="stat-card" flat bordered>
                <q-card-section class="q-pa-sm text-center">
                    <div class="text-caption text-grey-6">{{ t('analytics.groups.income') }}</div>
                    <div class="text-subtitle2 text-weight-bold text-positive">
                        {{ formatCurrency(summary.inflow) }}
                    </div>
                    <div class="text-caption text-grey-6">
                        {{ formatPercent(inflowDelta.percent, { signed: true }) }}
                    </div>
                </q-card-section>
            </q-card>

            <q-card class="stat-card" flat bordered>
                <q-card-section class="q-pa-sm text-center">
                    <div class="text-caption text-grey-6">{{ t('analytics.groups.expense') }}</div>
                    <div class="text-subtitle2 text-weight-bold text-negative">
                        {{ formatCurrency(summary.spending) }}
                    </div>
                    <div class="text-caption text-grey-6">
                        {{ formatPercent(spendingDelta.percent, { signed: true }) }}
                    </div>
                </q-card-section>
            </q-card>

            <!-- Money reallocated, kept out of the spending figure on purpose -->
            <q-card v-if="summary.allocated > 0" class="stat-card" flat bordered>
                <q-card-section class="q-pa-sm text-center">
                    <div class="text-caption text-grey-6">{{ t('analytics.allocated') }}</div>
                    <div class="text-subtitle2 text-weight-bold text-info">
                        {{ formatCurrency(summary.allocated) }}
                    </div>
                    <div class="text-caption text-grey-6">{{ t('analytics.allocatedHint') }}</div>
                </q-card-section>
            </q-card>

            <q-card class="stat-card" flat bordered>
                <q-card-section class="q-pa-sm text-center">
                    <div class="text-caption text-grey-6">{{ t('report.net') }}</div>
                    <div class="text-subtitle2 text-weight-bold" :class="netClass">
                        {{ formatSignedCurrency(summary.net) }}
                    </div>
                </q-card-section>
            </q-card>

            <q-card class="stat-card" flat bordered>
                <q-card-section class="q-pa-sm text-center">
                    <div class="text-caption text-grey-6">{{ t('analytics.savingsRate') }}</div>
                    <div class="text-subtitle2 text-weight-bold" :class="netClass">
                        {{ formatPercent(summary.savingsRate) }}
                    </div>
                </q-card-section>
            </q-card>
        </div>

        <div v-if="points.length === 0" class="text-center text-grey-6 q-py-xl">
            {{ t('analytics.noData') }}
        </div>

        <template v-else>
            <!-- Income vs expenses, one shared axis -->
            <q-card class="q-mb-md" flat bordered>
                <q-card-section>
                    <div class="text-subtitle1 text-weight-medium q-mb-md">
                        {{ t('analytics.incomeVsExpenses') }}
                    </div>
                    <div class="chart-container">
                        <Bar :data="comparisonData" :options="comparisonOptions" />
                    </div>
                </q-card-section>
            </q-card>

            <!-- Net per period: direction carries the sign, color reinforces it -->
            <q-card class="q-mb-md" flat bordered>
                <q-card-section>
                    <div class="text-subtitle1 text-weight-medium q-mb-md">
                        {{ t('analytics.netPerPeriod') }}
                    </div>
                    <div class="chart-container">
                        <Bar :data="netData" :options="netOptions" />
                    </div>
                </q-card-section>
            </q-card>

            <!-- Detailed breakdown per direction -->
            <q-card class="q-mb-md" flat bordered>
                <q-card-section>
                    <div class="row items-center justify-between q-mb-md">
                        <div class="text-subtitle1 text-weight-medium">
                            {{ t('analytics.detailed') }}
                        </div>
                        <q-toggle v-model="detailed" dense size="sm" />
                    </div>

                    <template v-if="detailed">
                        <div class="text-caption text-grey-6 q-mb-sm">
                            {{ t('analytics.groups.income') }}
                        </div>
                        <BreakdownList v-if="inflowRows.length > 0" :rows="inflowRows" />
                        <div v-else class="text-caption text-grey-5 q-mb-md">
                            {{ t('analytics.noData') }}
                        </div>

                        <q-separator class="q-my-md" />

                        <div class="text-caption text-grey-6 q-mb-sm">
                            {{ t('analytics.groups.expense') }}
                        </div>
                        <BreakdownList v-if="outflowRows.length > 0" :rows="outflowRows" />
                        <div v-else class="text-caption text-grey-5">
                            {{ t('analytics.noData') }}
                        </div>
                    </template>
                </q-card-section>
            </q-card>

            <!-- Table view -->
            <q-card flat bordered>
                <q-card-section>
                    <div class="text-subtitle1 text-weight-medium q-mb-sm">
                        {{ t('analytics.perPeriod') }}
                    </div>
                    <q-list separator>
                        <q-item v-for="point in reversedPoints" :key="point.key">
                            <q-item-section>
                                <q-item-label class="text-capitalize">
                                    {{ bucketLabel(point) }}
                                </q-item-label>
                                <q-item-label caption>
                                    <span class="text-positive">
                                        {{ formatCurrency(point.inflow) }}
                                    </span>
                                    ·
                                    <span class="text-negative">
                                        {{ formatCurrency(point.spending) }}
                                    </span>
                                    <template v-if="point.allocated > 0">
                                        ·
                                        <span class="text-info">
                                            {{ formatCurrency(point.allocated) }}
                                        </span>
                                    </template>
                                </q-item-label>
                            </q-item-section>
                            <q-item-section side>
                                <q-item-label
                                    class="text-weight-medium"
                                    :class="point.net >= 0 ? 'text-positive' : 'text-negative'"
                                >
                                    {{ formatSignedCurrency(point.net) }}
                                </q-item-label>
                                <q-item-label caption>
                                    {{ formatPercent(point.savingsRate) }}
                                </q-item-label>
                            </q-item-section>
                        </q-item>
                    </q-list>
                </q-card-section>
            </q-card>
        </template>
    </div>
</template>

<script setup lang="ts">
import { Bar } from 'vue-chartjs';
import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    type ChartData,
    type ChartOptions,
} from 'chart.js';
import type { BreakdownRow, FlowGroup, NormalizedFlow } from 'src/types/analytics';
import { OTHER_COLOR } from 'src/services/chart';
import {
    aggregateBy,
    buildComparison,
    computeDelta,
    foldToLimit,
    summarize,
} from 'src/services/analytics';
import BreakdownList from './BreakdownList.vue';
import GranularityChips from './GranularityChips.vue';
import { useAnalytics } from 'src/composables/useAnalytics';
import { useAnalyticsFilters } from 'src/composables/useAnalyticsFilters';
import { useCurrency } from 'src/composables/useCurrency';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

/** Income and expenses read as opposites; blue/red stays readable for CVD viewers. */
const INFLOW_COLOR = '#2a78d6';
const OUTFLOW_COLOR = '#e34948';

/** Reallocated money reads as neither earned nor spent. */
const ALLOCATION_COLOR = '#4a3aa7';

/** Flow families the comparison always accounts for. */
const COMPARISON_GROUPS: FlowGroup[] = ['income', 'expense', 'game', 'project', 'fee'];

/** Master categories listed per direction in the detailed view. */
const DETAIL_LIMIT = 6;

const { t } = useI18n();
const { filters } = useAnalyticsFilters();
const { range, previousRange, timeBuckets, selectIn, bucketLabel } = useAnalytics();
const masterCategoryStore = useMasterCategoryStore();
const { formatCurrency, formatSignedCurrency, formatCompactCurrency, formatPercent } =
    useCurrency();

const detailed = ref(true);

/** Flows of the period, with both directions forced in. */
const flows = computed(() => selectIn(range.value, { groups: COMPARISON_GROUPS }));

/** Flows of the previous period, used for the comparison chips. */
const previousFlows = computed(() =>
    selectIn(previousRange.value, { groups: COMPARISON_GROUPS }),
);

const summary = computed(() => summarize(flows.value, range.value));
const previousSummary = computed(() => summarize(previousFlows.value, previousRange.value));

const inflowDelta = computed(() =>
    computeDelta(summary.value.inflow, previousSummary.value.inflow),
);
const spendingDelta = computed(() =>
    computeDelta(summary.value.spending, previousSummary.value.spending),
);

const netClass = computed(() => (summary.value.net >= 0 ? 'text-positive' : 'text-negative'));

/** Inflow / outflow / net per time bucket. */
const points = computed(() =>
    buildComparison(flows.value, timeBuckets.value, filters.value.granularity),
);

const reversedPoints = computed(() => [...points.value].reverse());

const labels = computed(() => points.value.map((point) => bucketLabel(point)));

/** Whether any bucket reallocated money, which earns the third series. */
const hasAllocation = computed(() => points.value.some((point) => point.allocated > 0));

const comparisonData = computed<ChartData<'bar'>>(() => {
    const datasets = [
        {
            label: t('analytics.groups.income'),
            data: points.value.map((point) => point.inflow),
            backgroundColor: INFLOW_COLOR,
            borderRadius: 4,
        },
        {
            label: t('analytics.groups.expense'),
            data: points.value.map((point) => point.spending),
            backgroundColor: OUTFLOW_COLOR,
            borderRadius: 4,
        },
    ];

    if (hasAllocation.value) {
        datasets.push({
            label: t('analytics.allocated'),
            data: points.value.map((point) => point.allocated),
            backgroundColor: ALLOCATION_COLOR,
            borderRadius: 4,
        });
    }

    return { labels: labels.value, datasets };
});

const comparisonOptions = computed<ChartOptions<'bar'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            display: true,
            position: 'bottom',
            labels: { boxWidth: 12, usePointStyle: true },
        },
        tooltip: {
            callbacks: {
                label: (context) =>
                    `${context.dataset.label ?? ''}: ${formatCurrency(Number(context.raw))}`,
            },
        },
    },
    scales: {
        x: { grid: { display: false } },
        y: {
            border: { display: false },
            ticks: { callback: (value) => formatCompactCurrency(Number(value)) },
        },
    },
}));

const netData = computed<ChartData<'bar'>>(() => ({
    labels: labels.value,
    datasets: [
        {
            label: t('report.net'),
            data: points.value.map((point) => point.net),
            backgroundColor: points.value.map((point) =>
                point.net >= 0 ? INFLOW_COLOR : OUTFLOW_COLOR,
            ),
            borderRadius: 4,
        },
    ],
}));

const netOptions = computed<ChartOptions<'bar'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        // A single series needs no legend box: the card title names it.
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (context) => formatSignedCurrency(Number(context.raw)),
            },
        },
    },
    scales: {
        x: { grid: { display: false } },
        y: {
            border: { display: false },
            ticks: { callback: (value) => formatCompactCurrency(Number(value)) },
        },
    },
}));

/**
 * Builds breakdown rows by master category for one flow direction.
 * @param direction - The direction to keep
 * @param color - Fallback color for entities without one of their own
 * @returns The rows, largest first
 */
function rowsFor(direction: 'in' | 'out', color: string): BreakdownRow[] {
    // The expense side lists consumption only: allocations have their own figure.
    const directional = flows.value.filter(
        (flow) =>
            flow.direction === direction && (direction === 'in' || flow.nature !== 'allocation'),
    );
    const buckets = foldToLimit(
        aggregateBy(directional, (flow: NormalizedFlow) => flow.masterCategoryId ?? 'other'),
        DETAIL_LIMIT,
    );
    const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0);

    return buckets.map((bucket) => {
        const masterCategory =
            bucket.key === 'other' ? undefined : masterCategoryStore.getMasterCategoryById(bucket.key);
        return {
            ...bucket,
            name: masterCategory?.name ?? t('analytics.other'),
            icon: masterCategory?.icon,
            color: bucket.key === 'other' ? OTHER_COLOR : (masterCategory?.color ?? color),
            percent: total > 0 ? (bucket.amount / total) * 100 : 0,
            drillable: false,
        };
    });
}

const inflowRows = computed(() => rowsFor('in', INFLOW_COLOR));
const outflowRows = computed(() => rowsFor('out', OUTFLOW_COLOR));
</script>

<style lang="scss" scoped>
.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.stat-card {
    border-radius: 12px;
}

.chart-container {
    position: relative;
    height: 260px;
}
</style>
