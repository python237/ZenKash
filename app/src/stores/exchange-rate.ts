import { defineStore } from 'pinia';
import type { CurrencyCode, ExchangeRate } from 'src/types/currency';
import { execute, query } from 'src/services/database';

/**
 * Generates a unique identifier for an exchange rate
 * @returns A unique string identifier combining timestamp and random values
 */
function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 *
 */
interface ExchangeRateRow {
    id: string;
    from_currency: string;
    to_currency: string;
    rate: number;
    updated_at: string;
}

/**
 * Converts a database row to an ExchangeRate object
 * @param row - The database row containing exchange rate data
 * @returns An ExchangeRate object with properly typed fields
 */
function rowToExchangeRate(row: ExchangeRateRow): ExchangeRate {
    return {
        id: row.id,
        fromCurrency: row.from_currency as CurrencyCode,
        toCurrency: row.to_currency as CurrencyCode,
        rate: row.rate,
        updatedAt: new Date(row.updated_at),
    };
}

export const useExchangeRateStore = defineStore('exchangeRate', () => {
    // State
    const rates = ref<ExchangeRate[]>([]);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    /**
     * Gets the exchange rate between two currencies
     * @param fromCurrency - The source currency code
     * @param toCurrency - The target currency code
     * @returns The exchange rate if found, 1 if same currency, null if not configured
     */
    const getRate = (fromCurrency: CurrencyCode, toCurrency: CurrencyCode): number | null => {
        // Same currency = 1:1
        if (fromCurrency === toCurrency) return 1;

        const rate = rates.value.find(
            (r: ExchangeRate) => r.fromCurrency === fromCurrency && r.toCurrency === toCurrency,
        );
        return rate?.rate ?? null;
    };

    /**
     * Converts an amount from one currency to another
     * @param amount - The amount to convert
     * @param fromCurrency - The source currency code
     * @param toCurrency - The target currency code
     * @returns The converted amount, or null if no exchange rate is configured
     */
    const convert = (
        amount: number,
        fromCurrency: CurrencyCode,
        toCurrency: CurrencyCode,
    ): number | null => {
        const rate = getRate(fromCurrency, toCurrency);
        if (rate === null) return null;
        return amount * rate;
    };

    /**
     * Converts an amount from one currency to another with a fallback rate of 1
     * Useful when conversion should proceed even without a configured rate
     * @param amount - The amount to convert
     * @param fromCurrency - The source currency code
     * @param toCurrency - The target currency code
     * @returns The converted amount using configured rate or 1 as fallback
     */
    const convertWithDefault = (
        amount: number,
        fromCurrency: CurrencyCode,
        toCurrency: CurrencyCode,
    ): number => {
        const rate = getRate(fromCurrency, toCurrency);
        return amount * (rate ?? 1);
    };

    /**
     * Loads all exchange rates from the database into the store
     * Only loads once; subsequent calls are no-ops if already initialized
     * @returns Promise that resolves when exchange rates are loaded
     */
    async function loadAll(): Promise<void> {
        if (isInitialized.value) return;
        isLoading.value = true;
        try {
            const rows = await query<ExchangeRateRow>(
                'SELECT * FROM exchange_rates ORDER BY from_currency',
            );
            rates.value = rows.map(rowToExchangeRate);
            isInitialized.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Sets or updates an exchange rate for a currency pair
     * Creates a new rate if one doesn't exist, updates existing rate otherwise
     * @param fromCurrency - The source currency code
     * @param toCurrency - The target currency code
     * @param rate - The exchange rate value
     * @returns Promise resolving to the created or updated exchange rate
     */
    async function setRate(
        fromCurrency: CurrencyCode,
        toCurrency: CurrencyCode,
        rate: number,
    ): Promise<ExchangeRate> {
        isLoading.value = true;
        try {
            const existing = rates.value.find(
                (r: ExchangeRate) => r.fromCurrency === fromCurrency && r.toCurrency === toCurrency,
            );

            const now = new Date();

            if (existing) {
                // Update existing rate
                await execute('UPDATE exchange_rates SET rate = ?, updated_at = ? WHERE id = ?', [
                    rate,
                    now.toISOString(),
                    existing.id,
                ]);
                existing.rate = rate;
                existing.updatedAt = now;
                return existing;
            } else {
                // Create new rate
                const newRate: ExchangeRate = {
                    id: generateId(),
                    fromCurrency,
                    toCurrency,
                    rate,
                    updatedAt: now,
                };

                await execute(
                    'INSERT INTO exchange_rates (id, from_currency, to_currency, rate, updated_at) VALUES (?, ?, ?, ?, ?)',
                    [
                        newRate.id,
                        newRate.fromCurrency,
                        newRate.toCurrency,
                        newRate.rate,
                        newRate.updatedAt.toISOString(),
                    ],
                );

                rates.value.push(newRate);
                return newRate;
            }
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Deletes an exchange rate from the database and removes it from the store
     * @param id - The unique identifier of the exchange rate to delete
     * @returns Promise that resolves when the rate is deleted
     */
    async function remove(id: string): Promise<void> {
        isLoading.value = true;
        try {
            await execute('DELETE FROM exchange_rates WHERE id = ?', [id]);
            rates.value = rates.value.filter((r: ExchangeRate) => r.id !== id);
        } finally {
            isLoading.value = false;
        }
    }

    return {
        // State
        rates,
        isLoading,
        isInitialized,
        // Getters
        getRate,
        convert,
        convertWithDefault,
        // Actions
        loadAll,
        setRate,
        remove,
    };
});
