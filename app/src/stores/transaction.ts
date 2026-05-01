import { defineStore } from 'pinia';
import type {
    Transaction,
    CreateTransaction,
    UpdateTransaction,
    TransactionFilters,
    TransactionWithRelations,
    TransactionType,
    ProjectTransactionType,
} from 'src/types/transaction';
import { execute, query } from 'src/services/database';

/**
 * Generates a unique identifier for a transaction
 * @returns A unique string identifier combining timestamp and random values
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Database row type
/**
 *
 */
interface TransactionRow {
    id: string;
    type: TransactionType;
    amount: number;
    date: string;
    category_id: string | null;
    wallet_id: string | null;
    from_wallet_id: string | null;
    to_wallet_id: string | null;
    fee: number | null;
    project_id: string | null;
    project_transaction_type: ProjectTransactionType | null;
    description: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Converts a database row to a Transaction object
 * Handles all transaction types: income, expense, transfer, and project
 * @param row - The database row containing transaction data
 * @returns A Transaction object with the appropriate type-specific fields
 * @throws Error if the transaction type is unknown
 */
function rowToTransaction(row: TransactionRow): Transaction {
    const base = {
        id: row.id,
        amount: row.amount,
        date: new Date(row.date),
        description: row.description ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };

    switch (row.type) {
        case 'income':
            return {
                ...base,
                type: 'income',
                walletId: row.wallet_id!,
                categoryId: row.category_id!,
            };
        case 'expense':
            return {
                ...base,
                type: 'expense',
                walletId: row.wallet_id!,
                categoryId: row.category_id!,
            };
        case 'transfer':
            return {
                ...base,
                type: 'transfer',
                fromWalletId: row.from_wallet_id!,
                toWalletId: row.to_wallet_id!,
                fee: row.fee ?? undefined,
            };
        case 'project':
            return {
                ...base,
                type: 'project',
                projectTransactionType: row.project_transaction_type!,
                projectId: row.project_id!,
                walletId: row.wallet_id!,
            };
        default: {
            const _exhaustiveCheck: never = row.type;
            throw new Error(`Unknown transaction type: ${String(_exhaustiveCheck)}`);
        }
    }
}

export const useTransactionStore = defineStore('transaction', () => {
    // State
    const transactions = ref<Transaction[]>([]);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    /**
     * Retrieves a transaction by its unique identifier
     * @param id - The transaction's unique identifier
     * @returns The transaction if found, undefined otherwise
     */
    const getTransactionById = (id: string): Transaction | undefined =>
        transactions.value.find((t: Transaction) => t.id === id);

    /**
     * Retrieves all transactions associated with a specific wallet
     * Includes transactions where the wallet is the source, destination, or both (for transfers)
     * @param walletId - The wallet's unique identifier
     * @returns Array of transactions involving the wallet
     */
    const getTransactionsByWalletId = (walletId: string): Transaction[] =>
        transactions.value.filter((t: Transaction) => {
            if (t.type === 'income' || t.type === 'expense' || t.type === 'project') {
                return t.walletId === walletId;
            }
            if (t.type === 'transfer') {
                return t.fromWalletId === walletId || t.toWalletId === walletId;
            }
            return false;
        });

    /**
     * Retrieves all transactions associated with a specific category
     * Only applicable to income and expense transactions
     * @param categoryId - The category's unique identifier
     * @returns Array of transactions in the category
     */
    const getTransactionsByCategoryId = (categoryId: string): Transaction[] =>
        transactions.value.filter((t: Transaction) => {
            if (t.type === 'income' || t.type === 'expense') {
                return t.categoryId === categoryId;
            }
            return false;
        });

    /**
     * Retrieves all transactions associated with a specific project
     * @param projectId - The project's unique identifier
     * @returns Array of project transactions (injections and dividends)
     */
    const getTransactionsByProjectId = (projectId: string): Transaction[] =>
        transactions.value.filter((t: Transaction) => {
            if (t.type === 'project') {
                return t.projectId === projectId;
            }
            return false;
        });

    /**
     * Filters transactions based on multiple criteria
     * Supports filtering by type, wallet, category, project, date range, month, and search text
     * @param filters - The filter criteria to apply
     * @returns Array of transactions matching all specified filters
     */
    const filterTransactions = (filters: TransactionFilters): Transaction[] => {
        return transactions.value.filter((t: Transaction) => {
            // Filter by type
            if (filters.type && filters.type !== 'all' && t.type !== filters.type) {
                return false;
            }

            // Filter by wallet
            if (filters.walletId) {
                if (t.type === 'transfer') {
                    if (t.fromWalletId !== filters.walletId && t.toWalletId !== filters.walletId) {
                        return false;
                    }
                } else if (t.type === 'income' || t.type === 'expense' || t.type === 'project') {
                    if (t.walletId !== filters.walletId) {
                        return false;
                    }
                }
            }

            // Filter by category
            if (filters.categoryId && (t.type === 'income' || t.type === 'expense')) {
                if (t.categoryId !== filters.categoryId) {
                    return false;
                }
            }

            // Filter by project
            if (filters.projectId) {
                // Only include project transactions for this specific project
                if (t.type !== 'project' || t.projectId !== filters.projectId) {
                    return false;
                }
            }

            // Filter by date range
            if (filters.startDate && t.date < filters.startDate) {
                return false;
            }
            if (filters.endDate && t.date > filters.endDate) {
                return false;
            }

            // Filter by month
            if (filters.month) {
                const transactionMonth = t.date.toISOString().slice(0, 7);
                if (transactionMonth !== filters.month) {
                    return false;
                }
            }

            // Filter by search
            if (filters.search) {
                const search = filters.search.toLowerCase();
                if (!t.description?.toLowerCase().includes(search)) {
                    return false;
                }
            }

            return true;
        });
    };

    /**
     * Loads all transactions from the database into the store
     * Only loads once; subsequent calls are no-ops if already initialized
     * @returns Promise that resolves when transactions are loaded
     */
    async function loadAll(): Promise<void> {
        if (isInitialized.value) return;
        isLoading.value = true;
        try {
            const rows = await query<TransactionRow>(
                'SELECT * FROM transactions ORDER BY date DESC',
            );
            transactions.value = rows.map(rowToTransaction);
            isInitialized.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Creates a new transaction in the database and adds it to the store
     * Automatically updates wallet balances and project totals as needed
     * @param data - The transaction creation data
     * @returns Promise resolving to the newly created transaction
     */
    async function create(data: CreateTransaction): Promise<Transaction> {
        isLoading.value = true;
        try {
            const now = new Date();
            const id = generateId();

            // Insert into database
            await execute(
                `INSERT INTO transactions (
          id, type, amount, date, category_id, wallet_id,
          from_wallet_id, to_wallet_id, fee, project_id,
          project_transaction_type, description, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    id,
                    data.type,
                    data.amount,
                    data.date.toISOString(),
                    data.type === 'income' || data.type === 'expense' ? data.categoryId : null,
                    data.type === 'income' || data.type === 'expense' || data.type === 'project'
                        ? data.walletId
                        : null,
                    data.type === 'transfer' ? data.fromWalletId : null,
                    data.type === 'transfer' ? data.toWalletId : null,
                    data.type === 'transfer' ? (data.fee ?? null) : null,
                    data.type === 'project' ? data.projectId : null,
                    data.type === 'project' ? data.projectTransactionType : null,
                    data.description ?? null,
                    now.toISOString(),
                    now.toISOString(),
                ],
            );

            // Update wallet balances
            await updateWalletBalances(data, 'create');

            // Update project totals if project transaction
            if (data.type === 'project') {
                await updateProjectTotals(
                    data.projectId,
                    data.projectTransactionType,
                    data.amount,
                    'add',
                );
            }

            // Create transaction object
            const transaction = createTransactionObject(id, data, now);
            transactions.value.unshift(transaction);

            return transaction;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Updates an existing transaction in the database and store
     * Reverts old wallet balances and project totals, then applies new values
     * @param id - The unique identifier of the transaction to update
     * @param data - The partial transaction data to update
     * @returns Promise resolving to the updated transaction, or null if not found
     */
    async function update(id: string, data: UpdateTransaction): Promise<Transaction | null> {
        isLoading.value = true;
        try {
            const existing = transactions.value.find((t: Transaction) => t.id === id);
            if (!existing) return null;

            // Revert old wallet balances
            await updateWalletBalances(existing, 'delete');

            // Revert old project totals if project transaction
            if (existing.type === 'project') {
                await updateProjectTotals(
                    existing.projectId,
                    existing.projectTransactionType,
                    existing.amount,
                    'subtract',
                );
            }

            const now = new Date();

            // Build update fields
            const updates: string[] = ['updated_at = ?'];
            const values: unknown[] = [now.toISOString()];

            if (data.amount !== undefined) {
                updates.push('amount = ?');
                values.push(data.amount);
            }
            if (data.date !== undefined) {
                updates.push('date = ?');
                values.push(data.date.toISOString());
            }
            if (data.description !== undefined) {
                updates.push('description = ?');
                values.push(data.description);
            }
            if (data.walletId !== undefined) {
                updates.push('wallet_id = ?');
                values.push(data.walletId);
            }
            if (data.categoryId !== undefined) {
                updates.push('category_id = ?');
                values.push(data.categoryId);
            }
            if (data.fromWalletId !== undefined) {
                updates.push('from_wallet_id = ?');
                values.push(data.fromWalletId);
            }
            if (data.toWalletId !== undefined) {
                updates.push('to_wallet_id = ?');
                values.push(data.toWalletId);
            }
            if (data.fee !== undefined) {
                updates.push('fee = ?');
                values.push(data.fee);
            }

            values.push(id);
            await execute(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ?`, values);

            // Create updated transaction object
            const updated = mergeTransactionUpdate(existing, data, now);

            // Apply new wallet balances
            await updateWalletBalances(updated, 'create');

            // Update new project totals if project transaction
            if (updated.type === 'project') {
                await updateProjectTotals(
                    updated.projectId,
                    updated.projectTransactionType,
                    updated.amount,
                    'add',
                );
            }

            // Update in memory
            const index = transactions.value.findIndex((t: Transaction) => t.id === id);
            if (index !== -1) {
                transactions.value[index] = updated;
            }

            return updated;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Deletes a transaction from the database and removes it from the store
     * Automatically reverts wallet balances and project totals
     * @param id - The unique identifier of the transaction to delete
     * @returns Promise resolving to true if deleted, false if not found
     */
    async function remove(id: string): Promise<boolean> {
        isLoading.value = true;
        try {
            const existing = transactions.value.find((t: Transaction) => t.id === id);
            if (!existing) return false;

            // Revert wallet balances
            await updateWalletBalances(existing, 'delete');

            // Revert project totals if project transaction
            if (existing.type === 'project') {
                await updateProjectTotals(
                    existing.projectId,
                    existing.projectTransactionType,
                    existing.amount,
                    'subtract',
                );
            }

            await execute('DELETE FROM transactions WHERE id = ?', [id]);

            const index = transactions.value.findIndex((t: Transaction) => t.id === id);
            if (index !== -1) {
                transactions.value.splice(index, 1);
            }

            return true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Updates wallet balances when a transaction is created or deleted
     * Handles all transaction types: income, expense, transfer, and project
     * @param data - The transaction data affecting the wallet balance
     * @param action - Whether creating or deleting the transaction
     */
    async function updateWalletBalances(
        data: CreateTransaction | Transaction,
        action: 'create' | 'delete',
    ): Promise<void> {
        const walletStore = useWalletStore();
        const multiplier = action === 'create' ? 1 : -1;

        switch (data.type) {
            case 'income': {
                const wallet = walletStore.getWalletById(data.walletId);
                if (wallet) {
                    const newBalance = wallet.balance + data.amount * multiplier;
                    await walletStore.updateBalance(wallet.id, newBalance);
                } else {
                    console.error('[updateWalletBalances] Wallet not found:', data.walletId);
                }
                break;
            }
            case 'expense': {
                const wallet = walletStore.getWalletById(data.walletId);
                if (wallet) {
                    const newBalance = wallet.balance - data.amount * multiplier;
                    await walletStore.updateBalance(wallet.id, newBalance);
                } else {
                    console.error('[updateWalletBalances] Wallet not found:', data.walletId);
                }
                break;
            }
            case 'transfer': {
                const fromWallet = walletStore.getWalletById(data.fromWalletId);
                const toWallet = walletStore.getWalletById(data.toWalletId);
                const fee = data.fee ?? 0;

                if (fromWallet) {
                    await walletStore.updateBalance(
                        fromWallet.id,
                        fromWallet.balance - (data.amount + fee) * multiplier,
                    );
                }
                if (toWallet) {
                    await walletStore.updateBalance(
                        toWallet.id,
                        toWallet.balance + data.amount * multiplier,
                    );
                }
                break;
            }
            case 'project': {
                const wallet = walletStore.getWalletById(data.walletId);
                if (wallet) {
                    if (data.projectTransactionType === 'injection') {
                        await walletStore.updateBalance(
                            wallet.id,
                            wallet.balance - data.amount * multiplier,
                        );
                    } else {
                        await walletStore.updateBalance(
                            wallet.id,
                            wallet.balance + data.amount * multiplier,
                        );
                    }
                }
                break;
            }
        }
    }

    /**
     * Updates project totals (invested or dividends) when project transactions are created or deleted
     * @param projectId - The project's unique identifier
     * @param type - The type of project transaction (injection or dividend)
     * @param amount - The transaction amount
     * @param action - Whether to add or subtract from the project total
     */
    async function updateProjectTotals(
        projectId: string,
        type: ProjectTransactionType,
        amount: number,
        action: 'add' | 'subtract',
    ): Promise<void> {
        const multiplier = action === 'add' ? 1 : -1;
        const column = type === 'injection' ? 'total_invested' : 'total_dividends';

        await execute(
            `UPDATE projects SET ${column} = ${column} + ?, updated_at = ? WHERE id = ?`,
            [amount * multiplier, new Date().toISOString(), projectId],
        );
    }

    /**
     * Creates a Transaction object from creation data
     * @param id - The transaction's unique identifier
     * @param data - The transaction creation data
     * @param now - The current timestamp for createdAt and updatedAt
     * @returns A properly typed Transaction object
     */
    function createTransactionObject(id: string, data: CreateTransaction, now: Date): Transaction {
        const base = {
            id,
            amount: data.amount,
            date: data.date,
            description: data.description,
            createdAt: now,
            updatedAt: now,
        };

        switch (data.type) {
            case 'income':
                return {
                    ...base,
                    type: 'income',
                    walletId: data.walletId,
                    categoryId: data.categoryId,
                };
            case 'expense':
                return {
                    ...base,
                    type: 'expense',
                    walletId: data.walletId,
                    categoryId: data.categoryId,
                };
            case 'transfer':
                return {
                    ...base,
                    type: 'transfer',
                    fromWalletId: data.fromWalletId,
                    toWalletId: data.toWalletId,
                    fee: data.fee,
                };
            case 'project':
                return {
                    ...base,
                    type: 'project',
                    projectTransactionType: data.projectTransactionType,
                    projectId: data.projectId,
                    walletId: data.walletId,
                };
        }
    }

    /**
     * Merges update data with an existing transaction to create an updated Transaction object
     * @param existing - The existing transaction to update
     * @param data - The partial update data to apply
     * @param now - The current timestamp for updatedAt
     * @returns A new Transaction object with the updates applied
     */
    function mergeTransactionUpdate(
        existing: Transaction,
        data: UpdateTransaction,
        now: Date,
    ): Transaction {
        const base = {
            id: existing.id,
            amount: data.amount ?? existing.amount,
            date: data.date ?? existing.date,
            description: data.description ?? existing.description,
            createdAt: existing.createdAt,
            updatedAt: now,
        };

        switch (existing.type) {
            case 'income':
                return {
                    ...base,
                    type: 'income',
                    walletId: data.walletId ?? existing.walletId,
                    categoryId: data.categoryId ?? existing.categoryId,
                };
            case 'expense':
                return {
                    ...base,
                    type: 'expense',
                    walletId: data.walletId ?? existing.walletId,
                    categoryId: data.categoryId ?? existing.categoryId,
                };
            case 'transfer':
                return {
                    ...base,
                    type: 'transfer',
                    fromWalletId: data.fromWalletId ?? existing.fromWalletId,
                    toWalletId: data.toWalletId ?? existing.toWalletId,
                    fee: data.fee ?? existing.fee,
                };
            case 'project':
                return {
                    ...base,
                    type: 'project',
                    projectTransactionType:
                        data.projectTransactionType ?? existing.projectTransactionType,
                    projectId: data.projectId ?? existing.projectId,
                    walletId: data.walletId ?? existing.walletId,
                };
        }
    }

    /**
     * Retrieves transactions with related entity data for display purposes
     * Includes wallet, category, master category, and project information
     * Results are sorted by date descending (most recent first)
     * @param filters - Optional filters to apply to the transactions
     * @returns Array of transactions enriched with related entity information
     */
    function getTransactionsWithRelations(
        filters?: TransactionFilters,
    ): TransactionWithRelations[] {
        const walletStore = useWalletStore();
        const categoryStore = useCategoryStore();
        const masterCategoryStore = useMasterCategoryStore();
        const projectStore = useProjectStore();

        const filtered = filters ? filterTransactions(filters) : transactions.value;

        // Sort by date descending (most recent first)
        const sorted = [...filtered].sort((a, b) => b.date.getTime() - a.date.getTime());

        return sorted.map((t: Transaction) => {
            const base: TransactionWithRelations = {
                id: t.id,
                type: t.type,
                amount: t.amount,
                date: t.date,
                description: t.description,
                createdAt: t.createdAt,
                updatedAt: t.updatedAt,
            };

            if (t.type === 'income' || t.type === 'expense') {
                const wallet = walletStore.getWalletById(t.walletId);
                const category = categoryStore.getCategoryById(t.categoryId);
                const masterCategory = category
                    ? masterCategoryStore.getMasterCategoryById(category.masterCategoryId)
                    : undefined;

                return {
                    ...base,
                    walletId: t.walletId,
                    categoryId: t.categoryId,
                    wallet: wallet
                        ? {
                              id: wallet.id,
                              name: wallet.name,
                              icon: wallet.icon,
                              currency: wallet.currency,
                          }
                        : undefined,
                    category: category
                        ? {
                              id: category.id,
                              name: category.name,
                              icon: category.icon,
                              masterCategory: masterCategory
                                  ? {
                                        id: masterCategory.id,
                                        name: masterCategory.name,
                                        icon: masterCategory.icon,
                                        color: masterCategory.color,
                                    }
                                  : undefined,
                          }
                        : undefined,
                };
            }

            if (t.type === 'transfer') {
                const fromWallet = walletStore.getWalletById(t.fromWalletId);
                const toWallet = walletStore.getWalletById(t.toWalletId);

                return {
                    ...base,
                    fromWalletId: t.fromWalletId,
                    toWalletId: t.toWalletId,
                    fee: t.fee,
                    fromWallet: fromWallet
                        ? {
                              id: fromWallet.id,
                              name: fromWallet.name,
                              icon: fromWallet.icon,
                              currency: fromWallet.currency,
                          }
                        : undefined,
                    toWallet: toWallet
                        ? {
                              id: toWallet.id,
                              name: toWallet.name,
                              icon: toWallet.icon,
                              currency: toWallet.currency,
                          }
                        : undefined,
                };
            }

            if (t.type === 'project') {
                const wallet = walletStore.getWalletById(t.walletId);
                const project = projectStore.getProjectById(t.projectId);

                return {
                    ...base,
                    walletId: t.walletId,
                    projectId: t.projectId,
                    projectTransactionType: t.projectTransactionType,
                    wallet: wallet
                        ? {
                              id: wallet.id,
                              name: wallet.name,
                              icon: wallet.icon,
                              currency: wallet.currency,
                          }
                        : undefined,
                    project: project ? { id: project.id, name: project.name } : undefined,
                };
            }

            return base;
        });
    }

    return {
        // State
        transactions,
        isLoading,
        isInitialized,
        // Getters
        getTransactionById,
        getTransactionsByWalletId,
        getTransactionsByCategoryId,
        getTransactionsByProjectId,
        filterTransactions,
        getTransactionsWithRelations,
        // Actions
        loadAll,
        create,
        update,
        remove,
    };
});
