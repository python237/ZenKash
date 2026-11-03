/**
 * Asset Types
 *
 * Durable goods (furniture, TV, vehicle...) valued at their estimated resale
 * price. Assets are independent from transactions: recording one never moves
 * money. They count in the net worth but not in the "available" net worth.
 * @module types/asset
 */

import type { CurrencyCode } from './currency';

/** Broad asset categories, each with preset depreciation rates */
export type AssetCategory =
    | 'tech'
    | 'tv'
    | 'appliance'
    | 'furniture'
    | 'vehicle'
    | 'tools'
    | 'fashion'
    | 'jewelry'
    | 'other';

/** Depreciation pace chosen among the category presets (never typed freely) */
export type DepreciationPace = 'slow' | 'standard' | 'fast';

/** Current condition, which sets the share of the depreciated value recovered on resale */
export type AssetCondition = 'like_new' | 'good' | 'fair' | 'worn';

/** Preset definition of a category */
export interface AssetCategoryPreset {
    id: AssetCategory;
    /** Material icon */
    icon: string;
    /** Named color, mapped by services/tone */
    color: string;
    /** Yearly declining-balance depreciation in percent, per pace */
    rates: Record<DepreciationPace, number>;
}

/** Category presets: yearly depreciation (declining balance) per pace */
export const ASSET_CATEGORIES: AssetCategoryPreset[] = [
    { id: 'tech', icon: 'o_laptop', color: 'blue', rates: { slow: 20, standard: 30, fast: 40 } },
    { id: 'tv', icon: 'o_tv', color: 'purple', rates: { slow: 15, standard: 20, fast: 30 } },
    {
        id: 'appliance',
        icon: 'o_kitchen',
        color: 'teal',
        rates: { slow: 10, standard: 15, fast: 20 },
    },
    {
        id: 'furniture',
        icon: 'o_chair',
        color: 'amber',
        rates: { slow: 7, standard: 10, fast: 15 },
    },
    {
        id: 'vehicle',
        icon: 'o_two_wheeler',
        color: 'orange',
        rates: { slow: 10, standard: 15, fast: 20 },
    },
    { id: 'tools', icon: 'o_handyman', color: 'grey', rates: { slow: 8, standard: 12, fast: 15 } },
    {
        id: 'fashion',
        icon: 'o_shopping_bag',
        color: 'pink',
        rates: { slow: 20, standard: 30, fast: 40 },
    },
    { id: 'jewelry', icon: 'o_diamond', color: 'amber', rates: { slow: 0, standard: 3, fast: 5 } },
    {
        id: 'other',
        icon: 'o_inventory_2',
        color: 'grey',
        rates: { slow: 10, standard: 15, fast: 20 },
    },
];

/** Paces in display order */
export const DEPRECIATION_PACES: DepreciationPace[] = ['slow', 'standard', 'fast'];

/** Share of the depreciated value recovered when selling, per condition */
export const CONDITION_RESALE_FACTOR: Record<AssetCondition, number> = {
    like_new: 0.6,
    good: 0.55,
    fair: 0.5,
    worn: 0.35,
};

/** Conditions in display order */
export const ASSET_CONDITIONS: AssetCondition[] = ['like_new', 'good', 'fair', 'worn'];

/** A durable good owned (or sold) by the user */
export interface Asset {
    id: string;
    name: string;
    category: AssetCategory;
    pace: DepreciationPace;
    condition: AssetCondition;
    purchasePrice: number;
    purchaseDate: Date;
    currency: CurrencyCode;
    /** Set once the asset is sold; it then leaves the net worth */
    soldAt?: Date | undefined;
    /** Price obtained, kept for reference only (no transaction is created) */
    soldPrice?: number | undefined;
    createdAt: Date;
    updatedAt: Date;
}

/** Data needed to create an asset */
export type CreateAsset = Pick<
    Asset,
    'name' | 'category' | 'pace' | 'condition' | 'purchasePrice' | 'purchaseDate' | 'currency'
>;

/** Editable fields of an asset */
export type UpdateAsset = Partial<
    Pick<Asset, 'name' | 'category' | 'pace' | 'condition' | 'purchasePrice' | 'purchaseDate'>
>;

/** Asset with its computed valuation */
export interface AssetWithStats extends Asset {
    /** Yearly depreciation rate applied, in percent */
    rate: number;
    /** Years elapsed since purchase */
    years: number;
    /** Value after depreciation, before the resale discount */
    depreciatedValue: number;
    /** Estimated resale value (depreciated value × resale factor) */
    resaleValue: number;
    /** Share of the purchase price still represented by the resale value, in percent */
    keptPercent: number;
    isSold: boolean;
}
