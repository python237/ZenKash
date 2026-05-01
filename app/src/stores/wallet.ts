import { defineStore } from 'pinia';
import type { Wallet, CreateWallet, UpdateWallet } from 'src/types/wallet';
import type { CurrencyCode } from 'src/types/currency';
import { execute, query } from 'src/services/database';

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
                ...data,
                balance: data.balance ?? 0,
                createdAt: now,
                updatedAt: now,
            };

            await execute(
                `INSERT INTO wallets (id, name, icon, currency, balance, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    wallet.id,
                    wallet.name,
                    wallet.icon,
                    wallet.currency,
                    wallet.balance,
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
        // Actions
        loadAll,
        create,
        update,
        updateBalance,
        adjustBalance,
        remove,
    };
});
