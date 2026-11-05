/**
 * Net Worth Forecast Service
 *
 * Projects the net worth month by month over the next 6 to 12 months. Where
 * the cash-flow forecast answers "will I run short?", this answers "where will
 * I stand?".
 *
 * Pure: measured inputs in, projection out. Four rules keep it honest:
 *
 * - **Savings use the median month**, not the mean: one bonus or one big
 *   purchase must not bend the whole curve.
 * - **Assets lose value exactly as their schedule says**, so they are valued
 *   at each future date rather than extrapolated.
 * - **Investments are assumed flat.** No return is invented, for the same
 *   reason the depreciation rate is never typed by the user.
 * - **Debts are neutral.** A repayment moves money between a receivable (or a
 *   payable) and a wallet; it neither creates nor destroys net worth.
 *
 * The uncertainty band is the spread of the measured months, widening with the
 * square root of time like any sum of independent monthly variations.
 * @module services/net-worth-forecast
 */

import type { NormalizedFlow } from 'src/types/analytics';

/** Complete months of history required before a projection is shown. */
export const MIN_HISTORY_MONTHS = 3;

/** Reference windows the screen offers, in complete months. */
export const SAMPLE_OPTIONS = [3, 6, 12] as const;

/** Horizons the screen offers, in months. */
export const FORECAST_HORIZONS = [6, 12] as const;

/** Inputs of a projection run. */
export interface NetWorthForecastInput {
    /** Reference "today" */
    now: Date;
    /** Months projected */
    horizonMonths: number;
    /** Net worth today, in the default currency */
    currentTotal: number;
    /** Resale value of the owned assets today, in the default currency */
    currentAssets: number;
    /** Net result (income − spending) of each sampled month, oldest first */
    monthlyNets: number[];
    /**
     * Resale value of the owned assets at a future date.
     * @param date - Valuation date
     * @returns The total resale value, in the default currency
     */
    assetsAt: (date: Date) => number;
}

/** One projected month. */
export interface NetWorthForecastPoint {
    /** End of the projected month (today for the starting point) */
    date: Date;
    /** Most likely net worth */
    central: number;
    /** Cautious scenario */
    low: number;
    /** Favourable scenario */
    high: number;
    /** Net worth without the assets */
    available: number;
    /** Resale value of the assets */
    assets: number;
}

/** The complete projection. */
export interface NetWorthForecast {
    /** Starting point (today) followed by one point per month */
    points: NetWorthForecastPoint[];
    /** Median monthly savings used for the projection */
    monthlySaving: number;
    /** Average monthly loss of value of the assets over the horizon */
    monthlyDepreciation: number;
    /** Standard deviation of the sampled months */
    spread: number;
}

/**
 * Median of a list of numbers.
 * @param values - The values
 * @returns The median, 0 for an empty list
 */
export function median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

/**
 * Sample standard deviation.
 * @param values - The values
 * @returns The standard deviation, 0 below two values
 */
export function standardDeviation(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance =
        values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / (values.length - 1);
    return Math.sqrt(variance);
}

/**
 * Number of complete months between the first flow and the current month.
 * @param flows - Every flow
 * @param now - Reference "today"
 * @returns The count of complete months of history
 */
export function completeMonthsOfHistory(flows: NormalizedFlow[], now: Date): number {
    if (flows.length === 0) return 0;
    const first = flows.reduce((min, f) => (f.date < min ? f.date : min), flows[0]!.date);
    return Math.max(
        0,
        (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth()),
    );
}

/**
 * Net result of each of the last complete months: what was earned minus what
 * was consumed. Reallocations (projects, debts, game deposits) are left out:
 * they move money around without being a habit of saving or spending.
 * @param flows - Every flow, converted to the default currency
 * @param now - Reference "today"
 * @param months - Complete months to measure
 * @returns One net per month, oldest first
 */
export function monthlyNets(flows: NormalizedFlow[], now: Date, months: number): number[] {
    const nets = new Array<number>(months).fill(0);
    const firstYear = now.getFullYear();
    const firstMonth = now.getMonth() - months;

    for (const flow of flows) {
        if (flow.nature !== 'earning' && flow.nature !== 'consumption') continue;
        const index =
            (flow.date.getFullYear() - firstYear) * 12 + (flow.date.getMonth() - firstMonth);
        if (index < 0 || index >= months) continue;
        nets[index]! += flow.nature === 'earning' ? flow.amount : -flow.amount;
    }

    return nets;
}

/**
 * End of the month `offset` months after the reference date's month.
 * @param now - Reference date
 * @param offset - Months ahead
 * @returns The last day of that month, at noon
 */
function endOfMonthAhead(now: Date, offset: number): Date {
    return new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 12);
}

/**
 * Projects the net worth month by month.
 * @param input - Current figures, sampled months and horizon
 * @returns The projection
 */
export function forecastNetWorth(input: NetWorthForecastInput): NetWorthForecast {
    const monthlySaving = median(input.monthlyNets);
    const spread = standardDeviation(input.monthlyNets);
    // Everything but the assets moves with the savings; the assets follow their schedule
    const baseAvailable = input.currentTotal - input.currentAssets;

    const points: NetWorthForecastPoint[] = [
        {
            date: input.now,
            central: input.currentTotal,
            low: input.currentTotal,
            high: input.currentTotal,
            available: baseAvailable,
            assets: input.currentAssets,
        },
    ];

    // The current month is partly over and already in the balances: only what
    // is left of it still counts
    const daysInMonth = endOfMonthAhead(input.now, 0).getDate();
    const remainingShare = (daysInMonth - input.now.getDate()) / daysInMonth;

    for (let month = 1; month <= input.horizonMonths; month += 1) {
        const date = endOfMonthAhead(input.now, month - 1);
        const elapsed = month - 1 + remainingShare;
        const assets = input.assetsAt(date);
        const available = baseAvailable + elapsed * monthlySaving;
        const central = available + assets;
        const margin = spread * Math.sqrt(elapsed);
        points.push({
            date,
            central,
            low: central - margin,
            high: central + margin,
            available,
            assets,
        });
    }

    const last = points[points.length - 1]!;
    return {
        points,
        monthlySaving,
        monthlyDepreciation: (input.currentAssets - last.assets) / input.horizonMonths,
        spread,
    };
}

/**
 * Next round milestone above a value: 1, 2 or 5 times a power of ten.
 * @param value - Current value
 * @returns The milestone, or null for a non-positive value
 */
export function nextMilestone(value: number): number | null {
    if (value <= 0) return null;
    let power = Math.pow(10, Math.floor(Math.log10(value)));
    for (;;) {
        for (const factor of [1, 2, 5]) {
            const candidate = factor * power;
            if (candidate > value) return candidate;
        }
        power *= 10;
    }
}
