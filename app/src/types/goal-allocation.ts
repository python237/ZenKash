import type { CurrencyCode } from './currency';
import type { SavingsGoalWithStats } from './savings-goal';

/**
 * Interchangeable allocation strategies. Each one answers the same question —
 * "where does the next available amount go?" — with a different priority rule.
 */
export enum AllocationStrategy {
    /** Hold every deadline first, then speed up the smallest goal with the surplus */
    Balanced = 'balanced',
    /** Smallest remaining first, to close goals quickly */
    Snowball = 'snowball',
    /** Nearest deadline first */
    Deadline = 'deadline',
    /** Highest monthly effort first, to protect the goals about to slip */
    AtRisk = 'at_risk',
}

/**
 * Machine-readable justification. The engine never builds a sentence: the view
 * turns a code plus its parameters into localized text, so the reasoning stays
 * testable and translatable.
 */
export enum AllocationReason {
    /** The balanced plan reserved `reserved` and left `leftover` to speed things up */
    StrategyBalanced = 'strategy_balanced',
    /** The snowball plan closes `completed` goal(s) */
    StrategySnowball = 'strategy_snowball',
    /** The deadline plan serves the nearest due date first */
    StrategyDeadline = 'strategy_deadline',
    /** The at-risk plan protects the `protected` goal(s) under the heaviest pace */
    StrategyAtRisk = 'strategy_at_risk',
    /** Recommendation: the amount cannot cover the monthly pace of every goal */
    PaceNotCovered = 'pace_not_covered',
    /** Recommendation: no goal has a deadline, nothing can be late */
    NoDeadlines = 'no_deadlines',
    /** Recommendation: the amount closes goals without putting the others behind */
    ClosesGoals = 'closes_goals',
    /** Recommendation: a deadline lands within the next few months */
    DeadlineNear = 'deadline_near',
    /** Recommendation: everything is on pace, the surplus is the only question */
    AllOnTrack = 'all_on_track',
    /** Recommendation: no eligible goal, or no amount to spread */
    NothingToAllocate = 'nothing_to_allocate',
}

/**
 * A reason code with the figures the message needs. Amounts are expressed in the
 * allocation currency.
 */
export interface AllocationExplanation {
    /** What is being explained */
    code: AllocationReason;
    /** Figures interpolated into the localized message */
    params: Record<string, number>;
}

/** One goal receiving money in a plan. */
export interface AllocationLine {
    /** Goal receiving the amount */
    goalId: string;
    /** Amount allocated, in the allocation currency */
    amount: number;
    /** Whether this allocation reaches the target */
    completes: boolean;
    /** Whether it covers the monthly pace the deadline requires */
    coversPace: boolean;
    /** Amount still missing after this allocation */
    remainingAfter: number;
    /** Completion rate after this allocation, capped at 100 */
    percentAfter: number;
}

/** The full outcome of one strategy for a given amount. */
export interface AllocationPlan {
    /** Strategy that produced the plan */
    strategy: AllocationStrategy;
    /** Allocations, in the order the strategy decided them */
    lines: AllocationLine[];
    /** Number of goals the plan closes */
    completedCount: number;
    /** Goals that stay short of their monthly pace once the plan is applied */
    atRiskGoalIds: string[];
    /** Amount left unallocated */
    leftover: number;
    /** Why the plan looks like this */
    explanation: AllocationExplanation;
}

/** The strategy the engine puts forward, and the rule that picked it. */
export interface AllocationRecommendation {
    /** Strategy to apply */
    strategy: AllocationStrategy;
    /** Rule that selected it */
    explanation: AllocationExplanation;
}

/** What was left out of the analysis, and why. */
export interface AllocationExclusions {
    /** Goals already reached — they need nothing */
    reached: number;
    /** Goals held in another currency than the allocated amount */
    otherCurrency: number;
    /** Goals whose linked wallet was deleted */
    walletMissing: number;
    /** Legacy goals sharing a wallet with another goal, whose figures overlap */
    sharedWallet: number;
}

/** Everything the allocation screen needs for one amount in one currency. */
export interface AllocationResult {
    /** Currency the amount and every figure are expressed in */
    currency: CurrencyCode;
    /** Amount being allocated */
    available: number;
    /** Goals the engine worked on */
    eligible: SavingsGoalWithStats[];
    /** Goals left out of the analysis */
    excluded: AllocationExclusions;
    /** One plan per strategy */
    plans: Record<AllocationStrategy, AllocationPlan>;
    /** Strategy the engine puts forward */
    recommendation: AllocationRecommendation;
}

/** Input of a single allocation run. */
export interface AllocationInput {
    /** Currency of the available amount; only goals in it are considered */
    currency: CurrencyCode;
    /** Amount available to spread */
    available: number;
    /** Decimals the currency is rounded to (0 for XOF/XAF) */
    decimals: number;
}
