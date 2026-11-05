import { defineStore } from 'pinia';
import type { Wallet, CreateWallet, UpdateWallet } from 'src/types/wallet';
import type { CurrencyCode } from 'src/types/currency';
import { execute, query } from 'src/services/database';

/**
 * Thrown when a movement targets a closed wallet. Closing freezes the wallet at
 * zero: no transaction, transfer or recurring rule may touch it until reopened.
 */
export const WALLET_CLOSED = 'WALLET_CLOSED';

/**
 * Thrown by {@link close} when the balance is not zero. The remainder must be
 * moved out first, otherwise it would silently drop out of every total.
 */
export const WALLET_NOT_EMPTY = 'WALLET_NOT_EMPTY';

/** Balances below this are treated as zero (rounding leftovers). */
const ZERO_TOLERANCE = 0.005;

/**
 * Generates a unique identifier for a wallet
 * @returns A unique string identifier combining timestamp and random values
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Database row type
/**
 *
 */
interface WalletRow {
    id: string;
    name: string;
    icon: string | null;
    currency: string;
    balance: number;
    is_game: number;
    closed_at: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Converts a database row to a Wallet object
 * @param row - The database row containing wallet data
 * @returns A Wallet object with properly typed fields
 */
function rowToWallet(row: WalletRow): Wallet {
    return {
        id: row.id,
        name: row.name,
        icon: row.icon ?? 'account_balance_wallet',
        currency: row.currency as CurrencyCode,
        balance: row.balance,
        isGame: row.is_game === 1,
        closedAt: row.closed_at ? new Date(row.closed_at) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export const useWalletStore = defineStore('wallet', () => {
    // State
    const wallets = ref<Wallet[]>([]);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    /**
     * Retrieves a wallet by its unique identifier
     * @param id - The wallet's unique identifier
     * @returns The wallet if found, undefined otherwise
     */
    const getWalletById = (id: string): Wallet | undefined =>
        wallets.value.find((w: Wallet) => w.id === id);

    /**
     * Wallets still open, game wallets included. Closed wallets sit at zero and
     * accept no movement, so they are never offered in a picker.
     */
    const openWallets = computed((): Wallet[] => wallets.value.filter((w: Wallet) => !w.closedAt));

    /**
     * Regular (non-game) open wallets.
     * Game-platform wallets are excluded because their balance may be locked
     * and must not count towards reported liquidity. Closed wallets are left
     * out too: their balance is zero and they take no new movement.
     */
    const nonGameWallets = computed((): Wallet[] =>
        openWallets.value.filter((w: Wallet) => !w.isGame),
    );

    /** Regular (non-game) wallets that have been closed. */
    const closedWallets = computed((): Wallet[] =>
        wallets.value.filter((w: Wallet) => !w.isGame && !!w.closedAt),
    );

    /**
     * Tells whether a wallet is closed.
     * @param id - The wallet's unique identifier
     * @returns True when the wallet exists and is closed
     */
    const isClosed = (id: string): boolean => !!getWalletById(id)?.closedAt;

    /**
     * Guards a movement: every wallet it touches must still be open.
     * @param ids - Wallets the movement touches (empty values are ignored)
     * @throws Error `WALLET_CLOSED` when one of them is closed
     */
    function assertOpen(...ids: (string | null | undefined)[]): void {
        if (ids.some((id) => !!id && isClosed(id))) throw new Error(WALLET_CLOSED);
    }

    /**
     * Loads all wallets from the database into the store
     * Only loads once; subsequent calls are no-ops if already initialized
     * @returns Promise that resolves when wallets are loaded
     */
    async function loadAll(): Promise<void> {
        if (isInitialized.value) return;
        isLoading.value = true;
        try {
            const rows = await query<WalletRow>('SELECT * FROM wallets ORDER BY name');
            wallets.value = rows.map(rowToWallet);
            isInitialized.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Creates a new wallet in the database and adds it to the store
     * @param data - The wallet creation data including name, icon, currency, and optional initial balance
     * @returns Promise resolving to the newly created wallet
     */
    async function create(data: CreateWallet): Promise<Wallet> {
        isLoading.value = true;
        try {
            const now = new Date();
            const wallet: Wallet = {
                id: generateId(),
                name: data.name,
                icon: data.icon,
                currency: data.currency,
                balance: data.balance ?? 0,
                isGame: data.isGame ?? false,
                createdAt: now,
                updatedAt: now,
            };

            await execute(
                `INSERT INTO wallets (id, name, icon, currency, balance, is_game, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    wallet.id,
                    wallet.name,
                    wallet.icon,
                    wallet.currency,
                    wallet.balance,
                    wallet.isGame ? 1 : 0,
                    wallet.createdAt.toISOString(),
                    wallet.updatedAt.toISOString(),
                ],
            );

            wallets.value.push(wallet);
            return wallet;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Updates an existing wallet in the database and store
     * @param id - The unique identifier of the wallet to update
     * @param data - The partial wallet data to update (name, icon, and/or balance)
     * @returns Promise resolving to the updated wallet, or null if not found
     */
    async function update(id: string, data: UpdateWallet): Promise<Wallet | null> {
        isLoading.value = true;
        try {
            const existing = wallets.value.find((w: Wallet) => w.id === id);
            if (!existing) return null;

            const updated: Wallet = {
                id: existing.id,
                name: data.name ?? existing.name,
                icon: data.icon ?? existing.icon,
                currency: existing.currency,
                balance: data.balance ?? existing.balance,
                isGame: existing.isGame,
                closedAt: existing.closedAt,
                createdAt: existing.createdAt,
                updatedAt: new Date(),
            };

            await execute(
                `UPDATE wallets SET name = ?, icon = ?, balance = ?, updated_at = ? WHERE id = ?`,
                [updated.name, updated.icon, updated.balance, updated.updatedAt.toISOString(), id],
            );

            const index = wallets.value.findIndex((w: Wallet) => w.id === id);
            if (index !== -1) {
                wallets.value[index] = updated;
            }

            return updated;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Updates a wallet's balance directly (optimized for transaction updates)
     * Updates both database and in-memory state
     * @param id - The wallet's unique identifier
     * @param newBalance - The new balance value to set
     * @returns Promise resolving to true if successful, false on error
     */
    async function updateBalance(id: string, newBalance: number): Promise<boolean> {
        // Last line of defence: callers check first, so the data stays consistent
        assertOpen(id);
        try {
            const now = new Date();
            await execute(`UPDATE wallets SET balance = ?, updated_at = ? WHERE id = ?`, [
                newBalance,
                now.toISOString(),
                id,
            ]);

            const index = wallets.value.findIndex((w: Wallet) => w.id === id);
            if (index !== -1) {
                wallets.value[index] = {
                    ...wallets.value[index],
                    balance: newBalance,
                    updatedAt: now,
                } as Wallet;
            }

            return true;
        } catch (error) {
            console.error('Failed to update wallet balance:', error);
            return false;
        }
    }

    /**
     * Adjusts a wallet's balance by a delta amount
     * Convenience method for transaction processing (+income, -expense)
     * @param id - The wallet's unique identifier
     * @param delta - The amount to add (positive) or subtract (negative)
     * @returns Promise resolving to true if successful, false if wallet not found or on error
     */
    async function adjustBalance(id: string, delta: number): Promise<boolean> {
        const wallet = wallets.value.find((w: Wallet) => w.id === id);
        if (!wallet) return false;
        return updateBalance(id, wallet.balance + delta);
    }

    /**
     * Writes the closing state of a wallet.
     * @param id - The wallet's unique identifier
     * @param closedAt - Closing date, or null to reopen
     * @returns Promise resolving when persisted
     */
    async function setClosedAt(id: string, closedAt: Date | null): Promise<void> {
        const now = new Date();
        await execute('UPDATE wallets SET closed_at = ?, updated_at = ? WHERE id = ?', [
            closedAt?.toISOString() ?? null,
            now.toISOString(),
            id,
        ]);
        const index = wallets.value.findIndex((w: Wallet) => w.id === id);
        if (index !== -1) {
            wallets.value[index] = {
                ...wallets.value[index],
                closedAt: closedAt ?? undefined,
                updatedAt: now,
            } as Wallet;
        }
    }

    /**
     * Closes a wallet and switches off the recurring rules that feed it.
     * @param id - The wallet's unique identifier
     * @returns Promise resolving when closed
     * @throws Error `WALLET_NOT_EMPTY` when the balance is not zero
     */
    async function close(id: string): Promise<void> {
        const wallet = getWalletById(id);
        if (!wallet || wallet.closedAt) return;
        if (Math.abs(wallet.balance) >= ZERO_TOLERANCE) throw new Error(WALLET_NOT_EMPTY);

        await setClosedAt(id, new Date());

        const recurringStore = useRecurringTransactionStore();
        await recurringStore.loadAll();
        for (const rule of recurringStore.rulesForWallet(id)) {
            if (rule.isActive) await recurringStore.toggleActive(rule.id, false);
        }
    }

    /**
     * Reopens a closed wallet. Recurring rules stay off: the user turns back on
     * the ones still relevant.
     * @param id - The wallet's unique identifier
     * @returns Promise resolving when reopened
     */
    async function reopen(id: string): Promise<void> {
        if (!isClosed(id)) return;
        await setClosedAt(id, null);
    }

    /**
     * Deletes a wallet from the database and removes it from the store
     * @param id - The unique identifier of the wallet to delete
     * @returns Promise resolving to true when deleted
     */
    async function remove(id: string): Promise<boolean> {
        isLoading.value = true;
        try {
            await execute('DELETE FROM wallets WHERE id = ?', [id]);
            wallets.value = wallets.value.filter((w: Wallet) => w.id !== id);
            return true;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        // State
        wallets,
        isLoading,
        isInitialized,
        // Getters
        getWalletById,
        openWallets,
        nonGameWallets,
        closedWallets,
        isClosed,
        assertOpen,
        // Actions
        loadAll,
        create,
        update,
        updateBalance,
        adjustBalance,
        close,
        reopen,
        remove,
    };
});
