import type { CurrencyCode } from './currency';

/**
 * A savings goal tracked against a dedicated wallet.
 * Progress is derived from the linked wallet's balance; the target amount is
 * expressed in that wallet's currency.
 */
export interface SavingsGoal {
    /** Unique identifier for the goal */
    id: string;
    /** Display name of the goal (e.g. "Emergency fund") */
    name: string;
    /** Optional Material icon name */
    icon?: string | undefined;
    /** Target amount to reach, in the linked wallet's currency */
    targetAmount: number;
    /** Wallet whose balance represents the current progress */
    walletId: string;
    /** Optional target date to reach the goal */
    deadline?: Date | undefined;
    /** Timestamp when the goal was created */
    createdAt: Date;
    /** Timestamp when the goal was last updated */
    updatedAt: Date;
}

/**
 * Data required to create a new savings goal.
 * Excludes auto-generated fields (id, createdAt, updatedAt).
 */
export interface CreateSavingsGoal {
    /** Display name of the goal */
    name: string;
    /** Optional Material icon name */
    icon?: string | undefined;
    /** Target amount to reach */
    targetAmount: number;
    /** Wallet whose balance represents the current progress */
    walletId: string;
    /** Optional target date */
    deadline?: Date | undefined;
}

/**
 * Data for updating an existing savings goal.
 * All fields optional to allow partial updates.
 */
export type UpdateSavingsGoal = Partial<CreateSavingsGoal>;

/**
 * Savings goal enriched with computed progress and deadline projection.
 * Used for displaying goals in the UI.
 */
export interface SavingsGoalWithStats extends SavingsGoal {
    /** Currency the amounts are expressed in (from the linked wallet) */
    currency: CurrencyCode;
    /** Current amount saved (linked wallet balance) */
    currentAmount: number;
    /** Amount still needed to reach the target (never negative) */
    remaining: number;
    /** Progress percentage, capped at 100 */
    percent: number;
    /** Whether the target has been reached */
    isReached: boolean;
    /** Whether the linked wallet still exists */
    walletExists: boolean;
    /** Number of whole months left until the deadline (0 if past/none) */
    monthsLeft: number | null;
    /** Amount to save per month to reach the target by the deadline */
    requiredMonthly: number | null;
    /** Whether progress is at or above the expected linear pace, if a deadline is set */
    onTrack: boolean | null;
}
