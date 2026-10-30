import { defineStore } from 'pinia';
import type { CurrencyCode } from 'src/types/currency';
import { execute, query } from 'src/services/database';

// Settings keys
const SETTINGS_KEY_DEFAULT_CURRENCY = 'default_currency';
const SETTINGS_KEY_FIRST_NAME = 'first_name';
const SETTINGS_KEY_AMOUNTS_HIDDEN = 'amounts_hidden';

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
    const firstName = ref<string | null>(null);
    const amountsHidden = ref(false);
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
                } else if (row.key === SETTINGS_KEY_FIRST_NAME) {
                    firstName.value = row.value || null;
                } else if (row.key === SETTINGS_KEY_AMOUNTS_HIDDEN) {
                    amountsHidden.value = row.value === '1';
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

    /**
     * Inserts or replaces a single setting row.
     * @param key - The setting key
     * @param value - The value to store
     */
    async function upsertSetting(key: string, value: string): Promise<void> {
        await execute('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [
            key,
            value,
        ]);
    }

    /**
     * Saves the user's first name, used to greet them on the dashboard.
     * @param name - The first name (trimmed before saving)
     */
    async function setFirstName(name: string): Promise<void> {
        const trimmed = name.trim();
        await upsertSetting(SETTINGS_KEY_FIRST_NAME, trimmed);
        firstName.value = trimmed || null;
    }

    /**
     * Shows or hides every amount displayed in the app (privacy mode).
     * @param hidden - True to mask amounts
     */
    async function setAmountsHidden(hidden: boolean): Promise<void> {
        amountsHidden.value = hidden;
        await upsertSetting(SETTINGS_KEY_AMOUNTS_HIDDEN, hidden ? '1' : '0');
    }

    return {
        // State
        defaultCurrency,
        firstName,
        amountsHidden,
        isLoading,
        isInitialized,
        // Getters
        hasDefaultCurrency,
        // Actions
        loadSettings,
        setDefaultCurrency,
        setFirstName,
        setAmountsHidden,
    };
});
