<template>
    <q-page class="zk-page">
        <!-- Month Navigation -->
        <div class="month-nav">
            <button
                type="button"
                class="month-nav__btn"
                :aria-label="t('report.previousMonth')"
                @click="prevMonth"
            >
                <q-icon name="chevron_left" size="22px" />
            </button>
            <button
                type="button"
                class="month-nav__label"
                :aria-label="t('report.selectMonth')"
                @click="showMonthPicker = true"
            >
                {{ formattedMonth }}
                <q-icon name="arrow_drop_down" size="20px" />
            </button>
            <button
                type="button"
                class="month-nav__btn"
                :disabled="isCurrentMonth"
                :aria-label="t('report.nextMonth')"
                @click="nextMonth"
            >
                <q-icon name="chevron_right" size="22px" />
            </button>
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

        <!-- Summary -->
        <section class="zk-hero summary-hero">
            <div class="summary-hero__top">
                <div class="summary-hero__spent">
                    <span class="zk-hero__label">{{ t('budgets.spent') }}</span>
                    <span class="zk-amount summary-hero__amount">{{ formattedTotalSpent }}</span>
                </div>
                <span class="zk-hero__label">
                    {{ t('budgets.ofTotal', { amount: formattedTotalBudgeted }) }}
                </span>
            </div>

            <!-- Progress -->
            <div class="summary-hero__track">
                <div
                    class="summary-hero__fill"
                    :class="`summary-hero__fill--${progressLevel}`"
                    :style="{ width: `${progressValue * 100}%` }"
                />
            </div>

            <!-- Exceeded warning -->
            <span v-if="summary.exceededCount > 0" class="summary-hero__warning">
                {{ t('budgets.exceededWarning', { count: summary.exceededCount }) }}
            </span>
        </section>

        <!-- Copy from previous month -->
        <q-btn
            v-if="budgetsWithStats.length === 0 && hasPreviousMonthBudgets"
            unelevated
            no-caps
            class="copy-btn"
            icon="content_copy"
            :label="t('budgets.copyPrevious')"
            @click="copyFromPrevious"
        />

        <!-- Budgets List -->
        <div v-if="budgetsWithStats.length === 0" class="zk-empty">
            <span class="zk-empty__icon">
                <q-icon name="o_savings" size="30px" />
            </span>
            <span class="zk-empty__title">{{ t('budgets.noBudgets') }}</span>
        </div>

        <div v-else class="budget-list">
            <BudgetCard
                v-for="budget in budgetsWithStats"
                :key="budget.id"
                :budget="budget"
                :currency="defaultCurrency"
                @click="openEdit(budget)"
            />
        </div>

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
import { maskAmount } from 'src/composables/usePrivacy';
import type { Budget, BudgetWithStats } from 'src/types/budget';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import { useBudgetStore } from 'src/stores/budget';
import BudgetCard from 'src/components/budgets/BudgetCard.vue';
import BudgetDialog from 'src/components/budgets/BudgetDialog.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';

const { t, locale } = useI18n();
usePage({
    title: t('budgets.title'),
    showHeader: true,
    showBack: true,
    actions: [{ icon: 'add', label: t('common.add'), onClick: () => openCreate() }],
});

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

/** Overall consumption level: over budget, close to it (80%+), or fine. */
const progressLevel = computed(() => {
    const percent = progressValue.value * 100;
    if (percent >= 100) return 'over';
    if (percent >= 80) return 'near';
    return 'ok';
});

// Formatting
const formattedTotalBudgeted = computed(() => {
    return maskAmount(
        new Intl.NumberFormat(locale.value, {
            style: 'currency',
            currency: defaultCurrency.value,
            minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
            maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
        }).format(summary.value.totalBudgeted),
    );
});

const formattedTotalSpent = computed(() => {
    return maskAmount(
        new Intl.NumberFormat(locale.value, {
            style: 'currency',
            currency: defaultCurrency.value,
            minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
            maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
        }).format(summary.value.totalSpent),
    );
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
    justify-content: space-between;
    padding: 4px;
    border-radius: 16px;
    background: $bg-card;

    &__btn {
        width: 44px;
        height: 44px;
        border: 0;
        border-radius: 12px;
        background: transparent;
        color: $text-primary;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;

        &:disabled {
            color: $border-color;
            cursor: default;
        }
    }

    &__label {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        min-height: 44px;
        padding: 0 8px;
        border: 0;
        background: none;
        color: $text-primary;
        font-family: inherit;
        font-size: 14px;
        font-weight: 700;
        text-transform: capitalize;
        cursor: pointer;
    }
}

.summary-hero {
    gap: 12px;

    &__top {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 12px;
    }

    &__spent {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
    }

    &__amount {
        font-size: 28px;
        overflow-wrap: anywhere;
    }

    &__track {
        height: 8px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.12);
        overflow: hidden;
    }

    &__fill {
        height: 100%;
        border-radius: 999px;
        background: $hero-accent;

        &--near {
            background: #f2c27b;
        }

        &--over {
            background: #ff9f6b;
        }
    }

    &__warning {
        font-size: 12px;
        font-weight: 600;
        color: #ffd6b8;
    }
}

.copy-btn {
    align-self: flex-start;
    min-height: 44px;
    background: $primary-soft;
    color: $primary;
}

.budget-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>
