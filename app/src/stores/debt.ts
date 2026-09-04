import { defineStore } from 'pinia';
import type { CreateDebt, Debt, DebtDirection, DebtWithStats, UpdateDebt } from 'src/types/debt';
import { CurrencyCode } from 'src/types/currency';
import { execute, query } from 'src/services/database';

/** Milliseconds in a day, used for the due-date countdown. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Generates a unique identifier for a debt.
 * @returns A unique string combining timestamp and randomness
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/** Database row shape of a debt. */
interface DebtRow {
    id: string;
    counterparty: string;
    direction: string;
    principal: number;
    total_repaid: number;
    wallet_id: string;
    due_date: string | null;
    description: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Converts a database row into a debt.
 * @param row - The row to convert
 * @returns The typed debt
 */
function rowToDebt(row: DebtRow): Debt {
    return {
        id: row.id,
        counterparty: row.counterparty,
        direction: row.direction as DebtDirection,
        principal: row.principal,
        totalRepaid: row.total_repaid,
        walletId: row.wallet_id,
        dueDate: row.due_date ? new Date(row.due_date) : undefined,
        description: row.description ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export const useDebtStore = defineStore('debt', () => {
    // State
    const debts = ref<Debt[]>([]);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    /**
     * Retrieves a debt by identifier.
     * @param id - The debt identifier
     * @returns The debt, or undefined when unknown
     */
    const getById = (id: string): Debt | undefined => debts.value.find((d) => d.id === id);

    /**
     * Direction of a debt, used by the analytics layer to decide whether a
     * movement goes in or out.
     * @param id - The debt identifier
     * @returns The direction, or undefined when the debt was deleted
     */
    const getDirection = (id: string): DebtDirection | undefined => getById(id)?.direction;

    /**
     * Enriches a debt with its outstanding balance and due-date status.
     * @param debt - The debt to enrich
     * @returns The debt with computed statistics
     */
    function withStats(debt: Debt): DebtWithStats {
        const walletStore = useWalletStore();
        const settingsStore = useSettingsStore();

        const wallet = walletStore.getWalletById(debt.walletId);
        const currency = wallet?.currency ?? settingsStore.defaultCurrency ?? CurrencyCode.XOF;

        const outstanding = Math.max(0, debt.principal - debt.totalRepaid);
        const percentRepaid =
            debt.principal > 0 ? Math.min(100, (debt.totalRepaid / debt.principal) * 100) : 0;
        const isSettled = outstanding <= 0;

        let daysLeft: number | null = null;
        if (debt.dueDate) {
            daysLeft = Math.ceil((debt.dueDate.getTime() - Date.now()) / DAY_MS);
        }

        return {
            ...debt,
            currency,
            outstanding,
            percentRepaid,
            isSettled,
            isOverdue: !isSettled && daysLeft !== null && daysLeft < 0,
            daysLeft,
            walletExists: !!wallet,
        };
    }

    /** Every debt enriched with its computed figures. */
    const debtsWithStats = computed<DebtWithStats[]>(() => debts.value.map(withStats));

    /** Money others still owe you, in each debt's own currency. */
    const receivables = computed(() =>
        debtsWithStats.value.filter((d) => d.direction === 'lent' && !d.isSettled),
    );

    /** Money you still owe, in each debt's own currency. */
    const payables = computed(() =>
        debtsWithStats.value.filter((d) => d.direction === 'borrowed' && !d.isSettled),
    );

    /**
     * Loads every debt from the database.
     * @returns Promise resolving when the debts are loaded
     */
    async function loadAll(): Promise<void> {
        if (isInitialized.value) return;
        isLoading.value = true;
        try {
            const rows = await query<DebtRow>('SELECT * FROM debts ORDER BY created_at DESC');
            debts.value = rows.map(rowToDebt);
            isInitialized.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Creates a debt. The money movement itself is a separate debt transaction,
     * so the wallet balance is only touched by the transaction store.
     * @param data - The debt creation data
     * @returns Promise resolving to the created debt
     */
    async function create(data: CreateDebt): Promise<Debt> {
        isLoading.value = true;
        try {
            const now = new Date();
            const debt: Debt = {
                id: generateId(),
                counterparty: data.counterparty,
                direction: data.direction,
                // Filled in by the principal transaction the caller records next:
                // the money and the figure must come from the same event.
                principal: 0,
                totalRepaid: 0,
                walletId: data.walletId,
                dueDate: data.dueDate,
                description: data.description,
                createdAt: now,
                updatedAt: now,
            };

            await execute(
                `INSERT INTO debts (id, counterparty, direction, principal, total_repaid, wallet_id, due_date, description, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    debt.id,
                    debt.counterparty,
                    debt.direction,
                    0,
                    0,
                    debt.walletId,
                    debt.dueDate?.toISOString() ?? null,
                    debt.description ?? null,
                    debt.createdAt.toISOString(),
                    debt.updatedAt.toISOString(),
                ],
            );

            debts.value.unshift(debt);
            return debt;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Updates a debt's descriptive fields. The direction never changes: it would
     * invert every movement already recorded against it.
     * @param id - The debt identifier
     * @param data - The fields to update
     * @returns Promise resolving to the updated debt, or null when unknown
     */
    async function update(id: string, data: UpdateDebt): Promise<Debt | null> {
        isLoading.value = true;
        try {
            const existing = getById(id);
            if (!existing) return null;

            const updated: Debt = {
                ...existing,
                counterparty: data.counterparty ?? existing.counterparty,
                walletId: data.walletId ?? existing.walletId,
                dueDate: data.dueDate !== undefined ? data.dueDate : existing.dueDate,
                description: data.description ?? existing.description,
                updatedAt: new Date(),
            };

            await execute(
                `UPDATE debts SET counterparty = ?, wallet_id = ?, due_date = ?, description = ?, updated_at = ? WHERE id = ?`,
                [
                    updated.counterparty,
                    updated.walletId,
                    updated.dueDate?.toISOString() ?? null,
                    updated.description ?? null,
                    updated.updatedAt.toISOString(),
                    id,
                ],
            );

            const index = debts.value.findIndex((d) => d.id === id);
            if (index !== -1) debts.value[index] = updated;
            return updated;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Applies a repayment to the running total. Called by the transaction store
     * when a debt transaction is created or reverted, so the two never diverge.
     * @param id - The debt identifier
     * @param amount - Signed amount to add to the repaid total
     * @returns Promise resolving when the total is persisted
     */
    async function adjustRepaid(id: string, amount: number): Promise<void> {
        const existing = getById(id);
        if (!existing) return;

        const totalRepaid = Math.max(0, existing.totalRepaid + amount);
        const updatedAt = new Date();

        await execute('UPDATE debts SET total_repaid = ?, updated_at = ? WHERE id = ?', [
            totalRepaid,
            updatedAt.toISOString(),
            id,
        ]);

        const index = debts.value.findIndex((d) => d.id === id);
        if (index !== -1) debts.value[index] = { ...existing, totalRepaid, updatedAt };
    }

    /**
     * Adjusts the principal, used when the initial movement is edited or removed.
     * @param id - The debt identifier
     * @param amount - Signed amount to add to the principal
     * @returns Promise resolving when the principal is persisted
     */
    async function adjustPrincipal(id: string, amount: number): Promise<void> {
        const existing = getById(id);
        if (!existing) return;

        const principal = Math.max(0, existing.principal + amount);
        const updatedAt = new Date();

        await execute('UPDATE debts SET principal = ?, updated_at = ? WHERE id = ?', [
            principal,
            updatedAt.toISOString(),
            id,
        ]);

        const index = debts.value.findIndex((d) => d.id === id);
        if (index !== -1) debts.value[index] = { ...existing, principal, updatedAt };
    }

    /**
     * Deletes a debt. Its transactions are kept, exactly like deleting a wallet
     * or a category leaves the history untouched.
     * @param id - The debt identifier
     * @returns Promise resolving to true when a debt was removed
     */
    async function remove(id: string): Promise<boolean> {
        isLoading.value = true;
        try {
            const index = debts.value.findIndex((d) => d.id === id);
            if (index === -1) return false;
            await execute('DELETE FROM debts WHERE id = ?', [id]);
            debts.value.splice(index, 1);
            return true;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        // State
        debts,
        isLoading,
        isInitialized,
        // Getters
        getById,
        getDirection,
        withStats,
        debtsWithStats,
        receivables,
        payables,
        // Actions
        loadAll,
        create,
        update,
        adjustRepaid,
        adjustPrincipal,
        remove,
    };
});
