import { defineStore } from 'pinia';
import type {
    Budget,
    CreateBudget,
    UpdateBudget,
    BudgetWithStats,
    BudgetSummary,
} from 'src/types/budget';
import type { ExpenseTransaction } from 'src/types/transaction';
import { execute, query } from 'src/services/database';

/**
 * Generates a unique identifier for a budget
 * @returns A unique string identifier combining timestamp and random values
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Database row type
/**
 *
 */
interface BudgetRow {
    id: string;
    month: string;
    category_id: string | null;
    master_category_id: string | null;
    amount: number;
    created_at: string;
    updated_at: string;
}

/**
 * Converts a database row to a Budget object
 * @param row - The database row containing budget data
 * @returns A Budget object with properly typed fields
 */
function rowToBudget(row: BudgetRow): Budget {
    return {
        id: row.id,
        month: row.month,
        categoryId: row.category_id ?? undefined,
        masterCategoryId: row.master_category_id ?? undefined,
        amount: row.amount,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export const useBudgetStore = defineStore('budget', () => {
    // State
    const budgets = ref<Budget[]>([]);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    /**
     * Retrieves a budget by its unique identifier
     * @param id - The budget's unique identifier
     * @returns The budget if found, undefined otherwise
     */
    const getBudgetById = (id: string): Budget | undefined =>
        budgets.value.find((b: Budget) => b.id === id);

    /**
     * Retrieves all budgets for a specific month
     * @param month - The month in 'YYYY-MM' format
     * @returns Array of budgets for the specified month
     */
    const getBudgetsByMonth = (month: string): Budget[] =>
        budgets.value.filter((b: Budget) => b.month === month);

    /**
     * Retrieves budgets with calculated statistics for a specific month
     * Includes spent amount, remaining amount, percentage used, and related category information
     * @param month - The month in 'YYYY-MM' format
     * @returns Array of budgets enriched with spending statistics and category relations
     */
    function getBudgetsWithStats(month: string): BudgetWithStats[] {
        const transactionStore = useTransactionStore();
        const categoryStore = useCategoryStore();
        const masterCategoryStore = useMasterCategoryStore();

        const monthBudgets = getBudgetsByMonth(month);

        return monthBudgets.map((budget: Budget) => {
            let spent = 0;

            // Get expense transactions for this month
            const transactions = transactionStore.filterTransactions({
                month,
                type: 'expense',
            });

            if (budget.categoryId) {
                // Budget for a specific category
                spent = (transactions as ExpenseTransaction[])
                    .filter((t) => t.categoryId === budget.categoryId)
                    .reduce((sum, t) => sum + t.amount, 0);
            } else if (budget.masterCategoryId) {
                // Budget for a master category (sum of all categories under it)
                const categoryIds = categoryStore
                    .getCategoriesByMasterId(budget.masterCategoryId)
                    .map((c: { id: string }) => c.id);
                spent = (transactions as ExpenseTransaction[])
                    .filter((t) => categoryIds.includes(t.categoryId))
                    .reduce((sum, t) => sum + t.amount, 0);
            }

            const remaining = budget.amount - spent;
            const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            const isExceeded = spent > budget.amount;

            // Get relations
            const category = budget.categoryId
                ? categoryStore.getCategoryById(budget.categoryId)
                : undefined;
            const masterCategory = budget.masterCategoryId
                ? masterCategoryStore.getMasterCategoryById(budget.masterCategoryId)
                : category
                  ? masterCategoryStore.getMasterCategoryById(category.masterCategoryId)
                  : undefined;

            return {
                ...budget,
                spent,
                remaining,
                percentUsed,
                isExceeded,
                category: category
                    ? { id: category.id, name: category.name, icon: category.icon }
                    : undefined,
                masterCategory: masterCategory
                    ? {
                          id: masterCategory.id,
                          name: masterCategory.name,
                          icon: masterCategory.icon,
                          color: masterCategory.color,
                      }
                    : undefined,
            };
        });
    }

    /**
     * Calculates a summary of all budgets for a specific month
     * @param month - The month in 'YYYY-MM' format
     * @returns Summary object with totals for budgeted, spent, remaining amounts and exceeded count
     */
    function getBudgetSummary(month: string): BudgetSummary {
        const budgetsWithStats = getBudgetsWithStats(month);

        const totalBudgeted = budgetsWithStats.reduce((sum, b) => sum + b.amount, 0);
        const totalSpent = budgetsWithStats.reduce((sum, b) => sum + b.spent, 0);
        const totalRemaining = totalBudgeted - totalSpent;
        const exceededCount = budgetsWithStats.filter((b) => b.isExceeded).length;

        return {
            month,
            totalBudgeted,
            totalSpent,
            totalRemaining,
            budgetCount: budgetsWithStats.length,
            exceededCount,
        };
    }

    /**
     * Retrieves all budgets that have exceeded their allocated amount for a specific month
     * Useful for displaying alerts to the user
     * @param month - The month in 'YYYY-MM' format
     * @returns Array of budgets that have spent more than budgeted
     */
    function getExceededBudgets(month: string): BudgetWithStats[] {
        return getBudgetsWithStats(month).filter((b) => b.isExceeded);
    }

    /**
     * Loads all budgets from the database into the store
     * Only loads once; subsequent calls are no-ops if already initialized
     * @returns Promise that resolves when budgets are loaded
     */
    async function loadAll(): Promise<void> {
        if (isInitialized.value) return;
        isLoading.value = true;
        try {
            const rows = await query<BudgetRow>('SELECT * FROM budgets ORDER BY month DESC');
            budgets.value = rows.map(rowToBudget);
            isInitialized.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Creates a new budget in the database and adds it to the store
     * @param data - The budget creation data including month, amount, and category/master category association
     * @returns Promise resolving to the newly created budget
     */
    async function create(data: CreateBudget): Promise<Budget> {
        isLoading.value = true;
        try {
            const now = new Date();
            const budget: Budget = {
                id: generateId(),
                month: data.month,
                categoryId: data.categoryId,
                masterCategoryId: data.masterCategoryId,
                amount: data.amount,
                createdAt: now,
                updatedAt: now,
            };

            await execute(
                `INSERT INTO budgets (id, month, category_id, master_category_id, amount, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    budget.id,
                    budget.month,
                    budget.categoryId ?? null,
                    budget.masterCategoryId ?? null,
                    budget.amount,
                    budget.createdAt.toISOString(),
                    budget.updatedAt.toISOString(),
                ],
            );

            budgets.value.push(budget);
            return budget;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Updates an existing budget in the database and store
     * @param id - The unique identifier of the budget to update
     * @param data - The partial budget data to update
     * @returns Promise resolving to the updated budget, or null if not found
     */
    async function update(id: string, data: UpdateBudget): Promise<Budget | null> {
        isLoading.value = true;
        try {
            const existing = budgets.value.find((b: Budget) => b.id === id);
            if (!existing) return null;

            const updated: Budget = {
                id: existing.id,
                month: data.month ?? existing.month,
                categoryId: data.categoryId ?? existing.categoryId,
                masterCategoryId: data.masterCategoryId ?? existing.masterCategoryId,
                amount: data.amount ?? existing.amount,
                createdAt: existing.createdAt,
                updatedAt: new Date(),
            };

            await execute(
                `UPDATE budgets SET month = ?, category_id = ?, master_category_id = ?, amount = ?, updated_at = ? WHERE id = ?`,
                [
                    updated.month,
                    updated.categoryId ?? null,
                    updated.masterCategoryId ?? null,
                    updated.amount,
                    updated.updatedAt.toISOString(),
                    id,
                ],
            );

            const index = budgets.value.findIndex((b: Budget) => b.id === id);
            if (index !== -1) {
                budgets.value[index] = updated;
            }

            return updated;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Deletes a budget from the database and removes it from the store
     * @param id - The unique identifier of the budget to delete
     * @returns Promise resolving to true if deleted, false if not found
     */
    async function remove(id: string): Promise<boolean> {
        isLoading.value = true;
        try {
            const index = budgets.value.findIndex((b: Budget) => b.id === id);
            if (index === -1) return false;

            await execute('DELETE FROM budgets WHERE id = ?', [id]);
            budgets.value.splice(index, 1);
            return true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Copies all budgets from the previous month to a target month
     * Skips budgets that already exist for the same category/master category in the target month
     * @param targetMonth - The target month in 'YYYY-MM' format to copy budgets to
     * @returns Promise resolving to array of newly created budgets
     */
    async function copyFromPreviousMonth(targetMonth: string): Promise<Budget[]> {
        // Parse target month and get previous month
        const [year, month] = targetMonth.split('-').map(Number);
        const prevDate = new Date(year!, (month ?? 1) - 2, 1);
        const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

        const previousBudgets = getBudgetsByMonth(prevMonth);
        const createdBudgets: Budget[] = [];

        for (const prevBudget of previousBudgets) {
            // Check if budget already exists for this category/master in target month
            const exists = budgets.value.some(
                (b: Budget) =>
                    b.month === targetMonth &&
                    b.categoryId === prevBudget.categoryId &&
                    b.masterCategoryId === prevBudget.masterCategoryId,
            );

            if (!exists) {
                const newBudget = await create({
                    month: targetMonth,
                    categoryId: prevBudget.categoryId,
                    masterCategoryId: prevBudget.masterCategoryId,
                    amount: prevBudget.amount,
                });
                createdBudgets.push(newBudget);
            }
        }

        return createdBudgets;
    }

    return {
        // State
        budgets,
        isLoading,
        isInitialized,
        // Getters
        getBudgetById,
        getBudgetsByMonth,
        getBudgetsWithStats,
        getBudgetSummary,
        getExceededBudgets,
        // Actions
        loadAll,
        create,
        update,
        remove,
        copyFromPreviousMonth,
    };
});
