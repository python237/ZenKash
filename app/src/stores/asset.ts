import { defineStore } from 'pinia';
import { v4 as uuidv4 } from 'uuid';
import type {
    Asset,
    AssetCategory,
    AssetCondition,
    AssetWithStats,
    CreateAsset,
    DepreciationPace,
    UpdateAsset,
} from 'src/types/asset';
import type { CurrencyCode } from 'src/types/currency';
import { execute, query } from 'src/services/database';
import { withStats } from 'src/services/asset-valuation';

/**
 * Database row shape for the assets table
 */
interface AssetRow {
    id: string;
    name: string;
    category: string;
    pace: string;
    condition: string;
    purchase_price: number;
    purchase_date: string;
    currency: string;
    sold_at: string | null;
    sold_price: number | null;
    created_at: string;
    updated_at: string;
}

/**
 * Converts a database row to an Asset.
 * @param row - The database row
 * @returns The asset
 */
function rowToAsset(row: AssetRow): Asset {
    return {
        id: row.id,
        name: row.name,
        category: row.category as AssetCategory,
        pace: row.pace as DepreciationPace,
        condition: row.condition as AssetCondition,
        purchasePrice: row.purchase_price,
        purchaseDate: new Date(row.purchase_date),
        currency: row.currency as CurrencyCode,
        soldAt: row.sold_at ? new Date(row.sold_at) : undefined,
        soldPrice: row.sold_price ?? undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
    };
}

/**
 * Asset store: durable goods valued at their estimated resale price.
 * Never creates transactions.
 */
export const useAssetStore = defineStore('asset', () => {
    const assets = ref<Asset[]>([]);
    const isLoading = ref(false);

    /** Every asset with its valuation, most valuable first */
    const assetsWithStats = computed((): AssetWithStats[] =>
        assets.value.map((asset) => withStats(asset)).sort((a, b) => b.resaleValue - a.resaleValue),
    );

    /** Assets still owned */
    const owned = computed(() => assetsWithStats.value.filter((a) => !a.isSold));

    /** Assets sold, most recent sale first */
    const sold = computed(() =>
        assetsWithStats.value
            .filter((a) => a.isSold)
            .sort((a, b) => (b.soldAt?.getTime() ?? 0) - (a.soldAt?.getTime() ?? 0)),
    );

    /**
     * Finds an asset with its valuation.
     * @param id - The asset id
     * @returns The asset, or undefined
     */
    function getById(id: string): AssetWithStats | undefined {
        return assetsWithStats.value.find((a) => a.id === id);
    }

    /**
     * Loads every asset.
     */
    async function loadAll(): Promise<void> {
        isLoading.value = true;
        try {
            const rows = await query<AssetRow>('SELECT * FROM assets ORDER BY created_at DESC');
            assets.value = rows.map(rowToAsset);
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Records a new asset.
     * @param data - The asset data
     * @returns The created asset
     */
    async function create(data: CreateAsset): Promise<Asset> {
        const now = new Date();
        const asset: Asset = { ...data, id: uuidv4(), createdAt: now, updatedAt: now };
        await execute(
            `INSERT INTO assets (id, name, category, pace, condition, purchase_price, purchase_date, currency, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                asset.id,
                asset.name,
                asset.category,
                asset.pace,
                asset.condition,
                asset.purchasePrice,
                asset.purchaseDate.toISOString(),
                asset.currency,
                now.toISOString(),
                now.toISOString(),
            ],
        );
        assets.value = [asset, ...assets.value];
        return asset;
    }

    /**
     * Updates an asset.
     * @param id - The asset id
     * @param data - Fields to change
     */
    async function update(id: string, data: UpdateAsset): Promise<void> {
        const current = assets.value.find((a) => a.id === id);
        if (!current) return;
        const next: Asset = { ...current, ...data, updatedAt: new Date() };
        await execute(
            `UPDATE assets SET name = ?, category = ?, pace = ?, condition = ?, purchase_price = ?,
             purchase_date = ?, updated_at = ? WHERE id = ?`,
            [
                next.name,
                next.category,
                next.pace,
                next.condition,
                next.purchasePrice,
                next.purchaseDate.toISOString(),
                next.updatedAt.toISOString(),
                id,
            ],
        );
        assets.value = assets.value.map((a) => (a.id === id ? next : a));
    }

    /**
     * Marks an asset as sold (or back to owned). It leaves the net worth; the
     * price is kept for reference only, no transaction is created.
     * @param id - The asset id
     * @param soldPrice - Price obtained, or null to undo the sale
     * @param soldAt - Sale date
     */
    async function setSold(
        id: string,
        soldPrice: number | null,
        soldAt = new Date(),
    ): Promise<void> {
        const now = new Date();
        const isSold = soldPrice !== null;
        await execute(
            'UPDATE assets SET sold_at = ?, sold_price = ?, updated_at = ? WHERE id = ?',
            [isSold ? soldAt.toISOString() : null, soldPrice, now.toISOString(), id],
        );
        assets.value = assets.value.map((a) =>
            a.id === id
                ? {
                      ...a,
                      soldAt: isSold ? soldAt : undefined,
                      soldPrice: soldPrice ?? undefined,
                      updatedAt: now,
                  }
                : a,
        );
    }

    /**
     * Deletes an asset.
     * @param id - The asset id
     */
    async function remove(id: string): Promise<void> {
        await execute('DELETE FROM assets WHERE id = ?', [id]);
        assets.value = assets.value.filter((a) => a.id !== id);
    }

    return {
        assets,
        isLoading,
        assetsWithStats,
        owned,
        sold,
        getById,
        loadAll,
        create,
        update,
        setSold,
        remove,
    };
});
