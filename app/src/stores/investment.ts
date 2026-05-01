import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import type {
    InvestmentItem,
    CreateInvestmentItem,
    UpdateInvestmentItem,
    RateHistory,
    InvestmentTransaction,
    CreateInvestmentTransaction,
    InvestmentStats,
    InvestmentSummary,
    InvestmentType,
} from 'src/types/investment';
import type { CurrencyCode } from 'src/types/currency';
import { execute, query } from 'src/services/database';

// Database row interfaces
/**
 *
 */
interface InvestmentItemRow {
    id: string;
    label: string;
    type: string;
    quantity: number;
    current_rate: number;
    currency: string;
    wallet_id: string;
    created_at: string;
    updated_at: string;
}

/**
 *
 */
interface RateHistoryRow {
    id: string;
    investment_item_id: string;
    rate: number;
    date: string;
}

/**
 *
 */
interface InvestmentTransactionRow {
    id: string;
    investment_item_id: string;
    type: string;
    quantity: number;
    price_per_unit: number;
    date: string;
    created_at: string;
}

export const useInvestmentStore = defineStore('investment', () => {
    // State
    const items = ref<InvestmentItem[]>([]);
    const transactions = ref<InvestmentTransaction[]>([]);
    const rateHistory = ref<RateHistory[]>([]);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    /**
     * Retrieves an investment item by its unique identifier
     * @param id - The investment item's unique identifier
     * @returns The investment item if found, undefined otherwise
     */
    const getItemById = (id: string): InvestmentItem | undefined =>
        items.value.find((item: InvestmentItem) => item.id === id);

    /**
     * Retrieves all transactions for a specific investment item
     * @param itemId - The investment item's unique identifier
     * @returns Array of transactions associated with the investment item
     */
    const getTransactionsByItemId = (itemId: string): InvestmentTransaction[] =>
        transactions.value.filter((tx: InvestmentTransaction) => tx.investmentItemId === itemId);

    /**
     * Retrieves the rate history for a specific investment item, sorted by date ascending
     * @param itemId - The investment item's unique identifier
     * @returns Array of rate history entries sorted from oldest to newest
     */
    const getRateHistoryByItemId = (itemId: string): RateHistory[] => {
        const filtered = rateHistory.value.filter(
            (rh: RateHistory) => rh.investmentItemId === itemId,
        );
        return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    };

    /**
     * Calculates detailed statistics for a single investment item
     * Includes total invested, current value, gain/loss, and health indicator
     * @param itemId - The investment item's unique identifier
     * @returns Investment statistics object, or null if item not found
     */
    function getItemStats(itemId: string): InvestmentStats | null {
        const item = getItemById(itemId);
        if (!item) return null;

        const itemTransactions = getTransactionsByItemId(itemId);

        // Calculate total invested (sum of buy transactions)
        const totalInvested = itemTransactions
            .filter((tx) => tx.type === 'buy')
            .reduce((sum, tx) => sum + tx.quantity * tx.pricePerUnit, 0);

        // Calculate total sold (sum of sell transactions)
        const totalSold = itemTransactions
            .filter((tx) => tx.type === 'sell')
            .reduce((sum, tx) => sum + tx.quantity * tx.pricePerUnit, 0);

        // Current value = quantity * current rate
        const currentValue = item.quantity * item.currentRate;

        // Gain/loss = current value + sold - invested
        const gainLoss = currentValue + totalSold - totalInvested;

        // Gain/loss percent
        const gainLossPercent = totalInvested > 0 ? (gainLoss / totalInvested) * 100 : 0;

        // Health indicator
        let health: 'positive' | 'negative' | 'neutral' = 'neutral';
        if (gainLossPercent > 0) health = 'positive';
        else if (gainLossPercent < 0) health = 'negative';

        return {
            totalInvested,
            currentValue,
            gainLoss,
            gainLossPercent,
            health,
        };
    }

    /**
     * Computed property that calculates a comprehensive summary of all investments
     * Includes totals for invested amount, current value, gain/loss, and breakdown by investment type
     */
    const summary = computed<InvestmentSummary>(() => {
        const byType: InvestmentSummary['byType'] = {
            stock: { count: 0, invested: 0, currentValue: 0 },
            crypto: { count: 0, invested: 0, currentValue: 0 },
            other: { count: 0, invested: 0, currentValue: 0 },
        };

        let totalInvested = 0;
        let totalCurrentValue = 0;

        const allItems: InvestmentItem[] = items.value;
        for (const item of allItems) {
            const stats = getItemStats(item.id);
            if (!stats) continue;

            totalInvested += stats.totalInvested;
            totalCurrentValue += stats.currentValue;

            byType[item.type].count++;
            byType[item.type].invested += stats.totalInvested;
            byType[item.type].currentValue += stats.currentValue;
        }

        const totalGainLoss = totalCurrentValue - totalInvested;
        const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

        return {
            totalInvested,
            totalCurrentValue,
            totalGainLoss,
            totalGainLossPercent,
            itemCount: items.value.length,
            byType,
        };
    });

    /**
     * Loads all investment data from the database into the store
     * Includes investment items, transactions, and rate history
     * Only loads once; subsequent calls are no-ops if already initialized
     * @returns Promise that resolves when all investment data is loaded
     */
    async function loadAll(): Promise<void> {
        if (isInitialized.value) return;
        isLoading.value = true;
        try {
            // Load investment items
            const itemRows = await query<InvestmentItemRow>(
                'SELECT * FROM investment_items ORDER BY label',
            );
            items.value = itemRows.map((row) => ({
                id: row.id,
                label: row.label,
                type: row.type as InvestmentType,
                quantity: row.quantity,
                currentRate: row.current_rate,
                currency: row.currency as CurrencyCode,
                walletId: row.wallet_id,
                createdAt: new Date(row.created_at),
                updatedAt: new Date(row.updated_at),
            }));

            // Load transactions
            const txRows = await query<InvestmentTransactionRow>(
                'SELECT * FROM investment_transactions ORDER BY date DESC',
            );
            transactions.value = txRows.map((row) => ({
                id: row.id,
                investmentItemId: row.investment_item_id,
                type: row.type as 'buy' | 'sell',
                quantity: row.quantity,
                pricePerUnit: row.price_per_unit,
                date: new Date(row.date),
                createdAt: new Date(row.created_at),
            }));

            // Load rate history
            const rateRows = await query<RateHistoryRow>(
                'SELECT * FROM rate_history ORDER BY date',
            );
            rateHistory.value = rateRows.map((row) => ({
                id: row.id,
                investmentItemId: row.investment_item_id,
                rate: row.rate,
                date: new Date(row.date),
            }));

            isInitialized.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Creates a new investment item in the database and adds it to the store
     * Also creates an initial rate history entry
     * @param data - The investment item creation data including label, type, quantity, rate, and wallet
     * @returns Promise resolving to the newly created investment item
     */
    async function createItem(data: CreateInvestmentItem): Promise<InvestmentItem> {
        isLoading.value = true;
        try {
            const now = new Date();
            const newItem: InvestmentItem = {
                id: uuidv4(),
                ...data,
                createdAt: now,
                updatedAt: now,
            };

            await execute(
                `INSERT INTO investment_items (id, label, type, quantity, current_rate, currency, wallet_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    newItem.id,
                    newItem.label,
                    newItem.type,
                    newItem.quantity,
                    newItem.currentRate,
                    newItem.currency,
                    newItem.walletId,
                    newItem.createdAt.toISOString(),
                    newItem.updatedAt.toISOString(),
                ],
            );

            // Add initial rate to history
            await addRateHistory(newItem.id, newItem.currentRate);

            items.value.push(newItem);
            return newItem;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Updates an existing investment item in the database and store
     * Automatically adds a rate history entry if the rate changed
     * @param id - The unique identifier of the investment item to update
     * @param data - The partial investment item data to update (label and/or currentRate)
     * @returns Promise resolving to the updated investment item, or null if not found
     */
    async function updateItem(
        id: string,
        data: UpdateInvestmentItem,
    ): Promise<InvestmentItem | null> {
        isLoading.value = true;
        try {
            const existing = items.value.find((item: InvestmentItem) => item.id === id);
            if (!existing) return null;

            const updated: InvestmentItem = {
                ...existing,
                label: data.label ?? existing.label,
                currentRate: data.currentRate ?? existing.currentRate,
                updatedAt: new Date(),
            };

            await execute(
                `UPDATE investment_items SET label = ?, current_rate = ?, updated_at = ? WHERE id = ?`,
                [updated.label, updated.currentRate, updated.updatedAt.toISOString(), id],
            );

            // If rate changed, add to history
            if (data.currentRate !== undefined && data.currentRate !== existing.currentRate) {
                await addRateHistory(id, data.currentRate);
            }

            const index = items.value.findIndex((item: InvestmentItem) => item.id === id);
            if (index !== -1) {
                items.value[index] = updated;
            }

            return updated;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Updates only the rate of an investment item (convenience method)
     * @param id - The unique identifier of the investment item
     * @param newRate - The new rate value to set
     * @returns Promise that resolves when the rate is updated
     */
    async function updateRate(id: string, newRate: number): Promise<void> {
        await updateItem(id, { currentRate: newRate });
    }

    /**
     * Deletes an investment item and all its related data from the database
     * Also removes associated transactions and rate history
     * @param id - The unique identifier of the investment item to delete
     * @returns Promise resolving to true if deleted successfully
     */
    async function deleteItem(id: string): Promise<boolean> {
        isLoading.value = true;
        try {
            // Delete related transactions
            await execute('DELETE FROM investment_transactions WHERE investment_item_id = ?', [id]);

            // Delete related rate history
            await execute('DELETE FROM rate_history WHERE investment_item_id = ?', [id]);

            // Delete item
            await execute('DELETE FROM investment_items WHERE id = ?', [id]);

            items.value = items.value.filter((item: InvestmentItem) => item.id !== id);
            transactions.value = transactions.value.filter(
                (tx: InvestmentTransaction) => tx.investmentItemId !== id,
            );
            rateHistory.value = rateHistory.value.filter(
                (rh: RateHistory) => rh.investmentItemId !== id,
            );

            return true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Adds a buy or sell transaction for an investment item
     * Updates the item's quantity and current rate, adjusts wallet balance accordingly
     * @param data - The transaction data including item ID, type (buy/sell), quantity, and price per unit
     * @returns Promise resolving to the newly created investment transaction
     * @throws Error if the investment item is not found
     */
    async function addTransaction(
        data: CreateInvestmentTransaction,
    ): Promise<InvestmentTransaction> {
        isLoading.value = true;
        try {
            const item = items.value.find((i: InvestmentItem) => i.id === data.investmentItemId);
            if (!item) throw new Error('Investment item not found');

            const newTransaction: InvestmentTransaction = {
                id: uuidv4(),
                ...data,
                createdAt: new Date(),
            };

            await execute(
                `INSERT INTO investment_transactions (id, investment_item_id, type, quantity, price_per_unit, date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    newTransaction.id,
                    newTransaction.investmentItemId,
                    newTransaction.type,
                    newTransaction.quantity,
                    newTransaction.pricePerUnit,
                    newTransaction.date.toISOString(),
                    newTransaction.createdAt.toISOString(),
                ],
            );

            // Update item quantity and currentRate (transaction price = current market rate)
            const quantityChange = data.type === 'buy' ? data.quantity : -data.quantity;
            const newQuantity = item.quantity + quantityChange;
            const newRate = data.pricePerUnit;

            await execute(
                `UPDATE investment_items SET quantity = ?, current_rate = ?, updated_at = ? WHERE id = ?`,
                [newQuantity, newRate, new Date().toISOString(), item.id],
            );

            // Update wallet balance
            const walletStore = useWalletStore();
            // Ensure wallets are loaded
            await walletStore.loadAll();
            const transactionTotal = data.quantity * data.pricePerUnit;
            // Buy = subtract from wallet, Sell = add to wallet
            const balanceDelta = data.type === 'buy' ? -transactionTotal : transactionTotal;
            await walletStore.adjustBalance(item.walletId, balanceDelta);

            // Add to rate history if rate changed
            if (item.currentRate !== newRate) {
                await addRateHistory(item.id, newRate);
            }

            // Update local state
            const itemIndex = items.value.findIndex((i: InvestmentItem) => i.id === item.id);
            if (itemIndex !== -1) {
                const existingItem = items.value[itemIndex];
                items.value[itemIndex] = {
                    ...existingItem,
                    quantity: newQuantity,
                    currentRate: newRate,
                    updatedAt: new Date(),
                } as InvestmentItem;
            }

            transactions.value.unshift(newTransaction);
            return newTransaction;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Adds a new entry to the rate history for an investment item
     * @param itemId - The investment item's unique identifier
     * @param rate - The rate value to record
     * @returns Promise that resolves when the rate history entry is added
     */
    async function addRateHistory(itemId: string, rate: number): Promise<void> {
        const newEntry: RateHistory = {
            id: uuidv4(),
            investmentItemId: itemId,
            rate,
            date: new Date(),
        };

        await execute(
            `INSERT INTO rate_history (id, investment_item_id, rate, date) VALUES (?, ?, ?, ?)`,
            [newEntry.id, newEntry.investmentItemId, newEntry.rate, newEntry.date.toISOString()],
        );

        rateHistory.value.push(newEntry);
    }

    /**
     * Calculates the total cash impact of investment transactions on a wallet's balance
     * Positive values indicate money added from sales, negative values indicate money spent on purchases
     * @param walletId - The wallet's unique identifier
     * @returns The net cash impact amount
     */
    function getWalletInvestmentCashImpact(walletId: string): number {
        // Get all items linked to this wallet
        const walletItems = items.value.filter(
            (item: InvestmentItem) => item.walletId === walletId,
        );

        let totalImpact = 0;
        for (const item of walletItems) {
            const itemTransactions = getTransactionsByItemId(item.id);
            for (const tx of itemTransactions) {
                const amount = tx.quantity * tx.pricePerUnit;
                if (tx.type === 'buy') {
                    totalImpact -= amount; // Buying reduces cash
                } else {
                    totalImpact += amount; // Selling adds cash
                }
            }
        }

        return totalImpact;
    }

    /**
     * Calculates the total current value of all investment assets linked to a wallet
     * Computed as sum of (quantity × currentRate) for all items
     * @param walletId - The wallet's unique identifier
     * @returns The total assets value in the wallet's base currency
     */
    function getWalletAssetsValue(walletId: string): number {
        const walletItems = items.value.filter(
            (item: InvestmentItem) => item.walletId === walletId,
        );
        return walletItems.reduce((sum, item) => sum + item.quantity * item.currentRate, 0);
    }

    /**
     * Retrieves all investment items linked to a specific wallet
     * @param walletId - The wallet's unique identifier
     * @returns Array of investment items associated with the wallet
     */
    function getItemsByWalletId(walletId: string): InvestmentItem[] {
        return items.value.filter((item: InvestmentItem) => item.walletId === walletId);
    }

    return {
        // State
        items,
        transactions,
        rateHistory,
        isLoading,
        isInitialized,
        // Getters
        getItemById,
        getTransactionsByItemId,
        getRateHistoryByItemId,
        getItemStats,
        summary,
        getWalletInvestmentCashImpact,
        getWalletAssetsValue,
        getItemsByWalletId,
        // Actions
        loadAll,
        createItem,
        updateItem,
        updateRate,
        deleteItem,
        addTransaction,
        addRateHistory,
    };
});
