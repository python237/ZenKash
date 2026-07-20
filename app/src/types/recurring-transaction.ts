/**
 * How often a recurring transaction repeats.
 */
export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

/**
 * The type of transaction a recurring rule generates.
 * Only income and expense are supported (transfers/projects are excluded).
 */
export type RecurringType = 'income' | 'expense';

/**
 * A recurring transaction template (e.g. salary, rent, subscription).
 * Generates real transactions automatically when due, and feeds cash-flow planning.
 */
export interface RecurringTransaction {
    /** Unique identifier for the recurring rule */
    id: string;
    /** Whether the generated transaction is an income or an expense */
    type: RecurringType;
    /** Amount of each generated transaction */
    amount: number;
    /** Category applied to the generated transaction */
    categoryId: string;
    /** Wallet the generated transaction is attached to */
    walletId: string;
    /** Optional description carried over to the generated transaction */
    description?: string | undefined;
    /** Repetition frequency */
    frequency: RecurringFrequency;
    /** Number of frequency units between occurrences (e.g. every 2 weeks) */
    intervalCount: number;
    /** Day of month (1-31) for monthly frequency; ignored otherwise */
    dayOfMonth?: number | undefined;
    /** Date of the first occurrence */
    startDate: Date;
    /** Optional date after which no more occurrences are generated */
    endDate?: Date | undefined;
    /** Date of the next occurrence to generate */
    nextRun: Date;
    /** Date of the last generated occurrence, if any */
    lastRun?: Date | undefined;
    /** Whether the rule is currently active */
    isActive: boolean;
    /** Whether occurrences post real transactions (true) or act as reminders only (false) */
    autoPost: boolean;
    /** Timestamp when the rule was created */
    createdAt: Date;
    /** Timestamp when the rule was last updated */
    updatedAt: Date;
}

/**
 * Data required to create a new recurring transaction rule.
 * Excludes auto-generated fields (id, nextRun, lastRun, createdAt, updatedAt).
 */
export interface CreateRecurringTransaction {
    /** Whether the generated transaction is an income or an expense */
    type: RecurringType;
    /** Amount of each generated transaction */
    amount: number;
    /** Category applied to the generated transaction */
    categoryId: string;
    /** Wallet the generated transaction is attached to */
    walletId: string;
    /** Optional description carried over to the generated transaction */
    description?: string | undefined;
    /** Repetition frequency */
    frequency: RecurringFrequency;
    /** Number of frequency units between occurrences */
    intervalCount: number;
    /** Day of month (1-31) for monthly frequency */
    dayOfMonth?: number | undefined;
    /** Date of the first occurrence */
    startDate: Date;
    /** Optional end date */
    endDate?: Date | undefined;
    /** Whether occurrences post real transactions */
    autoPost: boolean;
}

/**
 * Data for updating an existing recurring rule.
 * All fields optional to allow partial updates.
 */
export type UpdateRecurringTransaction = Partial<CreateRecurringTransaction>;

/**
 * A projected future occurrence of a recurring rule.
 * Computed on demand for planning; never persisted.
 */
export interface RecurringOccurrence {
    /** The recurring rule this occurrence belongs to */
    recurringId: string;
    /** Income or expense */
    type: RecurringType;
    /** Amount of the occurrence */
    amount: number;
    /** Wallet the occurrence targets */
    walletId: string;
    /** Category of the occurrence */
    categoryId: string;
    /** Optional description */
    description?: string | undefined;
    /** Date the occurrence falls on */
    date: Date;
}
