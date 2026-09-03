/**
 * Goal Allocation Service
 *
 * Answers "where does this amount go?" for savings goals. Like
 * `services/analytics.ts` it is pure — no Vue, no Pinia, no store lookup — so a
 * plan is reproducible and testable from fixtures alone.
 *
 * Two invariants make the whole thing sound:
 *
 * - **One goal per wallet.** A goal's progress is the linked wallet's balance,
 *   so two goals on one wallet would advance together and no per-goal allocation
 *   would mean anything. The constraint is enforced at creation; legacy rows that
 *   still share a wallet are reported in {@link AllocationExclusions.sharedWallet}.
 * - **One currency per run.** Goals are compared in the currency of the amount
 *   being allocated, never converted, so no plan ever depends on an exchange rate.
 *
 * Reached goals are ignored: they need nothing. `isReached` is derived from the
 * wallet balance, so a goal that dips back under its target simply reappears.
 * @module services/goal-allocation
 */

import type { CurrencyCode } from 'src/types/currency';
import type { SavingsGoalWithStats } from 'src/types/savings-goal';
import {
    AllocationReason,
    AllocationStrategy,
    type AllocationExclusions,
    type AllocationExplanation,
    type AllocationInput,
    type AllocationLine,
    type AllocationPlan,
    type AllocationRecommendation,
    type AllocationResult,
} from 'src/types/goal-allocation';

/** A deadline closer than this makes the schedule the dominant concern. */
const NEAR_DEADLINE_MONTHS = 3;

/** Tolerance for the float comparisons on rounded money. */
const EPSILON = 0.005;

/** Sort key for goals without a deadline: they never create urgency. */
const NO_DEADLINE = Number.POSITIVE_INFINITY;

/**
 * Rounds an amount to the currency precision.
 * @param value - Raw amount
 * @param decimals - Decimals of the currency
 * @returns The rounded amount
 */
function roundTo(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

/**
 * Rounds an amount down to the currency precision, so an allocation never
 * exceeds the budget it was taken from.
 * @param value - Raw amount
 * @param decimals - Decimals of the currency
 * @returns The floored amount
 */
function floorTo(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.floor(value * factor) / factor;
}

/**
 * Months left before the deadline, or infinity when the goal has none.
 * @param goal - The goal to read
 * @returns The urgency sort key
 */
function urgency(goal: SavingsGoalWithStats): number {
    return goal.monthsLeft ?? NO_DEADLINE;
}

/**
 * Monthly effort a goal requires to hold its deadline, 0 when it has none.
 * @param goal - The goal to read
 * @returns The required monthly amount
 */
function pace(goal: SavingsGoalWithStats): number {
    return goal.requiredMonthly ?? 0;
}

/**
 * Splits goals into the ones the engine can work on and the reasons the others
 * were left out.
 *
 * A goal is eligible when it is held in the allocation currency, still needs
 * money, and its wallet exists.
 * @param goals - Every goal, enriched with stats
 * @param currency - Currency of the amount being allocated
 * @returns The eligible goals and the exclusion counters
 */
export function selectEligibleGoals(
    goals: SavingsGoalWithStats[],
    currency: CurrencyCode,
): { eligible: SavingsGoalWithStats[]; excluded: AllocationExclusions } {
    const excluded: AllocationExclusions = {
        reached: 0,
        otherCurrency: 0,
        walletMissing: 0,
        sharedWallet: 0,
    };
    const eligible: SavingsGoalWithStats[] = [];

    for (const goal of goals) {
        if (!goal.walletExists) {
            excluded.walletMissing += 1;
            continue;
        }
        if (goal.currency !== currency) {
            excluded.otherCurrency += 1;
            continue;
        }
        if (goal.isReached || goal.remaining <= 0) {
            excluded.reached += 1;
            continue;
        }
        if (goal.sharesWallet) excluded.sharedWallet += 1;
        eligible.push(goal);
    }

    return { eligible, excluded };
}

/**
 * Lists the currencies goals are held in, most represented first. Used to
 * preselect the currency of the allocation screen.
 * @param goals - Every goal, enriched with stats
 * @returns Currencies carrying at least one unreached goal
 */
export function allocatableCurrencies(goals: SavingsGoalWithStats[]): CurrencyCode[] {
    const counts = new Map<CurrencyCode, number>();

    for (const goal of goals) {
        if (!goal.walletExists || goal.isReached || goal.remaining <= 0) continue;
        counts.set(goal.currency, (counts.get(goal.currency) ?? 0) + 1);
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([currency]) => currency);
}

/**
 * Hands money out along an order, capped per goal, and returns what is left.
 * Every strategy is this same walk with a different order and a different cap.
 * @param order - Goals in priority order
 * @param budget - Amount still available
 * @param decimals - Decimals of the currency
 * @param capOf - Ceiling of what a goal may hold in total after this pass
 * @param allocated - Running allocations, mutated in place
 * @param allOrNothing - Skip a goal the budget cannot fully cover, instead of
 * leaving it a part-payment that neither holds its schedule nor closes it
 * @returns The unallocated remainder
 */
function distribute(
    order: SavingsGoalWithStats[],
    budget: number,
    decimals: number,
    capOf: (goal: SavingsGoalWithStats) => number,
    allocated: Map<string, number>,
    allOrNothing = false,
): number {
    let left = budget;

    for (const goal of order) {
        if (left <= EPSILON) break;

        const already = allocated.get(goal.id) ?? 0;
        const need = Math.min(capOf(goal), goal.remaining) - already;
        if (need <= EPSILON) continue;
        if (allOrNothing && need > left + EPSILON) continue;

        let amount = need <= left ? roundTo(need, decimals) : floorTo(left, decimals);
        if (amount > left) amount = floorTo(left, decimals);
        if (amount <= 0) continue;

        allocated.set(goal.id, roundTo(already + amount, decimals));
        left = roundTo(left - amount, decimals + 2);
    }

    return Math.max(0, left);
}

/**
 * Smallest remaining first — the fastest way to close goals.
 * @param goals - Eligible goals
 * @returns Goals ordered for the snowball strategy
 */
function snowballOrder(goals: SavingsGoalWithStats[]): SavingsGoalWithStats[] {
    return [...goals].sort((a, b) => a.remaining - b.remaining);
}

/**
 * Nearest deadline first, smallest remaining as a tie-break.
 * @param goals - Eligible goals
 * @returns Goals ordered for the deadline strategy
 */
function deadlineOrder(goals: SavingsGoalWithStats[]): SavingsGoalWithStats[] {
    return [...goals].sort((a, b) => urgency(a) - urgency(b) || a.remaining - b.remaining);
}

/**
 * Heaviest monthly effort first — the goals most likely to miss their date.
 * @param goals - Eligible goals
 * @returns Goals ordered for the at-risk strategy
 */
function atRiskOrder(goals: SavingsGoalWithStats[]): SavingsGoalWithStats[] {
    return [...goals].sort((a, b) => pace(b) - pace(a) || urgency(a) - urgency(b));
}

/**
 * Runs one strategy and returns the resulting allocations.
 * @param strategy - Strategy to apply
 * @param goals - Eligible goals
 * @param input - Amount, currency and precision
 * @returns The allocations, the unallocated remainder, and what a strategy-level
 * message needs to explain itself
 */
function runStrategy(
    strategy: AllocationStrategy,
    goals: SavingsGoalWithStats[],
    input: AllocationInput,
): { allocated: Map<string, number>; leftover: number; reserved: number } {
    const { available, decimals } = input;
    const allocated = new Map<string, number>();
    let left = available;
    let reserved = 0;

    switch (strategy) {
        case AllocationStrategy.Snowball:
            left = distribute(snowballOrder(goals), left, decimals, (g) => g.remaining, allocated);
            break;

        case AllocationStrategy.Deadline:
            left = distribute(deadlineOrder(goals), left, decimals, (g) => g.remaining, allocated);
            break;

        case AllocationStrategy.AtRisk: {
            // Cover the monthly effort of the most exposed goals first, then let
            // the surplus finish them off in the same order.
            const order = atRiskOrder(goals);
            left = distribute(order, left, decimals, pace, allocated);
            reserved = roundTo(available - left, decimals);
            left = distribute(order, left, decimals, (g) => g.remaining, allocated);
            break;
        }

        case AllocationStrategy.Balanced: {
            // Pass 1: keep every dated goal on schedule, nearest deadline first.
            // A goal whose full pace cannot be covered is skipped rather than
            // half-funded: that money does more good accelerating a goal in pass 2.
            const dated = deadlineOrder(goals).filter((g) => g.deadline);
            left = distribute(dated, left, decimals, pace, allocated, true);
            reserved = roundTo(available - left, decimals);
            // Pass 2: the surplus goes to the quickest win.
            left = distribute(snowballOrder(goals), left, decimals, (g) => g.remaining, allocated);
            break;
        }
    }

    return { allocated, leftover: left, reserved };
}

/**
 * Turns raw allocations into displayable lines, in allocation order.
 * @param goals - Eligible goals
 * @param allocated - Amounts decided by the strategy
 * @returns One line per goal receiving money
 */
function buildLines(
    goals: SavingsGoalWithStats[],
    allocated: Map<string, number>,
): AllocationLine[] {
    const byId = new Map(goals.map((goal) => [goal.id, goal]));
    const lines: AllocationLine[] = [];

    for (const [goalId, amount] of allocated) {
        const goal = byId.get(goalId);
        if (!goal || amount <= 0) continue;

        const remainingAfter = Math.max(0, goal.remaining - amount);
        const target = goal.targetAmount;

        lines.push({
            goalId,
            amount,
            completes: remainingAfter <= EPSILON,
            coversPace: goal.requiredMonthly === null || amount + EPSILON >= goal.requiredMonthly,
            remainingAfter,
            percentAfter:
                target > 0 ? Math.min(100, ((goal.currentAmount + amount) / target) * 100) : 0,
        });
    }

    return lines;
}

/**
 * Goals that stay short of the monthly effort their deadline requires once the
 * plan is applied — the ones that will drift if nothing else comes in.
 * @param goals - Eligible goals
 * @param allocated - Amounts decided by the strategy
 * @returns Identifiers of the goals still behind
 */
function findAtRisk(goals: SavingsGoalWithStats[], allocated: Map<string, number>): string[] {
    return goals
        .filter((goal) => {
            if (goal.requiredMonthly === null || goal.requiredMonthly <= 0) return false;
            const amount = allocated.get(goal.id) ?? 0;
            if (amount + EPSILON >= goal.remaining) return false;
            return amount + EPSILON < goal.requiredMonthly;
        })
        .map((goal) => goal.id);
}

/**
 * Builds the message explaining what a strategy did.
 * @param strategy - Strategy that ran
 * @param lines - Its allocations
 * @param leftover - Unallocated remainder
 * @param reserved - Amount held back to keep deadlines on schedule
 * @returns The strategy explanation
 */
function explainStrategy(
    strategy: AllocationStrategy,
    lines: AllocationLine[],
    leftover: number,
    reserved: number,
): AllocationExplanation {
    const completed = lines.filter((line) => line.completes).length;

    switch (strategy) {
        case AllocationStrategy.Snowball:
            return { code: AllocationReason.StrategySnowball, params: { completed } };

        case AllocationStrategy.Deadline:
            return { code: AllocationReason.StrategyDeadline, params: { completed } };

        case AllocationStrategy.AtRisk:
            return {
                code: AllocationReason.StrategyAtRisk,
                params: { protected: lines.filter((line) => line.coversPace).length },
            };

        case AllocationStrategy.Balanced:
            return { code: AllocationReason.StrategyBalanced, params: { reserved, leftover } };
    }
}

/**
 * Computes the plan of a single strategy.
 * @param strategy - Strategy to apply
 * @param goals - Eligible goals
 * @param input - Amount, currency and precision
 * @returns The complete plan
 */
export function buildPlan(
    strategy: AllocationStrategy,
    goals: SavingsGoalWithStats[],
    input: AllocationInput,
): AllocationPlan {
    const { allocated, leftover, reserved } = runStrategy(strategy, goals, input);
    const lines = buildLines(goals, allocated);
    const atRiskGoalIds = findAtRisk(goals, allocated);

    return {
        strategy,
        lines,
        completedCount: lines.filter((line) => line.completes).length,
        atRiskGoalIds,
        leftover,
        explanation: explainStrategy(strategy, lines, leftover, reserved),
    };
}

/**
 * Picks the strategy that fits the current situation.
 *
 * The rules are evaluated in order and each one is decidable from the figures
 * alone — no scoring, no tuning constant beyond {@link NEAR_DEADLINE_MONTHS}:
 *
 * 1. the amount cannot even hold every deadline → protect what is slipping;
 * 2. nothing is dated → nothing can be late, close goals instead;
 * 3. closing goals leaves nobody behind → take the win;
 * 4. a deadline lands within three months → follow the calendar;
 * 5. otherwise keep everyone on schedule and speed up the rest.
 * @param goals - Eligible goals
 * @param plans - Plans already computed for every strategy
 * @param input - Amount, currency and precision
 * @returns The recommended strategy and the rule behind it
 */
export function recommend(
    goals: SavingsGoalWithStats[],
    plans: Record<AllocationStrategy, AllocationPlan>,
    input: AllocationInput,
): AllocationRecommendation {
    const { available, decimals } = input;

    if (goals.length === 0 || available <= 0) {
        return {
            strategy: AllocationStrategy.Balanced,
            explanation: { code: AllocationReason.NothingToAllocate, params: {} },
        };
    }

    const dated = goals.filter((goal) => goal.deadline);
    const totalPace = roundTo(
        dated.reduce((sum, goal) => sum + Math.min(pace(goal), goal.remaining), 0),
        decimals,
    );

    if (dated.length > 0 && totalPace > available + EPSILON) {
        return {
            strategy: AllocationStrategy.AtRisk,
            explanation: {
                code: AllocationReason.PaceNotCovered,
                params: { shortfall: roundTo(totalPace - available, decimals), count: dated.length },
            },
        };
    }

    if (dated.length === 0) {
        return {
            strategy: AllocationStrategy.Snowball,
            explanation: { code: AllocationReason.NoDeadlines, params: { count: goals.length } },
        };
    }

    const snowball = plans[AllocationStrategy.Snowball];
    if (snowball.completedCount > 0 && snowball.atRiskGoalIds.length === 0) {
        return {
            strategy: AllocationStrategy.Snowball,
            explanation: {
                code: AllocationReason.ClosesGoals,
                params: { count: snowball.completedCount, leftover: snowball.leftover },
            },
        };
    }

    const soonest = Math.min(...dated.map(urgency));
    if (soonest <= NEAR_DEADLINE_MONTHS) {
        return {
            strategy: AllocationStrategy.Deadline,
            explanation: { code: AllocationReason.DeadlineNear, params: { months: soonest } },
        };
    }

    const balanced = plans[AllocationStrategy.Balanced];
    return {
        strategy: AllocationStrategy.Balanced,
        explanation: {
            code: AllocationReason.AllOnTrack,
            params: {
                reserved: roundTo(available - balanced.leftover, decimals),
                leftover: balanced.leftover,
            },
        },
    };
}

/**
 * Computes every plan and the recommendation for one amount in one currency.
 * This is the single entry point of the allocation screen.
 * @param goals - Every goal, enriched with stats
 * @param input - Amount, currency and precision
 * @returns Eligible goals, exclusions, one plan per strategy and the recommendation
 */
export function buildAllocation(
    goals: SavingsGoalWithStats[],
    input: AllocationInput,
): AllocationResult {
    const { eligible, excluded } = selectEligibleGoals(goals, input.currency);
    const available = Math.max(0, input.available);
    const run = { ...input, available };

    const plans = {
        [AllocationStrategy.Balanced]: buildPlan(AllocationStrategy.Balanced, eligible, run),
        [AllocationStrategy.Snowball]: buildPlan(AllocationStrategy.Snowball, eligible, run),
        [AllocationStrategy.Deadline]: buildPlan(AllocationStrategy.Deadline, eligible, run),
        [AllocationStrategy.AtRisk]: buildPlan(AllocationStrategy.AtRisk, eligible, run),
    };

    return {
        currency: input.currency,
        available,
        eligible,
        excluded,
        plans,
        recommendation: recommend(eligible, plans, run),
    };
}
