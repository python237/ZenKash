import { defineStore } from 'pinia';
import type {
    RecurringTransaction,
    CreateRecurringTransaction,
    UpdateRecurringTransaction,
    RecurringFrequency,
    RecurringOccurrence,
} from 'src/types/recurring-transaction';
import { execute, query } from 'src/services/database';

/**
 * Generates a unique identifier for a recurring transaction
 * @returns A unique string identifier combining timestamp and random values
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Number of days in a given month.
 * @param year - Full year
 * @param monthIndex - Zero-based month index
 * @returns The number of days in the month
 */
function daysInMonth(year: number, monthIndex: number): number {
    return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Advances a date by one interval of the given frequency.
 * For monthly frequency the target day is clamped to the target month length.
 * @param date - The starting date
 * @param frequency - Repetition frequency
 * @param interval - Number of frequency units to advance
 * @param dayOfMonth - Preferred day of month for monthly frequency
 * @returns The next occurrence date
 */
function advanceDate(
    date: Date,
    frequency: RecurringFrequency,
    interval: number,
    dayOfMonth?: number,
): Date {
    const step = Math.max(1, interval);
    const result = new Date(date);

    if (frequency === 'weekly') {
        result.setDate(result.getDate() + 7 * step);
        return result;
    }

    if (frequency === 'yearly') {
        result.setFullYear(result.getFullYear() + step);
        return result;
    }

    // monthly — avoid day overflow by resetting to the 1st first
    const day = dayOfMonth ?? date.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + step);
    result.setDate(Math.min(day, daysInMonth(result.getFullYear(), result.getMonth())));
    return result;
}

/**
 * Returns midnight of the given date (time stripped).
 * @param date - The reference date
 * @returns A new date at 00:00:00.000
 */
function startOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Computes the first occurrence date for a new recurring rule.
 * @param data - The recurring rule creation data
 * @returns The date of the first occurrence
 */
function computeFirstRun(data: CreateRecurringTransaction): Date {
    if (data.frequency === 'monthly' && data.dayOfMonth) {
        const start = startOfDay(data.startDate);
        let candidate = new Date(
            start.getFullYear(),
            start.getMonth(),
            Math.min(data.dayOfMonth, daysInMonth(start.getFullYear(), start.getMonth())),
        );
        if (candidate.getTime() < start.getTime()) {
            candidate = advanceDate(candidate, 'monthly', data.intervalCount, data.dayOfMonth);
        }
        return candidate;
    }
    return new Date(data.startDate);
}

// Database row type
/**
 *
 */
interface RecurringRow {
    id: string;
    type: 'income' | 'expense';
    amount: number;
    category_id: string | null;
    wallet_id: string;
    description: string | null;
    frequency: RecurringFrequency;
    interval_count: number;
    day_of_month: number | null;
    start_date: string;
    end_date: string | null;
    next_run: string;
    last_run: string | null;
    is_active: number;
    auto_post: number;
    created_at: string;
    updated_at: string;
}

/**
 * Converts a database row to a RecurringTransaction object
 * @param row - The database row containing recurring data
 * @returns A RecurringTransaction object with properly typed fields
 */
function rowToRecurring(row: RecurringRow): RecurringTransaction {
    return {
        id: row.id,
        type: row.type,
        amount: row.amount,
        categoryId: row.category_id ?? '',
        walletId: row.wallet_id,
        description: row.description ?? undefined,
        frequency: row.frequency,
        intervalCount: row.interval_count,
        dayOfMonth: row.day_of_month ?? undefined,
        startDate: new Date(row.start_date),
        endDate: row.end_date ? new Date(row.end_date) : undefined,
        nextRun: new Date(row.next_run),
        lastRun: row.last_run ? new Date(row.last_run) : undefined,
        isActive: row.is_active === 1,
        autoPost: row.auto_post === 1,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export const useRecurringTransactionStore = defineStore('recurringTransaction', () => {
    // State
    const items = ref<RecurringTransaction[]>([]);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    /**
     * Only active recurring rules.
     */
    const activeItems = computed(() => items.value.filter((i) => i.isActive));

    /**
     * Retrieves a recurring rule by its unique identifier
     * @param id - The rule's unique identifier
     * @returns The rule if found, undefined otherwise
     */
    const getById = (id: string): RecurringTransaction | undefined =>
        items.value.find((i) => i.id === id);

    /**
     * Loads all recurring rules from the database into the store
     * Only loads once; subsequent calls are no-ops if already initialized
     * @returns Promise that resolves when rules are loaded
     */
    async function loadAll(): Promise<void> {
        if (isInitialized.value) return;
        isLoading.value = true;
        try {
            const rows = await query<RecurringRow>(
                'SELECT * FROM recurring_transactions ORDER BY next_run ASC',
            );
            items.value = rows.map(rowToRecurring);
            isInitialized.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Persists the next_run / last_run of a rule to the database and store.
     * @param item - The rule to update
     * @param nextRun - The new next run date
     * @param lastRun - The new last run date
     * @returns Promise that resolves when persisted
     */
    async function persistSchedule(
        item: RecurringTransaction,
        nextRun: Date,
        lastRun: Date | undefined,
    ): Promise<void> {
        const now = new Date();
        await execute(
            'UPDATE recurring_transactions SET next_run = ?, last_run = ?, updated_at = ? WHERE id = ?',
            [nextRun.toISOString(), lastRun?.toISOString() ?? null, now.toISOString(), item.id],
        );
        const index = items.value.findIndex((i) => i.id === item.id);
        if (index !== -1) {
            items.value[index] = { ...item, nextRun, lastRun, updatedAt: now };
        }
    }

    /**
     * Creates a new recurring rule in the database and adds it to the store
     * @param data - The recurring rule creation data
     * @returns Promise resolving to the newly created rule
     */
    async function create(data: CreateRecurringTransaction): Promise<RecurringTransaction> {
        isLoading.value = true;
        try {
            const now = new Date();
            const nextRun = computeFirstRun(data);

            const item: RecurringTransaction = {
                id: generateId(),
                type: data.type,
                amount: data.amount,
                categoryId: data.categoryId,
                walletId: data.walletId,
                description: data.description,
                frequency: data.frequency,
                intervalCount: data.intervalCount,
                dayOfMonth: data.dayOfMonth,
                startDate: data.startDate,
                endDate: data.endDate,
                nextRun,
                lastRun: undefined,
                isActive: true,
                autoPost: data.autoPost,
                createdAt: now,
                updatedAt: now,
            };

            await execute(
                `INSERT INTO recurring_transactions (
                    id, type, amount, category_id, wallet_id, description, frequency,
                    interval_count, day_of_month, start_date, end_date, next_run, last_run,
                    is_active, auto_post, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    item.id,
                    item.type,
                    item.amount,
                    item.categoryId || null,
                    item.walletId,
                    item.description ?? null,
                    item.frequency,
                    item.intervalCount,
                    item.dayOfMonth ?? null,
                    item.startDate.toISOString(),
                    item.endDate?.toISOString() ?? null,
                    item.nextRun.toISOString(),
                    null,
                    item.isActive ? 1 : 0,
                    item.autoPost ? 1 : 0,
                    item.createdAt.toISOString(),
                    item.updatedAt.toISOString(),
                ],
            );

            items.value.push(item);
            return item;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Updates an existing recurring rule in the database and store
     * @param id - The unique identifier of the rule to update
     * @param data - The partial rule data to update
     * @returns Promise resolving to the updated rule, or null if not found
     */
    async function update(
        id: string,
        data: UpdateRecurringTransaction,
    ): Promise<RecurringTransaction | null> {
        isLoading.value = true;
        try {
            const existing = items.value.find((i) => i.id === id);
            if (!existing) return null;

            const merged: CreateRecurringTransaction = {
                type: data.type ?? existing.type,
                amount: data.amount ?? existing.amount,
                categoryId: data.categoryId ?? existing.categoryId,
                walletId: data.walletId ?? existing.walletId,
                description: data.description ?? existing.description,
                frequency: data.frequency ?? existing.frequency,
                intervalCount: data.intervalCount ?? existing.intervalCount,
                dayOfMonth: data.dayOfMonth ?? existing.dayOfMonth,
                startDate: data.startDate ?? existing.startDate,
                endDate: data.endDate ?? existing.endDate,
                autoPost: data.autoPost ?? existing.autoPost,
            };

            // Recompute next run when the schedule changes
            const scheduleChanged =
                data.frequency !== undefined ||
                data.intervalCount !== undefined ||
                data.dayOfMonth !== undefined ||
                data.startDate !== undefined;
            const nextRun = scheduleChanged ? computeFirstRun(merged) : existing.nextRun;

            const now = new Date();
            const updated: RecurringTransaction = {
                ...existing,
                ...merged,
                id: existing.id,
                nextRun,
                createdAt: existing.createdAt,
                updatedAt: now,
            };

            await execute(
                `UPDATE recurring_transactions SET
                    type = ?, amount = ?, category_id = ?, wallet_id = ?, description = ?,
                    frequency = ?, interval_count = ?, day_of_month = ?, start_date = ?,
                    end_date = ?, next_run = ?, auto_post = ?, updated_at = ?
                 WHERE id = ?`,
                [
                    updated.type,
                    updated.amount,
                    updated.categoryId || null,
                    updated.walletId,
                    updated.description ?? null,
                    updated.frequency,
                    updated.intervalCount,
                    updated.dayOfMonth ?? null,
                    updated.startDate.toISOString(),
                    updated.endDate?.toISOString() ?? null,
                    updated.nextRun.toISOString(),
                    updated.autoPost ? 1 : 0,
                    updated.updatedAt.toISOString(),
                    id,
                ],
            );

            const index = items.value.findIndex((i) => i.id === id);
            if (index !== -1) items.value[index] = updated;
            return updated;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Toggles a rule's active state.
     * @param id - The rule's unique identifier
     * @param isActive - The new active state
     * @returns Promise that resolves when persisted
     */
    async function toggleActive(id: string, isActive: boolean): Promise<void> {
        const existing = items.value.find((i) => i.id === id);
        if (!existing) return;
        const now = new Date();
        await execute(
            'UPDATE recurring_transactions SET is_active = ?, updated_at = ? WHERE id = ?',
            [isActive ? 1 : 0, now.toISOString(), id],
        );
        const index = items.value.findIndex((i) => i.id === id);
        if (index !== -1) items.value[index] = { ...existing, isActive, updatedAt: now };
    }

    /**
     * Deletes a recurring rule from the database and removes it from the store
     * @param id - The unique identifier of the rule to delete
     * @returns Promise resolving to true if deleted, false if not found
     */
    async function remove(id: string): Promise<boolean> {
        isLoading.value = true;
        try {
            const index = items.value.findIndex((i) => i.id === id);
            if (index === -1) return false;
            await execute('DELETE FROM recurring_transactions WHERE id = ?', [id]);
            items.value.splice(index, 1);
            return true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Processes all due occurrences: generates the corresponding transactions
     * (when auto_post is enabled) and advances each rule's schedule, catching up
     * on any missed occurrences.
     * @returns Promise resolving to the number of transactions created
     */
    async function processDue(): Promise<number> {
        const transactionStore = useTransactionStore();
        const today = startOfDay(new Date());
        today.setHours(23, 59, 59, 999);

        let createdCount = 0;

        for (const item of [...items.value]) {
            if (!item.isActive) continue;

            let next = new Date(item.nextRun);
            let last = item.lastRun ? new Date(item.lastRun) : undefined;
            let advanced = false;
            let guard = 0;

            while (next.getTime() <= today.getTime() && guard < 1000) {
                if (item.endDate && next.getTime() > new Date(item.endDate).getTime()) break;

                if (item.autoPost) {
                    // Branch on the literal type so the discriminated union narrows correctly
                    if (item.type === 'income') {
                        await transactionStore.create({
                            type: 'income',
                            amount: item.amount,
                            date: new Date(next),
                            walletId: item.walletId,
                            categoryId: item.categoryId,
                            description: item.description,
                        });
                    } else {
                        await transactionStore.create({
                            type: 'expense',
                            amount: item.amount,
                            date: new Date(next),
                            walletId: item.walletId,
                            categoryId: item.categoryId,
                            description: item.description,
                        });
                    }
                    createdCount++;
                }

                last = new Date(next);
                next = advanceDate(next, item.frequency, item.intervalCount, item.dayOfMonth);
                advanced = true;
                guard++;
            }

            if (advanced) {
                await persistSchedule(item, next, last);
            }
        }

        return createdCount;
    }

    /**
     * Projects upcoming occurrences (without persisting) up to a target date.
     * Used for cash-flow planning.
     * @param untilDate - The date up to which to project occurrences
     * @returns The list of upcoming occurrences sorted by date
     */
    function upcoming(untilDate: Date): RecurringOccurrence[] {
        const result: RecurringOccurrence[] = [];
        const limit = startOfDay(untilDate);
        limit.setHours(23, 59, 59, 999);

        for (const item of activeItems.value) {
            let next = new Date(item.nextRun);
            let guard = 0;
            while (next.getTime() <= limit.getTime() && guard < 1000) {
                if (item.endDate && next.getTime() > new Date(item.endDate).getTime()) break;
                result.push({
                    recurringId: item.id,
                    type: item.type,
                    amount: item.amount,
                    walletId: item.walletId,
                    categoryId: item.categoryId,
                    description: item.description,
                    date: new Date(next),
                });
                next = advanceDate(next, item.frequency, item.intervalCount, item.dayOfMonth);
                guard++;
            }
        }

        return result.sort((a, b) => a.date.getTime() - b.date.getTime());
    }

    return {
        // State
        items,
        isLoading,
        isInitialized,
        // Getters
        activeItems,
        getById,
        upcoming,
        // Actions
        loadAll,
        create,
        update,
        toggleActive,
        remove,
        processDue,
    };
});
