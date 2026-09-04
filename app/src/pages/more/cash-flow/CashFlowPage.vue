<template>
    <q-page class="q-pa-md">
        <!-- Horizon -->
        <div class="row items-center justify-between q-mb-md">
            <q-btn-toggle
                v-model="horizonDays"
                :options="horizonOptions"
                dense
                unelevated
                no-caps
                toggle-color="primary"
                color="grey-2"
                text-color="grey-8"
            />
            <q-toggle
                v-model="includeDrift"
                dense
                size="sm"
                :label="t('cashFlow.includeDrift')"
            />
        </div>

        <!-- Headline: today, the low point, the end of the horizon -->
        <q-card flat bordered class="summary q-mb-md">
            <q-card-section>
                <div class="text-caption text-grey-6">{{ t('cashFlow.today') }}</div>
                <div class="text-h5 text-weight-medium">
                    {{ formatCurrency(total.startBalance) }}
                </div>

                <div class="row q-mt-md q-col-gutter-md">
                    <div class="col">
                        <div class="text-caption text-grey-6">{{ t('cashFlow.lowest') }}</div>
                        <div
                            class="text-subtitle2 text-weight-medium"
                            :class="total.lowest.balance < 0 ? 'text-negative' : ''"
                        >
                            {{ formatCurrency(total.lowest.balance) }}
                        </div>
                        <div class="text-caption text-grey-6">
                            {{ formatDay(total.lowest.date) }}
                        </div>
                    </div>
                    <div class="col">
                        <div class="text-caption text-grey-6">
                            {{ t('cashFlow.endOfHorizon', { days: horizonDays }) }}
                        </div>
                        <div
                            class="text-subtitle2 text-weight-medium"
                            :class="total.endBalance < total.startBalance ? 'text-warning' : 'text-positive'"
                        >
                            {{ formatCurrency(total.endBalance) }}
                        </div>
                        <div class="text-caption text-grey-6">
                            {{ formatSignedCurrency(total.endBalance - total.startBalance) }}
                        </div>
                    </div>
                </div>

                <div v-if="includeDrift" class="text-caption text-grey-6 q-mt-sm">
                    {{ t('cashFlow.driftNote', { amount: formatCurrency(monthlyDrift) }) }}
                </div>
                <div v-else class="text-caption text-grey-6 q-mt-sm">
                    {{ t('cashFlow.scheduledOnly') }}
                </div>
            </q-card-section>
        </q-card>

        <!-- The runway -->
        <q-card flat bordered class="q-mb-md">
            <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-sm">
                    {{ t('cashFlow.projection') }}
                </div>
                <div class="chart-container">
                    <Line :data="chartData" :options="chartOptions" />
                </div>
            </q-card-section>
        </q-card>

        <!-- Wallets that dip below zero, worst first -->
        <q-card v-if="atRisk.length > 0" flat bordered class="at-risk q-mb-md">
            <q-card-section>
                <div class="row items-center q-gutter-xs q-mb-sm">
                    <q-icon name="warning" color="negative" size="20px" />
                    <div class="text-subtitle2 text-weight-medium">
                        {{ t('cashFlow.atRisk') }}
                    </div>
                </div>
                <div v-for="wallet in atRisk" :key="wallet.walletId" class="text-body2 q-mb-xs">
                    {{ t('cashFlow.goesNegative', {
                        wallet: walletName(wallet.walletId),
                        date: formatDay(wallet.firstNegative!),
                        amount: formatCurrency(wallet.lowest.balance, wallet.currency),
                    }) }}
                </div>
            </q-card-section>
        </q-card>

        <!-- Wallet by wallet -->
        <div class="text-subtitle2 text-weight-medium q-mb-sm">{{ t('cashFlow.byWallet') }}</div>
        <q-card flat bordered class="q-mb-md">
            <q-list separator>
                <q-item v-for="wallet in projection.wallets" :key="wallet.walletId">
                    <q-item-section>
                        <q-item-label>{{ walletName(wallet.walletId) }}</q-item-label>
                        <q-item-label caption>
                            {{ t('cashFlow.lowest') }}:
                            {{ formatCurrency(wallet.lowest.balance, wallet.currency) }} ·
                            {{ formatDay(wallet.lowest.date) }}
                        </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <div
                            class="text-weight-medium"
                            :class="wallet.firstNegative ? 'text-negative' : ''"
                        >
                            {{ formatCurrency(wallet.endBalance, wallet.currency) }}
                        </div>
                        <div class="text-caption text-grey-6">
                            {{ formatSignedCurrency(wallet.endBalance - wallet.startBalance, wallet.currency) }}
                        </div>
                    </q-item-section>
                </q-item>
            </q-list>
        </q-card>

        <!-- What actually moves, in order -->
        <div class="text-subtitle2 text-weight-medium q-mb-sm">{{ t('cashFlow.upcoming') }}</div>
        <div v-if="upcomingEvents.length === 0" class="text-caption text-grey-6 q-mb-md">
            {{ t('cashFlow.noEvents') }}
        </div>
        <q-card v-else flat bordered>
            <q-list separator>
                <q-item v-for="event in upcomingEvents" :key="event.id">
                    <q-item-section avatar class="event-icon">
                        <q-icon
                            :name="event.amount < 0 ? 'south_west' : 'north_east'"
                            :color="event.amount < 0 ? 'negative' : 'positive'"
                            size="18px"
                        />
                    </q-item-section>
                    <q-item-section>
                        <q-item-label>{{ event.label || walletName(event.walletId) }}</q-item-label>
                        <q-item-label caption>
                            {{ formatDay(event.date) }} · {{ walletName(event.walletId) }}
                        </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <div :class="event.amount < 0 ? 'text-negative' : 'text-positive'">
                            {{ formatSignedCurrency(event.amount, currencyOf(event.walletId)) }}
                        </div>
                    </q-item-section>
                </q-item>
            </q-list>
        </q-card>
    </q-page>
</template>

<script setup lang="ts">
import { Line } from 'vue-chartjs';
import {
    Chart as ChartJS,
    CategoryScale,
    Filler,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
    type ChartData,
    type ChartOptions,
} from 'chart.js';
import type { CurrencyCode } from 'src/types/currency';
import type { ForecastEvent, WalletForecast } from 'src/types/cash-flow';
import { colorAt } from 'src/services/chart';
import { HORIZON_OPTIONS, useCashFlow } from 'src/composables/useCashFlow';

ChartJS.register(CategoryScale, Filler, LineElement, LinearScale, PointElement, Tooltip);

/** Events listed under the curve. */
const MAX_LISTED_EVENTS = 20;

const { t, locale } = useI18n();
usePage({ title: t('cashFlow.title'), showHeader: true, showBack: true });

const walletStore = useWalletStore();
const { formatCurrency, formatSignedCurrency, formatCompactCurrency } = useCurrency();
const { projection, horizonDays, includeDrift, monthlyDrift, loadAll } = useCashFlow();

onMounted(async () => {
    await loadAll();
});

const total = computed(() => projection.value.total);

const horizonOptions = computed(() =>
    HORIZON_OPTIONS.map((days) => ({ label: t('cashFlow.days', { days }), value: days })),
);

const atRisk = computed(() =>
    projection.value.wallets
        .filter((wallet: WalletForecast) => wallet.firstNegative !== null)
        .sort(
            (a: WalletForecast, b: WalletForecast) =>
                a.firstNegative!.getTime() - b.firstNegative!.getTime(),
        ),
);

/** Every scheduled movement of the horizon, chronological. */
const upcomingEvents = computed<ForecastEvent[]>(() =>
    projection.value.wallets
        .flatMap((wallet: WalletForecast) => wallet.events)
        .sort((a: ForecastEvent, b: ForecastEvent) => a.date.getTime() - b.date.getTime())
        .slice(0, MAX_LISTED_EVENTS),
);

/**
 * Resolves a wallet name.
 * @param walletId - The wallet identifier
 * @returns The wallet name, or a placeholder when it was deleted
 */
function walletName(walletId: string): string {
    return walletStore.getWalletById(walletId)?.name ?? t('common.noData');
}

/**
 * Resolves the currency an event's amount is expressed in.
 * @param walletId - The wallet identifier
 * @returns The wallet currency
 */
function currencyOf(walletId: string): CurrencyCode | undefined {
    return walletStore.getWalletById(walletId)?.currency;
}

/**
 * Formats a day of the horizon.
 * @param date - The day to format
 * @returns The localized short date
 */
function formatDay(date: Date): string {
    return new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' }).format(date);
}

/** One label per day, thinned out so the axis stays readable. */
const chartData = computed<ChartData<'line'>>(() => ({
    labels: total.value.points.map((point) => formatDay(point.date)),
    datasets: [
        {
            label: t('cashFlow.projection'),
            data: total.value.points.map((point) => point.balance),
            borderColor: colorAt(0),
            backgroundColor: 'rgba(13, 148, 136, 0.12)',
            borderWidth: 2,
            pointRadius: 0,
            tension: 0.2,
            fill: true,
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
                label: (item) => formatCurrency(Number(item.parsed.y ?? 0)),
            },
        },
    },
    scales: {
        x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 6, autoSkip: true },
        },
        y: {
            // Zero must always be visible: the whole point is seeing the dip.
            suggestedMin: Math.min(0, total.value.lowest.balance),
            ticks: { callback: (value) => formatCompactCurrency(Number(value)) },
        },
    },
}));
</script>

<style lang="scss" scoped>
.summary,
.at-risk {
    border-radius: 12px;
}

.at-risk {
    border-left: 3px solid $negative;
}

.chart-container {
    height: 220px;
}

.event-icon {
    min-width: 32px;
    padding-right: 0;
}
</style>
