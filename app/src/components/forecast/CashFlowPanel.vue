<template>
    <div class="panel">
        <!-- Horizon and habits -->
        <div class="controls">
            <TabNav v-model="horizonTab" :tabs="horizonTabs" class="controls__horizon" />
            <q-toggle
                v-model="includeDrift"
                dense
                size="sm"
                class="controls__toggle"
                :label="t('cashFlow.includeDrift')"
            />
        </div>

        <!-- Today, the curve, the low point and the end of the horizon -->
        <section class="zk-card">
            <div class="head">
                <span class="zk-caption">{{ t('cashFlow.today') }}</span>
                <span class="zk-amount zk-amount--lg">{{
                    formatCurrency(total.startBalance)
                }}</span>
            </div>
            <div class="chart-container">
                <Line :data="chartData" :options="chartOptions" />
            </div>
            <div class="figures">
                <div class="figure">
                    <span class="zk-caption">
                        {{ t('cashFlow.lowest') }} · {{ formatDay(total.lowest.date) }}
                    </span>
                    <span class="figure__value figure__value--low">
                        {{ formatCurrency(total.lowest.balance) }}
                    </span>
                </div>
                <div class="figure">
                    <span class="zk-caption">
                        {{ t('cashFlow.endOfHorizon', { days: horizonDays }) }}
                    </span>
                    <span class="figure__value">{{ formatCurrency(total.endBalance) }}</span>
                    <span
                        class="figure__delta"
                        :class="
                            total.endBalance < total.startBalance
                                ? 'figure__delta--down'
                                : 'figure__delta--up'
                        "
                    >
                        {{ formatSignedCurrency(total.endBalance - total.startBalance) }}
                    </span>
                </div>
            </div>
            <p class="note">
                <template v-if="includeDrift">
                    {{
                        t('cashFlow.driftNote', {
                            income: formatCurrency(monthlyIncome),
                            amount: formatCurrency(monthlyDrift),
                            months: sampleMonths,
                        })
                    }}
                </template>
                <template v-else>{{ t('cashFlow.scheduledOnly') }}</template>
            </p>
            <div v-if="includeDrift && spendingMonths.length > 0" class="months">
                <span class="zk-caption">{{ t('cashFlow.spendingByMonth') }}</span>
                <div class="months__list">
                    <span
                        v-for="month in spendingMonths"
                        :key="month.date.getTime()"
                        class="months__item"
                    >
                        <span class="months__label">{{ formatMonthShort(month.date) }}</span>
                        <span class="months__value">{{ formatCompactCurrency(month.total) }}</span>
                    </span>
                </div>
            </div>
        </section>

        <!-- Wallets that dip below zero, earliest first -->
        <div v-for="wallet in atRisk" :key="wallet.walletId" class="alert" role="alert">
            <q-icon name="o_warning" size="18px" class="alert__icon" />
            <span>
                {{
                    t('cashFlow.goesNegative', {
                        wallet: walletName(wallet.walletId),
                        date: formatDay(wallet.firstNegative!),
                        amount: formatCurrency(wallet.lowest.balance, wallet.currency),
                    })
                }}
            </span>
        </div>

        <!-- What actually moves, in order -->
        <section class="block">
            <span class="zk-section-title">{{ t('cashFlow.upcoming') }}</span>
            <div v-if="upcomingEvents.length === 0" class="zk-caption">
                {{ t('cashFlow.noEvents') }}
            </div>
            <div v-else class="list">
                <div v-for="event in upcomingEvents" :key="event.id" class="list-row">
                    <span
                        class="zk-tile zk-tile--sm"
                        :class="event.amount < 0 ? 'zk-tile--orange' : 'zk-tile--green'"
                    >
                        <q-icon
                            :name="event.amount < 0 ? 'south_east' : 'north_west'"
                            size="16px"
                        />
                    </span>
                    <span class="list-row__body">
                        <span class="list-row__title">
                            <span class="list-row__name">
                                {{
                                    event.kind === 'habitualIncome'
                                        ? t('cashFlow.habitualIncome')
                                        : event.label || walletName(event.walletId)
                                }}
                            </span>
                            <span
                                v-if="event.kind === 'habitualIncome'"
                                class="zk-pill list-row__pill"
                            >
                                {{ t('cashFlow.estimated') }}
                            </span>
                        </span>
                        <span class="list-row__meta">
                            {{ formatDay(event.date) }} · {{ walletName(event.walletId) }} ·
                            {{
                                event.kind === 'habitualIncome'
                                    ? t('cashFlow.fromHistory')
                                    : t('cashFlow.fromRecurring')
                            }}
                        </span>
                    </span>
                    <span
                        class="list-row__amount"
                        :class="event.amount < 0 ? 'list-row__amount--out' : 'list-row__amount--in'"
                    >
                        {{ formatSignedCurrency(event.amount, currencyOf(event.walletId)) }}
                    </span>
                </div>
            </div>
        </section>

        <!-- Wallet by wallet -->
        <section class="block">
            <span class="zk-section-title">{{ t('cashFlow.byWallet') }}</span>
            <div class="list">
                <div v-for="wallet in projection.wallets" :key="wallet.walletId" class="list-row">
                    <span class="list-row__body">
                        <span class="list-row__title">{{ walletName(wallet.walletId) }}</span>
                        <span class="list-row__meta">
                            {{ t('cashFlow.lowest') }} ·
                            {{ formatCurrency(wallet.lowest.balance, wallet.currency) }} ·
                            {{ formatDay(wallet.lowest.date) }}
                        </span>
                    </span>
                    <span class="list-row__side">
                        <span
                            class="list-row__amount"
                            :class="{ 'list-row__amount--out': wallet.firstNegative }"
                        >
                            {{ formatCurrency(wallet.endBalance, wallet.currency) }}
                        </span>
                        <span class="list-row__meta">
                            {{
                                formatSignedCurrency(
                                    wallet.endBalance - wallet.startBalance,
                                    wallet.currency,
                                )
                            }}
                        </span>
                    </span>
                </div>
            </div>
        </section>
    </div>
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
import { HORIZON_OPTIONS, useCashFlow } from 'src/composables/useCashFlow';
import TabNav from '../tabs/TabNav.vue';

ChartJS.register(CategoryScale, Filler, LineElement, LinearScale, PointElement, Tooltip);

/** Events listed under the curve. */
const MAX_LISTED_EVENTS = 20;

const { t, locale } = useI18n();
const walletStore = useWalletStore();
const { formatCurrency, formatSignedCurrency, formatCompactCurrency } = useCurrency();
const {
    projection,
    horizonDays,
    includeDrift,
    monthlyDrift,
    monthlyIncome,
    sampleMonths,
    spendingMonths,
    loadAll,
} = useCashFlow();

onMounted(async () => {
    await loadAll();
});

const total = computed(() => projection.value.total);

const horizonTabs = computed(() =>
    HORIZON_OPTIONS.map((days) => ({ label: t('cashFlow.days', { days }), value: String(days) })),
);

/** TabNav works on strings, the horizon is a number of days. */
const horizonTab = computed({
    get: () => String(horizonDays.value),
    set: (value: string) => (horizonDays.value = Number(value)),
});

const atRisk = computed(() =>
    projection.value.wallets
        .filter((wallet: WalletForecast) => wallet.firstNegative !== null)
        .sort(
            (a: WalletForecast, b: WalletForecast) =>
                a.firstNegative!.getTime() - b.firstNegative!.getTime(),
        ),
);

/** Every expected movement of the horizon, chronological. */
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

/**
 * Formats a sampled month.
 * @param date - First day of the month
 * @returns The localized short month
 */
function formatMonthShort(date: Date): string {
    return new Intl.DateTimeFormat(locale.value, { month: 'short' }).format(date);
}

const chartData = computed<ChartData<'line'>>(() => ({
    labels: total.value.points.map((point) => formatDay(point.date)),
    datasets: [
        {
            label: t('cashFlow.projection'),
            data: total.value.points.map((point) => point.balance),
            borderColor: '#0B6E5F',
            backgroundColor: 'rgba(213, 236, 230, 0.6)',
            borderWidth: 2.5,
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
            border: { display: false },
            ticks: { color: '#5B6661', font: { size: 11 }, maxTicksLimit: 5, autoSkip: true },
        },
        y: {
            // Zero must always be visible: the whole point is seeing the dip.
            suggestedMin: Math.min(0, total.value.lowest.balance),
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
</script>

<style lang="scss" scoped>
.panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.controls {
    display: flex;
    align-items: center;
    gap: 12px;

    &__horizon {
        flex: 1;
        min-width: 0;

        :deep(.q-tab) {
            min-width: 0;
            padding: 0 6px;
        }
    }

    &__toggle {
        flex-shrink: 0;
        white-space: nowrap;
        font-size: 13px;
        font-weight: 600;
        color: $text-secondary;
    }
}

.head {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.chart-container {
    height: 180px;
}

.figures {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    border-top: 1px solid $border-light;
    padding-top: 12px;
}

.figure {
    display: flex;
    flex-direction: column;
    gap: 2px;

    &__value {
        font-size: 16px;
        font-weight: 800;

        &--low {
            color: $amber;
        }
    }

    &__delta {
        font-size: 12px;
        font-weight: 600;

        &--up {
            color: $primary;
        }

        &--down {
            color: $negative;
        }
    }
}

.note {
    margin: 0;
    border-top: 1px solid $border-light;
    padding-top: 12px;
    font-size: 12px;
    line-height: 1.5;
    color: $text-secondary;
}

.months {
    display: flex;
    flex-direction: column;
    gap: 8px;

    &__list {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
    }

    &__item {
        display: flex;
        flex-direction: column;
        gap: 2px;
        background: $grey-soft;
        border-radius: 12px;
        padding: 8px 10px;
    }

    &__label {
        font-size: 11px;
        color: $text-secondary;
    }

    &__value {
        font-size: 13px;
        font-weight: 700;
    }
}

.alert {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    background: $negative-soft;
    border-radius: 16px;
    padding: 12px 14px;
    font-size: 13px;
    line-height: 1.5;
    color: #5c2410;

    &__icon {
        flex-shrink: 0;
        margin-top: 1px;
    }
}

.block {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .zk-section-title {
        padding-left: 4px;
    }
}

.list {
    background: $bg-card;
    border-radius: 20px;
    padding: 4px 14px;
}

.list-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;

    & + & {
        border-top: 1px solid $border-light;
    }

    &__body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    &__title {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        font-size: 14px;
        font-weight: 600;
    }

    &__name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__pill {
        flex-shrink: 0;
    }

    &__meta {
        font-size: 12px;
        color: $text-secondary;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__side {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
    }

    &__amount {
        font-size: 14px;
        font-weight: 700;
        white-space: nowrap;

        &--in {
            color: $primary;
        }

        &--out {
            color: $negative;
        }
    }
}
</style>
