import { defineStore } from 'pinia';
import type { Bet, BetStatus, CreateBet, UpdateBet, ResolveBet } from 'src/types/bet';
import { execute, query } from 'src/services/database';

/**
 * Generates a unique identifier for a bet
 * @returns A unique string identifier combining timestamp and random values
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Database row type
/**
 *
 */
interface BetRow {
    id: string;
    game_id: string;
    stake: number;
    status: BetStatus;
    payout: number | null;
    placed_at: string;
    resolved_at: string | null;
    description: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Converts a database row to a Bet object
 * @param row - The database row containing bet data
 * @returns A Bet object with properly typed fields
 */
function rowToBet(row: BetRow): Bet {
    return {
        id: row.id,
        gameId: row.game_id,
        stake: row.stake,
        status: row.status,
        payout: row.payout ?? undefined,
        placedAt: new Date(row.placed_at),
        resolvedAt: row.resolved_at ? new Date(row.resolved_at) : undefined,
        description: row.description ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

/**
 * Net effect of a bet on its game wallet balance:
 * the stake always leaves the wallet, a won bet credits back its payout.
 * @param bet - The bet to evaluate
 * @returns The signed amount applied to the game wallet balance
 */
function netWalletEffect(bet: Pick<Bet, 'stake' | 'status' | 'payout'>): number {
    return -bet.stake + (bet.status === 'won' ? (bet.payout ?? 0) : 0);
}

/**
 * Contribution of a bet to its game's total_won derived column.
 * @param bet - The bet to evaluate
 * @returns The payout counted for a won bet, otherwise 0
 */
function wonContribution(bet: Pick<Bet, 'status' | 'payout'>): number {
    return bet.status === 'won' ? (bet.payout ?? 0) : 0;
}

export const useBetStore = defineStore('bet', () => {
    // State
    const bets = ref<Bet[]>([]);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    /**
     * Retrieves all bets for a game, most recent first.
     * @param gameId - The game identifier
     * @returns The list of bets belonging to the game
     */
    const getBetsByGame = (gameId: string): Bet[] =>
        bets.value
            .filter((b: Bet) => b.gameId === gameId)
            .sort((a: Bet, b: Bet) => b.placedAt.getTime() - a.placedAt.getTime());

    /**
     * Loads all bets from the database into the store
     * Only loads once; subsequent calls are no-ops if already initialized
     * @returns Promise that resolves when bets are loaded
     */
    async function loadAll(): Promise<void> {
        if (isInitialized.value) return;
        isLoading.value = true;
        try {
            const rows = await query<BetRow>('SELECT * FROM bets ORDER BY placed_at DESC');
            bets.value = rows.map(rowToBet);
            isInitialized.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Places a new bet: records it and immediately deducts its stake
     * from the game wallet.
     * @param data - The bet creation data
     * @returns Promise resolving to the newly created bet
     */
    async function place(data: CreateBet): Promise<Bet> {
        isLoading.value = true;
        try {
            const gameStore = useGameStore();
            const walletStore = useWalletStore();
            const game = gameStore.getGameById(data.gameId);
            if (!game) throw new Error('Game not found');

            const now = new Date();
            const bet: Bet = {
                id: generateId(),
                gameId: data.gameId,
                stake: data.stake,
                status: 'pending',
                payout: undefined,
                placedAt: data.placedAt,
                resolvedAt: undefined,
                description: data.description,
                createdAt: now,
                updatedAt: now,
            };

            await execute(
                `INSERT INTO bets (id, game_id, stake, status, payout, placed_at, resolved_at, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    bet.id,
                    bet.gameId,
                    bet.stake,
                    bet.status,
                    bet.payout ?? null,
                    bet.placedAt.toISOString(),
                    bet.resolvedAt ?? null,
                    bet.description ?? null,
                    bet.createdAt.toISOString(),
                    bet.updatedAt.toISOString(),
                ],
            );

            bets.value.push(bet);
            await walletStore.adjustBalance(game.walletId, netWalletEffect(bet));
            await gameStore.adjustTotals(bet.gameId, bet.stake, 0);
            return bet;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Resolves a pending bet as won or lost.
     * A win credits the payout to the game wallet; a loss keeps the stake.
     * @param id - The bet identifier
     * @param data - The resolution outcome and optional payout
     * @returns Promise resolving to the updated bet, or null if not found
     */
    async function resolve(id: string, data: ResolveBet): Promise<Bet | null> {
        isLoading.value = true;
        try {
            const existing = bets.value.find((b: Bet) => b.id === id);
            if (!existing) return null;

            const gameStore = useGameStore();
            const walletStore = useWalletStore();
            const game = gameStore.getGameById(existing.gameId);

            const oldNet = netWalletEffect(existing);
            const oldWon = wonContribution(existing);

            const now = new Date();
            const updated: Bet = {
                ...existing,
                status: data.status,
                payout: data.status === 'won' ? (data.payout ?? 0) : undefined,
                resolvedAt: now,
                updatedAt: now,
            };

            await execute(
                `UPDATE bets SET status = ?, payout = ?, resolved_at = ?, updated_at = ? WHERE id = ?`,
                [
                    updated.status,
                    updated.payout ?? null,
                    updated.resolvedAt?.toISOString() ?? null,
                    updated.updatedAt.toISOString(),
                    id,
                ],
            );

            const index = bets.value.findIndex((b: Bet) => b.id === id);
            if (index !== -1) bets.value[index] = updated;

            if (game) {
                await walletStore.adjustBalance(game.walletId, netWalletEffect(updated) - oldNet);
            }
            await gameStore.adjustTotals(existing.gameId, 0, wonContribution(updated) - oldWon);

            return updated;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Edits a bet's details (stake, date, description) without changing its outcome.
     * Wallet balance and game totals are adjusted by the resulting deltas.
     * @param id - The bet identifier
     * @param data - The fields to update
     * @returns Promise resolving to the updated bet, or null if not found
     */
    async function update(id: string, data: UpdateBet): Promise<Bet | null> {
        isLoading.value = true;
        try {
            const existing = bets.value.find((b: Bet) => b.id === id);
            if (!existing) return null;

            const gameStore = useGameStore();
            const walletStore = useWalletStore();
            const game = gameStore.getGameById(existing.gameId);

            const oldNet = netWalletEffect(existing);
            const oldStake = existing.stake;

            const updated: Bet = {
                ...existing,
                stake: data.stake ?? existing.stake,
                placedAt: data.placedAt ?? existing.placedAt,
                description: data.description ?? existing.description,
                updatedAt: new Date(),
            };

            await execute(
                `UPDATE bets SET stake = ?, placed_at = ?, description = ?, updated_at = ? WHERE id = ?`,
                [
                    updated.stake,
                    updated.placedAt.toISOString(),
                    updated.description ?? null,
                    updated.updatedAt.toISOString(),
                    id,
                ],
            );

            const index = bets.value.findIndex((b: Bet) => b.id === id);
            if (index !== -1) bets.value[index] = updated;

            if (game) {
                await walletStore.adjustBalance(game.walletId, netWalletEffect(updated) - oldNet);
            }
            await gameStore.adjustTotals(existing.gameId, updated.stake - oldStake, 0);

            return updated;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Deletes a bet and reverts its effect on the game wallet and totals.
     * @param id - The bet identifier
     * @returns Promise resolving to true if deleted, false if not found
     */
    async function remove(id: string): Promise<boolean> {
        isLoading.value = true;
        try {
            const existing = bets.value.find((b: Bet) => b.id === id);
            if (!existing) return false;

            const gameStore = useGameStore();
            const walletStore = useWalletStore();
            const game = gameStore.getGameById(existing.gameId);

            await execute('DELETE FROM bets WHERE id = ?', [id]);
            bets.value = bets.value.filter((b: Bet) => b.id !== id);

            if (game) {
                await walletStore.adjustBalance(game.walletId, -netWalletEffect(existing));
            }
            await gameStore.adjustTotals(
                existing.gameId,
                -existing.stake,
                -wonContribution(existing),
            );

            return true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Deletes all bets of a game without reverting balances.
     * Used when a game (and its wallet) is being deleted entirely.
     * @param gameId - The game identifier
     * @returns Promise resolving when the bets are removed
     */
    async function removeByGame(gameId: string): Promise<void> {
        await execute('DELETE FROM bets WHERE game_id = ?', [gameId]);
        bets.value = bets.value.filter((b: Bet) => b.gameId !== gameId);
    }

    return {
        // State
        bets,
        isLoading,
        isInitialized,
        // Getters
        getBetsByGame,
        // Actions
        loadAll,
        place,
        resolve,
        update,
        remove,
        removeByGame,
    };
});
