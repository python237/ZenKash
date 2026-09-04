/**
 * Cash Flow Service
 *
 * The forward-looking half of the app. Analytics reads the past, the goal
 * diagnosis reads the capacity, and this projects the **runway**: what each
 * wallet holds day by day once the scheduled movements and the habitual
 * spending are played out.
 *
 * Pure, like the other analysis layers: measured inputs in, projection out. The
 * only store lookup — currency conversion for the aggregated total — is injected
 * through a {@link CashFlowContext}.
 *
 * Two rules keep the projection honest:
 *
 * - **A forecast built on recurring rules alone is always too optimistic.** Rent
 *   and salary are scheduled; groceries are not. The habitual spending measured
 *   from history is applied as a daily drift, otherwise the curve only ever goes
 *   up between two rules.
 * - **Each wallet is projected in its own currency.** Only the aggregated total
 *   converts, so a single wallet's runway never depends on an exchange rate.
 * @module services/cash-flow
 */

import type { CurrencyCode } from 'src/types/currency';
import type {
    CashFlowForecast,
    CashFlowInput,
    ForecastEvent,
    ForecastPoint,
    WalletForecast,
} from 'src/types/cash-flow';

/** Milliseconds in a day. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Store lookups the forecast depends on. Injecting them keeps this pure. */
export interface CashFlowContext {
    /**
     * Converts an amount into the reference currency.
     * @param amount - Amount in `from`
     * @param from - Currency the amount is expressed in
     * @returns The converted amount
     */
    convert: (amount: number, from: CurrencyCode) => number;
}

/**
 * Midnight of the given day, so every date key lands on a stable boundary.
 * @param date - Any moment of the day
 * @returns The start of that day
 */
function startOfDay(date: Date): Date {
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);
    return day;
}

/**
 * Whole days between two moments, ignoring the time of day.
 * @param from - Earlier moment
 * @param to - Later moment
 * @returns The number of days, negative when `to` precedes `from`
 */
function daysBetween(from: Date, to: Date): number {
    return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
}

/**
 * Groups the events of one wallet by their day offset from the start.
 * Events outside the horizon are dropped: they cannot move a balance shown here.
 * @param events - Events hitting the wallet
 * @param start - First day of the horizon
 * @param horizonDays - Number of days projected
 * @returns Signed totals per day offset
 */
function eventsByDay(
    events: ForecastEvent[],
    start: Date,
    horizonDays: number,
): Map<number, number> {
    const byDay = new Map<number, number>();

    for (const event of events) {
        const offset = daysBetween(start, event.date);
        if (offset < 0 || offset > horizonDays) continue;
        byDay.set(offset, (byDay.get(offset) ?? 0) + event.amount);
    }

    return byDay;
}

/**
 * Projects one wallet day by day.
 * @param walletId - Wallet being projected
 * @param currency - Currency of its balance
 * @param startBalance - Balance the projection starts from
 * @param events - Events hitting this wallet
 * @param drift - Habitual daily spending, positive, in the wallet currency
 * @param input - Horizon and reference day
 * @returns The wallet projection
 */
function projectWallet(
    walletId: string,
    currency: CurrencyCode,
    startBalance: number,
    events: ForecastEvent[],
    drift: number,
    input: CashFlowInput,
): WalletForecast {
    const start = startOfDay(input.now);
    const byDay = eventsByDay(events, start, input.horizonDays);

    const points: ForecastPoint[] = [];
    let balance = startBalance;
    let lowest: ForecastPoint = { date: start, balance };
    let firstNegative: Date | null = balance < 0 ? start : null;

    for (let offset = 0; offset <= input.horizonDays; offset += 1) {
        const date = new Date(start.getTime() + offset * DAY_MS);

        // Day 0 is today's closing balance: what already happened today is
        // in the balance, so only later days carry drift and events.
        if (offset > 0) {
            balance = balance - drift + (byDay.get(offset) ?? 0);
        }

        points.push({ date, balance });
        if (balance < lowest.balance) lowest = { date, balance };
        if (firstNegative === null && balance < 0) firstNegative = date;
    }

    return {
        walletId,
        currency,
        startBalance,
        endBalance: balance,
        points,
        events: [...events].sort((a, b) => a.date.getTime() - b.date.getTime()),
        lowest,
        firstNegative,
    };
}

/**
 * Builds the forecast for every wallet, plus their converted total.
 * @param input - Wallets, events, drift and horizon
 * @param ctx - Currency conversion into the reference currency
 * @returns The complete forecast
 */
export function forecast(input: CashFlowInput, ctx: CashFlowContext): CashFlowForecast {
    const start = startOfDay(input.now);

    const eventsByWallet = new Map<string, ForecastEvent[]>();
    for (const event of input.events) {
        const list = eventsByWallet.get(event.walletId);
        if (list) list.push(event);
        else eventsByWallet.set(event.walletId, [event]);
    }

    const wallets = input.wallets.map((wallet) =>
        projectWallet(
            wallet.id,
            wallet.currency,
            wallet.balance,
            eventsByWallet.get(wallet.id) ?? [],
            Math.max(0, input.dailyDrift[wallet.id] ?? 0),
            input,
        ),
    );

    // The total is the only figure that converts, and it does so day by day so
    // the aggregated curve stays consistent with the individual ones.
    const totalPoints: ForecastPoint[] = [];
    for (let offset = 0; offset <= input.horizonDays; offset += 1) {
        const date = new Date(start.getTime() + offset * DAY_MS);
        let balance = 0;
        for (const wallet of wallets) {
            balance += ctx.convert(wallet.points[offset]?.balance ?? 0, wallet.currency);
        }
        totalPoints.push({ date, balance });
    }

    const totalStart = totalPoints[0] ?? { date: start, balance: 0 };
    const totalEnd = totalPoints[totalPoints.length - 1] ?? totalStart;
    const totalLowest = totalPoints.reduce(
        (min, point) => (point.balance < min.balance ? point : min),
        totalStart,
    );
    const totalNegative = totalPoints.find((point) => point.balance < 0);

    return {
        start,
        horizonDays: input.horizonDays,
        currency: input.currency,
        wallets,
        total: {
            currency: input.currency,
            startBalance: totalStart.balance,
            endBalance: totalEnd.balance,
            points: totalPoints,
            lowest: totalLowest,
            firstNegative: totalNegative?.date ?? null,
        },
        atRiskWalletIds: wallets
            .filter((wallet) => wallet.firstNegative !== null)
            .map((wallet) => wallet.walletId),
    };
}
