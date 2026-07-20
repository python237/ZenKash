<template>
    <q-page class="q-pa-md">
        <!-- Total Net Worth Card -->
        <q-card class="networth-card bg-dark text-white q-mb-md" flat>
            <q-card-section class="q-pa-md">
                <div class="text-caption text-grey-5">{{ t('netWorth.total') }}</div>
                <div class="text-h4 text-weight-bold q-mt-xs">{{ formatCurrency(current.total) }}</div>
                <div v-if="delta" class="text-caption q-mt-xs" :class="deltaClass">
                    <q-icon :name="delta.amount >= 0 ? 'trending_up' : 'trending_down'" size="14px" />
                    {{ formatSignedCurrency(delta.amount) }} ({{ formatPercent(delta.percent) }})
                    <span class="text-grey-5">{{ t('netWorth.vsPrevious') }}</span>
                </div>
            </q-card-section>
        </q-card>

        <!-- Evolution Chart -->
        <q-card class="q-mb-md" flat bordered>
            <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">
                    {{ t('netWorth.evolution') }}
                </div>
                <div v-if="chartPoints.length < 2" class="text-center text-grey-6 q-py-lg">
                    {{ t('netWorth.noData') }}
                </div>
                <div v-else class="chart-container">
                    <Line :data="chartData" :options="chartOptions" />
                </div>
            </q-card-section>
        </q-card>

        <!-- Breakdown -->
        <q-card class="q-mb-md" flat bordered>
            <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">
                    {{ t('netWorth.breakdown') }}
                </div>
                <div v-for="item in breakdown" :key="item.key" class="breakdown-item q-mb-sm">
                    <div class="row items-center justify-between q-mb-xs">
                        <span class="text-body2">{{ item.label }}</span>
                        <span class="text-body2 text-weight-medium">
                            {{ formatCurrency(item.value) }} · {{ formatPercent(item.percent) }}
                        </span>
                    </div>
                    <q-linear-progress
                        :value="item.percent / 100"
                        :color="item.color"
                        track-color="grey-3"
                        rounded
                        size="8px"
                    />
                </div>
            </q-card-section>
        </q-card>

        <!-- History -->
        <q-card flat bordered>
            <q-card-section>
                <div class="row items-center justify-between q-mb-sm">
                    <div class="text-subtitle1 text-weight-medium">{{ t('netWorth.history') }}</div>
                    <BtnPrimary
                        :label="t('netWorth.captureNow')"
                        icon="add_chart"
                        :loading="netWorthStore.isLoading"
                        @click="capture"
                    />
                </div>
                <div v-if="history.length === 0" class="text-center text-grey-6 q-py-md">
                    {{ t('netWorth.noHistory') }}
                </div>
                <q-list v-else separator>
                    <q-item v-for="snapshot in history" :key="snapshot.id">
                        <q-item-section>
                            <q-item-label class="text-capitalize">{{
                                formatPeriod(snapshot.period)
                            }}</q-item-label>
                            <q-item-label caption>
                                {{ t('netWorth.liquid') }} {{ formatCurrency(snapshot.liquid) }} ·
                                {{ t('netWorth.investments') }}
                                {{ formatCurrency(snapshot.investments) }}
                            </q-item-label>
                        </q-item-section>
                        <q-item-section side>
                            <q-item-label class="text-weight-bold text-primary">{{
                                formatCurrency(snapshot.total)
                            }}</q-item-label>
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-card-section>
        </q-card>
    </q-page>
</template>

<script setup lang="ts">
import { Line } from 'vue-chartjs';
import {
    Chart as ChartJS,
    LineElement,
    PointElement,
    LinearScale,
    CategoryScale,
    Tooltip,
    Legend,
    Filler,
    type ChartData,
    type ChartOptions,
} from 'chart.js';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import type { NetWorthComponents } from 'src/types/net-worth-snapshot';
import { useNetWorthStore } from 'src/stores/net-worth';
import BtnPrimary from 'src/components/buttons/BtnPrimary.vue';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

const { t, locale } = useI18n();
usePage({ title: t('netWorth.title'), showHeader: true, showBack: true });

const netWorthStore = useNetWorthStore();
const walletStore = useWalletStore();
const investmentStore = useInvestmentStore();
const exchangeRateStore = useExchangeRateStore();
const settingsStore = useSettingsStore();

const defaultCurrency = computed(() => settingsStore.defaultCurrency ?? CurrencyCode.XOF);
const currencyInfo = computed(() => CURRENCIES[defaultCurrency.value]);

/**
 * Formats an amount as a localized currency string.
 * @param amount - The amount to format
 * @returns The formatted currency string
 */
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: defaultCurrency.value,
        minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
        maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
    }).format(amount);
}

/**
 * Formats an amount with an explicit sign prefix.
 * @param amount - The amount to format
 * @returns The signed currency string
 */
function formatSignedCurrency(amount: number): string {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}${formatCurrency(amount)}`;
}

/**
 * Formats a percentage value.
 * @param value - The percentage value
 * @returns The formatted percentage string
 */
function formatPercent(value: number): string {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
}

/**
 * Formats a "YYYY-MM" period as a localized month/year label.
 * @param period - The period key
 * @returns The formatted label
 */
function formatPeriod(period: string): string {
    const [year, month] = period.split('-').map(Number);
    const date = new Date(year ?? 2024, (month ?? 1) - 1);
    return new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' }).format(date);
}

// Current components (latest snapshot, or live computation as fallback)
const current = computed<NetWorthComponents>(() => {
    const latest = netWorthStore.latest;
    if (latest) {
        return {
            liquid: latest.liquid,
            investments: latest.investments,
            games: latest.games,
            total: latest.total,
        };
    }
    return netWorthStore.computeCurrent();
});

const delta = computed(() => netWorthStore.deltaVsPrevious);
const deltaClass = computed(() =>
    (delta.value?.amount ?? 0) >= 0 ? 'text-green-4' : 'text-red-4',
);

// Breakdown bars
const breakdown = computed(() => {
    const total = current.value.total || 1;
    return [
        {
            key: 'liquid',
            label: t('netWorth.liquid'),
            value: current.value.liquid,
            percent: (current.value.liquid / total) * 100,
            color: 'primary',
        },
        {
            key: 'investments',
            label: t('netWorth.investments'),
            value: current.value.investments,
            percent: (current.value.investments / total) * 100,
            color: 'teal',
        },
        {
            key: 'games',
            label: t('netWorth.games'),
            value: current.value.games,
            percent: (current.value.games / total) * 100,
            color: 'deep-orange',
        },
    ].filter((b) => b.value !== 0);
});

// Chart
const chartPoints = computed(() => netWorthStore.series(12));

const chartData = computed<ChartData<'line'>>(() => ({
    labels: chartPoints.value.map((s) => formatPeriod(s.period)),
    datasets: [
        {
            label: t('netWorth.total'),
            data: chartPoints.value.map((s) => s.total),
            borderColor: '#4CAF50',
            backgroundColor: 'rgba(76, 175, 80, 0.15)',
            fill: true,
            tension: 0.3,
            pointRadius: 3,
        },
    ],
}));

const chartOptions = computed<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (ctx) => formatCurrency(ctx.parsed.y ?? 0),
            },
        },
    },
    scales: {
        y: {
            ticks: {
                callback: (value) => formatCurrency(Number(value)),
            },
        },
    },
}));

// History (most recent first)
const history = computed(() => [...netWorthStore.snapshots].reverse());

/**
 * Captures a fresh net worth snapshot for the current month.
 * @returns Promise that resolves when the snapshot is captured
 */
async function capture(): Promise<void> {
    await netWorthStore.captureCurrent();
}

onMounted(async () => {
    await Promise.all([
        settingsStore.loadSettings(),
        walletStore.loadAll(),
        investmentStore.loadAll(),
        exchangeRateStore.loadAll(),
        netWorthStore.loadAll(),
    ]);
    // Refresh the current month snapshot when opening the page
    await netWorthStore.captureCurrent();
});
</script>

<style lang="scss" scoped>
.networth-card {
    border-radius: 16px;
}

.chart-container {
    position: relative;
    height: 240px;
}

.breakdown-item {
    width: 100%;
}
</style>
