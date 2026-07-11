/**
 * Represents a game/betting platform (e.g. 1XBET).
 * Each game owns a dedicated wallet where all its money movements happen.
 * The game wallet balance is intentionally excluded from balance reports,
 * because that money may be locked on the platform. Only regular (non-game)
 * wallets count towards reported liquidity: withdrawing from a game credits
 * a non-game wallet.
 */
export interface Game {
    /** Unique identifier for the game */
    id: string;
    /** Display name of the game platform */
    name: string;
    /** Icon identifier for visual representation */
    icon: string;
    /** Identifier of the dedicated wallet automatically created with the game */
    walletId: string;
    /** Total amount staked across all bets (calculated from bets) */
    totalStaked: number;
    /** Total amount won across all resolved bets (calculated from bets) */
    totalWon: number;
    /** Timestamp when the game was created */
    createdAt: Date;
    /** Timestamp when the game was last updated */
    updatedAt: Date;
}

/**
 * Data required to create a new game.
 * The dedicated wallet is created automatically by the store.
 */
export interface CreateGame {
    /** Display name of the game platform */
    name: string;
    /** Icon identifier for visual representation */
    icon?: string | undefined;
}

/**
 * Data for updating an existing game.
 * Financial totals and the linked wallet are not editable here.
 */
export type UpdateGame = Partial<CreateGame>;

/**
 * Game with calculated statistics.
 * Used for displaying game performance in the UI.
 */
export interface GameWithStats extends Game {
    /** Current balance of the game wallet (available on the platform) */
    balance: number;
    /** Net result: totalWon - totalStaked */
    netResult: number;
    /** Total stake currently locked in pending bets */
    pendingStake: number;
    /** Number of pending (unresolved) bets */
    pendingCount: number;
}
