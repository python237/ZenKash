/**
 * Analytics Types
 *
 * Shared vocabulary for the analytics screens: period selection, filters and the
 * normalized cash-flow representation every aggregation is built on.
 *
 * A "flow" is one directional movement of money derived from a transaction.
 * A single transaction can produce more than one flow (a transfer with a fee
 * produces the transfer itself plus a fee flow), which is why aggregations work
 * on flows and never directly on transactions.
 * @module types/analytics
 */

import type { CurrencyCode } from './currency';

/** Time bucket size used to build evolution series. */
export type Granularity = 'week' | 'month' | 'quarter';

/** Named period shortcuts offered in the UI. */
export type PeriodPreset =
    | 'currentMonth'
    | 'last3Months'
    | 'last6Months'
    | 'last12Months'
    | 'yearToDate'
    | 'custom';

/** Dimension used to group breakdown rows. */
export type BreakdownDimension = 'masterCategory' | 'category' | 'wallet';

/** Direction of a cash flow relative to the user's own money. */
export type FlowDirection = 'in' | 'out';

/**
 * Coarse flow families the user can toggle on and off. They map 1:1 to the
 * filter checkboxes and always partition the data (no flow belongs to two).
 */
export type FlowGroup = 'expense' | 'income' | 'game' | 'project' | 'fee';

/** Precise nature of a flow, kept for labelling and future drill-downs. */
export type FlowKind =
    | 'income'
    | 'expense'
    | 'gameDeposit'
    | 'gameWithdrawal'
    | 'projectInjection'
    | 'projectDividend'
    | 'transferFee';

/** Half-open date range used for every period computation. */
export interface DateRange {
    /** Inclusive lower bound */
    start: Date;
    /** Inclusive upper bound */
    end: Date;
}

/**
 * Complete filter state of the analytics screens. Shared by every tab so the
 * user never re-enters a selection when switching views.
 */
export interface AnalyticsFilters {
    /** Selected period shortcut */
    preset: PeriodPreset;
    /** Explicit range, only used when `preset` is `'custom'` */
    customRange: DateRange | null;
    /** Bucket size for time series */
    granularity: Granularity;
    /** Flow families to include */
    groups: FlowGroup[];
    /** Restrict to these master categories (empty = all) */
    masterCategoryIds: string[];
    /** Restrict to these categories (empty = all) */
    categoryIds: string[];
    /** Restrict to these wallets (empty = all) */
    walletIds: string[];
    /** Minimum flow amount in the default currency */
    amountMin: number | null;
    /** Maximum flow amount in the default currency */
    amountMax: number | null;
    /** Free-text search on the transaction description */
    search: string;
    /** Dimension used to group breakdown rows */
    dimension: BreakdownDimension;
}

/**
 * One directional movement of money, converted to the default currency and
 * enriched with the identifiers every aggregation needs.
 */
export interface NormalizedFlow {
    /** Stable identifier of the flow (transaction id, suffixed when a transaction yields several flows) */
    id: string;
    /** Identifier of the originating transaction */
    transactionId: string;
    /** Date of the transaction */
    date: Date;
    /** Precise nature of the flow */
    kind: FlowKind;
    /** Flow family used by the filters */
    group: FlowGroup;
    /** Whether money came in or went out */
    direction: FlowDirection;
    /** Amount, always positive, converted to the default currency */
    amount: number;
    /** Amount as originally recorded */
    originalAmount: number;
    /** Currency the amount was originally recorded in */
    currency: CurrencyCode;
    /** Wallet the flow is attached to, when applicable */
    walletId?: string | undefined;
    /** Category of the flow, for income and expenses */
    categoryId?: string | undefined;
    /** Master category of `categoryId`, resolved once */
    masterCategoryId?: string | undefined;
    /** Project the flow belongs to, for project transactions */
    projectId?: string | undefined;
    /** Game the flow belongs to, for game transfers */
    gameId?: string | undefined;
    /** Free-text description of the transaction */
    description?: string | undefined;
}

/** Raw aggregation result before labels and colors are attached. */
export interface AggregateBucket {
    /** Grouping key, or `'other'` for the folded remainder */
    key: string;
    /** Sum of the flow amounts in the default currency */
    amount: number;
    /** Number of flows in the bucket */
    count: number;
}

/** A breakdown row ready to render. */
export interface BreakdownRow extends AggregateBucket {
    /** Human-readable label */
    name: string;
    /** Material icon name */
    icon?: string | undefined;
    /** Color used in the chart and the list marker */
    color: string;
    /** Share of the total, in percent */
    percent: number;
    /** Whether tapping the row can drill one level deeper */
    drillable: boolean;
}

/** Headline figures for a period. */
export interface PeriodSummary {
    /** Period the figures were computed on */
    range: DateRange;
    /** Sum of every incoming flow */
    inflow: number;
    /** Sum of every outgoing flow */
    outflow: number;
    /** `inflow - outflow` over the selected groups */
    net: number;
    /** `net / inflow` in percent, 0 when there is no inflow */
    savingsRate: number;
    /** Number of flows */
    count: number;
    /** Average outflow per day over the period */
    dailyAverage: number;
    /** Largest single outflow */
    largestOutflow: number;
}

/** A figure compared with the previous, equally long period. */
export interface Delta {
    /** Absolute difference */
    amount: number;
    /** Relative difference in percent, 0 when the baseline is 0 */
    percent: number;
}
