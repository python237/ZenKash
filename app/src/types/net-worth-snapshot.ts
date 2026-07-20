import type { CurrencyCode } from './currency';

/**
 * The individual components that make up the total net worth.
 * All values are expressed in the user's default currency.
 */
export interface NetWorthComponents {
    /** Sum of non-game wallet balances (available liquidity) */
    liquid: number;
    /** Current market value of all investment assets (quantity × rate) */
    investments: number;
    /** Sum of game-platform wallet balances (funds parked on betting platforms) */
    games: number;
    /** Total net worth (liquid + investments + games) */
    total: number;
}

/**
 * A point-in-time snapshot of the user's total net worth for a given month.
 * Snapshots are captured periodically since wallet balances are only stored
 * as their current value and cannot be reconstructed retroactively.
 */
export interface NetWorthSnapshot extends NetWorthComponents {
    /** Unique identifier for the snapshot */
    id: string;
    /** Target period in format "YYYY-MM" (e.g., "2024-01"), unique per month */
    period: string;
    /** Timestamp when the snapshot was captured */
    date: Date;
    /** Currency in which the values are expressed */
    currency: CurrencyCode;
    /** Timestamp when the snapshot record was created */
    createdAt: Date;
    /** Timestamp when the snapshot record was last updated */
    updatedAt: Date;
}

/**
 * Data required to create or upsert a net worth snapshot.
 * Excludes auto-generated fields (id, createdAt, updatedAt).
 */
export interface CreateNetWorthSnapshot extends NetWorthComponents {
    /** Target period in format "YYYY-MM" */
    period: string;
    /** Timestamp when the snapshot was captured */
    date: Date;
    /** Currency in which the values are expressed */
    currency: CurrencyCode;
}

/**
 * Difference between the latest snapshot and the previous one.
 * Used to display net worth trend indicators.
 */
export interface NetWorthDelta {
    /** Absolute change in total net worth */
    amount: number;
    /** Percentage change relative to the previous snapshot */
    percent: number;
}
