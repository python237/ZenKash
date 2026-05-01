/**
 * Enumeration of supported currency codes.
 * Includes major African currencies and international currencies.
 */
export enum CurrencyCode {
    /** Franc CFA - West African Economic and Monetary Union (BCEAO) */
    XOF = 'XOF',
    /** Franc CFA - Central African Economic and Monetary Community (BEAC) */
    XAF = 'XAF',
    /** Euro - European Union */
    EUR = 'EUR',
    /** US Dollar - United States */
    USD = 'USD',
    /** British Pound - United Kingdom */
    GBP = 'GBP',
    /** Moroccan Dirham - Morocco */
    MAD = 'MAD',
    /** Nigerian Naira - Nigeria */
    NGN = 'NGN',
    /** Ghanaian Cedi - Ghana */
    GHS = 'GHS',
    /** Kenyan Shilling - Kenya */
    KES = 'KES',
    /** South African Rand - South Africa */
    ZAR = 'ZAR',
}

/**
 * Represents currency metadata including display symbol and decimal precision.
 */
export interface Currency {
    /** ISO 4217 currency code */
    code: CurrencyCode;
    /** Display symbol (e.g., "$", "€", "FCFA") */
    symbol: string;
    /** Number of decimal places for this currency (0 for XOF/XAF, 2 for most others) */
    decimals: number;
}

/**
 * Lookup table of all supported currencies with their metadata.
 * Used for formatting amounts and displaying currency information.
 */
export const CURRENCIES: Record<CurrencyCode, Currency> = {
    [CurrencyCode.XOF]: { code: CurrencyCode.XOF, symbol: 'FCFA', decimals: 0 },
    [CurrencyCode.XAF]: { code: CurrencyCode.XAF, symbol: 'FCFA', decimals: 0 },
    [CurrencyCode.EUR]: { code: CurrencyCode.EUR, symbol: '€', decimals: 2 },
    [CurrencyCode.USD]: { code: CurrencyCode.USD, symbol: '$', decimals: 2 },
    [CurrencyCode.GBP]: { code: CurrencyCode.GBP, symbol: '£', decimals: 2 },
    [CurrencyCode.MAD]: { code: CurrencyCode.MAD, symbol: 'DH', decimals: 2 },
    [CurrencyCode.NGN]: { code: CurrencyCode.NGN, symbol: '₦', decimals: 2 },
    [CurrencyCode.GHS]: { code: CurrencyCode.GHS, symbol: 'GH₵', decimals: 2 },
    [CurrencyCode.KES]: { code: CurrencyCode.KES, symbol: 'KSh', decimals: 2 },
    [CurrencyCode.ZAR]: { code: CurrencyCode.ZAR, symbol: 'R', decimals: 2 },
};

/**
 * Generates a list of currency options for use in select dropdowns.
 * @param t - Translation function for localized currency names
 * @returns Array of currency options with value, label, and symbol
 */
export function getCurrencyOptions(t: (key: string) => string) {
    return Object.values(CURRENCIES).map((c) => ({
        value: c.code,
        label: `${t(`currencies.${c.code}`)} (${c.symbol})`,
        symbol: c.symbol,
    }));
}

/**
 * Represents an exchange rate between two currencies.
 * Used for converting amounts when dealing with multi-currency wallets.
 */
export interface ExchangeRate {
    /** Unique identifier for the exchange rate record */
    id: string;
    /** Source currency code */
    fromCurrency: CurrencyCode;
    /** Target currency code (typically the user's default currency) */
    toCurrency: CurrencyCode;
    /** Conversion rate: 1 unit of fromCurrency = rate units of toCurrency */
    rate: number;
    /** Timestamp when this rate was last updated */
    updatedAt: Date;
}
