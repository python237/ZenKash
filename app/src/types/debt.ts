import type { CurrencyCode } from './currency';

/**
 * Which way the money went.
 * - `lent`: you gave money out and expect it back — a receivable
 * - `borrowed`: you received money you owe back — a payable
 */
export type DebtDirection = 'lent' | 'borrowed';

/**
 * Money lent to, or borrowed from, someone.
 *
 * A loan is **not an expense**: the money is reallocated, not consumed, exactly
 * like a project injection. Recording it as an expense would inflate spending
 * and crush the savings rate, which is why it gets its own entity and its own
 * `allocation` flows.
 */
export interface Debt {
    /** Unique identifier */
    id: string;
    /** Person or organization on the other side */
    counterparty: string;
    /** Whether the money went out (lent) or came in (borrowed) */
    direction: DebtDirection;
    /** Sum of the principal movements recorded, in the linked wallet's currency */
    principal: number;
    /** Sum of the repayments recorded so far */
    totalRepaid: number;
    /** Wallet the money left from, or landed in */
    walletId: string;
    /** Optional date the balance is expected to be settled */
    dueDate?: Date | undefined;
    /** Optional free-text note */
    description?: string | undefined;
    /** Timestamp when the record was created */
    createdAt: Date;
    /** Timestamp when the record was last updated */
    updatedAt: Date;
}

/**
 * Data required to create a debt.
 *
 * The principal is deliberately absent: it is the sum of the debt's `principal`
 * transactions, exactly as a project's invested total is the sum of its
 * injections. Recording it here as well would count the money twice.
 */
export interface CreateDebt {
    /** Person or organization on the other side */
    counterparty: string;
    /** Whether the money goes out (lent) or comes in (borrowed) */
    direction: DebtDirection;
    /** Wallet the money leaves from, or lands in */
    walletId: string;
    /** Optional due date */
    dueDate?: Date | undefined;
    /** Optional note */
    description?: string | undefined;
}

/**
 * Data for updating a debt. The direction never changes — it would invert every
 * movement already recorded — and the principal moves through transactions only.
 */
export type UpdateDebt = Partial<Omit<CreateDebt, 'direction'>>;

/** A debt enriched with the figures the UI needs. */
export interface DebtWithStats extends Debt {
    /** Currency the amounts are expressed in (from the linked wallet) */
    currency: CurrencyCode;
    /** Amount still owed, never negative */
    outstanding: number;
    /** Share of the principal already repaid, capped at 100 */
    percentRepaid: number;
    /** Whether nothing is outstanding any more */
    isSettled: boolean;
    /** Whether the due date has passed while an amount is still outstanding */
    isOverdue: boolean;
    /** Whole days left until the due date, null when there is none */
    daysLeft: number | null;
    /** Whether the linked wallet still exists */
    walletExists: boolean;
}
