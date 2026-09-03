import type { CurrencyCode } from './currency';

/** How a goal stands against the savings capacity actually observed. */
export enum GoalHealth {
    /** The deadline holds with room to spare */
    Reachable = 'reachable',
    /** The deadline holds, but only just */
    Tight = 'tight',
    /** The deadline cannot hold at the current capacity */
    Unreachable = 'unreachable',
    /** No deadline: nothing can be missed */
    Undated = 'undated',
    /** Capacity could not be measured, so nothing can be judged */
    Unknown = 'unknown',
}

/** Headline call of the diagnosis — the one thing to act on. */
export enum DiagnosisVerdict {
    /** No goal to diagnose */
    NoGoals = 'no_goals',
    /** Not enough history to measure a savings capacity */
    CapacityUnknown = 'capacity_unknown',
    /** Nothing is saved month over month: no goal advances */
    CapacityNegative = 'capacity_negative',
    /** Deadlines require more per month than is actually saved */
    PaceExceedsCapacity = 'pace_exceeds_capacity',
    /** Deadlines hold, but the emergency cushion is too thin to fund goals first */
    CushionThin = 'cushion_thin',
    /** Every deadline holds at the current capacity */
    AllReachable = 'all_reachable',
}

/** Secondary observations shown under the verdict. */
export enum DiagnosisNoteCode {
    /** Capacity measured over `months` complete month(s), from `low` to `high` */
    CapacitySample = 'capacity_sample',
    /** Fewer complete months than the target window: the median is still fragile */
    CapacityProvisional = 'capacity_provisional',
    /** `amount` of recurring charges falls due within `days` days */
    Commitments = 'commitments',
    /** Liquid balance covers `months` month(s) of spending */
    Cushion = 'cushion',
    /** Spending is unknown, the cushion cannot be measured */
    CushionUnknown = 'cushion_unknown',
    /** `count` goal(s) cannot hold their deadline */
    UnreachableGoals = 'unreachable_goals',
    /** `amount` of monthly capacity is left once every deadline is held */
    SpareCapacity = 'spare_capacity',
}

/** How loud a note should be. */
export type DiagnosisSeverity = 'info' | 'warning' | 'critical';

/** A verdict or note, with the figures its message needs. */
export interface DiagnosisMessage {
    /** Verdict or note code */
    code: DiagnosisVerdict | DiagnosisNoteCode;
    /** Figures interpolated into the localized message */
    params: Record<string, number>;
    /** How loud the message should be */
    severity: DiagnosisSeverity;
}

/** One goal weighed against the observed capacity. */
export interface GoalFeasibility {
    /** Goal being judged */
    goalId: string;
    /** Monthly effort its deadline requires, in the reference currency */
    requiredMonthly: number;
    /** Share of the monthly capacity this goal can realistically claim */
    monthlyShare: number;
    /** Months needed at that share, null when nothing is being saved */
    monthsAtCapacity: number | null;
    /** Date the target is reached at that share, null when out of reach */
    feasibleDate: Date | null;
    /** Target that would fit the existing deadline at that share */
    feasibleTarget: number | null;
    /** Verdict for this goal */
    health: GoalHealth;
}

/** Savings capacity measured on what actually happened. */
export interface SavingsCapacity {
    /** Median net saved per complete month, in the reference currency */
    monthly: number;
    /** Median monthly spending, used for the cushion */
    monthlySpending: number;
    /** Worst month of the sample, so an exceptional month stays visible */
    low: number;
    /** Best month of the sample */
    high: number;
    /** Number of complete months the medians were computed on */
    sampleMonths: number;
}

/** The full financial read on the goals. */
export interface GoalDiagnosis {
    /** Currency every figure is expressed in (the user's default) */
    currency: CurrencyCode;
    /** What the last complete months actually show */
    capacity: SavingsCapacity;
    /** Total monthly effort every deadline requires */
    requiredMonthly: number;
    /** `requiredMonthly - capacity.monthly`, positive when short */
    gap: number;
    /** Liquid balance outside investment and game wallets */
    liquidBalance: number;
    /** Recurring charges falling due in the next days */
    commitments: number;
    /** Months of spending the liquid balance covers, null without spending data */
    cushionMonths: number | null;
    /** One entry per goal, worst health first */
    goals: GoalFeasibility[];
    /** The call to act on */
    verdict: DiagnosisMessage;
    /** Supporting observations */
    notes: DiagnosisMessage[];
}

/** Measured inputs the diagnosis runs on. */
export interface GoalDiagnosisInput {
    /** Currency every figure is expressed in */
    currency: CurrencyCode;
    /** Net saved per complete month, oldest first, in the reference currency */
    monthlyNet: number[];
    /** Money consumed per complete month, oldest first */
    monthlySpending: number[];
    /** Liquid balance outside investment and game wallets */
    liquidBalance: number;
    /** Recurring charges due within {@link commitmentDays} */
    commitments: number;
    /** Horizon the commitments were summed over */
    commitmentDays: number;
    /** Reference "today" */
    now: Date;
}
