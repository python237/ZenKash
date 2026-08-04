<template>
    <div>
        <!-- Hero: total outflow over the period -->
        <q-card class="hero-card bg-dark text-white q-mb-md" flat>
            <q-card-section class="q-pa-md">
                <div class="text-caption text-grey-5">{{ t('analytics.totalSpent') }}</div>
                <div class="text-h4 text-weight-bold q-mt-xs">
                    {{ formatCurrency(summary.outflow) }}
                </div>
                <div class="text-caption q-mt-xs" :class="deltaClass">
                    <q-icon :name="deltaIcon" size="14px" />
                    {{ formatSignedCurrency(outflowDelta.amount) }}
                    <span v-if="outflowDelta.percent !== 0">
                        ({{ formatPercent(outflowDelta.percent, { signed: true }) }})
                    </span>
                    <span class="text-grey-5">{{ t('analytics.vsPreviousPeriod') }}</span>
                </div>
                <div class="text-caption text-grey-5 q-mt-xs">{{ rangeLabel }}</div>
            </q-card-section>
        </q-card>

        <!-- Secondary figures -->
        <div class="stats-grid q-mb-md">
            <q-card class="stat-card" flat bordered>
                <q-card-section class="q-pa-sm text-center">
                    <div class="text-caption text-grey-6">{{ t('analytics.dailyAverage') }}</div>
                    <div class="text-subtitle2 text-weight-bold">
                        {{ formatCurrency(summary.dailyAverage) }}
                    </div>
                </q-card-section>
            </q-card>

            <q-card class="stat-card" flat bordered>
                <q-card-section class="q-pa-sm text-center">
                    <div class="text-caption text-grey-6">{{ t('analytics.largestExpense') }}</div>
                    <div class="text-subtitle2 text-weight-bold">
                        {{ formatCurrency(summary.largestOutflow) }}
                    </div>
                </q-card-section>
            </q-card>

            <q-card class="stat-card" flat bordered>
                <q-card-section class="q-pa-sm text-center">
                    <div class="text-caption text-grey-6">{{ t('analytics.flows') }}</div>
                    <div class="text-subtitle2 text-weight-bold">{{ summary.count }}</div>
                </q-card-section>
            </q-card>

            <!-- Only meaningful once incoming flows are part of the selection -->
            <q-card v-if="summary.inflow > 0" class="stat-card" flat bordered>
                <q-card-section class="q-pa-sm text-center">
                    <div class="text-caption text-grey-6">{{ t('analytics.savingsRate') }}</div>
                    <div class="text-subtitle2 text-weight-bold" :class="savingsRateClass">
                        {{ formatPercent(summary.savingsRate) }}
                    </div>
                </q-card-section>
            </q-card>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { Delta, PeriodSummary } from 'src/types/analytics';
import { useCurrency } from 'src/composables/useCurrency';

const props = defineProps<{
    /** Figures of the selected period */
    summary: PeriodSummary;
    /** Spending change against the previous period */
    outflowDelta: Delta;
    /** Human-readable label of the selected period */
    rangeLabel: string;
}>();

const { t } = useI18n();
const { formatCurrency, formatSignedCurrency, formatPercent } = useCurrency();

// Spending more than the previous period is the negative outcome here, so the
// color mapping is inverted compared with a balance.
const deltaClass = computed(() => (props.outflowDelta.amount > 0 ? 'text-red-4' : 'text-green-4'));

const deltaIcon = computed(() => (props.outflowDelta.amount > 0 ? 'trending_up' : 'trending_down'));

const savingsRateClass = computed(() =>
    props.summary.savingsRate >= 0 ? 'text-positive' : 'text-negative',
);
</script>

<style lang="scss" scoped>
.hero-card {
    border-radius: 16px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.stat-card {
    border-radius: 12px;
}
</style>
