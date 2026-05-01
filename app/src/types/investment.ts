import type { CurrencyCode } from './currency';

/**
 * Types of investment assets supported in the application.
 * - stock: Traditional securities (e.g., BRVM stocks)
 * - crypto: Cryptocurrency assets (e.g., Bitcoin, Ethereum)
 * - other: Other investment types (e.g., real estate, commodities)
 */
export type InvestmentType = 'stock' | 'crypto' | 'other';

/**
 * Represents an investment asset in the user's portfolio.
 * Can be stocks, cryptocurrency, real estate, or other asset types.
 * Value is tracked through quantity and current rate.
 */
export interface InvestmentItem {
    /** Unique identifier for the investment */
    id: string;
    /** Display name of the investment (e.g., "SONATEL", "Bitcoin") */
    label: string;
    /** Type classification of the investment */
    type: InvestmentType;
    /** Number of units currently held */
    quantity: number;
    /** Current market rate per unit */
    currentRate: number;
    /** Currency in which the investment is denominated */
    currency: CurrencyCode;
    /** Wallet from which funds were used for purchases */
    walletId: string;
    /** Timestamp when the investment was first created */
    createdAt: Date;
    /** Timestamp when the investment was last updated */
    updatedAt: Date;
}

/**
 * Data required to create a new investment item.
 * Excludes auto-generated fields (id, createdAt, updatedAt).
 */
export type CreateInvestmentItem = Omit<InvestmentItem, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Data for updating an existing investment item.
 * Only label and currentRate can be updated directly.
 * Type is immutable, and quantity is updated via transactions.
 */
export type UpdateInvestmentItem = Partial<Pick<InvestmentItem, 'label' | 'currentRate'>>;

/**
 * Historical record of an investment's rate/price.
 * Used to track price evolution over time and generate charts.
 */
export interface RateHistory {
    /** Unique identifier for the history entry */
    id: string;
    /** Reference to the investment item */
    investmentItemId: string;
    /** Rate/price at the recorded time */
    rate: number;
    /** Date when this rate was recorded */
    date: Date;
}

/**
 * Types of investment transactions.
 * - buy: Purchasing additional units
 * - sell: Selling existing units
 */
export type InvestmentTransactionType = 'buy' | 'sell';

/**
 * Represents a buy or sell transaction for an investment.
 * These transactions update the investment's quantity.
 */
export interface InvestmentTransaction {
    /** Unique identifier for the transaction */
    id: string;
    /** Reference to the investment item being traded */
    investmentItemId: string;
    /** Whether this is a buy or sell transaction */
    type: InvestmentTransactionType;
    /** Number of units bought or sold */
    quantity: number;
    /** Price paid or received per unit */
    pricePerUnit: number;
    /** Date when the transaction occurred */
    date: Date;
    /** Timestamp when the record was created */
    createdAt: Date;
}

/**
 * Data required to create a new investment transaction.
 * Excludes auto-generated fields (id, createdAt).
 */
export type CreateInvestmentTransaction = Omit<InvestmentTransaction, 'id' | 'createdAt'>;

/**
 * Computed performance statistics for a single investment.
 * Calculated from transaction history and current rate.
 */
export interface InvestmentStats {
    /** Total amount invested (sum of all purchases) */
    totalInvested: number;
    /** Current portfolio value (quantity × currentRate) */
    currentValue: number;
    /** Absolute gain or loss (currentValue - totalInvested) */
    gainLoss: number;
    /** Percentage gain or loss ((gainLoss / totalInvested) × 100) */
    gainLossPercent: number;
    /** Visual health indicator based on performance */
    health: 'positive' | 'negative' | 'neutral';
}

/**
 * Aggregated investment statistics for the dashboard.
 * Provides portfolio-wide overview and breakdown by investment type.
 */
export interface InvestmentSummary {
    /** Total amount invested across all investments */
    totalInvested: number;
    /** Current value of entire portfolio */
    totalCurrentValue: number;
    /** Overall gain/loss across portfolio */
    totalGainLoss: number;
    /** Overall percentage gain/loss */
    totalGainLossPercent: number;
    /** Number of investment items in portfolio */
    itemCount: number;
    /** Statistics grouped by investment type */
    byType: Record<
        InvestmentType,
        {
            /** Number of investments of this type */
            count: number;
            /** Total invested in this type */
            invested: number;
            /** Current value of this type */
            currentValue: number;
        }
    >;
}
