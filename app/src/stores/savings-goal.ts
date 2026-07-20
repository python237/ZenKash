import { defineStore } from 'pinia';
import type {
    SavingsGoal,
    CreateSavingsGoal,
    UpdateSavingsGoal,
    SavingsGoalWithStats,
} from 'src/types/savings-goal';
import { CurrencyCode } from 'src/types/currency';
import { execute, query } from 'src/services/database';

/** Average number of days per month, used for deadline projections. */
const DAYS_PER_MONTH = 30.44;

/**
 * Generates a unique identifier for a savings goal
 * @returns A unique string identifier combining timestamp and random values
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Database row type
/**
 *
 */
interface SavingsGoalRow {
    id: string;
    name: string;
    icon: string | null;
    target_amount: number;
    wallet_id: string;
    deadline: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Converts a database row to a SavingsGoal object
 * @param row - The database row containing goal data
 * @returns A SavingsGoal object with properly typed fields
 */
function rowToGoal(row: SavingsGoalRow): SavingsGoal {
    return {
        id: row.id,
        name: row.name,
        icon: row.icon ?? undefined,
        targetAmount: row.target_amount,
        walletId: row.wallet_id,
        deadline: row.deadline ? new Date(row.deadline) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export const useSavingsGoalStore = defineStore('savingsGoal', () => {
    // State
    const goals = ref<SavingsGoal[]>([]);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    /**
     * Retrieves a goal by its unique identifier
     * @param id - The goal's unique identifier
     * @returns The goal if found, undefined otherwise
     */
    const getById = (id: string): SavingsGoal | undefined => goals.value.find((g) => g.id === id);

    /**
     * Enriches a goal with progress (from the linked wallet balance) and,
     * when a deadline is set, a linear-pace projection.
     * @param goal - The goal to enrich
     * @returns The goal with computed statistics
     */
    function withStats(goal: SavingsGoal): SavingsGoalWithStats {
        const walletStore = useWalletStore();
        const settingsStore = useSettingsStore();

        const wallet = walletStore.getWalletById(goal.walletId);
        const currency = wallet?.currency ?? settingsStore.defaultCurrency ?? CurrencyCode.XOF;
        const currentAmount = wallet?.balance ?? 0;

        const remaining = Math.max(0, goal.targetAmount - currentAmount);
        const percent =
            goal.targetAmount > 0 ? Math.min(100, (currentAmount / goal.targetAmount) * 100) : 0;
        const isReached = currentAmount >= goal.targetAmount && goal.targetAmount > 0;

        let monthsLeft: number | null = null;
        let requiredMonthly: number | null = null;
        let onTrack: boolean | null = null;

        if (goal.deadline) {
            const now = new Date();
            const daysLeft = (goal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            monthsLeft = Math.max(0, Math.ceil(daysLeft / DAYS_PER_MONTH));

            const divisor = monthsLeft > 0 ? monthsLeft : 1;
            requiredMonthly = isReached ? 0 : remaining / divisor;

            const total = goal.deadline.getTime() - goal.createdAt.getTime();
            const elapsed = now.getTime() - goal.createdAt.getTime();
            const ratio = total > 0 ? Math.min(1, Math.max(0, elapsed / total)) : 1;
            const expected = goal.targetAmount * ratio;
            onTrack = isReached || currentAmount >= expected;
        }

        return {
            ...goal,
            currency,
            currentAmount,
            remaining,
            percent,
            isReached,
            walletExists: !!wallet,
            monthsLeft,
            requiredMonthly,
            onTrack,
        };
    }

    /**
     * All goals enriched with computed statistics.
     */
    const goalsWithStats = computed<SavingsGoalWithStats[]>(() => goals.value.map(withStats));

    /**
     * Loads all savings goals from the database into the store
     * Only loads once; subsequent calls are no-ops if already initialized
     * @returns Promise that resolves when goals are loaded
     */
    async function loadAll(): Promise<void> {
        if (isInitialized.value) return;
        isLoading.value = true;
        try {
            const rows = await query<SavingsGoalRow>(
                'SELECT * FROM savings_goals ORDER BY created_at DESC',
            );
            goals.value = rows.map(rowToGoal);
            isInitialized.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Creates a new savings goal in the database and adds it to the store
     * @param data - The goal creation data
     * @returns Promise resolving to the newly created goal
     */
    async function create(data: CreateSavingsGoal): Promise<SavingsGoal> {
        isLoading.value = true;
        try {
            const now = new Date();
            const goal: SavingsGoal = {
                id: generateId(),
                name: data.name,
                icon: data.icon,
                targetAmount: data.targetAmount,
                walletId: data.walletId,
                deadline: data.deadline,
                createdAt: now,
                updatedAt: now,
            };

            await execute(
                `INSERT INTO savings_goals (id, name, icon, target_amount, wallet_id, deadline, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    goal.id,
                    goal.name,
                    goal.icon ?? null,
                    goal.targetAmount,
                    goal.walletId,
                    goal.deadline?.toISOString() ?? null,
                    goal.createdAt.toISOString(),
                    goal.updatedAt.toISOString(),
                ],
            );

            goals.value.unshift(goal);
            return goal;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Updates an existing savings goal in the database and store
     * @param id - The unique identifier of the goal to update
     * @param data - The partial goal data to update
     * @returns Promise resolving to the updated goal, or null if not found
     */
    async function update(id: string, data: UpdateSavingsGoal): Promise<SavingsGoal | null> {
        isLoading.value = true;
        try {
            const existing = goals.value.find((g) => g.id === id);
            if (!existing) return null;

            const updated: SavingsGoal = {
                id: existing.id,
                name: data.name ?? existing.name,
                icon: data.icon ?? existing.icon,
                targetAmount: data.targetAmount ?? existing.targetAmount,
                walletId: data.walletId ?? existing.walletId,
                deadline: data.deadline !== undefined ? data.deadline : existing.deadline,
                createdAt: existing.createdAt,
                updatedAt: new Date(),
            };

            await execute(
                `UPDATE savings_goals SET name = ?, icon = ?, target_amount = ?, wallet_id = ?, deadline = ?, updated_at = ? WHERE id = ?`,
                [
                    updated.name,
                    updated.icon ?? null,
                    updated.targetAmount,
                    updated.walletId,
                    updated.deadline?.toISOString() ?? null,
                    updated.updatedAt.toISOString(),
                    id,
                ],
            );

            const index = goals.value.findIndex((g) => g.id === id);
            if (index !== -1) goals.value[index] = updated;
            return updated;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Deletes a savings goal from the database and removes it from the store
     * @param id - The unique identifier of the goal to delete
     * @returns Promise resolving to true if deleted, false if not found
     */
    async function remove(id: string): Promise<boolean> {
        isLoading.value = true;
        try {
            const index = goals.value.findIndex((g) => g.id === id);
            if (index === -1) return false;
            await execute('DELETE FROM savings_goals WHERE id = ?', [id]);
            goals.value.splice(index, 1);
            return true;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        // State
        goals,
        isLoading,
        isInitialized,
        // Getters
        getById,
        withStats,
        goalsWithStats,
        // Actions
        loadAll,
        create,
        update,
        remove,
    };
});
