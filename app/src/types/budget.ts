/**
 * Represents a monthly budget for tracking spending limits.
 * Budgets can be associated with either a category or a master category.
 */
export interface Budget {
    /** Unique identifier for the budget */
    id: string;
    /** Target month in format "YYYY-MM" (e.g., "2024-01") */
    month: string;
    /** Optional category ID for category-specific budgets */
    categoryId?: string | undefined;
    /** Optional master category ID for broader budget tracking */
    masterCategoryId?: string | undefined;
    /** Maximum spending amount for this budget */
    amount: number;
    /** Timestamp when the budget was created */
    createdAt: Date;
    /** Timestamp when the budget was last updated */
    updatedAt: Date;
}

/**
 * Data required to create a new budget.
 * Excludes auto-generated fields (id, createdAt, updatedAt).
 */
export interface CreateBudget {
    /** Target month in format "YYYY-MM" */
    month: string;
    /** Optional category ID for category-specific budgets */
    categoryId?: string | undefined;
    /** Optional master category ID for broader budget tracking */
    masterCategoryId?: string | undefined;
    /** Maximum spending amount for this budget */
    amount: number;
}

/**
 * Data for updating an existing budget.
 * All fields are optional to allow partial updates.
 */
export type UpdateBudget = Partial<CreateBudget>;

/**
 * Budget with calculated statistics and related entity information.
 * Used for displaying budget progress in the UI.
 */
export interface BudgetWithStats extends Budget {
    /** Total amount spent against this budget */
    spent: number;
    /** Remaining amount (amount - spent) */
    remaining: number;
    /** Percentage of budget used (spent / amount * 100) */
    percentUsed: number;
    /** Whether spending has exceeded the budget amount */
    isExceeded: boolean;
    /** Related category information if budget is category-specific */
    category?:
        | {
              id: string;
              name: string;
              icon?: string | undefined;
          }
        | undefined;
    /** Related master category information if budget is master-category-specific */
    masterCategory?:
        | {
              id: string;
              name: string;
              icon?: string | undefined;
              color?: string | undefined;
          }
        | undefined;
}

/**
 * Aggregated budget statistics for a specific month.
 * Used for displaying monthly budget overview in dashboards.
 */
export interface BudgetSummary {
    /** Target month in format "YYYY-MM" */
    month: string;
    /** Sum of all budget amounts for the month */
    totalBudgeted: number;
    /** Sum of all spending across budgets */
    totalSpent: number;
    /** Total remaining across all budgets */
    totalRemaining: number;
    /** Number of budgets for this month */
    budgetCount: number;
    /** Number of budgets that have been exceeded */
    exceededCount: number;
}
