<template>
    <q-page class="zk-page">
        <!-- Net worth + evolution -->
        <section class="zk-card">
            <div class="total">
                <span class="zk-caption">{{ t('netWorth.total') }}</span>
                <span class="zk-amount zk-amount--lg">{{ formatCurrency(current.total) }}</span>
                <span v-if="delta" class="total__delta" :class="deltaClass">
                    {{ formatSignedCurrency(delta.amount) }} · {{ formatPercent(delta.percent) }}
                    {{ t('netWorth.vsPrevious') }}
                </span>
            </div>
            <div v-if="chartPoints.length < 2" class="zk-caption text-center q-py-md">
                {{ t('netWorth.noData') }}
            </div>
            <div v-else class="chart-container">
                <Line :data="chartData" :options="chartOptions" />
            </div>
        </section>

        <!-- Composition -->
        <section class="zk-card">
            <h2 class="zk-section-title">{{ t('netWorth.breakdown') }}</h2>
            <div class="stack-bar" aria-hidden="true">
                <div
                    v-for="item in assetItems"
                    :key="item.key"
                    :style="{ width: `${item.percent}%`, background: item.color }"
                />
            </div>
            <div class="legend">
                <component
                    :is="item.route ? 'router-link' : 'div'"
                    v-for="item in assetItems"
                    :key="item.key"
                    :to="item.route ? { name: item.route } : undefined"
                    class="legend__row"
                    :class="{ 'legend__row--link': item.route }"
                >
                    <span class="legend__dot" :style="{ background: item.color }" />
                    <span class="legend__label">{{ item.label }}</span>
                    <span class="legend__value">{{ formatCurrency(item.value) }}</span>
                    <q-icon
                        v-if="item.route"
                        name="chevron_right"
                        size="18px"
                        class="legend__chevron"
                    />
                </component>
                <template v-if="current.payables > 0">
                    <div class="legend__divider" />
                    <router-link :to="{ name: 'debts' }" class="legend__row legend__row--link">
                        <span class="legend__dot legend__dot--outline" />
                        <span class="legend__label">{{ t('netWorth.payables') }}</span>
                        <span class="legend__value text-negative">
                            −{{ formatCurrency(current.payables) }}
                        </span>
                        <q-icon name="chevron_right" size="18px" class="legend__chevron" />
                    </router-link>
                </template>
            </div>
        </section>

        <!-- Shortcuts to asset sections -->
        <nav class="shortcuts" :aria-label="t('netWorth.sections')">
            <router-link
                v-for="shortcut in shortcuts"
                :key="shortcut.name"
                :to="{ name: shortcut.name }"
                class="shortcut"
            >
                <span class="zk-tile zk-tile--sm" :class="`zk-tile--${shortcut.tone}`">
                    <q-icon :name="shortcut.icon" size="20px" />
                </span>
                <span class="shortcut__label">{{ shortcut.label }}</span>
                <span class="shortcut__value">{{ shortcut.value }}</span>
            </router-link>
        </nav>

        <!-- History -->
        <section class="zk-card">
            <div class="zk-section-head">
                <h2 class="zk-section-title">{{ t('netWorth.history') }}</h2>
                <button
                    type="button"
                    class="zk-link"
                    :disabled="netWorthStore.isLoading"
                    @click="capture"
                >
                    {{ t('netWorth.captureNow') }}
                </button>
            </div>
            <div v-if="history.length === 0" class="zk-caption text-center q-py-md">
                {{ t('netWorth.noHistory') }}
            </div>
            <div v-for="snapshot in history" :key="snapshot.id" class="history-row">
                <div class="history-row__body">
                    <span class="history-row__period">{{ formatPeriod(snapshot.period) }}</span>
                    <span class="zk-caption">
                        {{ t('netWorth.liquid') }} {{ formatCurrency(snapshot.liquid) }} ·
                        {{ t('netWorth.investments') }}
                        {{ formatCurrency(snapshot.investments) }}
                        <template v-if="snapshot.payables > 0">
                            · {{ t('netWorth.payables') }}
                            {{ formatCurrency(snapshot.payables) }}
                        </template>
                    </span>
                </div>
                <span class="history-row__total">{{ formatCurrency(snapshot.total) }}</span>
            </div>
        </section>
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
import type { NetWorthComponents } from 'src/types/net-worth-snapshot';
import { useNetWorthStore } from 'src/stores/net-worth';
import { useCurrency } from 'src/composables/useCurrency';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

const { t, locale } = useI18n();
usePage({ title: t('netWorth.title'), showHeader: true });

const netWorthStore = useNetWorthStore();
const walletStore = useWalletStore();
const investmentStore = useInvestmentStore();
const exchangeRateStore = useExchangeRateStore();
const settingsStore = useSettingsStore();
const debtStore = useDebtStore();
const projectStore = useProjectStore();

// Currency formatting and conversion (shared with every other money screen)
const {
    formatCurrency,
    formatSignedCurrency,
    formatCompactCurrency,
    formatPercent: formatPercentValue,
} = useCurrency();

/**
 * Formats a percentage value with an explicit sign on gains.
 * @param value - The percentage value
 * @returns The formatted percentage string
 */
function formatPercent(value: number): string {
    return formatPercentValue(value, { signed: true });
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
            receivables: latest.receivables,
            payables: latest.payables,
            total: latest.total,
        };
    }
    return netWorthStore.computeCurrent();
});

const delta = computed(() => netWorthStore.deltaVsPrevious);
const deltaClass = computed(() =>
    (delta.value?.amount ?? 0) >= 0 ? 'text-positive' : 'text-negative',
);

// Composition of gross assets. Shares are relative to gross assets: debts make
// the net total smaller than the sum of its parts, so it is not a usable denominator.
const assetItems = computed(() => {
    const { liquid, investments, games, receivables } = current.value;
    const assets = liquid + investments + games + receivables || 1;
    return [
        {
            key: 'liquid',
            label: t('netWorth.liquid'),
            value: liquid,
            color: '#0B6E5F',
            route: 'wallets',
        },
        {
            key: 'investments',
            label: t('netWorth.investments'),
            value: investments,
            color: '#2F4A9A',
            route: 'investments',
        },
        {
            key: 'games',
            label: t('netWorth.games'),
            value: games,
            color: '#8A5A00',
            route: 'games',
        },
        {
            key: 'receivables',
            label: t('netWorth.receivables'),
            value: receivables,
            color: '#7FB8AC',
            route: 'debts',
        },
    ]
        .filter((b) => b.value > 0)
        .map((b) => ({ ...b, percent: (b.value / assets) * 100 }));
});

// Sections grouped under the net worth tab
const shortcuts = computed(() => {
    const projectsInvested = projectStore.projects.reduce((sum, p) => sum + p.totalInvested, 0);
    const { receivables, payables } = current.value;
    return [
        {
            name: 'investments',
            label: t('nav.investments'),
            icon: 'trending_up',
            tone: 'blue',
            value: formatCurrency(investmentStore.summary.totalCurrentValue),
        },
        {
            name: 'projects',
            label: t('nav.projects'),
            icon: 'o_business_center',
            tone: 'green',
            value: formatCurrency(projectsInvested),
        },
        {
            name: 'debts',
            label: t('debts.title'),
            icon: 'o_handshake',
            tone: 'amber',
            value: formatSignedCurrency(receivables - payables),
        },
        {
            name: 'games',
            label: t('games.title'),
            icon: 'o_casino',
            tone: 'orange',
            value: formatCurrency(current.value.games),
        },
    ];
});

// Chart
const chartPoints = computed(() => netWorthStore.series(12));

const chartData = computed<ChartData<'line'>>(() => ({
    labels: chartPoints.value.map((s) => formatPeriod(s.period)),
    datasets: [
        {
            label: t('netWorth.total'),
            data: chartPoints.value.map((s) => s.total),
            borderColor: '#0B6E5F',
            backgroundColor: 'rgba(213, 236, 230, 0.6)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 0,
            pointHoverRadius: 4,
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
        x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: '#5B6661', font: { size: 11 } },
        },
        y: {
            grid: { color: '#EEF2EF' },
            border: { display: false },
            ticks: {
                color: '#5B6661',
                font: { size: 11 },
                maxTicksLimit: 4,
                callback: (value) => formatCompactCurrency(Number(value)),
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
        debtStore.loadAll(),
        projectStore.loadAll(),
    ]);
    // Refresh the current month snapshot when opening the page
    await netWorthStore.captureCurrent();
});
</script>

<style lang="scss" scoped>
.total {
    display: flex;
    flex-direction: column;
    gap: 4px;

    &__delta {
        font-size: 13px;
        font-weight: 600;
    }
}

.chart-container {
    position: relative;
    height: 160px;
}

.stack-bar {
    display: flex;
    gap: 2px;
    height: 12px;
    border-radius: 999px;
    overflow: hidden;
    background: $grey-soft;
}

.legend {
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 14px;

    &__row {
        display: flex;
        align-items: center;
        gap: 10px;
        color: $text-primary;
        text-decoration: none;

        &--link {
            min-height: 32px;
        }
    }

    &__chevron {
        margin-left: -4px;
        color: $text-muted;
    }

    &__dot {
        width: 10px;
        height: 10px;
        border-radius: 3px;
        flex-shrink: 0;

        &--outline {
            border: 2px solid $negative;
        }
    }

    &__label {
        flex: 1;
        font-weight: 600;
    }

    &__value {
        font-weight: 700;
    }

    &__divider {
        height: 1px;
        background: $border-light;
    }
}

.shortcuts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.shortcut {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px;
    border-radius: $radius-tile;
    background: $bg-card;
    color: $text-primary;
    text-decoration: none;
    min-width: 0;

    &__label {
        font-size: 13px;
        font-weight: 700;
    }

    &__value {
        margin-top: -4px;
        font-size: 12px;
        font-weight: 600;
        color: $text-secondary;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

.history-row {
    display: flex;
    align-items: center;
    gap: 12px;

    & + & {
        padding-top: 12px;
        border-top: 1px solid $border-light;
    }

    &__body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    &__period {
        font-size: 14px;
        font-weight: 600;
        text-transform: capitalize;
    }

    &__total {
        font-size: 14px;
        font-weight: 700;
        color: $primary;
    }
}
</style>
