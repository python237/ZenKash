<template>
    <div>
        <GranularityChips class="q-mb-md" />

        <div v-if="isEmpty" class="text-center text-grey-6 q-py-xl">
            {{ t('analytics.noData') }}
        </div>

        <template v-else>
            <!-- Stacked evolution -->
            <q-card class="q-mb-md" flat bordered>
                <q-card-section>
                    <div class="row items-center justify-between q-mb-sm">
                        <div class="text-subtitle1 text-weight-medium">
                            {{ t('analytics.evolution') }}
                        </div>
                        <q-toggle
                            v-model="cumulative"
                            dense
                            size="sm"
                            :label="t('analytics.cumulative')"
                        />
                    </div>
                    <div class="text-caption text-grey-6 q-mb-md">
                        {{ t(`analytics.dimensions.${filters.dimension}`) }}
                    </div>

                    <div class="chart-container">
                        <Bar :data="stackedData" :options="stackedOptions" />
                    </div>

                    <!-- Legend: identity is never carried by color alone -->
                    <div class="legend q-mt-md">
                        <div v-for="row in breakdownRows" :key="row.key" class="legend-item">
                            <span class="legend-color" :style="{ backgroundColor: row.color }" />
                            <span class="legend-label text-caption">{{ row.name }}</span>
                            <span class="legend-value text-caption text-grey-6">
                                {{ formatCurrency(row.amount) }}
                            </span>
                        </div>
                    </div>
                </q-card-section>
            </q-card>

            <!-- Trend: total per bucket and its moving average -->
            <q-card v-if="series.length >= 2" class="q-mb-md" flat bordered>
                <q-card-section>
                    <div class="text-subtitle1 text-weight-medium q-mb-sm">
                        {{ t('analytics.trend') }}
                    </div>
                    <div class="row q-gutter-md q-mb-md">
                        <div>
                            <div class="text-caption text-grey-6">{{ t('analytics.average') }}</div>
                            <div class="text-body2 text-weight-medium">
                                {{ formatCurrency(stats.average) }}
                            </div>
                        </div>
                        <div>
                            <div class="text-caption text-grey-6">{{ t('analytics.highest') }}</div>
                            <div class="text-body2 text-weight-medium">
                                {{ formatCurrency(stats.max) }}
                            </div>
                        </div>
                        <div>
                            <div class="text-caption text-grey-6">{{ t('analytics.lowest') }}</div>
                            <div class="text-body2 text-weight-medium">
                                {{ formatCurrency(stats.min) }}
                            </div>
                        </div>
                    </div>

                    <div class="chart-container">
                        <Line :data="trendData" :options="trendOptions" />
                    </div>
                </q-card-section>
            </q-card>

            <!-- Table view: the numbers behind the charts -->
            <q-card flat bordered>
                <q-card-section>
                    <div class="text-subtitle1 text-weight-medium q-mb-sm">
                        {{ t('analytics.perPeriod') }}
                    </div>
                    <q-list separator>
                        <q-item v-for="row in tableRows" :key="row.key">
                            <q-item-section>
                                <q-item-label class="text-capitalize">{{ row.label }}</q-item-label>
                                <q-item-label caption>
                                    {{ t('analytics.flowCount', { count: row.count }) }}
                                </q-item-label>
                            </q-item-section>
                            <q-item-section side>
                                <q-item-label class="text-weight-medium">
                                    {{ formatCurrency(row.total) }}
                                </q-item-label>
                                <q-item-label
                                    v-if="row.delta !== null"
                                    caption
                                    :class="row.delta > 0 ? 'text-negative' : 'text-positive'"
                                >
                                    {{ formatPercent(row.delta, { signed: true }) }}
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
import { Bar, Line } from 'vue-chartjs';
import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    Filler,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
    type ChartData,
    type ChartOptions,
} from 'chart.js';
import { CHART_SURFACE } from 'src/services/chart';
import { bucketKeyOf, cumulate, movingAverage } from 'src/services/analytics';
import GranularityChips from './GranularityChips.vue';
import { useAnalytics } from 'src/composables/useAnalytics';
import { useAnalyticsFilters } from 'src/composables/useAnalyticsFilters';
import { useCurrency } from 'src/composables/useCurrency';

ChartJS.register(
    BarElement,
    CategoryScale,
    Filler,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
);

/** Number of periods averaged by the trend line. */
const MOVING_AVERAGE_WINDOW = 3;

const { t } = useI18n();
const { filters } = useAnalyticsFilters();
const { series, breakdownRows, colorByKey, isEmpty, bucketLabel, flows } = useAnalytics();
const { formatCurrency, formatCompactCurrency, formatPercent } = useCurrency();

const cumulative = ref(false);

const labels = computed(() => series.value.map((point) => bucketLabel(point)));

/** Totals per bucket, cumulated when the toggle is on. */
const totals = computed(() => {
    const raw = series.value.map((point) => point.total);
    return cumulative.value ? cumulate(raw) : raw;
});

const stackedData = computed<ChartData<'bar'>>(() => ({
    labels: labels.value,
    datasets: breakdownRows.value.map((row) => {
        const raw = series.value.map((point) => point.values[row.key] ?? 0);
        return {
            label: row.name,
            data: cumulative.value ? cumulate(raw) : raw,
            backgroundColor: colorByKey.value.get(row.key) ?? row.color,
            // A surface-colored gap keeps stacked segments readable.
            borderColor: CHART_SURFACE,
            borderWidth: { top: 2, right: 0, bottom: 0, left: 0 },
            borderRadius: 4,
            stack: 'total',
        };
    }),
}));

const stackedOptions = computed<ChartOptions<'bar'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (context) =>
                    `${context.dataset.label ?? ''}: ${formatCurrency(Number(context.raw))}`,
            },
        },
    },
    scales: {
        x: { stacked: true, grid: { display: false } },
        y: {
            stacked: true,
            border: { display: false },
            ticks: { callback: (value) => formatCompactCurrency(Number(value)) },
        },
    },
}));

const trendData = computed<ChartData<'line'>>(() => {
    const average = movingAverage(totals.value, MOVING_AVERAGE_WINDOW);

    return {
        labels: labels.value,
        datasets: [
            {
                label: t('analytics.total'),
                data: totals.value,
                borderColor: '#2a78d6',
                backgroundColor: 'rgba(42, 120, 214, 0.12)',
                borderWidth: 2,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
            },
            {
                label: t('analytics.movingAverage', { window: MOVING_AVERAGE_WINDOW }),
                data: average,
                borderColor: '#eb6834',
                borderWidth: 2,
                borderDash: [6, 4],
                fill: false,
                tension: 0.3,
                pointRadius: 0,
                spanGaps: false,
            },
        ],
    };
});

const trendOptions = computed<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: true, position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } },
        tooltip: {
            callbacks: {
                label: (context) =>
                    `${context.dataset.label ?? ''}: ${formatCurrency(context.parsed.y ?? 0)}`,
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

/** Average, highest and lowest bucket totals over the period. */
const stats = computed(() => {
    const raw = series.value.map((point) => point.total);
    if (raw.length === 0) return { average: 0, min: 0, max: 0 };
    const sum = raw.reduce((acc, value) => acc + value, 0);
    return {
        average: sum / raw.length,
        min: Math.min(...raw),
        max: Math.max(...raw),
    };
});

/** Table rows, most recent bucket first, with the change against the previous one. */
const tableRows = computed(() => {
    const counts = new Map<string, number>();
    for (const flow of flows.value) {
        const key = bucketKeyOf(flow.date, filters.value.granularity);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return series.value
        .map((point, index) => {
            const previous = index > 0 ? series.value[index - 1]?.total : undefined;
            return {
                key: point.key,
                label: bucketLabel(point),
                total: point.total,
                count: counts.get(point.key) ?? 0,
                delta:
                    previous === undefined || previous === 0
                        ? null
                        : ((point.total - previous) / previous) * 100,
            };
        })
        .reverse();
});
</script>

<style lang="scss" scoped>
.chart-container {
    position: relative;
    height: 260px;
}

.legend {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
}

.legend-color {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    flex-shrink: 0;
}

.legend-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.legend-value {
    flex-shrink: 0;
}
</style>
