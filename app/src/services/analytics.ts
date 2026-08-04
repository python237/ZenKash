/**
 * Analytics Service
 *
 * Pure aggregation layer for the analytics screens. Every function here is free
 * of Vue and Pinia: the store lookups it needs (currency conversion, category
 * resolution, game-transfer classification) are injected through an
 * {@link AnalyticsContext}, which keeps the numbers reproducible and the whole
 * module unit-testable.
 *
 * The pipeline is always the same:
 * `transactions → toFlows() → selectFlows() → summarize()/aggregateBy()`
 * @module services/analytics
 */

import type { CurrencyCode } from 'src/types/currency';
import type { Transaction } from 'src/types/transaction';
import type { GameTransferClassification } from 'src/composables/useGameTransfers';
import type {
    AggregateBucket,
    AnalyticsFilters,
    ComparisonPoint,
    DateRange,
    Delta,
    FlowGroup,
    Granularity,
    NormalizedFlow,
    PeriodSummary,
    SeriesPoint,
    TimeBucket,
} from 'src/types/analytics';

/** Minimal category shape the service needs. */
interface CategoryRef {
    /** Category identifier */
    id: string;
    /** Master category the category belongs to */
    masterCategoryId: string;
}

/**
 * Store lookups the aggregation depends on. Injecting them keeps this module
 * pure and lets tests supply fixtures instead of a database.
 */
export interface AnalyticsContext {
    /**
     * Converts an amount into the default currency.
     * @param amount - Amount in `from`
     * @param from - Currency the amount is expressed in
     * @returns The amount in the default currency
     */
    convert: (amount: number, from: CurrencyCode) => number;
    /**
     * Resolves the currency of a wallet.
     * @param walletId - Wallet identifier, may be missing
     * @returns The wallet currency, or the default currency as a fallback
     */
    walletCurrency: (walletId?: string) => CurrencyCode;
    /**
     * Resolves a category.
     * @param id - Category identifier
     * @returns The category, or undefined when it no longer exists
     */
    category: (id: string) => CategoryRef | undefined;
    /**
     * Classifies a transfer against the game wallets.
     * @param tx - Transfer transaction
     * @returns The classification, or null when the transfer is internal
     */
    classifyGameTransfer: (tx: Transaction) => GameTransferClassification | null;
}

/** Number of months covered by each month-based preset. */
const PRESET_MONTHS: Record<string, number> = {
    currentMonth: 1,
    last3Months: 3,
    last6Months: 6,
    last12Months: 12,
};

/**
 * Returns the first millisecond of a day.
 * @param date - Reference date
 * @returns A new date at 00:00:00.000 local time
 */
export function startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

/**
 * Returns the last millisecond of a day.
 * @param date - Reference date
 * @returns A new date at 23:59:59.999 local time
 */
export function endOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

/**
 * Returns the first millisecond of a month.
 * @param date - Reference date
 * @returns A new date on the first day of the month at 00:00:00.000
 */
export function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Returns the last millisecond of a month.
 * @param date - Reference date
 * @returns A new date on the last day of the month at 23:59:59.999
 */
export function endOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Resolves the filters into a concrete date range.
 *
 * Month-based presets always end with the current month so a period stays
 * comparable to the monthly figures shown on the dashboard.
 * @param filters - Current filter state
 * @param now - Reference "today", injected for testability
 * @returns The resolved range
 */
export function resolveRange(filters: AnalyticsFilters, now: Date): DateRange {
    if (filters.preset === 'custom' && filters.customRange) {
        return {
            start: startOfDay(filters.customRange.start),
            end: endOfDay(filters.customRange.end),
        };
    }

    if (filters.preset === 'yearToDate') {
        return { start: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0), end: endOfDay(now) };
    }

    const months = PRESET_MONTHS[filters.preset] ?? 1;
    const start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - (months - 1), 1));
    return { start, end: endOfMonth(now) };
}

/**
 * Resolves the period immediately preceding the selected one, with the same
 * length, so both can be compared.
 * @param filters - Current filter state
 * @param now - Reference "today", injected for testability
 * @returns The previous range
 */
export function resolvePreviousRange(filters: AnalyticsFilters, now: Date): DateRange {
    const current = resolveRange(filters, now);

    if (filters.preset === 'custom' || filters.preset === 'yearToDate') {
        const span = current.end.getTime() - current.start.getTime();
        return {
            start: new Date(current.start.getTime() - span - 1),
            end: new Date(current.start.getTime() - 1),
        };
    }

    const months = PRESET_MONTHS[filters.preset] ?? 1;
    const start = startOfMonth(
        new Date(current.start.getFullYear(), current.start.getMonth() - months, 1),
    );
    return {
        start,
        end: endOfMonth(new Date(current.start.getFullYear(), current.start.getMonth() - 1, 1)),
    };
}

/**
 * Expands transactions into normalized, currency-converted flows.
 *
 * Mapping rules:
 * - income / expense → one flow, categorized
 * - project injection / dividend → one flow, attached to the project
 * - transfer between a game wallet and a regular wallet → one game flow
 *   (deposit = out, withdrawal = in), following the same rule as the dashboard
 * - transfer fee → one separate `fee` flow
 * - internal transfers (wallet to wallet) produce no flow: they move money
 *   without changing what was earned or spent
 * @param transactions - Raw transactions from the store
 * @param ctx - Injected store lookups
 * @returns The normalized flows, unordered
 */
export function toFlows(transactions: Transaction[], ctx: AnalyticsContext): NormalizedFlow[] {
    const flows: NormalizedFlow[] = [];

    for (const tx of transactions) {
        const base = {
            transactionId: tx.id,
            date: tx.date,
            description: tx.description,
        };

        if (tx.type === 'income' || tx.type === 'expense') {
            const currency = ctx.walletCurrency(tx.walletId);
            const category = ctx.category(tx.categoryId);
            flows.push({
                ...base,
                id: tx.id,
                kind: tx.type,
                group: tx.type,
                direction: tx.type === 'income' ? 'in' : 'out',
                nature: tx.type === 'income' ? 'earning' : 'consumption',
                amount: ctx.convert(tx.amount, currency),
                originalAmount: tx.amount,
                currency,
                walletId: tx.walletId,
                categoryId: tx.categoryId,
                masterCategoryId: category?.masterCategoryId,
            });
            continue;
        }

        if (tx.type === 'project') {
            const currency = ctx.walletCurrency(tx.walletId);
            const isInjection = tx.projectTransactionType === 'injection';
            flows.push({
                ...base,
                id: tx.id,
                kind: isInjection ? 'projectInjection' : 'projectDividend',
                group: 'project',
                direction: isInjection ? 'out' : 'in',
                // Injecting money into a project reallocates it, it does not spend it.
                nature: isInjection ? 'allocation' : 'return',
                amount: ctx.convert(tx.amount, currency),
                originalAmount: tx.amount,
                currency,
                walletId: tx.walletId,
                projectId: tx.projectId,
            });
            continue;
        }

        if (tx.type === 'transfer') {
            const classification = ctx.classifyGameTransfer(tx);
            if (classification) {
                flows.push({
                    ...base,
                    id: tx.id,
                    kind: classification.kind === 'deposit' ? 'gameDeposit' : 'gameWithdrawal',
                    group: 'game',
                    direction: classification.kind === 'deposit' ? 'out' : 'in',
                    // Same reasoning as projects: a deposit moves money onto a
                    // platform, it is only consumed once it is lost.
                    nature: classification.kind === 'deposit' ? 'allocation' : 'return',
                    amount: ctx.convert(classification.amount, classification.currency),
                    originalAmount: classification.amount,
                    currency: classification.currency,
                    walletId: tx.fromWalletId,
                    gameId: classification.gameId,
                });
            }

            // A game deposit already includes its fee (it is what left the wallet),
            // so only non-game transfers contribute a separate fee flow.
            const fee = tx.fee ?? 0;
            if (fee > 0 && classification?.kind !== 'deposit') {
                const currency = ctx.walletCurrency(tx.fromWalletId);
                flows.push({
                    ...base,
                    id: `${tx.id}:fee`,
                    kind: 'transferFee',
                    group: 'fee',
                    direction: 'out',
                    nature: 'consumption',
                    amount: ctx.convert(fee, currency),
                    originalAmount: fee,
                    currency,
                    walletId: tx.fromWalletId,
                });
            }
        }
    }

    return flows;
}

/**
 * Applies the filter state to a set of flows.
 * @param flows - Normalized flows
 * @param filters - Current filter state
 * @param range - Resolved period the flows must fall into
 * @returns The matching flows, sorted by date descending
 */
export function selectFlows(
    flows: NormalizedFlow[],
    filters: AnalyticsFilters,
    range: DateRange,
): NormalizedFlow[] {
    const groups = new Set<FlowGroup>(filters.groups);
    const masterCategoryIds = new Set(filters.masterCategoryIds);
    const categoryIds = new Set(filters.categoryIds);
    const walletIds = new Set(filters.walletIds);
    const search = filters.search.trim().toLowerCase();
    const from = range.start.getTime();
    const to = range.end.getTime();

    const selected = flows.filter((flow) => {
        const time = flow.date.getTime();
        if (time < from || time > to) return false;
        if (!groups.has(flow.group)) return false;

        if (masterCategoryIds.size > 0) {
            if (!flow.masterCategoryId || !masterCategoryIds.has(flow.masterCategoryId)) {
                return false;
            }
        }
        if (categoryIds.size > 0) {
            if (!flow.categoryId || !categoryIds.has(flow.categoryId)) return false;
        }
        if (walletIds.size > 0) {
            if (!flow.walletId || !walletIds.has(flow.walletId)) return false;
        }
        if (filters.amountMin !== null && flow.amount < filters.amountMin) return false;
        if (filters.amountMax !== null && flow.amount > filters.amountMax) return false;
        if (search && !flow.description?.toLowerCase().includes(search)) return false;

        return true;
    });

    return selected.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/**
 * Computes the headline figures of a period.
 * @param flows - Flows already restricted to the period
 * @param range - The period the flows belong to
 * @param now - Reference "today", used to keep the daily average honest on a
 * period that has not elapsed yet (the current month ends in the future)
 * @returns The period summary
 */
export function summarize(flows: NormalizedFlow[], range: DateRange, now?: Date): PeriodSummary {
    let inflow = 0;
    let spending = 0;
    let allocated = 0;
    let largestOutflow = 0;

    for (const flow of flows) {
        if (flow.direction === 'in') {
            inflow += flow.amount;
            continue;
        }

        // Spending and allocation are both outflows but must never be summed
        // into a single "expenses" figure.
        if (flow.nature === 'allocation') {
            allocated += flow.amount;
        } else {
            spending += flow.amount;
        }
        if (flow.amount > largestOutflow) largestOutflow = flow.amount;
    }

    const outflow = spending + allocated;
    const net = inflow - outflow;
    const dayMs = 24 * 60 * 60 * 1000;
    // Averaging over days that have not happened yet would understate spending.
    const elapsedEnd =
        now && now.getTime() < range.end.getTime() ? now.getTime() : range.end.getTime();
    const days = Math.max(1, Math.round((elapsedEnd - range.start.getTime()) / dayMs));

    return {
        range,
        inflow,
        outflow,
        spending,
        allocated,
        net,
        // What was not consumed, whether it stayed liquid or was invested.
        savingsRate: inflow > 0 ? ((inflow - spending) / inflow) * 100 : 0,
        count: flows.length,
        dailyAverage: outflow / days,
        largestOutflow,
    };
}

/**
 * Groups flows by an arbitrary key and sorts the buckets by amount descending.
 * Flows the selector returns `null` for are skipped.
 * @param flows - Flows to aggregate
 * @param keyOf - Extracts the grouping key of a flow
 * @returns The buckets, largest first
 */
export function aggregateBy(
    flows: NormalizedFlow[],
    keyOf: (flow: NormalizedFlow) => string | null,
): AggregateBucket[] {
    const buckets = new Map<string, AggregateBucket>();

    for (const flow of flows) {
        const key = keyOf(flow);
        if (key === null) continue;

        const bucket = buckets.get(key);
        if (bucket) {
            bucket.amount += flow.amount;
            bucket.count += 1;
        } else {
            buckets.set(key, { key, amount: flow.amount, count: 1 });
        }
    }

    return [...buckets.values()].sort((a, b) => b.amount - a.amount);
}

/**
 * Keeps the largest buckets and folds the remainder into a single `'other'`
 * bucket, so a chart never has to cycle its color palette.
 * @param buckets - Buckets sorted by amount descending
 * @param limit - Maximum number of buckets to keep
 * @returns The kept buckets, plus an `'other'` bucket when something was folded
 */
export function foldToLimit(buckets: AggregateBucket[], limit: number): AggregateBucket[] {
    if (buckets.length <= limit) return buckets;

    const kept = buckets.slice(0, limit);
    const folded = buckets.slice(limit).reduce<AggregateBucket>(
        (acc, bucket) => ({
            key: 'other',
            amount: acc.amount + bucket.amount,
            count: acc.count + bucket.count,
        }),
        { key: 'other', amount: 0, count: 0 },
    );

    return [...kept, folded];
}

/**
 * Returns the first millisecond of the week a date belongs to (weeks start on
 * Monday, matching the DACH/EU convention the app targets).
 * @param date - Reference date
 * @returns A new date on that Monday at 00:00:00.000
 */
export function startOfWeek(date: Date): Date {
    const result = startOfDay(date);
    // getDay() is 0 on Sunday, which is the last day of an ISO week.
    const shift = (result.getDay() + 6) % 7;
    result.setDate(result.getDate() - shift);
    return result;
}

/**
 * Returns the first millisecond of the quarter a date belongs to.
 * @param date - Reference date
 * @returns A new date on the first day of the quarter at 00:00:00.000
 */
export function startOfQuarter(date: Date): Date {
    return new Date(date.getFullYear(), Math.floor(date.getMonth() / 3) * 3, 1, 0, 0, 0, 0);
}

/**
 * Splits a range into consecutive time buckets.
 *
 * The first bucket starts at the beginning of the period containing
 * `range.start`, so a month bucket always covers a whole month even when the
 * range starts mid-month.
 * @param range - The period to split
 * @param granularity - Bucket size
 * @returns The buckets, oldest first
 */
export function bucketsFor(range: DateRange, granularity: Granularity): TimeBucket[] {
    const buckets: TimeBucket[] = [];
    let cursor =
        granularity === 'week'
            ? startOfWeek(range.start)
            : granularity === 'quarter'
              ? startOfQuarter(range.start)
              : startOfMonth(range.start);

    while (cursor.getTime() <= range.end.getTime()) {
        const next =
            granularity === 'week'
                ? new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7)
                : granularity === 'quarter'
                  ? new Date(cursor.getFullYear(), cursor.getMonth() + 3, 1)
                  : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);

        buckets.push({
            key: bucketKeyOf(cursor, granularity),
            start: cursor,
            end: new Date(next.getTime() - 1),
        });
        cursor = next;
    }

    return buckets;
}

/**
 * Computes the bucket key a date falls into.
 *
 * Used to place a flow in its bucket in constant time, so it must stay in sync
 * with the keys {@link bucketsFor} generates.
 * @param date - The date to place
 * @param granularity - Bucket size
 * @returns The bucket key
 */
export function bucketKeyOf(date: Date, granularity: Granularity): string {
    if (granularity === 'week') {
        const monday = startOfWeek(date);
        const month = String(monday.getMonth() + 1).padStart(2, '0');
        const day = String(monday.getDate()).padStart(2, '0');
        return `${monday.getFullYear()}-W${month}-${day}`;
    }
    if (granularity === 'quarter') {
        return `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Distributes flows over time buckets, split by series key.
 *
 * Every bucket carries an entry for every series key (zero when absent), so a
 * stacked chart never has holes and the series order stays stable.
 * @param flows - Flows to distribute
 * @param buckets - Target buckets, oldest first
 * @param granularity - Bucket size the buckets were built with
 * @param seriesKeys - Series keys to report, in display order
 * @param seriesKeyOf - Extracts the series key of a flow
 * @returns One point per bucket, oldest first
 */
export function buildSeries(
    flows: NormalizedFlow[],
    buckets: TimeBucket[],
    granularity: Granularity,
    seriesKeys: string[],
    seriesKeyOf: (flow: NormalizedFlow) => string,
): SeriesPoint[] {
    const points: SeriesPoint[] = buckets.map((bucket) => {
        const values: Record<string, number> = {};
        for (const key of seriesKeys) values[key] = 0;
        return { ...bucket, values, total: 0 };
    });
    const byKey = new Map(points.map((point) => [point.key, point]));

    for (const flow of flows) {
        const point = byKey.get(bucketKeyOf(flow.date, granularity));
        if (!point) continue;

        const key = seriesKeyOf(flow);
        point.values[key] = (point.values[key] ?? 0) + flow.amount;
        point.total += flow.amount;
    }

    return points;
}

/**
 * Distributes flows over time buckets as inflow / outflow pairs.
 * @param flows - Flows to distribute
 * @param buckets - Target buckets, oldest first
 * @param granularity - Bucket size the buckets were built with
 * @returns One comparison point per bucket, oldest first
 */
export function buildComparison(
    flows: NormalizedFlow[],
    buckets: TimeBucket[],
    granularity: Granularity,
): ComparisonPoint[] {
    const points: ComparisonPoint[] = buckets.map((bucket) => ({
        ...bucket,
        inflow: 0,
        outflow: 0,
        spending: 0,
        allocated: 0,
        net: 0,
        savingsRate: 0,
    }));
    const byKey = new Map(points.map((point) => [point.key, point]));

    for (const flow of flows) {
        const point = byKey.get(bucketKeyOf(flow.date, granularity));
        if (!point) continue;

        if (flow.direction === 'in') {
            point.inflow += flow.amount;
        } else if (flow.nature === 'allocation') {
            point.allocated += flow.amount;
        } else {
            point.spending += flow.amount;
        }
    }

    for (const point of points) {
        point.outflow = point.spending + point.allocated;
        point.net = point.inflow - point.outflow;
        point.savingsRate =
            point.inflow > 0 ? ((point.inflow - point.spending) / point.inflow) * 100 : 0;
    }

    return points;
}

/**
 * Computes a trailing moving average.
 * @param values - Ordered values
 * @param window - Number of points averaged, including the current one
 * @returns The averages, `null` where there is not enough history yet
 */
export function movingAverage(values: number[], window: number): (number | null)[] {
    return values.map((_, index) => {
        if (index + 1 < window) return null;
        const slice = values.slice(index + 1 - window, index + 1);
        return slice.reduce((sum, value) => sum + value, 0) / window;
    });
}

/**
 * Turns a series of values into their running total.
 * @param values - Ordered values
 * @returns The cumulative values
 */
export function cumulate(values: number[]): number[] {
    let running = 0;
    return values.map((value) => {
        running += value;
        return running;
    });
}

/**
 * Compares a value with its baseline from the previous period.
 * @param current - Value for the selected period
 * @param previous - Value for the previous period
 * @returns The absolute and relative difference
 */
export function computeDelta(current: number, previous: number): Delta {
    const amount = current - previous;
    return {
        amount,
        percent: previous === 0 ? 0 : (amount / Math.abs(previous)) * 100,
    };
}
