<template>
    <q-page class="q-pa-md">
        <!-- Summary Cards -->
        <div class="summary-section q-mb-lg">
            <!-- Total Value Card -->
            <q-card class="summary-card summary-card--value" flat>
                <q-card-section class="q-pa-md">
                    <div class="text-caption text-white-7">{{ t('investments.totalValue') }}</div>
                    <div class="summary-value text-white q-mt-xs">{{ formattedTotalValue }}</div>
                    <div class="summary-currency text-white-7">{{ currencyLabel }}</div>
                    <div class="summary-change" :class="totalHealthClass">
                        <q-icon :name="totalHealthIcon" size="14px" />
                        {{ formattedTotalGainLoss }}
                    </div>
                </q-card-section>
            </q-card>

            <!-- Total Invested Card -->
            <q-card class="summary-card" flat bordered>
                <q-card-section class="q-pa-md">
                    <div class="text-caption text-grey-6">{{ t('investments.totalInvested') }}</div>
                    <div class="summary-value q-mt-xs">{{ formattedTotalInvested }}</div>
                    <div class="summary-currency">{{ currencyLabel }}</div>
                    <div class="text-caption text-grey-6 q-mt-xs">
                        {{ summary.itemCount }} {{ t('investments.items') }}
                    </div>
                </q-card-section>
            </q-card>
        </div>

        <!-- Filter Tabs -->
        <TabNav v-model="activeFilter" :tabs="filterTabs" variant="pills" class="q-mb-md" />

        <!-- Investments List -->
        <div v-if="filteredItems.length === 0" class="empty-state">
            <q-icon name="trending_up" size="64px" color="grey-4" />
            <div class="text-grey-6 q-mt-md">{{ t('investments.noInvestments') }}</div>
        </div>

        <div v-else class="investment-list">
            <InvestmentCard
                v-for="item in filteredItems"
                :key="item.id"
                :investment="item"
                class="q-mb-sm"
                @click="goToDetail(item)"
            />
        </div>

        <!-- Add FAB -->
        <q-page-sticky position="bottom-right" :offset="[18, 18]">
            <BtnFab icon="add" @click="openCreate" />
        </q-page-sticky>

        <!-- Create/Edit Dialog -->
        <InvestmentDialog v-model="showDialog" :investment="selectedItem" />
    </q-page>
</template>

<script setup lang="ts">
import type { InvestmentItem, InvestmentType } from 'src/types/investment';
import { useInvestmentStore } from 'src/stores/investment';
import { useSettingsStore } from 'src/stores/settings';
import { CURRENCIES } from 'src/types/currency';
import InvestmentCard from 'src/components/investments/InvestmentCard.vue';
import InvestmentDialog from 'src/components/investments/InvestmentDialog.vue';
import TabNav from 'src/components/tabs/TabNav.vue';
import BtnFab from 'src/components/buttons/BtnFab.vue';

const { t } = useI18n();
const router = useRouter();
usePage({ title: t('investments.title'), showHeader: true });

const investmentStore = useInvestmentStore();
const settingsStore = useSettingsStore();

// State
const showDialog = ref(false);
const selectedItem = ref<InvestmentItem | null>(null);
const activeFilter = ref<'all' | InvestmentType>('all');

// Load data
onMounted(async () => {
    await settingsStore.loadSettings();
    await investmentStore.loadAll();
});

// Summary
const summary = computed(() => investmentStore.summary);

// Default currency
const defaultCurrency = computed(() => settingsStore.defaultCurrency ?? 'XOF');

// Filter tabs
const filterTabs = computed(() => [
    { value: 'all', label: t('common.all') },
    { value: 'stock', label: t('investments.types.stock') },
    { value: 'crypto', label: t('investments.types.crypto') },
    { value: 'other', label: t('investments.types.other') },
]);

// Filtered items
const filteredItems = computed(() => {
    if (activeFilter.value === 'all') return investmentStore.items;
    return investmentStore.items.filter((item) => item.type === activeFilter.value);
});

// Formatting - numbers only (no currency symbol)
const formattedTotalValue = computed(() => {
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(summary.value.totalCurrentValue);
});

const formattedTotalInvested = computed(() => {
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(summary.value.totalInvested);
});

const currencyLabel = computed(() => {
    const currency = CURRENCIES[defaultCurrency.value];
    return currency?.symbol ?? defaultCurrency.value;
});

const formattedTotalGainLoss = computed(() => {
    const percent = summary.value.totalGainLossPercent;

    if (percent == 0) return '0%';
    else {
        const sign = percent >= 0 ? '+' : '';
        return `${sign}${percent.toFixed(1)}%`;
    }
});

// Health indicators
const totalHealth = computed(() => {
    if (summary.value.totalGainLossPercent > 0) return 'positive';
    if (summary.value.totalGainLossPercent < 0) return 'negative';
    return 'neutral';
});

const totalHealthClass = computed(() => `summary-change--${totalHealth.value}`);

const totalHealthIcon = computed(() => {
    if (totalHealth.value === 'positive') return 'arrow_upward';
    if (totalHealth.value === 'negative') return 'arrow_downward';
    return 'equalizer';
});

// Navigation
/**
 * Navigates to the detail page for a specific investment item.
 * @param {InvestmentItem} item - The investment item to view
 * @returns {void}
 */
function goToDetail(item: InvestmentItem) {
    void router.push({ name: 'investment-detail', params: { id: item.id } });
}

// Open create dialog
/**
 * Opens the investment creation dialog with no pre-selected item.
 * @returns {void}
 */
function openCreate() {
    selectedItem.value = null;
    showDialog.value = true;
}
</script>

<style lang="scss" scoped>
@use 'sass:color';

.summary-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.summary-card {
    border-radius: 12px;
    overflow: hidden;
    background: white;

    &--value {
        background: linear-gradient(
            135deg,
            $primary 0%,
            color.adjust($primary, $lightness: -15%) 100%
        );
    }
}

.summary-value {
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;
    word-break: break-word;
}

.summary-currency {
    font-size: 12px;
    color: var(--q-grey-6);
    margin-top: 2px;
}

.text-white-7 {
    color: rgba(255, 255, 255, 0.7);
}

.summary-change {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    margin-top: 4px;

    &--positive {
        color: #22c55e;
        background: rgba(255, 255, 255, 0.2);
    }

    &--negative {
        color: #f87171;
        background: rgba(255, 255, 255, 0.2);
    }

    &--neutral {
        color: rgba(255, 255, 255, 0.8);
        background: rgba(255, 255, 255, 0.15);
    }
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
}

.investment-list {
    display: flex;
    flex-direction: column;
}
</style>
