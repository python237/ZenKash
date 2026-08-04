<template>
    <div class="breakdown-doughnut">
        <Doughnut :data="chartData" :options="chartOptions" />
        <div class="doughnut-center">
            <div class="text-caption text-grey-6">{{ centerLabel }}</div>
            <div class="text-subtitle1 text-weight-bold">{{ formatCurrency(total) }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Doughnut } from 'vue-chartjs';
import { Chart as ChartJS, ArcElement, Tooltip, type ChartData, type ChartOptions } from 'chart.js';
import type { BreakdownRow } from 'src/types/analytics';
import { CHART_SURFACE } from 'src/services/chart';
import { useCurrency } from 'src/composables/useCurrency';

ChartJS.register(ArcElement, Tooltip);

const props = defineProps<{
    /** Rows to plot, largest first */
    rows: BreakdownRow[];
    /** Label shown above the total in the center of the ring */
    centerLabel: string;
}>();

const { formatCurrency, formatPercent } = useCurrency();

const total = computed(() => props.rows.reduce((sum, row) => sum + row.amount, 0));

const chartData = computed<ChartData<'doughnut'>>(() => ({
    labels: props.rows.map((row) => row.name),
    datasets: [
        {
            data: props.rows.map((row) => row.amount),
            backgroundColor: props.rows.map((row) => row.color),
            // A surface-colored gap keeps adjacent segments readable without borders.
            borderColor: CHART_SURFACE,
            borderWidth: 2,
            hoverOffset: 6,
        },
    ],
}));

const chartOptions = computed<ChartOptions<'doughnut'>>(() => ({
    responsive: true,
    maintainAspectRatio: true,
    cutout: '62%',
    plugins: {
        // The breakdown list below the chart doubles as legend and table.
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (context) => {
                    const value = Number(context.raw);
                    const share = total.value > 0 ? (value / total.value) * 100 : 0;
                    return `${context.label}: ${formatCurrency(value)} (${formatPercent(share)})`;
                },
            },
        },
    },
}));
</script>

<style lang="scss" scoped>
.breakdown-doughnut {
    position: relative;
    max-width: 240px;
    margin: 0 auto;
}

.doughnut-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
    max-width: 55%;
}
</style>
