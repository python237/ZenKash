import { defineStore } from 'pinia';
import type {
    NetWorthSnapshot,
    NetWorthComponents,
    NetWorthDelta,
} from 'src/types/net-worth-snapshot';
import { CurrencyCode } from 'src/types/currency';
import type { Wallet } from 'src/types/wallet';
import type { InvestmentItem } from 'src/types/investment';
import { execute, query } from 'src/services/database';

/**
 * Generates a unique identifier for a net worth snapshot
 * @returns A unique string identifier combining timestamp and random values
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Returns the current month in "YYYY-MM" format.
 * @returns The current period key
 */
function currentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Database row type
/**
 *
 */
interface NetWorthRow {
    id: string;
    period: string;
    date: string;
    liquid: number;
    investments: number;
    games: number;
    total: number;
    currency: string;
    created_at: string;
    updated_at: string;
}

/**
 * Converts a database row to a NetWorthSnapshot object
 * @param row - The database row containing snapshot data
 * @returns A NetWorthSnapshot object with properly typed fields
 */
function rowToSnapshot(row: NetWorthRow): NetWorthSnapshot {
    return {
        id: row.id,
        period: row.period,
        date: new Date(row.date),
        liquid: row.liquid,
        investments: row.investments,
        games: row.games,
        total: row.total,
        currency: row.currency as CurrencyCode,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

export const useNetWorthStore = defineStore('netWorth', () => {
    // State
    const snapshots = ref<NetWorthSnapshot[]>([]);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    /**
     * The most recent snapshot by period, if any.
     */
    const latest = computed<NetWorthSnapshot | null>(() => snapshots.value.at(-1) ?? null);

    /**
     * The last N snapshots ordered chronologically (oldest first).
     * @param count - Maximum number of snapshots to return (default 12)
     * @returns The most recent snapshots, oldest first
     */
    function series(count = 12): NetWorthSnapshot[] {
        return snapshots.value.slice(-count);
    }

    /**
     * The change between the latest snapshot and the previous one.
     */
    const deltaVsPrevious = computed<NetWorthDelta | null>(() => {
        if (snapshots.value.length < 2) return null;
        const last = snapshots.value.at(-1)!;
        const prev = snapshots.value.at(-2)!;
        const amount = last.total - prev.total;
        const percent = prev.total !== 0 ? (amount / Math.abs(prev.total)) * 100 : 0;
        return { amount, percent };
    });

    /**
     * Computes the current net worth components, converting every value
     * to the user's default currency.
     * @returns The current net worth breakdown
     */
    function computeCurrent(): NetWorthComponents {
        const walletStore = useWalletStore();
        const investmentStore = useInvestmentStore();
        const exchangeRateStore = useExchangeRateStore();
        const settingsStore = useSettingsStore();

        const defaultCurrency = settingsStore.defaultCurrency ?? CurrencyCode.XOF;

        const liquid = walletStore.nonGameWallets.reduce(
            (sum: number, w: Wallet) =>
                sum + exchangeRateStore.convertWithDefault(w.balance, w.currency, defaultCurrency),
            0,
        );

        const games = walletStore.wallets
            .filter((w: Wallet) => w.isGame)
            .reduce(
                (sum: number, w: Wallet) =>
                    sum +
                    exchangeRateStore.convertWithDefault(w.balance, w.currency, defaultCurrency),
                0,
            );

        const investments = investmentStore.items.reduce(
            (sum: number, item: InvestmentItem) =>
                sum +
                exchangeRateStore.convertWithDefault(
                    item.quantity * item.currentRate,
                    item.currency,
                    defaultCurrency,
                ),
            0,
        );

        return { liquid, investments, games, total: liquid + investments + games };
    }

    /**
     * Loads all net worth snapshots from the database into the store
     * Only loads once; subsequent calls are no-ops if already initialized
     * @returns Promise that resolves when snapshots are loaded
     */
    async function loadAll(): Promise<void> {
        if (isInitialized.value) return;
        isLoading.value = true;
        try {
            const rows = await query<NetWorthRow>(
                'SELECT * FROM net_worth_snapshots ORDER BY period ASC',
            );
            snapshots.value = rows.map(rowToSnapshot);
            isInitialized.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Captures the current net worth for the current month.
     * Upserts on the period: the current month is always refreshed while past
     * months stay frozen.
     * @returns Promise resolving to the created or updated snapshot
     */
    async function captureCurrent(): Promise<NetWorthSnapshot> {
        isLoading.value = true;
        try {
            const settingsStore = useSettingsStore();
            const components = computeCurrent();
            const period = currentPeriod();
            const now = new Date();

            const existing = snapshots.value.find((s) => s.period === period);
            const id = existing?.id ?? generateId();
            const createdAt = existing?.createdAt ?? now;

            const snapshot: NetWorthSnapshot = {
                id,
                period,
                date: now,
                liquid: components.liquid,
                investments: components.investments,
                games: components.games,
                total: components.total,
                currency: settingsStore.defaultCurrency ?? CurrencyCode.XOF,
                createdAt,
                updatedAt: now,
            };

            await execute(
                `INSERT INTO net_worth_snapshots
                    (id, period, date, liquid, investments, games, total, currency, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(period) DO UPDATE SET
                    date = excluded.date,
                    liquid = excluded.liquid,
                    investments = excluded.investments,
                    games = excluded.games,
                    total = excluded.total,
                    currency = excluded.currency,
                    updated_at = excluded.updated_at`,
                [
                    snapshot.id,
                    snapshot.period,
                    snapshot.date.toISOString(),
                    snapshot.liquid,
                    snapshot.investments,
                    snapshot.games,
                    snapshot.total,
                    snapshot.currency,
                    snapshot.createdAt.toISOString(),
                    snapshot.updatedAt.toISOString(),
                ],
            );

            const index = snapshots.value.findIndex((s) => s.period === period);
            if (index !== -1) {
                snapshots.value[index] = snapshot;
            } else {
                snapshots.value.push(snapshot);
                snapshots.value.sort((a, b) => a.period.localeCompare(b.period));
            }

            return snapshot;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Deletes a snapshot from the database and removes it from the store
     * @param id - The unique identifier of the snapshot to delete
     * @returns Promise resolving to true if deleted, false if not found
     */
    async function remove(id: string): Promise<boolean> {
        isLoading.value = true;
        try {
            const index = snapshots.value.findIndex((s) => s.id === id);
            if (index === -1) return false;
            await execute('DELETE FROM net_worth_snapshots WHERE id = ?', [id]);
            snapshots.value.splice(index, 1);
            return true;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        // State
        snapshots,
        isLoading,
        isInitialized,
        // Getters
        latest,
        deltaVsPrevious,
        series,
        computeCurrent,
        // Actions
        loadAll,
        captureCurrent,
        remove,
    };
});
