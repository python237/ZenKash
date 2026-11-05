<template>
    <div class="panel">
        <!-- Not enough history yet -->
        <template v-if="!isReady">
            <section class="zk-card empty">
                <span class="empty__icon">
                    <q-icon name="o_insights" size="30px" />
                </span>
                <span class="empty__title">{{ t('forecast.emptyTitle') }}</span>
                <span class="empty__text">
                    {{
                        t('forecast.emptyText', {
                            min: MIN_HISTORY_MONTHS,
                            missing: MIN_HISTORY_MONTHS - historyMonths,
                            month: readyMonth,
                        })
                    }}
                </span>
                <div class="months">
                    <div
                        class="months__bar"
                        role="progressbar"
                        :aria-label="t('forecast.historyProgress')"
                        aria-valuemin="0"
                        :aria-valuemax="MIN_HISTORY_MONTHS"
                        :aria-valuenow="historyMonths"
                    >
                        <span
                            v-for="step in progressSteps"
                            :key="step.label"
                            class="months__step"
                            :class="{ 'months__step--done': step.done }"
                        />
                    </div>
                    <div class="months__labels">
                        <span v-for="step in progressSteps" :key="step.label">{{
                            step.label
                        }}</span>
                    </div>
                </div>
            </section>

            <section class="zk-card tips">
                <span class="tips__title">{{ t('forecast.tipsTitle') }}</span>
                <span class="tip">
                    <q-icon name="check" size="18px" class="tip__icon" />
                    {{ t('forecast.tipIncome') }}
                </span>
                <router-link to="/recurring" class="tip">
                    <q-icon name="check" size="18px" class="tip__icon" />
                    {{ t('forecast.tipRecurring') }}
                </router-link>
                <router-link to="/assets" class="tip">
                    <q-icon name="check" size="18px" class="tip__icon" />
                    {{ t('forecast.tipAssets') }}
                </router-link>
            </section>

            <q-btn
                unelevated
                no-caps
                color="dark"
                class="zk-cta"
                :label="t('forecast.seeCashFlow')"
                @click="emit('show-cash-flow')"
            />
        </template>

        <template v-else>
            <!-- Horizon and reference window -->
            <div class="controls">
                <div class="controls__row">
                    <span class="controls__label">{{ t('forecast.horizon') }}</span>
                    <TabNav v-model="horizonTab" :tabs="horizonTabs" class="controls__horizon" />
                </div>
                <div class="controls__row controls__row--wrap">
                    <span class="controls__label">{{ t('forecast.basedOn') }}</span>
                    <button
                        v-for="option in sampleOptions"
                        :key="option.value"
                        type="button"
                        class="chip"
                        :class="{ 'chip--active': sampleMonths === option.value }"
                        :aria-pressed="sampleMonths === option.value"
                        :disabled="option.disabled"
                        @click="sampleMonths = option.value"
                    >
                        {{ option.label }}
                    </button>
                </div>
            </div>

            <!-- Most likely net worth, the curve and its band -->
            <section class="zk-card">
                <div class="head">
                    <span class="zk-caption">
                        {{ t('forecast.estimatedAt', { month: formatMonth(end.date) }) }}
                    </span>
                    <span class="zk-amount zk-amount--lg">{{ formatCurrency(end.central) }}</span>
                    <span class="zk-pill" :class="gain >= 0 ? 'zk-pill--green' : 'zk-pill--orange'">
                        {{ t('forecast.vsToday', { amount: formatSignedCurrency(gain) }) }}
                    </span>
                </div>
                <div class="chart-container">
                    <Line :data="chartData" :options="chartOptions" />
                </div>
                <div class="chart-legend zk-caption">
                    <span>{{ formatMonth(history[0]!.date) }}</span>
                    <span class="chart-legend__today">{{ t('forecast.today') }}</span>
                    <span>{{ formatMonth(end.date) }}</span>
                </div>
                <div class="scenarios">
                    <div class="scenario">
                        <span class="zk-caption">{{ t('forecast.cautious') }}</span>
                        <span class="scenario__value">{{ formatCurrency(end.low) }}</span>
                    </div>
                    <div class="scenario">
                        <span class="zk-caption">{{ t('forecast.likely') }}</span>
                        <span class="scenario__value scenario__value--main">
                            {{ formatCurrency(end.central) }}
                        </span>
                    </div>
                    <div class="scenario">
                        <span class="zk-caption">{{ t('forecast.favourable') }}</span>
                        <span class="scenario__value">{{ formatCurrency(end.high) }}</span>
                    </div>
                </div>
                <p class="sentence">
                    {{
                        t('forecast.sentence', {
                            months: effectiveSample,
                            amount: formatCurrency(end.central),
                            month: formatMonth(end.date),
                        })
                    }}
                    <template v-if="milestone">
                        {{
                            t('forecast.milestone', {
                                amount: formatCompactCurrency(milestone.amount),
                                month: formatMonth(milestone.date),
                            })
                        }}
                    </template>
                </p>
            </section>

            <!-- Available money and assets at the horizon -->
            <div class="stats">
                <div class="stat">
                    <span class="zk-caption">{{ t('forecast.available') }}</span>
                    <span class="stat__value">{{ formatCurrency(end.available) }}</span>
                    <span class="stat__sub">
                        {{
                            t('forecast.todayValue', {
                                amount: formatCurrency(current.total - current.assets),
                            })
                        }}
                    </span>
                </div>
                <router-link to="/assets" class="stat stat--link">
                    <span class="zk-caption">{{ t('forecast.assets') }}</span>
                    <span class="stat__value stat__value--assets">
                        {{ formatCurrency(end.assets) }}
                    </span>
                    <span class="stat__sub">
                        {{ t('forecast.todayValue', { amount: formatCurrency(current.assets) }) }}
                    </span>
                </router-link>
            </div>

            <!-- What moves the curve -->
            <section class="block">
                <span class="zk-section-title">{{ t('forecast.drivers') }}</span>
                <div class="list">
                    <div class="list-row">
                        <span class="zk-tile zk-tile--sm zk-tile--green">
                            <q-icon name="trending_up" size="18px" />
                        </span>
                        <span class="list-row__body">
                            <span class="list-row__title">{{ t('forecast.saving') }}</span>
                            <span class="list-row__meta">{{ t('forecast.savingHint') }}</span>
                        </span>
                        <span
                            class="list-row__amount"
                            :class="
                                projection.monthlySaving >= 0
                                    ? 'list-row__amount--in'
                                    : 'list-row__amount--out'
                            "
                        >
                            {{ formatSignedCurrency(projection.monthlySaving) }}
                        </span>
                    </div>
                    <div class="list-row">
                        <span class="zk-tile zk-tile--sm zk-tile--violet">
                            <q-icon name="o_chair" size="18px" />
                        </span>
                        <span class="list-row__body">
                            <span class="list-row__title">{{ t('forecast.depreciation') }}</span>
                            <span class="list-row__meta">{{ t('forecast.depreciationHint') }}</span>
                        </span>
                        <span class="list-row__amount list-row__amount--out">
                            {{ formatSignedCurrency(-projection.monthlyDepreciation) }}
                        </span>
                    </div>
                    <div class="list-row">
                        <span class="zk-tile zk-tile--sm zk-tile--blue">
                            <q-icon name="show_chart" size="18px" />
                        </span>
                        <span class="list-row__body">
                            <span class="list-row__title">{{ t('forecast.investments') }}</span>
                            <span class="list-row__meta">{{ t('forecast.investmentsHint') }}</span>
                        </span>
                        <span class="list-row__amount list-row__amount--muted">0 %</span>
                    </div>
                    <div class="list-row">
                        <span class="zk-tile zk-tile--sm zk-tile--amber">
                            <q-icon name="swap_horiz" size="18px" />
                        </span>
                        <span class="list-row__body">
                            <span class="list-row__title">{{ t('forecast.debts') }}</span>
                            <span class="list-row__meta">
                                {{
                                    debtsDue > 0
                                        ? t(
                                              'forecast.debtsDueHint',
                                              { count: debtsDue, month: formatMonth(end.date) },
                                              debtsDue,
                                          )
                                        : t('forecast.debtsHint')
                                }}
                            </span>
                        </span>
                        <span class="list-row__amount list-row__amount--muted">
                            {{ t('forecast.neutral') }}
                        </span>
                    </div>
                </div>
            </section>

            <p class="info">
                <q-icon name="o_info" size="18px" class="info__icon" />
                <span>{{ t('forecast.note') }}</span>
            </p>
        </template>
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
import {
    FORECAST_HORIZONS,
    MIN_HISTORY_MONTHS,
    SAMPLE_OPTIONS,
} from 'src/services/net-worth-forecast';
import { useNetWorthForecast } from 'src/composables/useNetWorthForecast';
import TabNav from '../tabs/TabNav.vue';

ChartJS.register(CategoryScale, Filler, LineElement, LinearScale, PointElement, Tooltip);

const emit = defineEmits<{
    'show-cash-flow': [];
}>();

const { t, locale } = useI18n();
const { formatCurrency, formatSignedCurrency, formatCompactCurrency } = useCurrency();
const {
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
} = useNetWorthForecast();

onMounted(async () => {
    await loadAll();
});

const horizonTabs = computed(() =>
    FORECAST_HORIZONS.map((months) => ({
        label: t('forecast.months', { count: months }, months),
        value: String(months),
    })),
);

/** TabNav works on strings, the horizon is a number of months. */
const horizonTab = computed({
    get: () => String(horizonMonths.value),
    set: (value: string) => (horizonMonths.value = Number(value)),
});

/** Reference windows; those longer than the history are disabled. */
const sampleOptions = computed(() =>
    SAMPLE_OPTIONS.map((months) => ({
        value: months,
        label: t('forecast.months', { count: months }, months),
        disabled: months > historyMonths.value,
    })),
);

// Fall back to the longest window the history can fill
watch(historyMonths, (available: number) => {
    if (sampleMonths.value <= available) return;
    const fitting = SAMPLE_OPTIONS.filter((months) => months <= available);
    sampleMonths.value = fitting.at(-1) ?? MIN_HISTORY_MONTHS;
});

const end = computed(() => projection.value.points.at(-1)!);
const gain = computed(() => end.value.central - current.value.total);

/**
 * Formats a month.
 * @param date - Any day of the month
 * @returns The localized short month and year
 */
function formatMonth(date: Date): string {
    return new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' }).format(date);
}

/** Month the projection becomes available, when history is still too short. */
const readyMonth = computed(() => {
    const now = new Date();
    const date = new Date(
        now.getFullYear(),
        now.getMonth() + (MIN_HISTORY_MONTHS - historyMonths.value),
        1,
    );
    return new Intl.DateTimeFormat(locale.value, { month: 'long' }).format(date);
});

/** One step per required month, the current one last. */
const progressSteps = computed(() => {
    const now = new Date();
    const short = new Intl.DateTimeFormat(locale.value, { month: 'short' });
    return Array.from({ length: MIN_HISTORY_MONTHS }, (_, index) => {
        const offset = index - historyMonths.value;
        const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
        const label = short.format(date);
        return {
            label: offset === 0 ? t('forecast.currentMonth', { month: label }) : label,
            done: index < historyMonths.value,
        };
    });
});

/** Past snapshots then the projected months, on one axis. */
const chartData = computed<ChartData<'line'>>(() => {
    const past = history.value;
    const future = projection.value.points.slice(1);
    const pastCount = past.length;
    const labels = [...past.map((p) => p.date), ...future.map((p) => p.date)].map(formatMonth);
    const pad = (count: number): null[] => new Array<null>(count).fill(null);
    const todayIndex = pastCount - 1;
    const today = past[todayIndex]!.total;

    return {
        labels,
        datasets: [
            {
                // Upper edge of the band, filled down to the lower edge
                data: [...pad(todayIndex), today, ...future.map((p) => p.high)],
                borderWidth: 0,
                pointRadius: 0,
                backgroundColor: 'rgba(213, 236, 230, 0.75)',
                fill: '+1',
                tension: 0.3,
            },
            {
                data: [...pad(todayIndex), today, ...future.map((p) => p.low)],
                borderWidth: 0,
                pointRadius: 0,
                fill: false,
                tension: 0.3,
            },
            {
                data: [...past.map((p) => p.total), ...pad(future.length)],
                borderColor: '#0B6E5F',
                borderWidth: 2.5,
                pointRadius: past.map((_, i) => (i === todayIndex ? 4.5 : 0)),
                pointBackgroundColor: '#0B6E5F',
                fill: false,
                tension: 0.3,
            },
            {
                data: [...pad(todayIndex), today, ...future.map((p) => p.central)],
                borderColor: '#0B6E5F',
                borderWidth: 2.2,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false,
                tension: 0.3,
            },
        ],
    };
});

const chartOptions = computed<ChartOptions<'line'>>(() => ({
    responsive: true,
    maintainAspectRatio: false,
    spanGaps: false,
    plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
    },
    scales: {
        x: { display: false },
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
</script>

<style lang="scss" scoped>
.panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.controls {
    display: flex;
    flex-direction: column;
    gap: 10px;

    &__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;

        &--wrap {
            justify-content: flex-start;
            flex-wrap: wrap;
        }
    }

    &__label {
        font-size: 13px;
        font-weight: 600;
        color: $text-secondary;
    }

    &__horizon {
        width: 200px;
    }
}

.chip {
    height: 36px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid $border-color;
    background: $bg-card;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: $text-primary;
    cursor: pointer;

    &--active {
        background: $text-primary;
        border-color: $text-primary;
        color: #ffffff;
    }

    &:disabled {
        opacity: 0.45;
        cursor: default;
    }
}

.head {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
}

.chart-container {
    height: 170px;
}

.chart-legend {
    display: flex;
    justify-content: space-between;
    font-size: 11px;

    &__today {
        color: $text-primary;
        font-weight: 700;
    }
}

.scenarios {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    border-top: 1px solid $border-light;
    padding-top: 12px;
}

.scenario {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    &__value {
        font-size: 13px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;

        &--main {
            font-weight: 800;
            color: $primary;
        }
    }
}

.sentence {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: $text-secondary;
}

.stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.stat {
    background: $bg-card;
    border-radius: $radius-tile;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: $text-primary;
    text-decoration: none;

    &__value {
        font-size: 15px;
        font-weight: 700;

        &--assets {
            color: $violet;
        }
    }

    &__sub {
        font-size: 11px;
        color: $text-secondary;
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
    padding: 11px 0;

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
        font-size: 14px;
        font-weight: 600;
    }

    &__meta {
        font-size: 12px;
        color: $text-secondary;
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

        &--muted {
            color: $text-secondary;
        }
    }
}

.info {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin: 0;
    padding: 0 4px;
    font-size: 12px;
    line-height: 1.5;
    color: $text-secondary;

    &__icon {
        flex-shrink: 0;
        margin-top: 1px;
    }
}

.empty {
    align-items: center;
    text-align: center;
    padding: 32px 22px 24px;

    &__icon {
        width: 64px;
        height: 64px;
        border-radius: 20px;
        background: $primary-soft;
        color: $primary;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    &__title {
        font-size: 18px;
        font-weight: 800;
    }

    &__text {
        font-size: 14px;
        line-height: 1.55;
        color: $text-secondary;
    }
}

.months {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;

    &__bar {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: minmax(0, 1fr);
        gap: 6px;
    }

    &__step {
        height: 8px;
        border-radius: 999px;
        background: $grey-soft;

        &--done {
            background: $primary;
        }
    }

    &__labels {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
        font-weight: 600;
        color: $text-secondary;
    }
}

.tips {
    gap: 10px;

    &__title {
        font-size: 14px;
        font-weight: 700;
    }
}

.tip {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-size: 13px;
    line-height: 1.5;
    color: $text-secondary;
    text-decoration: none;

    &__icon {
        flex-shrink: 0;
        color: $primary;
    }
}
</style>
