import { defineStore } from 'pinia';
import type { Game, CreateGame, UpdateGame, GameWithStats } from 'src/types/game';
import { CurrencyCode } from 'src/types/currency';
import { execute, query } from 'src/services/database';

/**
 * Generates a unique identifier for a game
 * @returns A unique string identifier combining timestamp and random values
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/** Default icon used for a game and its dedicated wallet */
const DEFAULT_GAME_ICON = 'casino';

// Database row type
/**
 *
 */
interface GameRow {
    id: string;
    name: string;
    icon: string | null;
    wallet_id: string;
    total_staked: number;
    total_won: number;
    created_at: string;
    updated_at: string;
}

/**
 * Converts a database row to a Game object
 * @param row - The database row containing game data
 * @returns A Game object with properly typed fields
 */
function rowToGame(row: GameRow): Game {
    return {
        id: row.id,
        name: row.name,
        icon: row.icon ?? DEFAULT_GAME_ICON,
        walletId: row.wallet_id,
        totalStaked: row.total_staked,
        totalWon: row.total_won,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export const useGameStore = defineStore('game', () => {
    // State
    const games = ref<Game[]>([]);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    /**
     * Retrieves a game by its unique identifier
     * @param id - The game's unique identifier
     * @returns The game if found, undefined otherwise
     */
    const getGameById = (id: string): Game | undefined =>
        games.value.find((g: Game) => g.id === id);

    /**
     * Retrieves a game by its dedicated wallet identifier.
     * @param walletId - The game wallet's unique identifier
     * @returns The game if found, undefined otherwise
     */
    const getGameByWalletId = (walletId: string): Game | undefined =>
        games.value.find((g: Game) => g.walletId === walletId);

    /**
     * Computed property that returns all games enriched with calculated statistics.
     * Balance comes from the dedicated wallet; pending stats come from the bet store.
     */
    const getGamesWithStats = computed((): GameWithStats[] => {
        const walletStore = useWalletStore();
        const betStore = useBetStore();
        return games.value.map((g: Game) => {
            const balance = walletStore.getWalletById(g.walletId)?.balance ?? 0;
            const pending = betStore.getBetsByGame(g.id).filter((b) => b.status === 'pending');
            return {
                ...g,
                balance,
                netResult: g.totalWon - g.totalStaked,
                pendingStake: pending.reduce((sum, b) => sum + b.stake, 0),
                pendingCount: pending.length,
            };
        });
    });

    /**
     * Loads all games from the database into the store
     * Only loads once; subsequent calls are no-ops if already initialized
     * @returns Promise that resolves when games are loaded
     */
    async function loadAll(): Promise<void> {
        if (isInitialized.value) return;
        isLoading.value = true;
        try {
            const rows = await query<GameRow>('SELECT * FROM games ORDER BY name');
            games.value = rows.map(rowToGame);
            isInitialized.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Forces a reload of all games from the database
     * Useful for syncing after bet changes update derived totals
     * @returns Promise that resolves when games are reloaded
     */
    async function reload(): Promise<void> {
        isLoading.value = true;
        try {
            const rows = await query<GameRow>('SELECT * FROM games ORDER BY name');
            games.value = rows.map(rowToGame);
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Creates a new game and its dedicated wallet.
     * The wallet is flagged as a game wallet so it is excluded from balance reports.
     * @param data - The game creation data (name and optional icon)
     * @returns Promise resolving to the newly created game
     */
    async function create(data: CreateGame): Promise<Game> {
        isLoading.value = true;
        try {
            const walletStore = useWalletStore();
            const settingsStore = useSettingsStore();
            const now = new Date();
            const icon = data.icon ?? DEFAULT_GAME_ICON;
            const currency = settingsStore.defaultCurrency ?? CurrencyCode.XOF;

            // Automatically create the dedicated game wallet
            const wallet = await walletStore.create({
                name: data.name,
                icon,
                currency,
                isGame: true,
            });

            const game: Game = {
                id: generateId(),
                name: data.name,
                icon,
                walletId: wallet.id,
                totalStaked: 0,
                totalWon: 0,
                createdAt: now,
                updatedAt: now,
            };

            await execute(
                `INSERT INTO games (id, name, icon, wallet_id, total_staked, total_won, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    game.id,
                    game.name,
                    game.icon,
                    game.walletId,
                    game.totalStaked,
                    game.totalWon,
                    game.createdAt.toISOString(),
                    game.updatedAt.toISOString(),
                ],
            );

            games.value.push(game);
            return game;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Updates an existing game (name and/or icon).
     * The linked wallet is kept in sync (same name and icon).
     * @param id - The unique identifier of the game to update
     * @param data - The partial game data to update
     * @returns Promise resolving to the updated game, or null if not found
     */
    async function update(id: string, data: UpdateGame): Promise<Game | null> {
        isLoading.value = true;
        try {
            const existing = games.value.find((g: Game) => g.id === id);
            if (!existing) return null;

            const updated: Game = {
                ...existing,
                name: data.name ?? existing.name,
                icon: data.icon ?? existing.icon,
                updatedAt: new Date(),
            };

            await execute(`UPDATE games SET name = ?, icon = ?, updated_at = ? WHERE id = ?`, [
                updated.name,
                updated.icon,
                updated.updatedAt.toISOString(),
                id,
            ]);

            // Keep the dedicated wallet in sync
            const walletStore = useWalletStore();
            await walletStore.update(existing.walletId, { name: updated.name, icon: updated.icon });

            const index = games.value.findIndex((g: Game) => g.id === id);
            if (index !== -1) {
                games.value[index] = updated;
            }

            return updated;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Deletes a game, all its bets, and its dedicated wallet.
     * @param id - The unique identifier of the game to delete
     * @returns Promise resolving to true if deleted, false if not found
     */
    async function remove(id: string): Promise<boolean> {
        isLoading.value = true;
        try {
            const existing = games.value.find((g: Game) => g.id === id);
            if (!existing) return false;

            const betStore = useBetStore();
            const walletStore = useWalletStore();

            // Remove bets first (no balance revert needed: the wallet is deleted too)
            await betStore.removeByGame(id);
            await execute('DELETE FROM games WHERE id = ?', [id]);
            await walletStore.remove(existing.walletId);

            games.value = games.value.filter((g: Game) => g.id !== id);
            return true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Applies deltas to a game's derived totals (called by the bet store).
     * @param id - The game identifier
     * @param stakeDelta - Amount to add to total_staked (can be negative)
     * @param wonDelta - Amount to add to total_won (can be negative)
     * @returns Promise resolving when totals are persisted
     */
    async function adjustTotals(id: string, stakeDelta: number, wonDelta: number): Promise<void> {
        const existing = games.value.find((g: Game) => g.id === id);
        if (!existing) return;

        const updated: Game = {
            ...existing,
            totalStaked: existing.totalStaked + stakeDelta,
            totalWon: existing.totalWon + wonDelta,
            updatedAt: new Date(),
        };

        await execute(
            `UPDATE games SET total_staked = ?, total_won = ?, updated_at = ? WHERE id = ?`,
            [updated.totalStaked, updated.totalWon, updated.updatedAt.toISOString(), id],
        );

        const index = games.value.findIndex((g: Game) => g.id === id);
        if (index !== -1) {
            games.value[index] = updated;
        }
    }

    return {
        // State
        games,
        isLoading,
        isInitialized,
        // Getters
        getGameById,
        getGameByWalletId,
        getGamesWithStats,
        // Actions
        loadAll,
        reload,
        create,
        update,
        remove,
        adjustTotals,
    };
});
