/**
 * What moved money in or out of a wallet. Every source that adjusts a wallet
 * balance has a kind here, so the reconstructed running balance stays exact.
 */
export type WalletMovementKind =
    | 'income'
    | 'expense'
    | 'project_injection'
    | 'project_dividend'
    | 'debt_principal'
    | 'debt_repayment'
    | 'transfer_out'
    | 'transfer_in'
    | 'investment_buy'
    | 'investment_sell'
    | 'bet_stake'
    | 'bet_payout';

/**
 * Position in the history, the last movement already loaded.
 * Keyset pagination: the next page starts strictly after it, so movements
 * added meanwhile never shift or duplicate the rows already displayed.
 */
export interface WalletHistoryCursor {
    date: string;
    createdAt: string;
    key: string;
}

/**
 * One movement on a wallet, as stored.
 */
export interface WalletMovement {
    /** Unique per movement: a transfer to self or a won bet yields two */
    key: string;
    kind: WalletMovementKind;
    date: Date;
    /** Signed effect on the wallet balance */
    delta: number;
    /** Category, project, counterparty, other wallet, investment or game */
    label?: string | undefined;
    icon?: string | undefined;
    description?: string | undefined;
    /** Transfer fee, already included in `delta` */
    fee?: number | undefined;
    /** Raw sort keys, used as the cursor of the next page */
    cursor: WalletHistoryCursor;
}

/**
 * A movement with the wallet balance right after it.
 */
export interface WalletHistoryEntry extends WalletMovement {
    balanceAfter: number;
}
