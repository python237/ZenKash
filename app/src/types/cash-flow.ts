import type { CurrencyCode } from './currency';

/** Where a forecast movement comes from. */
export type ForecastEventKind =
    /** A scheduled occurrence of a recurring rule */
    | 'recurring'
    /** A savings goal falling due */
    | 'goalDeadline';

/** One dated movement expected on a wallet. */
export interface ForecastEvent {
    /** Unique identifier of the event within the forecast */
    id: string;
    /** Day the movement lands on */
    date: Date;
    /** Wallet the movement hits */
    walletId: string;
    /** Signed amount in the wallet's currency: negative leaves the wallet */
    amount: number;
    /** What produced the event */
    kind: ForecastEventKind;
    /** User-written label carried from the rule or goal, when there is one */
    label?: string | undefined;
}

/** Balance of a wallet on a given day of the horizon. */
export interface ForecastPoint {
    /** The day */
    date: Date;
    /** Projected balance at the end of that day */
    balance: number;
}

/** The projected path of one wallet over the horizon. */
export interface WalletForecast {
    /** Wallet being projected */
    walletId: string;
    /** Currency every figure is expressed in */
    currency: CurrencyCode;
    /** Balance the projection starts from */
    startBalance: number;
    /** Balance at the end of the horizon */
    endBalance: number;
    /** One point per day, oldest first */
    points: ForecastPoint[];
    /** Events hitting this wallet, chronological */
    events: ForecastEvent[];
    /** Lowest point of the horizon — the moment the wallet is most exposed */
    lowest: ForecastPoint;
    /** First day the balance turns negative, null when it never does */
    firstNegative: Date | null;
}

/** The whole forecast: every wallet, plus their converted total. */
export interface CashFlowForecast {
    /** Day the projection starts from */
    start: Date;
    /** Number of days projected */
    horizonDays: number;
    /** Currency the total is expressed in */
    currency: CurrencyCode;
    /** One projection per wallet */
    wallets: WalletForecast[];
    /** Every wallet converted into the reference currency and summed */
    total: Omit<WalletForecast, 'walletId' | 'events'>;
    /** Wallets that go negative before the end of the horizon */
    atRiskWalletIds: string[];
}

/** Minimal wallet shape the forecast needs. */
export interface ForecastWallet {
    /** Wallet identifier */
    id: string;
    /** Currency of the balance */
    currency: CurrencyCode;
    /** Balance the projection starts from */
    balance: number;
}

/** Measured inputs of a forecast run. */
export interface CashFlowInput {
    /** Reference "today" */
    now: Date;
    /** Days to project */
    horizonDays: number;
    /** Currency the total is expressed in */
    currency: CurrencyCode;
    /** Wallets to project */
    wallets: ForecastWallet[];
    /** Dated movements expected over the horizon */
    events: ForecastEvent[];
    /**
     * Habitual daily spending per wallet, in that wallet's currency and always
     * positive. Zero disables the drift, which makes the forecast show scheduled
     * movements only.
     */
    dailyDrift: Record<string, number>;
}
