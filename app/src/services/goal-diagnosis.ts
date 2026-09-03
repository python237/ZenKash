/**
 * Goal Diagnosis Service
 *
 * The financial read that sits **in front of** `services/goal-allocation.ts`.
 * Allocation answers "where does this amount go?"; diagnosis answers the
 * question a manager would ask first: "is this plan reachable at all, given what
 * you actually save?"
 *
 * Pure, like the analytics and allocation layers: measured figures in, verdict
 * out. The one store lookup it needs — currency conversion — is injected through
 * a {@link GoalDiagnosisContext}.
 *
 * Capacity is **measured, never declared**: the median net saved over the last
 * complete months. The median, not the mean, so one exceptional month (a bonus,
 * a car repair) does not rewrite the picture.
 *
 * Unlike allocation, this layer *does* convert: it compares aggregates across
 * every goal, so it works in the user's default currency and each goal's pace is
 * converted into it. A verdict therefore depends on the exchange rates, while an
 * allocation plan never does.
 * @module services/goal-diagnosis
 */

import type { CurrencyCode } from 'src/types/currency';
import type { SavingsGoalWithStats } from 'src/types/savings-goal';
import {
    DiagnosisNoteCode,
    DiagnosisVerdict,
    GoalHealth,
    type DiagnosisMessage,
    type GoalDiagnosis,
    type GoalDiagnosisInput,
    type GoalFeasibility,
    type SavingsCapacity,
} from 'src/types/goal-diagnosis';

/**
 * Complete months the capacity is measured over. Six samples is what makes the
 * median robust: one exceptional month — a bonus, a car repair — cannot move
 * the middle value of six. Below that window the median is still fragile, which
 * is what {@link DiagnosisNoteCode.CapacityProvisional} warns about.
 */
export const SAMPLE_MONTHS = 6;

/** Months of spending a liquid cushion should cover before goals take priority. */
const MIN_CUSHION_MONTHS = 3;

/** At or above this share of what the goal needs, the deadline holds. */
const REACHABLE_RATIO = 1;

/** Below this share it is out of reach; in between, it lands just short. */
const TIGHT_RATIO = 0.9;

/** Store lookups the diagnosis depends on. Injecting them keeps this pure. */
export interface GoalDiagnosisContext {
    /**
     * Converts an amount into the reference (default) currency.
     * @param amount - Amount in `from`
     * @param from - Currency the amount is expressed in
     * @returns The converted amount
     */
    convert: (amount: number, from: CurrencyCode) => number;
}

/**
 * Median of a series, 0 when empty. Resistant to the one exceptional month a
 * mean would let dominate.
 * @param values - The series
 * @returns The median value
 */
function median(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    return sorted.length % 2 === 0
        ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
        : (sorted[middle] ?? 0);
}

/**
 * Measures what the last complete months actually show.
 * @param input - Monthly series of net savings and spending
 * @returns The observed capacity
 */
export function measureCapacity(input: GoalDiagnosisInput): SavingsCapacity {
    const net = input.monthlyNet;

    return {
        monthly: median(net),
        monthlySpending: median(input.monthlySpending),
        low: net.length > 0 ? Math.min(...net) : 0,
        high: net.length > 0 ? Math.max(...net) : 0,
        sampleMonths: net.length,
    };
}

/**
 * Adds whole months to a date, clamping the day to the target month's length.
 * @param date - Starting date
 * @param months - Months to add
 * @returns The shifted date
 */
function addMonths(date: Date, months: number): Date {
    const shifted = new Date(date);
    const day = shifted.getDate();
    shifted.setDate(1);
    shifted.setMonth(shifted.getMonth() + months);
    shifted.setDate(Math.min(day, new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate()));
    return shifted;
}

/**
 * Weighs one goal against the share of capacity it can realistically claim.
 *
 * Dated goals split the capacity in proportion to what their deadline demands;
 * whatever is left over is what undated goals can hope for.
 * @param goal - The goal, with its stats
 * @param requiredMonthly - Its monthly effort, converted
 * @param monthlyShare - The capacity it can claim each month
 * @param remaining - Amount still missing, converted
 * @param now - Reference "today"
 * @param measured - Whether a capacity could be measured at all
 * @returns The feasibility record
 */
function weighGoal(
    goal: SavingsGoalWithStats,
    requiredMonthly: number,
    monthlyShare: number,
    remaining: number,
    now: Date,
    measured: boolean,
): GoalFeasibility {
    const monthsAtCapacity = monthlyShare > 0 ? Math.ceil(remaining / monthlyShare) : null;
    const feasibleDate = monthsAtCapacity === null ? null : addMonths(now, monthsAtCapacity);

    // Without history there is nothing to judge against: saying "out of reach"
    // would be a verdict on missing data, not on the goal.
    if (!measured) {
        return {
            goalId: goal.id,
            requiredMonthly,
            monthlyShare: 0,
            monthsAtCapacity: null,
            feasibleDate: null,
            feasibleTarget: null,
            health: GoalHealth.Unknown,
        };
    }

    if (!goal.deadline || goal.monthsLeft === null) {
        return {
            goalId: goal.id,
            requiredMonthly,
            monthlyShare,
            monthsAtCapacity,
            feasibleDate,
            feasibleTarget: null,
            health: GoalHealth.Undated,
        };
    }

    // A deadline this month still leaves one month of effort, matching how
    // `requiredMonthly` is projected in the savings-goal store.
    const months = Math.max(1, goal.monthsLeft);
    const attainable = monthlyShare * months;
    const ratio = remaining > 0 ? attainable / remaining : Number.POSITIVE_INFINITY;

    let health = GoalHealth.Unreachable;
    if (ratio >= REACHABLE_RATIO) health = GoalHealth.Reachable;
    else if (ratio >= TIGHT_RATIO) health = GoalHealth.Tight;

    return {
        goalId: goal.id,
        requiredMonthly,
        monthlyShare,
        monthsAtCapacity,
        feasibleDate,
        // What the deadline could actually buy: today's savings plus what the
        // share brings in before the date. Nothing is being saved: no target fits.
        feasibleTarget: monthlyShare > 0 ? goal.currentAmount + attainable : null,
        health,
    };
}

/** Order used to surface the goals that need attention first. */
const HEALTH_ORDER: Record<GoalHealth, number> = {
    [GoalHealth.Unreachable]: 0,
    [GoalHealth.Tight]: 1,
    [GoalHealth.Reachable]: 2,
    [GoalHealth.Undated]: 3,
    [GoalHealth.Unknown]: 4,
};

/**
 * Picks the one thing to act on, and the observations behind it.
 * @param diagnosis - Everything measured so far
 * @param input - The measured inputs
 * @returns The verdict and its supporting notes
 */
function conclude(
    diagnosis: Omit<GoalDiagnosis, 'verdict' | 'notes'>,
    input: GoalDiagnosisInput,
): { verdict: DiagnosisMessage; notes: DiagnosisMessage[] } {
    const { capacity, requiredMonthly, gap, cushionMonths, goals } = diagnosis;
    const unreachable = goals.filter((goal) => goal.health === GoalHealth.Unreachable).length;
    const spare = Math.max(0, capacity.monthly - requiredMonthly);

    const notes: DiagnosisMessage[] = [];

    if (capacity.sampleMonths > 0) {
        // The spread is shown next to the median so an exceptional month stays
        // visible instead of silently disappearing into the middle value.
        notes.push({
            code: DiagnosisNoteCode.CapacitySample,
            params: {
                months: capacity.sampleMonths,
                amount: capacity.monthly,
                low: capacity.low,
                high: capacity.high,
            },
            severity: 'info',
        });
    }
    if (capacity.sampleMonths > 0 && capacity.sampleMonths < SAMPLE_MONTHS) {
        notes.push({
            code: DiagnosisNoteCode.CapacityProvisional,
            params: { months: capacity.sampleMonths, target: SAMPLE_MONTHS },
            severity: 'warning',
        });
    }
    if (input.commitments > 0) {
        notes.push({
            code: DiagnosisNoteCode.Commitments,
            params: { amount: input.commitments, days: input.commitmentDays },
            severity: 'warning',
        });
    }
    if (cushionMonths === null) {
        notes.push({ code: DiagnosisNoteCode.CushionUnknown, params: {}, severity: 'info' });
    } else {
        notes.push({
            code: DiagnosisNoteCode.Cushion,
            params: { months: Math.round(cushionMonths * 10) / 10 },
            severity: cushionMonths < MIN_CUSHION_MONTHS ? 'warning' : 'info',
        });
    }
    if (unreachable > 0) {
        notes.push({
            code: DiagnosisNoteCode.UnreachableGoals,
            params: { count: unreachable },
            severity: 'critical',
        });
    }
    if (spare > 0) {
        notes.push({
            code: DiagnosisNoteCode.SpareCapacity,
            params: { amount: spare },
            severity: 'info',
        });
    }

    /**
     * Builds the verdict message.
     * @param code - The verdict code
     * @param params - Its figures
     * @param severity - How loud it should be
     * @returns The verdict and the collected notes
     */
    const verdict = (
        code: DiagnosisVerdict,
        params: Record<string, number>,
        severity: DiagnosisMessage['severity'],
    ) => ({ verdict: { code, params, severity }, notes });

    if (goals.length === 0) {
        return verdict(DiagnosisVerdict.NoGoals, {}, 'info');
    }
    if (capacity.sampleMonths === 0) {
        return verdict(DiagnosisVerdict.CapacityUnknown, {}, 'warning');
    }
    if (capacity.monthly <= 0) {
        return verdict(DiagnosisVerdict.CapacityNegative, { amount: capacity.monthly }, 'critical');
    }
    if (gap > 0) {
        return verdict(
            DiagnosisVerdict.PaceExceedsCapacity,
            { gap, required: requiredMonthly, capacity: capacity.monthly, unreachable },
            'critical',
        );
    }
    if (cushionMonths !== null && cushionMonths < MIN_CUSHION_MONTHS) {
        return verdict(
            DiagnosisVerdict.CushionThin,
            { months: Math.round(cushionMonths * 10) / 10, target: MIN_CUSHION_MONTHS },
            'warning',
        );
    }

    return verdict(DiagnosisVerdict.AllReachable, { spare }, 'info');
}

/**
 * Runs the full diagnosis: measured capacity, per-goal feasibility, verdict.
 * @param goals - Every goal, enriched with stats
 * @param input - The measured inputs
 * @param ctx - Currency conversion into the reference currency
 * @returns The diagnosis
 */
export function diagnose(
    goals: SavingsGoalWithStats[],
    input: GoalDiagnosisInput,
    ctx: GoalDiagnosisContext,
): GoalDiagnosis {
    const capacity = measureCapacity(input);

    // Reached goals need nothing, and a goal whose wallet is gone cannot be judged.
    const open = goals.filter((goal) => goal.walletExists && !goal.isReached && goal.remaining > 0);

    const converted = open.map((goal) => ({
        goal,
        remaining: ctx.convert(goal.remaining, goal.currency),
        requiredMonthly: ctx.convert(goal.requiredMonthly ?? 0, goal.currency),
    }));

    const requiredMonthly = converted.reduce((sum, entry) => sum + entry.requiredMonthly, 0);
    const undated = converted.filter((entry) => entry.requiredMonthly <= 0);
    // A negative capacity is not a negative share: nothing is being saved, so
    // every goal simply gets nothing.
    const spendable = Math.max(0, capacity.monthly);
    const measured = capacity.sampleMonths > 0;
    // Dated goals split the capacity in proportion to what they demand; when the
    // capacity covers everything, each simply gets its own pace and the surplus
    // is what undated goals can share.
    const covered = spendable >= requiredMonthly;
    const spare = Math.max(0, spendable - requiredMonthly);

    const feasibility = converted.map(({ goal, remaining, requiredMonthly: pace }) => {
        let share = 0;
        if (pace > 0) {
            share = covered ? pace : (spendable * pace) / requiredMonthly;
        } else if (undated.length > 0) {
            share = spare / undated.length;
        }
        return weighGoal(goal, pace, share, remaining, input.now, measured);
    });

    feasibility.sort((a, b) => HEALTH_ORDER[a.health] - HEALTH_ORDER[b.health]);

    const cushionMonths =
        capacity.monthlySpending > 0 ? input.liquidBalance / capacity.monthlySpending : null;

    const base = {
        currency: input.currency,
        capacity,
        requiredMonthly,
        gap: requiredMonthly - capacity.monthly,
        liquidBalance: input.liquidBalance,
        commitments: input.commitments,
        cushionMonths,
        goals: feasibility,
    };

    return { ...base, ...conclude(base, input) };
}
