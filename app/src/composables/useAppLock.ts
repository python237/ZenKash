/**
 * App Lock Composable
 *
 * PIN-based application lock (100% JS, no native dependency). The PIN is stored
 * as a SHA-256 hash in the app_settings table. The app locks on launch and,
 * on native platforms, whenever it goes to the background.
 * @module composables/useAppLock
 */

import { ref, computed } from 'vue';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { execute, query, waitForDatabase } from 'src/services/database';
import { hashPin } from 'src/services/crypto';

const ENABLED_KEY = 'app_lock_enabled';
const PIN_KEY = 'app_lock_pin';

/** PIN length enforced by the UI. */
export const PIN_LENGTH = 4;

/** Whether the app lock is enabled */
const isEnabled = ref(false);
/** Whether the app is currently locked */
const isLocked = ref(false);
/** Whether the composable has been initialized */
const isInitialized = ref(false);
/** Whether the background listener has been registered */
let listenerRegistered = false;

/**
 *
 */
interface SettingRow {
    key: string;
    value: string;
}

/**
 * Reads a setting value from app_settings.
 * @param key - The setting key
 * @returns Promise resolving to the value, or null if absent
 */
async function readSetting(key: string): Promise<string | null> {
    const rows = await query<SettingRow>('SELECT value FROM app_settings WHERE key = ?', [key]);
    return rows[0]?.value ?? null;
}

/**
 * Upserts a setting value into app_settings.
 * @param key - The setting key
 * @param value - The value to store
 * @returns Promise that resolves when persisted
 */
async function writeSetting(key: string, value: string): Promise<void> {
    await execute(
        'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, value],
    );
}

/**
 * Deletes a setting from app_settings.
 * @param key - The setting key
 * @returns Promise that resolves when deleted
 */
async function deleteSetting(key: string): Promise<void> {
    await execute('DELETE FROM app_settings WHERE key = ?', [key]);
}

/**
 * App lock composable accessor.
 * @returns Reactive lock state and control actions
 */
export function useAppLock() {
    const isNative = computed(() => Capacitor.isNativePlatform());

    /**
     * Initializes the lock state from storage and, on native, registers the
     * background listener. Locks the app on launch when enabled.
     * @returns Promise that resolves when initialized
     */
    async function initialize(): Promise<void> {
        if (isInitialized.value) return;
        await waitForDatabase();

        const enabled = await readSetting(ENABLED_KEY);
        isEnabled.value = enabled === '1';
        isLocked.value = isEnabled.value;
        isInitialized.value = true;

        if (Capacitor.isNativePlatform() && !listenerRegistered) {
            listenerRegistered = true;
            void App.addListener('appStateChange', ({ isActive }) => {
                if (!isActive && isEnabled.value) {
                    isLocked.value = true;
                }
            });
        }
    }

    /**
     * Verifies a PIN against the stored hash.
     * @param pin - The PIN to verify
     * @returns Promise resolving to true if the PIN is correct
     */
    async function verify(pin: string): Promise<boolean> {
        const stored = await readSetting(PIN_KEY);
        if (!stored) return false;
        return stored === (await hashPin(pin));
    }

    /**
     * Enables the lock by setting a PIN.
     * @param pin - The new PIN
     * @returns Promise that resolves when the PIN is set
     */
    async function setPin(pin: string): Promise<void> {
        await writeSetting(PIN_KEY, await hashPin(pin));
        await writeSetting(ENABLED_KEY, '1');
        isEnabled.value = true;
        isLocked.value = false;
    }

    /**
     * Disables the lock after verifying the current PIN.
     * @param pin - The current PIN
     * @returns Promise resolving to true if disabled, false if the PIN is wrong
     */
    async function disable(pin: string): Promise<boolean> {
        if (!(await verify(pin))) return false;
        await deleteSetting(PIN_KEY);
        await writeSetting(ENABLED_KEY, '0');
        isEnabled.value = false;
        isLocked.value = false;
        return true;
    }

    /**
     * Attempts to unlock the app with a PIN.
     * @param pin - The PIN to try
     * @returns Promise resolving to true if unlocked
     */
    async function unlock(pin: string): Promise<boolean> {
        if (await verify(pin)) {
            isLocked.value = false;
            return true;
        }
        return false;
    }

    /**
     * Locks the app immediately when the lock is enabled.
     */
    function lock(): void {
        if (isEnabled.value) isLocked.value = true;
    }

    return {
        isEnabled,
        isLocked,
        isInitialized,
        isNative,
        initialize,
        verify,
        setPin,
        disable,
        unlock,
        lock,
    };
}
