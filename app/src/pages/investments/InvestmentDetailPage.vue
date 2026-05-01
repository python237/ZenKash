<template>
    <q-page v-if="investment" class="q-pa-md">
        <!-- Header Card with main info -->
        <q-card class="main-card q-mb-md" flat bordered>
            <q-card-section>
                <!-- Type badge & actions -->
                <div class="row items-center justify-between q-mb-md">
                    <q-badge
                        :color="typeColor"
                        :label="t(`investments.types.${investment.type}`)"
                    />
                    <div>
                        <BtnIcon dense icon="edit" @click="openEdit" />
                        <BtnIcon dense icon="delete" color="negative" @click="confirmDelete" />
                    </div>
                </div>

                <!-- Value -->
                <div class="text-h4 text-weight-bold">{{ formattedCurrentValue }}</div>
                <div class="health-badge q-mt-xs" :class="`health-badge--${stats?.health}`">
                    <q-icon :name="healthIcon" size="16px" />
                    {{ formattedGainLoss }} ({{ formattedGainLossPercent }})
                </div>

                <!-- Stats grid -->
                <div class="stats-grid q-mt-lg">
                    <div class="stat-item">
                        <div class="text-caption text-grey-6">{{ t('investments.quantity') }}</div>
                        <div class="text-subtitle1 text-weight-medium">
                            {{ investment.quantity }}
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="text-caption text-grey-6">{{ t('investments.rate') }}</div>
                        <div class="text-subtitle1 text-weight-medium">{{ formattedRate }}</div>
                    </div>
                    <div class="stat-item">
                        <div class="text-caption text-grey-6">
                            {{ t('investments.totalInvested') }}
                        </div>
                        <div class="text-subtitle1 text-weight-medium">
                            {{ formattedTotalInvested }}
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="text-caption text-grey-6">{{ t('investments.gainLoss') }}</div>
                        <div class="text-subtitle1 text-weight-medium" :class="gainLossClass">
                            {{ formattedGainLoss }}
                        </div>
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- Rate Evolution Chart -->
        <q-card class="q-mb-md" flat bordered>
            <q-card-section>
                <div class="row items-center justify-between q-mb-md">
                    <div class="text-subtitle1 text-weight-medium">
                        {{ t('investments.evolution') }}
                    </div>
                    <BtnLink :label="t('investments.updateRate')" @click="openUpdateRate" />
                </div>

                <!-- Simple chart placeholder -->
                <div v-if="rateHistory.length > 1" class="chart-container">
                    <div class="chart-bars">
                        <div
                            v-for="(entry, index) in normalizedRateHistory"
                            :key="index"
                            class="chart-bar"
                            :style="{ height: `${entry.height}%` }"
                            :class="{
                                'chart-bar--latest': index === normalizedRateHistory.length - 1,
                            }"
                        >
                            <q-tooltip>
                                {{ formatDate(entry.date) }}: {{ formatAmount(entry.rate) }}
                            </q-tooltip>
                        </div>
                    </div>
                    <div class="chart-labels">
                        <span>{{ formatDate(rateHistory[0]?.date) }}</span>
                        <span>{{ formatDate(rateHistory[rateHistory.length - 1]?.date) }}</span>
                    </div>
                </div>
                <div v-else class="text-center text-grey-6 q-pa-lg">
                    {{ t('investments.noHistory') }}
                </div>
            </q-card-section>
        </q-card>

        <!-- Action buttons -->
        <div class="row q-gutter-sm q-mb-md">
            <BtnAction
                class="col"
                color="positive"
                :label="t('investments.buy')"
                icon="add"
                @click="openTransaction('buy')"
            />
            <BtnAction
                class="col"
                color="negative"
                :label="t('investments.sell')"
                icon="remove"
                :disable="investment.quantity <= 0"
                @click="openTransaction('sell')"
            />
        </div>

        <!-- Transaction History -->
        <q-card flat bordered>
            <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">
                    {{ t('investments.transactions') }}
                </div>

                <q-list v-if="transactions.length > 0" separator>
                    <q-item v-for="tx in transactions" :key="tx.id">
                        <q-item-section avatar>
                            <q-avatar
                                :color="tx.type === 'buy' ? 'positive' : 'negative'"
                                text-color="white"
                                size="36px"
                            >
                                <q-icon :name="tx.type === 'buy' ? 'add' : 'remove'" size="20px" />
                            </q-avatar>
                        </q-item-section>
                        <q-item-section>
                            <q-item-label>
                                {{
                                    tx.type === 'buy' ? t('investments.buy') : t('investments.sell')
                                }}
                                {{ tx.quantity }} {{ t('investments.units') }}
                            </q-item-label>
                            <q-item-label caption>
                                {{ formatDate(tx.date) }} @ {{ formatAmount(tx.pricePerUnit) }}
                            </q-item-label>
                        </q-item-section>
                        <q-item-section side>
                            <q-item-label
                                :class="tx.type === 'buy' ? 'text-negative' : 'text-positive'"
                            >
                                {{ tx.type === 'buy' ? '-' : '+'
                                }}{{ formatAmount(tx.quantity * tx.pricePerUnit) }}
                            </q-item-label>
                        </q-item-section>
                    </q-item>
                </q-list>

                <div v-else class="text-center text-grey-6 q-pa-md">
                    {{ t('investments.noTransactions') }}
                </div>
            </q-card-section>
        </q-card>

        <!-- Edit Dialog -->
        <InvestmentDialog v-model="showEditDialog" :investment="investment" @saved="onItemSaved" />

        <!-- Transaction Dialog -->
        <InvestmentTransactionDialog
            v-if="investment"
            v-model="showTransactionDialog"
            :investment="investment"
            :transaction-type="transactionType"
            @saved="onTransactionSaved"
        />

        <!-- Update Rate Dialog -->
        <UpdateRateDialog
            v-if="investment"
            v-model="showRateDialog"
            :investment="investment"
            @saved="onRateSaved"
        />

        <!-- Delete Confirmation -->
        <ModalConfirm
            v-model="showDeleteConfirm"
            :title="t('common.delete')"
            :message="t('investments.deleteConfirm')"
            confirm-color="negative"
            :confirm-label="t('common.delete')"
            @confirm="onDelete"
        />
    </q-page>

    <!-- Loading or not found -->
    <q-page v-else class="flex flex-center">
        <q-spinner v-if="investmentStore.isLoading" size="xl" color="primary" />
        <div v-else class="text-grey-6">{{ t('investments.notFound') }}</div>
    </q-page>
</template>

<script setup lang="ts">
import type { InvestmentTransactionType, RateHistory } from 'src/types/investment';
import { CURRENCIES } from 'src/types/currency';
import { useInvestmentStore } from 'src/stores/investment';
import InvestmentDialog from 'src/components/investments/InvestmentDialog.vue';
import InvestmentTransactionDialog from 'src/components/investments/InvestmentTransactionDialog.vue';
import UpdateRateDialog from 'src/components/investments/UpdateRateDialog.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';
import BtnIcon from 'src/components/buttons/BtnIcon.vue';
import BtnLink from 'src/components/buttons/BtnLink.vue';
import BtnAction from 'src/components/buttons/BtnAction.vue';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const investmentStore = useInvestmentStore();

// Get investment from route
const investmentId = computed(() => route.params.id as string);
const investment = computed(() => investmentStore.getItemById(investmentId.value));

// Stats
const stats = computed(() =>
    investment.value ? investmentStore.getItemStats(investment.value.id) : null,
);

// Rate history
const rateHistory = computed(() =>
    investment.value ? investmentStore.getRateHistoryByItemId(investment.value.id) : [],
);

// Transactions
const transactions = computed(() =>
    investment.value ? investmentStore.getTransactionsByItemId(investment.value.id) : [],
);

// Page title
watchEffect(() => {
    if (investment.value) {
        usePage({ title: investment.value.label, showHeader: true, showBack: true });
    }
});

// Load data
onMounted(async () => {
    await investmentStore.loadAll();
});

// State
const showEditDialog = ref(false);
const showTransactionDialog = ref(false);
const showRateDialog = ref(false);
const showDeleteConfirm = ref(false);
const transactionType = ref<InvestmentTransactionType>('buy');

// Type color
const typeColor = computed(() => {
    const colors: Record<string, string> = {
        stock: 'blue',
        crypto: 'orange',
        other: 'grey',
    };
    return colors[investment.value?.type ?? 'other'] ?? 'grey';
});

// Health icon
const healthIcon = computed(() => {
    if (stats.value?.health === 'positive') return 'arrow_upward';
    if (stats.value?.health === 'negative') return 'arrow_downward';
    return 'remove';
});

// Gain/loss class
const gainLossClass = computed(() => {
    if (stats.value?.health === 'positive') return 'text-positive';
    if (stats.value?.health === 'negative') return 'text-negative';
    return '';
});

// Currency helpers
const currency = computed(() => {
    if (!investment.value) return null;
    return CURRENCIES[investment.value.currency];
});

/**
 * Formats a numeric amount as a localized currency string.
 * Uses the investment's currency for formatting.
 * @param {number} amount - The amount to format
 * @returns {string} The formatted currency string, or '0' if no investment loaded
 */
function formatAmount(amount: number): string {
    if (!investment.value) return '0';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: investment.value.currency,
        minimumFractionDigits: currency.value?.decimals ?? 0,
        maximumFractionDigits: currency.value?.decimals ?? 2,
    }).format(amount);
}

/**
 * Formats a date object into a localized short date string.
 * @param {Date | undefined} date - The date to format
 * @returns {string} The formatted date string (e.g., "15 mai 2024"), or empty string if undefined
 */
function formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(date));
}

// Formatted values
const formattedCurrentValue = computed(() => {
    if (!investment.value) return '0';
    return formatAmount(investment.value.quantity * investment.value.currentRate);
});

const formattedRate = computed(() => {
    if (!investment.value) return '0';
    return formatAmount(investment.value.currentRate);
});

const formattedTotalInvested = computed(() => formatAmount(stats.value?.totalInvested ?? 0));

const formattedGainLoss = computed(() => formatAmount(stats.value?.gainLoss ?? 0));

const formattedGainLossPercent = computed(() => {
    const percent = stats.value?.gainLossPercent ?? 0;
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
});

// Normalized rate history for chart
const normalizedRateHistory = computed(() => {
    if (rateHistory.value.length === 0) return [];

    const rates = rateHistory.value.map((r) => r.rate);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const range = max - min || 1;

    return rateHistory.value.map((entry: RateHistory) => ({
        ...entry,
        height: ((entry.rate - min) / range) * 80 + 20, // Min 20%, max 100%
    }));
});

// Actions
/**
 * Opens the investment edit dialog.
 * @returns {void}
 */
function openEdit() {
    showEditDialog.value = true;
}

/**
 * Opens the investment transaction dialog for buying or selling.
 * @param {InvestmentTransactionType} type - The type of transaction ('buy' or 'sell')
 * @returns {void}
 */
function openTransaction(type: InvestmentTransactionType) {
    transactionType.value = type;
    showTransactionDialog.value = true;
}

/**
 * Opens the rate update dialog to change the investment's current rate.
 * @returns {void}
 */
function openUpdateRate() {
    showRateDialog.value = true;
}

/**
 * Opens the delete confirmation dialog.
 * @returns {void}
 */
function confirmDelete() {
    showDeleteConfirm.value = true;
}

// Callbacks
/**
 * Callback handler when an investment item is successfully saved.
 * Used to refresh the view after edits.
 * @returns {void}
 */
function onItemSaved() {
    // Item updated
}

/**
 * Callback handler when a transaction (buy/sell) is successfully saved.
 * Used to refresh the transaction list and stats.
 * @returns {void}
 */
function onTransactionSaved() {
    // Transaction added
}

/**
 * Callback handler when a rate update is successfully saved.
 * Used to refresh the rate history chart.
 * @returns {void}
 */
function onRateSaved() {
    // Rate updated
}

/**
 * Handles the investment deletion after user confirmation.
 * Deletes the investment and redirects to the investments list.
 * @returns {Promise<void>}
 */
async function onDelete() {
    if (!investment.value) return;
    await investmentStore.deleteItem(investment.value.id);
    void router.replace({ name: 'investments' });
}
</script>

<style lang="scss" scoped>
.main-card {
    border-radius: 16px;
}

.health-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 6px;

    &--positive {
        color: var(--q-positive);
        background: rgba(76, 175, 80, 0.1);
    }

    &--negative {
        color: var(--q-negative);
        background: rgba(244, 67, 54, 0.1);
    }

    &--neutral {
        color: var(--q-grey-6);
        background: rgba(0, 0, 0, 0.05);
    }
}

.stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.stat-item {
    padding: 8px 0;
}

.chart-container {
    height: 120px;
    display: flex;
    flex-direction: column;
}

.chart-bars {
    flex: 1;
    display: flex;
    align-items: flex-end;
    gap: 4px;
    padding: 8px 0;
}

.chart-bar {
    flex: 1;
    background: var(--q-primary);
    opacity: 0.4;
    border-radius: 4px 4px 0 0;
    min-height: 4px;
    transition: opacity 0.2s;

    &--latest {
        opacity: 1;
    }

    &:hover {
        opacity: 0.8;
    }
}

.chart-labels {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--q-grey-6);
}
</style>
