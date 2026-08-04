/**
 * AI Report Types
 *
 * Shapes of the data snapshot sent for external analysis, and the options the
 * user controls before it leaves the device.
 * @module types/ai-report
 */

/** How much history the report covers. */
export type ReportWindow = 3 | 6 | 12;

/** Language the report body is written in. */
export type ReportLanguage = 'fr' | 'en';

/** User-controlled options applied before the report is generated. */
export interface AiReportOptions {
    /** Number of months of history to include */
    window: ReportWindow;
    /** Include absolute amounts; when false only shares and rates are sent */
    includeAmounts: boolean;
    /** Replace category and commitment names with neutral labels */
    anonymizeLabels: boolean;
    /** Language of the generated report */
    language: ReportLanguage;
    /** Amount above which an expense is listed individually, in the default currency */
    largeExpenseThreshold: number;
}

/** One month of the report. */
export interface ReportMonth {
    /** Localized month label */
    label: string;
    /** Incoming flows */
    inflow: number;
    /** Outgoing flows actually consumed */
    outflow: number;
    /** `inflow - outflow` */
    net: number;
    /** Income not consumed: `inflow - spending` */
    savings: number;
    /** `net / inflow` in percent */
    savingsRate: number;
}

/** One grouping line of the report. */
export interface ReportGroup {
    /** Display name, replaced when anonymizing */
    name: string;
    /** Amount over the whole window */
    amount: number;
    /** Share of its direction's total, in percent */
    percent: number;
}

/** One active recurring commitment. */
export interface ReportCommitment {
    /** Display name, replaced when anonymizing */
    name: string;
    /** Amount of each occurrence */
    amount: number;
    /** Localized frequency label */
    frequency: string;
    /** Whether the commitment is an income or an expense */
    direction: 'in' | 'out';
}

/** One budget of the current month. */
export interface ReportBudget {
    /** Display name, replaced when anonymizing */
    name: string;
    /** Budgeted amount */
    amount: number;
    /** Amount already spent */
    spent: number;
    /** Share of the budget used, in percent */
    percentUsed: number;
}

/** Progress of one savings goal. */
export interface ReportGoal {
    /** Display name, replaced when anonymizing */
    name: string;
    /** Amount saved so far */
    current: number;
    /** Amount to reach */
    target: number;
    /** Share of the target reached, in percent */
    percent: number;
    /** Monthly amount still required to meet the deadline, when one is set */
    requiredMonthly?: number | undefined;
    /** Months left before the deadline, when one is set */
    monthsLeft?: number | undefined;
}

/** One line of the detailed net worth. */
export interface ReportAsset {
    /** Display name, replaced when anonymizing */
    name: string;
    /** What kind of holding it is */
    kind: 'wallet' | 'investment' | 'project';
    /** Current value of the holding */
    value: number;
    /** Amount put in, for investments and projects */
    invested?: number | undefined;
    /** Dividends received, for projects */
    dividends?: number | undefined;
}

/** One individually listed transaction. */
export interface ReportEntry {
    /** Localized short date */
    date: string;
    /** Description, or the category name when there is none */
    label: string;
    /** Category name, when it adds information to the label */
    category?: string | undefined;
    /** Amount in the default currency */
    amount: number;
}

/** Entries of one month, for the large-expense listing. */
export interface ReportMonthEntries {
    /** Localized month label */
    label: string;
    /** Entries of the month, largest first */
    entries: ReportEntry[];
}

/** One net worth data point. */
export interface ReportNetWorth {
    /** Localized period label */
    label: string;
    /** Total net worth at that point */
    total: number;
}

/** Everything the report is built from. */
export interface AiReportData {
    /** Default currency code, for example `XOF` */
    currency: string;
    /** Localized label of the covered period */
    periodLabel: string;
    /** Totals over the whole window */
    totals: {
        /** Incoming flows */
        inflow: number;
        /** Outgoing flows actually consumed */
        spending: number;
        /** Outgoing flows reallocated (projects, games), never counted as spending */
        allocated: number;
        /** `inflow - spending - allocated` */
        net: number;
        /** Share of income not consumed, in percent */
        savingsRate: number;
    };
    /** Month-by-month figures, oldest first */
    months: ReportMonth[];
    /** Expenses grouped by master category, largest first */
    expenseGroups: ReportGroup[];
    /** Income grouped by master category, largest first */
    incomeGroups: ReportGroup[];
    /** Active recurring commitments */
    commitments: ReportCommitment[];
    /** Budgets of the current month */
    budgets: ReportBudget[];
    /** Net worth history over the window */
    netWorth: ReportNetWorth[];
    /** Savings goals and their progress */
    goals: ReportGoal[];
    /** Detailed net worth, holding by holding */
    assets: ReportAsset[];
    /** Individual income transactions, most recent first */
    incomes: ReportEntry[];
    /** How many income transactions exist in the window, to disclose any capping */
    incomeTotalCount: number;
    /** Expenses above the threshold, grouped by month */
    largeExpenses: ReportMonthEntries[];
}

/** Formatters injected into the builder so it stays free of locale concerns. */
export interface ReportFormatters {
    /**
     * Formats a monetary amount.
     * @param amount - Amount in the default currency
     * @returns The formatted amount
     */
    amount: (amount: number) => string;
    /**
     * Formats a percentage.
     * @param value - Percentage value
     * @returns The formatted percentage
     */
    percent: (value: number) => string;
}
