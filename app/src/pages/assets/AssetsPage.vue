<template>
    <q-page class="zk-page">
        <!-- Estimated resale value of everything owned -->
        <section class="zk-hero">
            <div class="hero-value">
                <span class="zk-hero__label">{{ t('assets.resaleValue') }}</span>
                <span class="zk-amount zk-amount--lg">{{ formatCurrency(totalResale) }}</span>
            </div>
            <div class="zk-hero__divider" />
            <div class="hero-meta">
                <span class="zk-hero__label">
                    {{ t('assets.ownedCount', { count: owned.length }, owned.length) }} ·
                    {{ t('assets.boughtFor') }}
                    <strong class="hero-meta__strong">{{ formatCurrency(totalPurchase) }}</strong>
                </span>
                <span v-if="totalPurchase > 0" class="hero-meta__kept">
                    {{
                        t('assets.keptShare', {
                            percent: formatPercent(keptPercent, { decimals: 0 }),
                        })
                    }}
                </span>
            </div>
            <span class="hero-pill">{{ t('assets.countsInNetWorth') }}</span>
        </section>

        <!-- Owned / sold -->
        <div class="chips" role="tablist" :aria-label="t('assets.statusFilter')">
            <button
                v-for="option in statusOptions"
                :key="option.value"
                type="button"
                role="tab"
                class="chip"
                :class="{ 'chip--active': statusFilter === option.value }"
                :aria-selected="statusFilter === option.value"
                @click="statusFilter = option.value"
            >
                {{ option.label }}
            </button>
        </div>

        <div v-if="visibleAssets.length === 0" class="zk-empty">
            <span class="zk-empty__icon">
                <q-icon name="o_chair" size="30px" />
            </span>
            <span class="zk-empty__title">
                {{ statusFilter === 'owned' ? t('assets.noOwned') : t('assets.noSold') }}
            </span>
            <span v-if="statusFilter === 'owned'">{{ t('assets.noOwnedHint') }}</span>
        </div>

        <div v-else class="asset-list">
            <router-link
                v-for="asset in visibleAssets"
                :key="asset.id"
                :to="{ name: 'asset-detail', params: { id: asset.id } }"
                class="asset-row"
            >
                <span class="zk-tile" :style="toneStyle(categoryPreset(asset.category).color)">
                    <q-icon :name="categoryPreset(asset.category).icon" size="20px" />
                </span>
                <span class="asset-row__body">
                    <span class="asset-row__name">{{ asset.name }}</span>
                    <span class="asset-row__meta">{{ rowMeta(asset) }}</span>
                </span>
                <span class="asset-row__side">
                    <template v-if="asset.isSold">
                        <span class="asset-row__value">
                            {{ formatCurrency(asset.soldPrice ?? 0, asset.currency) }}
                        </span>
                        <span class="asset-row__caption">{{ t('assets.soldLabel') }}</span>
                    </template>
                    <template v-else>
                        <span class="asset-row__value">
                            {{ formatCurrency(asset.resaleValue, asset.currency) }}
                        </span>
                        <span class="asset-row__caption">
                            {{
                                t('assets.ofPrice', {
                                    percent: formatPercent(asset.keptPercent, { decimals: 0 }),
                                })
                            }}
                        </span>
                    </template>
                </span>
            </router-link>
        </div>

        <p class="info">
            <q-icon name="o_info" size="18px" class="info__icon" />
            <span>{{ t('assets.noTransactionLong') }}</span>
        </p>

        <AssetDialog v-model="showDialog" @saved="onChanged" />
    </q-page>
</template>

<script setup lang="ts">
import type { AssetWithStats } from 'src/types/asset';
import { categoryPreset } from 'src/services/asset-valuation';
import { toneStyle } from 'src/services/tone';
import { useAssetStore } from 'src/stores/asset';
import { useNetWorthStore } from 'src/stores/net-worth';
import AssetDialog from 'src/components/assets/AssetDialog.vue';

const { t, locale } = useI18n();
const assetStore = useAssetStore();
const netWorthStore = useNetWorthStore();
const settingsStore = useSettingsStore();
const exchangeRateStore = useExchangeRateStore();
const { formatCurrency, formatPercent, convert } = useCurrency();

const showDialog = ref(false);

usePage({
    title: t('assets.title'),
    showHeader: true,
    showBack: true,
    actions: [{ icon: 'add', label: t('assets.add'), onClick: () => (showDialog.value = true) }],
});

const statusFilter = ref<'owned' | 'sold'>('owned');
const statusOptions = computed((): { value: 'owned' | 'sold'; label: string }[] => [
    { value: 'owned', label: t('assets.filterOwned') },
    { value: 'sold', label: t('assets.filterSold') },
]);

const owned = computed(() => assetStore.owned);
const visibleAssets = computed(() =>
    statusFilter.value === 'owned' ? assetStore.owned : assetStore.sold,
);

// Totals of owned assets, in the default currency
const totalResale = computed(() =>
    owned.value.reduce((sum, a) => sum + convert(a.resaleValue, a.currency), 0),
);
const totalPurchase = computed(() =>
    owned.value.reduce((sum, a) => sum + convert(a.purchasePrice, a.currency), 0),
);
const keptPercent = computed(() =>
    totalPurchase.value > 0 ? (totalResale.value / totalPurchase.value) * 100 : 0,
);

/**
 * Secondary line of a row: category, purchase month and condition (or sale date).
 * @param asset - The asset
 * @returns The localized meta line
 */
function rowMeta(asset: AssetWithStats): string {
    const month = new Intl.DateTimeFormat(locale.value, { month: 'short', year: 'numeric' });
    const category = t(`assets.categories.${asset.category}`);
    if (asset.isSold && asset.soldAt) {
        return `${category} · ${t('assets.soldOn', { date: month.format(asset.soldAt) })}`;
    }
    return `${category} · ${month.format(asset.purchaseDate)} · ${t(`assets.conditions.${asset.condition}`)}`;
}

/**
 * Refreshes the current net worth snapshot after a change.
 */
function onChanged(): void {
    void netWorthStore.captureCurrent();
}

onMounted(async () => {
    await Promise.all([
        settingsStore.loadSettings(),
        exchangeRateStore.loadAll(),
        assetStore.loadAll(),
        netWorthStore.loadAll(),
    ]);
});
</script>

<style lang="scss" scoped>
.hero-value {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.hero-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;

    &__strong {
        color: #ffffff;
        font-weight: 700;
    }

    &__kept {
        font-size: 13px;
        font-weight: 600;
        color: $hero-accent;
    }
}

.hero-pill {
    align-self: flex-start;
    font-size: 12px;
    font-weight: 600;
    color: $hero-accent;
    background: rgba(143, 227, 207, 0.14);
    padding: 5px 10px;
    border-radius: 999px;
}

.chips {
    display: flex;
    gap: 8px;
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
}

.asset-list {
    background: $bg-card;
    border-radius: $radius-card;
    padding: 4px 16px;
}

.asset-row {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 64px;
    padding: 12px 0;
    color: $text-primary;
    text-decoration: none;

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

    &__name {
        font-size: 14px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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

    &__value {
        font-size: 14px;
        font-weight: 700;
        white-space: nowrap;
    }

    &__caption {
        font-size: 11px;
        color: $text-secondary;
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
</style>
