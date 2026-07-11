/**
 * Lifecycle status of a bet.
 * - pending: placed, not yet resolved (stake already deducted from the game wallet)
 * - won: resolved as a win (payout credited to the game wallet)
 * - lost: resolved as a loss (stake kept)
 */
export type BetStatus = 'pending' | 'won' | 'lost';

/**
 * Represents a single bet placed on a game platform.
 * Placing a bet immediately deducts its stake from the game wallet.
 * Resolving it as won credits the payout; resolving as lost keeps the stake.
 * Bets are NOT transactions: they never appear in the transactions ledger
 * nor in income/expense reports.
 */
export interface Bet {
    /** Unique identifier for the bet */
    id: string;
    /** Identifier of the game this bet belongs to */
    gameId: string;
    /** Amount staked (always positive) */
    stake: number;
    /** Current lifecycle status */
    status: BetStatus;
    /** Amount won (defined only when status is 'won') */
    payout?: number | undefined;
    /** Timestamp when the bet was placed */
    placedAt: Date;
    /** Timestamp when the bet was resolved (undefined while pending) */
    resolvedAt?: Date | undefined;
    /** Optional description */
    description?: string | undefined;
    /** Timestamp when the bet record was created */
    createdAt: Date;
    /** Timestamp when the bet record was last updated */
    updatedAt: Date;
}

/**
 * Data required to place a new bet.
 */
export interface CreateBet {
    /** Identifier of the game this bet belongs to */
    gameId: string;
    /** Amount staked (always positive) */
    stake: number;
    /** Date the bet was placed */
    placedAt: Date;
    /** Optional description */
    description?: string | undefined;
}

/**
 * Data for editing an existing bet's details (not its outcome).
 * Use resolve() to change a bet's status/payout.
 */
export interface UpdateBet {
    /** Amount staked (always positive) */
    stake?: number | undefined;
    /** Date the bet was placed */
    placedAt?: Date | undefined;
    /** Optional description */
    description?: string | undefined;
}

/**
 * Data required to resolve a pending bet.
 * A payout is required when the outcome is 'won'.
 */
export interface ResolveBet {
    /** Resolution outcome */
    status: 'won' | 'lost';
    /** Amount won (required when status is 'won') */
    payout?: number | undefined;
}
