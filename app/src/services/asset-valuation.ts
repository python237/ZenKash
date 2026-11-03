/**
 * Asset Valuation Service
 *
 * Estimated resale value of a durable good:
 *   value = purchase price × (1 − yearly rate)^years × resale factor (condition)
 * The rate comes from the category presets (declining balance); the resale
 * factor from the current condition. Rates are never typed freely so the net
 * worth stays credible.
 * @module services/asset-valuation
 */

import type { Asset, AssetCategoryPreset, AssetWithStats } from 'src/types/asset';
import { ASSET_CATEGORIES, CONDITION_RESALE_FACTOR } from 'src/types/asset';

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Finds the preset of a category (falls back to "other").
 * @param category - The category id
 * @returns The category preset
 */
export function categoryPreset(category: string): AssetCategoryPreset {
    return (
        ASSET_CATEGORIES.find((c) => c.id === category) ??
        (ASSET_CATEGORIES[ASSET_CATEGORIES.length - 1] as AssetCategoryPreset)
    );
}

/**
 * Years elapsed between two dates (never negative).
 * @param from - Start date
 * @param to - End date
 * @returns Elapsed years, fractional
 */
export function yearsBetween(from: Date, to: Date): number {
    return Math.max(0, (to.getTime() - from.getTime()) / MS_PER_YEAR);
}

/**
 * Value after depreciation at a given date, before the resale discount.
 * @param asset - The asset
 * @param at - Valuation date (defaults to now)
 * @returns The depreciated value
 */
export function depreciatedValueAt(
    asset: Pick<Asset, 'category' | 'pace' | 'purchasePrice' | 'purchaseDate'>,
    at: Date = new Date(),
): number {
    const rate = categoryPreset(asset.category).rates[asset.pace] / 100;
    return asset.purchasePrice * Math.pow(1 - rate, yearsBetween(asset.purchaseDate, at));
}

/**
 * Estimated resale value at a given date.
 * @param asset - The asset
 * @param at - Valuation date (defaults to now)
 * @returns The estimated resale value, rounded to the unit
 */
export function resaleValueAt(
    asset: Pick<Asset, 'category' | 'pace' | 'condition' | 'purchasePrice' | 'purchaseDate'>,
    at: Date = new Date(),
): number {
    return Math.round(depreciatedValueAt(asset, at) * CONDITION_RESALE_FACTOR[asset.condition]);
}

/**
 * Adds the computed valuation to an asset. A sold asset is worth 0.
 * @param asset - The asset
 * @param at - Valuation date (defaults to now)
 * @returns The asset with its stats
 */
export function withStats(asset: Asset, at: Date = new Date()): AssetWithStats {
    const isSold = !!asset.soldAt;
    const depreciatedValue = Math.round(depreciatedValueAt(asset, at));
    const resaleValue = isSold ? 0 : resaleValueAt(asset, at);
    return {
        ...asset,
        rate: categoryPreset(asset.category).rates[asset.pace],
        years: yearsBetween(asset.purchaseDate, at),
        depreciatedValue,
        resaleValue,
        keptPercent:
            asset.purchasePrice > 0 ? (resaleValueAt(asset, at) / asset.purchasePrice) * 100 : 0,
        isSold,
    };
}
