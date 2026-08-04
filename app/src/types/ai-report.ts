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
}

/** One month of the report. */
export interface ReportMonth {
    /** Localized month label */
    label: string;
    /** Incoming flows */
    inflow: number;
    /** Outgoing flows */
    outflow: number;
    /** `inflow - outflow` */
    net: number;
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
        /** Outgoing flows */
        outflow: number;
        /** `inflow - outflow` */
        net: number;
        /** `net / inflow` in percent */
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
