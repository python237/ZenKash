<template>
    <q-page class="zk-page">
        <template v-if="asset">
            <!-- Value + curve -->
            <section class="zk-card">
                <div class="value">
                    <span class="zk-caption">
                        {{ t(`assets.categories.${asset.category}`) }}
                    </span>
                    <template v-if="asset.isSold">
                        <span class="zk-caption">{{ t('assets.soldFor') }}</span>
                        <span class="zk-amount zk-amount--lg">
                            {{ formatCurrency(asset.soldPrice ?? 0, asset.currency) }}
                        </span>
                        <span v-if="asset.soldAt" class="zk-pill">
                            {{ t('assets.soldOn', { date: formatDate(asset.soldAt) }) }}
                        </span>
                    </template>
                    <template v-else>
                        <span class="zk-caption">{{ t('assets.resaleValue') }}</span>
                        <span class="zk-amount zk-amount--lg">
                            {{ formatCurrency(asset.resaleValue, asset.currency) }}
                        </span>
                        <span class="zk-pill zk-pill--orange">
                            {{
                                t('assets.lossSincePurchase', {
                                    amount: formatCurrency(
                                        asset.purchasePrice - asset.resaleValue,
                                        asset.currency,
                                    ),
                                })
                            }}
                        </span>
                    </template>
                </div>
                <div v-if="!asset.isSold" class="chart-container">
                    <Line :data="chartData" :options="chartOptions" />
                </div>
                <div v-if="!asset.isSold" class="chart-legend zk-caption">
                    <span>{{ t('assets.purchase') }} · {{ formatMonth(asset.purchaseDate) }}</span>
                    <span class="chart-legend__today">{{ t('transactions.today') }}</span>
                    <span>
                        {{ formatMonth(projectionEnd) }} ·
                        {{ formatCurrency(projectedValue, asset.currency) }}
                    </span>
                </div>
            </section>

            <!-- Key figures -->
            <div class="stats">
                <div class="stat">
                    <span class="zk-caption">{{ t('assets.purchasePrice') }}</span>
                    <span class="stat__value">
                        {{ formatCurrency(asset.purchasePrice, asset.currency) }}
                    </span>
                    <span class="stat__sub">{{ formatDate(asset.purchaseDate) }}</span>
                </div>
                <div class="stat">
                    <span class="zk-caption">{{ t('assets.depreciation') }}</span>
                    <span class="stat__value">{{
                        t('assets.ratePerYear', { rate: asset.rate })
                    }}</span>
                    <span class="stat__sub">{{ t(`assets.paces.${asset.pace}`) }}</span>
                </div>
                <div class="stat">
                    <span class="zk-caption">{{ t('assets.condition') }}</span>
                    <span class="stat__value">{{ t(`assets.conditions.${asset.condition}`) }}</span>
                    <span class="stat__sub">
                        {{ t('assets.resaleAt', { percent: resalePercent }) }}
                    </span>
                </div>
                <div class="stat">
                    <span class="zk-caption">{{ t('assets.depreciatedValue') }}</span>
                    <span class="stat__value">
                        {{ formatCurrency(asset.depreciatedValue, asset.currency) }}
                    </span>
                    <span class="stat__sub">{{ t('assets.beforeDiscount') }}</span>
                </div>
            </div>

            <!-- Transparent calculation -->
            <section v-if="!asset.isSold" class="calc">
                <span class="calc__title">{{ t('assets.howComputed') }}</span>
                <span class="calc__line">
                    {{ formatCurrency(asset.purchasePrice, asset.currency) }} ×
                    {{ depreciationFactor }}<sup>{{ yearsLabel }}</sup> =
                    {{ formatCurrency(asset.depreciatedValue, asset.currency) }}
                </span>
                <span class="calc__line">
                    {{ formatCurrency(asset.depreciatedValue, asset.currency) }} ×
                    {{ resalePercent }} % ({{ t(`assets.conditions.${asset.condition}`) }}) =
                    <strong>{{ formatCurrency(asset.resaleValue, asset.currency) }}</strong>
                </span>
            </section>

            <!-- Actions -->
            <div class="actions">
                <BtnAction
                    v-if="!asset.isSold"
                    color="dark"
                    :label="t('assets.markSold')"
                    @click="showSold = true"
                />
                <BtnSecondary v-else :label="t('assets.undoSale')" @click="undoSale" />
                <BtnSecondary
                    class="actions__delete"
                    :label="t('common.delete')"
                    @click="showDeleteConfirm = true"
                />
            </div>
            <p class="zk-caption hint">{{ t('assets.markSoldHint') }}</p>
        </template>

        <div v-else-if="!assetStore.isLoading" class="zk-empty">
            <span class="zk-empty__title">{{ t('common.notFound') }}</span>
        </div>

        <AssetDialog v-model="showEdit" :asset="asset ?? null" @saved="onChanged" />
        <AssetSoldDialog v-model="showSold" :asset="asset ?? null" @saved="onChanged" />
        <ModalConfirm
            v-model="showDeleteConfirm"
            :title="t('common.delete')"
            :message="t('assets.deleteConfirm')"
            variant="danger"
            :confirm-label="t('common.delete')"
            @confirm="onDelete"
        />
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
    Filler,
    type ChartData,
    type ChartOptions,
} from 'chart.js';
import { CONDITION_RESALE_FACTOR } from 'src/types/asset';
import { resaleValueAt } from 'src/services/asset-valuation';
import { useAssetStore } from 'src/stores/asset';
import { useNetWorthStore } from 'src/stores/net-worth';
import AssetDialog from 'src/components/assets/AssetDialog.vue';
import AssetSoldDialog from 'src/components/assets/AssetSoldDialog.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';
import BtnAction from 'src/components/buttons/BtnAction.vue';
import BtnSecondary from 'src/components/buttons/BtnSecondary.vue';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Filler);

/** How far the dashed projection goes, in months */
const PROJECTION_MONTHS = 24;
/** Maximum number of points drawn on the curve */
const MAX_POINTS = 30;

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const assetStore = useAssetStore();
const netWorthStore = useNetWorthStore();
const { formatCurrency, formatCompactCurrency } = useCurrency();

const asset = computed(() => assetStore.getById(route.params.id as string));

const showEdit = ref(false);
const showSold = ref(false);
const showDeleteConfirm = ref(false);

usePage({
    title: () => asset.value?.name ?? '',
    showHeader: true,
    showBack: true,
    actions: computed(() =>
        asset.value
            ? [
                  {
                      icon: 'o_edit',
                      label: t('common.edit'),
                      variant: 'outline' as const,
                      onClick: () => (showEdit.value = true),
                  },
              ]
            : [],
    ),
});

const resalePercent = computed(() =>
    asset.value ? Math.round(CONDITION_RESALE_FACTOR[asset.value.condition] * 100) : 0,
);
const depreciationFactor = computed(() =>
    asset.value ? ((100 - asset.value.rate) / 100).toFixed(2).replace('.', ',') : '',
);
const yearsLabel = computed(() =>
    asset.value
        ? t('assets.yearsShort', { years: asset.value.years.toFixed(1).replace('.', ',') })
        : '',
);

const projectionEnd = computed(() => {
    const end = new Date();
    end.setMonth(end.getMonth() + PROJECTION_MONTHS);
    return end;
});
const projectedValue = computed(() =>
    asset.value ? resaleValueAt(asset.value, projectionEnd.value) : 0,
);

/**
 * Formats a date as "12 mars 2024".
 * @param date - The date
 * @returns The formatted date
 */
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat(locale.value, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

/**
 * Formats a date as "mars 2024".
 * @param date - The date
 * @returns The formatted month
 */
function formatMonth(date: Date): string {
    return new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' }).format(date);
}

// Monthly points from purchase to the end of the projection
const points = computed(() => {
    if (!asset.value) return [];
    const start = new Date(asset.value.purchaseDate);
    const now = new Date();
    const totalMonths =
        (projectionEnd.value.getFullYear() - start.getFullYear()) * 12 +
        (projectionEnd.value.getMonth() - start.getMonth());
    const step = Math.max(1, Math.ceil(totalMonths / MAX_POINTS));

    const result: { date: Date; value: number; future: boolean }[] = [];
    for (let m = 0; m <= totalMonths; m += step) {
        const date = new Date(start.getFullYear(), start.getMonth() + m, start.getDate());
        result.push({ date, value: resaleValueAt(asset.value, date), future: date > now });
    }
    // Make sure "today" is a point, so both segments meet
    result.push({ date: now, value: resaleValueAt(asset.value, now), future: false });
    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
});

const chartData = computed<ChartData<'line'>>(() => {
    const now = Date.now();
    return {
        labels: points.value.map((p) => formatMonth(p.date)),
        datasets: [
            {
                data: points.value.map((p) => (p.date.getTime() <= now ? p.value : null)),
                borderColor: '#5B3FA0',
                backgroundColor: 'rgba(236, 230, 248, 0.7)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.3,
                pointRadius: 0,
            },
            {
                data: points.value.map((p) => (p.date.getTime() >= now ? p.value : null)),
                borderColor: 'rgba(91, 63, 160, 0.6)',
                borderWidth: 2,
                borderDash: [4, 5],
                fill: false,
                tension: 0.3,
                pointRadius: 0,
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
        tooltip: {
            callbacks: {
                label: (ctx) => formatCurrency(ctx.parsed.y ?? 0, asset.value?.currency),
            },
        },
    },
    scales: {
        x: { display: false },
        y: {
            beginAtZero: true,
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

/**
 * Refreshes the current net worth snapshot after a change.
 */
function onChanged(): void {
    void netWorthStore.captureCurrent();
}

/**
 * Puts a sold asset back among owned ones.
 */
async function undoSale(): Promise<void> {
    if (!asset.value) return;
    await assetStore.setSold(asset.value.id, null);
    onChanged();
}

/**
 * Deletes the asset and goes back to the list.
 */
async function onDelete(): Promise<void> {
    if (!asset.value) return;
    await assetStore.remove(asset.value.id);
    onChanged();
    router.back();
}

onMounted(async () => {
    await Promise.all([assetStore.loadAll(), netWorthStore.loadAll()]);
});
</script>

<style lang="scss" scoped>
.value {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
}

.chart-container {
    position: relative;
    height: 140px;
}

.chart-legend {
    display: flex;
    justify-content: space-between;
    gap: 8px;

    &__today {
        color: $text-primary;
        font-weight: 700;
    }
}

.stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px;
    border-radius: $radius-tile;
    background: $bg-card;
    min-width: 0;

    &__value {
        font-size: 15px;
        font-weight: 700;
    }

    &__sub {
        font-size: 11px;
        color: $text-secondary;
    }
}

.calc {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px;
    border-radius: $radius-tile;
    background: $bg-card;

    &__title {
        font-size: 13px;
        font-weight: 700;
    }

    &__line {
        font-size: 12px;
        line-height: 1.6;
        color: $text-secondary;

        strong {
            color: $text-primary;
        }
    }
}

.actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;

    :deep(.q-btn) {
        min-height: 52px;
        border-radius: 16px;
        font-size: 15px;
    }

    &__delete {
        color: $negative !important;
    }
}

.hint {
    margin: -6px 0 0;
    padding: 0 4px;
    line-height: 1.5;
}
</style>
