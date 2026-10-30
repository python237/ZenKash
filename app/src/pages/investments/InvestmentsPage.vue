<template>
    <q-page class="zk-page">
        <!-- Summary -->
        <section class="zk-hero">
            <div class="hero-main">
                <span class="zk-hero__label">{{ t('investments.totalValue') }}</span>
                <span class="zk-amount zk-amount--lg">{{ formattedTotalValue }}</span>
                <span class="hero-change" :class="`hero-change--${totalHealth}`">
                    {{ formattedTotalGain }} · {{ formattedTotalGainLoss }}
                </span>
            </div>
            <div class="hero-meta">
                <span>
                    {{ t('investments.totalInvested') }}
                    <strong>{{ formattedTotalInvested }}</strong>
                </span>
                <span>
                    <strong>{{ summary.itemCount }}</strong> {{ t('investments.items') }}
                </span>
            </div>
        </section>

        <!-- Filter Tabs -->
        <TabNav v-model="activeFilter" :tabs="filterTabs" variant="pills" />

        <!-- Investments List -->
        <div v-if="filteredItems.length === 0" class="zk-empty">
            <span class="zk-empty__icon">
                <q-icon name="trending_up" size="30px" />
            </span>
            <span class="zk-empty__title">{{ t('investments.noInvestments') }}</span>
        </div>

        <div v-else class="investment-list">
            <InvestmentCard
                v-for="item in filteredItems"
                :key="item.id"
                :investment="item"
                @click="goToDetail(item)"
            />
        </div>

        <!-- Create/Edit Dialog -->
        <InvestmentDialog v-model="showDialog" :investment="selectedItem" />
    </q-page>
</template>

<script setup lang="ts">
import type { InvestmentItem, InvestmentType } from 'src/types/investment';
import { useInvestmentStore } from 'src/stores/investment';
import { useSettingsStore } from 'src/stores/settings';
import InvestmentCard from 'src/components/investments/InvestmentCard.vue';
import InvestmentDialog from 'src/components/investments/InvestmentDialog.vue';
import TabNav from 'src/components/tabs/TabNav.vue';

const { t } = useI18n();
const router = useRouter();
usePage({
    title: t('investments.title'),
    showHeader: true,
    showBack: true,
    actions: [{ icon: 'add', label: t('common.add'), onClick: () => openCreate() }],
});

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

// Formatting (amounts are in the default currency)
const { formatCurrency } = useCurrency();

const formattedTotalValue = computed(() => formatCurrency(summary.value.totalCurrentValue));
const formattedTotalInvested = computed(() => formatCurrency(summary.value.totalInvested));

/** Absolute gain or loss, signed with a true minus sign. */
const formattedTotalGain = computed(() => {
    const gain = summary.value.totalCurrentValue - summary.value.totalInvested;
    const sign = gain > 0 ? '+' : gain < 0 ? '−' : '';
    return `${sign}${formatCurrency(Math.abs(gain))}`;
});

const formattedTotalGainLoss = computed(() => {
    const percent = summary.value.totalGainLossPercent;
    if (percent === 0) return '0%';
    const sign = percent > 0 ? '+' : '−';
    return `${sign}${Math.abs(percent).toFixed(1)}%`;
});

// Health indicator
const totalHealth = computed(() => {
    if (summary.value.totalGainLossPercent > 0) return 'positive';
    if (summary.value.totalGainLossPercent < 0) return 'negative';
    return 'neutral';
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
.hero-main {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.hero-change {
    font-size: 13px;
    font-weight: 600;
    color: $hero-muted;

    &--positive {
        color: $hero-accent;
    }

    &--negative {
        color: #ffd6b8;
    }
}

.hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 24px;
    font-size: 12px;
    color: $hero-muted;

    strong {
        color: #ffffff;
        font-weight: 700;
    }
}

.investment-list {
    display: flex;
    flex-direction: column;
    padding: 4px 14px;
    border-radius: $radius-card;
    background: $bg-card;

    > * + * {
        border-top: 1px solid $border-light;
    }
}
</style>
