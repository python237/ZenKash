import type { CurrencyCode } from './currency';

/**
 * Core transaction types stored in the database.
 * - income: Money received (salary, freelance payments, etc.)
 * - expense: Money spent (purchases, bills, etc.)
 * - transfer: Money moved between wallets
 * - project: Investment project injections or dividends
 */
export type TransactionType = 'income' | 'expense' | 'transfer' | 'project';

/**
 * Extended transaction types for UI display purposes.
 * Includes 'investment' which is stored separately but shown alongside regular transactions.
 */
export type DisplayTransactionType = TransactionType | 'investment';

/**
 * Subtypes for project transactions.
 * - injection: Money invested into a project
 * - dividend: Returns received from a project
 */
export type ProjectTransactionType = 'injection' | 'dividend';

/**
 * Subtypes for investment transactions in display contexts.
 * - buy: Purchasing investment units
 * - sell: Selling investment units
 */
export type InvestmentDisplayType = 'buy' | 'sell';

/**
 * Base interface for all transaction types.
 * Contains common fields shared across all transaction variants.
 */
export interface BaseTransaction {
    /** Unique identifier for the transaction */
    id: string;
    /** Type discriminator for the transaction */
    type: TransactionType;
    /** Transaction amount (always positive) */
    amount: number;
    /** Date when the transaction occurred */
    date: Date;
    /** Optional user-provided description or note */
    description?: string | undefined;
    /** Timestamp when the record was created */
    createdAt: Date;
    /** Timestamp when the record was last updated */
    updatedAt: Date;
}

/**
 * Represents income received into a wallet.
 * Examples: salary, freelance payment, gift received.
 */
export interface IncomeTransaction extends BaseTransaction {
    /** Type discriminator */
    type: 'income';
    /** Wallet receiving the income */
    walletId: string;
    /** Category classifying the income source */
    categoryId: string;
}

/**
 * Represents an expense from a wallet.
 * Examples: rent payment, grocery purchase, utility bill.
 */
export interface ExpenseTransaction extends BaseTransaction {
    /** Type discriminator */
    type: 'expense';
    /** Wallet from which money is spent */
    walletId: string;
    /** Category classifying the expense type */
    categoryId: string;
}

/**
 * Represents a transfer between two wallets.
 * Used for moving money between accounts without categorization.
 */
export interface TransferTransaction extends BaseTransaction {
    /** Type discriminator */
    type: 'transfer';
    /** Wallet from which money is sent */
    fromWalletId: string;
    /** Wallet receiving the money */
    toWalletId: string;
    /** Optional transfer fee deducted from source wallet */
    fee?: number | undefined;
}

/**
 * Represents a project-related transaction (injection or dividend).
 * Links financial flows to investment projects.
 */
export interface ProjectTransaction extends BaseTransaction {
    /** Type discriminator */
    type: 'project';
    /** Whether this is an injection (out) or dividend (in) */
    projectTransactionType: ProjectTransactionType;
    /** Reference to the associated project */
    projectId: string;
    /** Source wallet for injections, destination for dividends */
    walletId: string;
}

/**
 * Union type representing any valid transaction.
 * Use type guards or switch on 'type' to handle specific variants.
 */
export type Transaction =
    | IncomeTransaction
    | ExpenseTransaction
    | TransferTransaction
    | ProjectTransaction;

/**
 * Data required to create a new income transaction.
 * Excludes auto-generated fields (id, createdAt, updatedAt).
 */
export interface CreateIncomeTransaction {
    /** Type discriminator */
    type: 'income';
    /** Transaction amount */
    amount: number;
    /** Date of the transaction */
    date: Date;
    /** Wallet receiving the income */
    walletId: string;
    /** Category for the income */
    categoryId: string;
    /** Optional description */
    description?: string | undefined;
}

/**
 * Data required to create a new expense transaction.
 * Excludes auto-generated fields (id, createdAt, updatedAt).
 */
export interface CreateExpenseTransaction {
    /** Type discriminator */
    type: 'expense';
    /** Transaction amount */
    amount: number;
    /** Date of the transaction */
    date: Date;
    /** Wallet from which to deduct */
    walletId: string;
    /** Category for the expense */
    categoryId: string;
    /** Optional description */
    description?: string | undefined;
}

/**
 * Data required to create a new transfer transaction.
 * Excludes auto-generated fields (id, createdAt, updatedAt).
 */
export interface CreateTransferTransaction {
    /** Type discriminator */
    type: 'transfer';
    /** Amount to transfer */
    amount: number;
    /** Date of the transfer */
    date: Date;
    /** Source wallet */
    fromWalletId: string;
    /** Destination wallet */
    toWalletId: string;
    /** Optional transfer fee */
    fee?: number | undefined;
    /** Optional description */
    description?: string | undefined;
}

/**
 * Data required to create a new project transaction.
 * Excludes auto-generated fields (id, createdAt, updatedAt).
 */
export interface CreateProjectTransaction {
    /** Type discriminator */
    type: 'project';
    /** Whether this is an injection or dividend */
    projectTransactionType: ProjectTransactionType;
    /** Transaction amount */
    amount: number;
    /** Date of the transaction */
    date: Date;
    /** Associated project */
    projectId: string;
    /** Wallet for the transaction */
    walletId: string;
    /** Optional description */
    description?: string | undefined;
}

/**
 *
 */
export type CreateTransaction =
    | CreateIncomeTransaction
    | CreateExpenseTransaction
    | CreateTransferTransaction
    | CreateProjectTransaction;

// For updating transactions (partial updates)
/**
 *
 */
export type UpdateTransaction = Partial<
    Pick<BaseTransaction, 'amount' | 'date' | 'description'>
> & {
    walletId?: string | undefined;
    categoryId?: string | undefined;
    fromWalletId?: string | undefined;
    toWalletId?: string | undefined;
    fee?: number | undefined;
    projectId?: string | undefined;
    projectTransactionType?: ProjectTransactionType | undefined;
};

// Transaction with related data for display
/**
 *
 */
export interface TransactionWithRelations extends Omit<BaseTransaction, 'type'> {
    type: DisplayTransactionType;
    wallet?:
        | {
              id: string;
              name: string;
              icon: string;
              currency: CurrencyCode;
          }
        | undefined;
    fromWallet?:
        | {
              id: string;
              name: string;
              icon: string;
              currency: CurrencyCode;
          }
        | undefined;
    toWallet?:
        | {
              id: string;
              name: string;
              icon: string;
              currency: CurrencyCode;
          }
        | undefined;
    category?:
        | {
              id: string;
              name: string;
              icon: string;
              masterCategory?:
                  | {
                        id: string;
                        name: string;
                        icon: string;
                        color: string;
                    }
                  | undefined;
          }
        | undefined;
    project?:
        | {
              id: string;
              name: string;
          }
        | undefined;
    // Investment-specific fields
    investment?:
        | {
              id: string;
              label: string;
              type: string;
              currency: CurrencyCode;
          }
        | undefined;
    investmentTransactionType?: InvestmentDisplayType | undefined;
    quantity?: number | undefined;
    pricePerUnit?: number | undefined;
    // For union type discrimination
    walletId?: string | undefined;
    categoryId?: string | undefined;
    fromWalletId?: string | undefined;
    toWalletId?: string | undefined;
    fee?: number | undefined;
    projectId?: string | undefined;
    projectTransactionType?: ProjectTransactionType | undefined;
}

// Transaction filters
/**
 *
 */
export interface TransactionFilters {
    type?: DisplayTransactionType | 'all' | undefined;
    walletId?: string | undefined;
    categoryId?: string | undefined;
    masterCategoryId?: string | undefined;
    projectId?: string | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    month?: string | undefined; // format: 'YYYY-MM'
    search?: string | undefined;
}

// Transaction summary for a period
/**
 *
 */
export interface TransactionSummary {
    totalIncome: number;
    totalExpense: number;
    totalTransferFees: number;
    totalProjectInjections: number;
    totalProjectDividends: number;
    netBalance: number; // income - expense - fees - injections + dividends
    transactionCount: number;
    byCategory: Record<
        string,
        {
            categoryId: string;
            categoryName: string;
            amount: number;
            count: number;
        }
    >;
    byWallet: Record<
        string,
        {
            walletId: string;
            walletName: string;
            income: number;
            expense: number;
            net: number;
        }
    >;
}
