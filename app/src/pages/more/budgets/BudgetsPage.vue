<template>
    <q-page class="q-pa-md">
        <!-- Month Navigation -->
        <div class="month-nav q-mb-lg">
            <BtnIcon icon="chevron_left" @click="prevMonth" />
            <q-btn flat no-caps class="month-label" @click="showMonthPicker = true">
                <span class="text-subtitle1 text-weight-medium text-capitalize">{{
                    formattedMonth
                }}</span>
                <q-icon name="arrow_drop_down" size="sm" />
            </q-btn>
            <BtnIcon icon="chevron_right" :disable="isCurrentMonth" @click="nextMonth" />
        </div>

        <!-- Month Picker Dialog -->
        <q-dialog v-model="showMonthPicker">
            <q-date
                v-model="selectedMonth"
                emit-immediately
                mask="YYYY/MM"
                default-view="Months"
                minimal
                years-in-month-view
                @update:model-value="showMonthPicker = false"
            />
        </q-dialog>

        <!-- Summary Card -->
        <q-card class="summary-card bg-dark text-white q-mb-lg" flat>
            <q-card-section class="q-pa-md">
                <div class="row items-center justify-between">
                    <div>
                        <div class="text-caption text-grey-5">{{ t('budgets.totalBudgeted') }}</div>
                        <div class="text-h5 text-weight-bold">{{ formattedTotalBudgeted }}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-caption text-grey-5">{{ t('budgets.spent') }}</div>
                        <div class="text-h6 text-weight-medium" :class="spentClassDark">
                            {{ formattedTotalSpent }}
                        </div>
                    </div>
                </div>

                <!-- Progress -->
                <q-linear-progress
                    :value="progressValue"
                    :color="progressColor"
                    track-color="grey-8"
                    rounded
                    size="10px"
                    class="q-mt-md"
                />

                <!-- Exceeded warning -->
                <div v-if="summary.exceededCount > 0" class="exceeded-warning q-mt-sm">
                    <q-icon name="warning" color="amber" size="16px" />
                    <span class="text-amber text-caption q-ml-xs">
                        {{ t('budgets.exceededWarning', { count: summary.exceededCount }) }}
                    </span>
                </div>
            </q-card-section>
        </q-card>

        <!-- Copy from previous month -->
        <div v-if="budgetsWithStats.length === 0 && hasPreviousMonthBudgets" class="q-mb-md">
            <q-btn
                flat
                no-caps
                color="primary"
                icon="content_copy"
                :label="t('budgets.copyPrevious')"
                @click="copyFromPrevious"
            />
        </div>

        <!-- Budgets List -->
        <div v-if="budgetsWithStats.length === 0" class="empty-state">
            <q-icon name="account_balance_wallet" size="64px" color="grey-4" />
            <div class="text-grey-6 q-mt-md">{{ t('budgets.noBudgets') }}</div>
        </div>

        <div v-else class="budget-list">
            <BudgetCard
                v-for="budget in budgetsWithStats"
                :key="budget.id"
                :budget="budget"
                :currency="defaultCurrency"
                class="q-mb-sm"
                @click="openEdit(budget)"
            />
        </div>

        <!-- Add FAB -->
        <q-page-sticky position="bottom-right" :offset="[18, 18]">
            <BtnFab icon="add" @click="openCreate" />
        </q-page-sticky>

        <!-- Create/Edit Dialog -->
        <BudgetDialog
            v-model="showDialog"
            :budget="selectedBudget"
            :month="monthFilter"
            @saved="onBudgetSaved"
        />

        <!-- Delete Confirmation -->
        <ModalConfirm
            v-model="showDeleteConfirm"
            :title="t('common.delete')"
            :message="t('budgets.deleteConfirm')"
            variant="danger"
            :confirm-label="t('common.delete')"
            @confirm="onDelete"
        />
    </q-page>
</template>

<script setup lang="ts">
import type { Budget, BudgetWithStats } from 'src/types/budget';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import { useBudgetStore } from 'src/stores/budget';
import BudgetCard from 'src/components/budgets/BudgetCard.vue';
import BudgetDialog from 'src/components/budgets/BudgetDialog.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';
import BtnIcon from 'src/components/buttons/BtnIcon.vue';
import BtnFab from 'src/components/buttons/BtnFab.vue';

const { t, locale } = useI18n();
usePage({ title: t('budgets.title'), showHeader: true, showBack: true });

const budgetStore = useBudgetStore();
const transactionStore = useTransactionStore();
const categoryStore = useCategoryStore();
const masterCategoryStore = useMasterCategoryStore();
const settingsStore = useSettingsStore();

// State
const showDialog = ref(false);
const showDeleteConfirm = ref(false);
const showMonthPicker = ref(false);
const selectedBudget = ref<Budget | null>(null);

// Month selection
const now = new Date();
const selectedMonth = ref(`${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`);

// Check if current month
const isCurrentMonth = computed(() => {
    const current = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth.value === current;
});

// Formatted month
const formattedMonth = computed(() => {
    const parts = selectedMonth.value.split('/');
    const year = parts[0] ?? '2024';
    const month = parts[1] ?? '01';
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return new Intl.DateTimeFormat(locale.value, {
        month: 'long',
        year: 'numeric',
    }).format(date);
});

// Month navigation
/**
 * Navigates to the previous month in the date selector.
 * Updates the selectedMonth ref to the month before the current selection.
 * @returns {void}
 */
function prevMonth(): void {
    const parts = selectedMonth.value.split('/').map(Number);
    const year = parts[0] ?? 2024;
    const month = parts[1] ?? 1;
    const date = new Date(year, month - 2);
    selectedMonth.value = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Navigates to the next month in the date selector.
 * Does nothing if already at the current month.
 * @returns {void}
 */
function nextMonth(): void {
    if (isCurrentMonth.value) return;
    const parts = selectedMonth.value.split('/').map(Number);
    const year = parts[0] ?? 2024;
    const month = parts[1] ?? 1;
    const date = new Date(year, month);
    selectedMonth.value = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Convert selected month to filter format
const monthFilter = computed(() => {
    const parts = selectedMonth.value.split('/');
    const year = parts[0] ?? '2024';
    const month = parts[1] ?? '01';
    return `${year}-${month}`;
});

// Default currency
const defaultCurrency = computed(() => settingsStore.defaultCurrency ?? CurrencyCode.XOF);
const currencyInfo = computed(() => {
    const code = defaultCurrency.value;
    return CURRENCIES[code];
});

// Budgets with stats
const budgetsWithStats = computed(() => budgetStore.getBudgetsWithStats(monthFilter.value));

// Summary
const summary = computed(() => budgetStore.getBudgetSummary(monthFilter.value));

// Check if previous month has budgets
const hasPreviousMonthBudgets = computed(() => {
    const parts = monthFilter.value.split('-').map(Number);
    const year = parts[0] ?? 2024;
    const month = parts[1] ?? 1;
    const prevDate = new Date(year, month - 2);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    return budgetStore.getBudgetsByMonth(prevMonth).length > 0;
});

// Progress
const progressValue = computed(() => {
    if (summary.value.totalBudgeted === 0) return 0;
    return Math.min(summary.value.totalSpent / summary.value.totalBudgeted, 1);
});

const progressColor = computed(() => {
    const percent = progressValue.value * 100;
    if (percent >= 100) return 'negative';
    if (percent >= 80) return 'warning';
    return 'positive';
});

// Spent class for dark background
const spentClassDark = computed(() => {
    const percent = progressValue.value * 100;
    if (percent >= 100) return 'text-red-4';
    if (percent >= 80) return 'text-amber';
    return 'text-green-4';
});

// Formatting
const formattedTotalBudgeted = computed(() => {
    return new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: defaultCurrency.value,
        minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
        maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
    }).format(summary.value.totalBudgeted);
});

const formattedTotalSpent = computed(() => {
    return new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: defaultCurrency.value,
        minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
        maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
    }).format(summary.value.totalSpent);
});

// Load data
onMounted(async () => {
    await Promise.all([
        settingsStore.loadSettings(),
        budgetStore.loadAll(),
        transactionStore.loadAll(),
        categoryStore.loadAll(),
        masterCategoryStore.loadAll(),
    ]);
});

// Actions
/**
 * Opens the budget creation dialog with no pre-selected budget.
 * @returns {void}
 */
function openCreate() {
    selectedBudget.value = null;
    showDialog.value = true;
}

/**
 * Opens the budget edit dialog for the selected budget.
 * @param {BudgetWithStats} budget - The budget to edit
 * @returns {void}
 */
function openEdit(budget: BudgetWithStats) {
    selectedBudget.value = budgetStore.getBudgetById(budget.id) ?? null;
    showDialog.value = true;
}

/**
 * Callback handler when a budget is successfully saved.
 * The list automatically updates via reactive state.
 * @returns {void}
 */
function onBudgetSaved() {
    // Budget saved, list will update automatically
}

/**
 * Copies all budgets from the previous month to the currently selected month.
 * Useful for quickly setting up recurring monthly budgets.
 * @returns {Promise<void>}
 */
async function copyFromPrevious() {
    await budgetStore.copyFromPreviousMonth(monthFilter.value);
}

/**
 * Handles the budget deletion after user confirmation.
 * Removes the selected budget from the store.
 * @returns {Promise<void>}
 */
async function onDelete() {
    if (!selectedBudget.value) return;
    await budgetStore.remove(selectedBudget.value.id);
    selectedBudget.value = null;
}
</script>

<style lang="scss" scoped>
.month-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.month-label {
    min-width: 180px;
}

.summary-card {
    border-radius: 16px;
}

.exceeded-warning {
    display: flex;
    align-items: center;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
}

.budget-list {
    display: flex;
    flex-direction: column;
}
</style>
