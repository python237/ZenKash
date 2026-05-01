import { defineStore } from 'pinia';
import type { CurrencyCode } from 'src/types/currency';
import { execute, query } from 'src/services/database';

// Settings keys
const SETTINGS_KEY_DEFAULT_CURRENCY = 'default_currency';

/**
 *
 */
interface SettingRow {
    key: string;
    value: string;
}

export const useSettingsStore = defineStore('settings', () => {
    // State
    const defaultCurrency = ref<CurrencyCode | null>(null);
    const isLoading = ref(false);
    const isInitialized = ref(false);

    /**
     * Computed property that indicates whether a default currency has been configured
     */
    const hasDefaultCurrency = computed(() => defaultCurrency.value !== null);

    /**
     * Loads all application settings from the database into the store
     * Only loads once; subsequent calls are no-ops if already initialized
     * @returns Promise that resolves when settings are loaded
     */
    async function loadSettings(): Promise<void> {
        if (isInitialized.value) return;
        isLoading.value = true;
        try {
            const rows = await query<SettingRow>('SELECT * FROM app_settings');

            for (const row of rows) {
                if (row.key === SETTINGS_KEY_DEFAULT_CURRENCY) {
                    defaultCurrency.value = row.value as CurrencyCode;
                }
            }

            isInitialized.value = true;
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Sets the default currency for the application
     * Can only be set once; subsequent calls will throw an error
     * @param currency - The currency code to set as default
     * @returns Promise that resolves when the currency is set
     * @throws Error if default currency is already set
     */
    async function setDefaultCurrency(currency: CurrencyCode): Promise<void> {
        if (defaultCurrency.value !== null) {
            throw new Error('Default currency already set and cannot be changed');
        }

        isLoading.value = true;
        try {
            await execute('INSERT INTO app_settings (key, value) VALUES (?, ?)', [
                SETTINGS_KEY_DEFAULT_CURRENCY,
                currency,
            ]);
            defaultCurrency.value = currency;
        } finally {
            isLoading.value = false;
        }
    }

    return {
        // State
        defaultCurrency,
        isLoading,
        isInitialized,
        // Getters
        hasDefaultCurrency,
        // Actions
        loadSettings,
        setDefaultCurrency,
    };
});
