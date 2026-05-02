/**
 * Reminder Composable
 * Provides daily transaction reminder functionality for the Zenkash application.
 * Integrates with the native ReminderPlugin on Android to show full-screen alerts
 * when no transaction has been recorded for the day.
 * @module composables/useReminder
 */

import { ref, computed } from 'vue';
import { Capacitor } from '@capacitor/core';
import { ReminderPlugin } from 'src/plugins/reminder';

/** Whether the reminder is enabled */
const isEnabled = ref(false);

/** Whether the app can schedule exact alarms */
const canScheduleAlarms = ref(true);

/** Whether a transaction was recorded today */
const hasTransactionToday = ref(false);

/** Whether the reminder system is initialized */
const isInitialized = ref(false);

/** Whether we're running on a native platform */
const isNative = computed(() => Capacitor.isNativePlatform());

/**
 * Initializes the reminder system.
 * Should be called on app startup to restore the reminder state.
 */
async function initialize(): Promise<void> {
    if (isInitialized.value) return;

    try {
        // Check if reminder is enabled
        const enabledResult = await ReminderPlugin.isReminderEnabled();
        isEnabled.value = enabledResult.enabled;

        // Check if we can schedule alarms (Android 12+)
        const alarmsResult = await ReminderPlugin.canScheduleExactAlarms();
        canScheduleAlarms.value = alarmsResult.canSchedule;

        // Check if transaction was recorded today
        const transactionResult = await ReminderPlugin.hasTransactionToday();
        hasTransactionToday.value = transactionResult.hasTransaction;

        isInitialized.value = true;
    } catch (error) {
        console.error('Failed to initialize reminder:', error);
    }
}

/**
 * Enables the daily transaction reminder.
 * Will show alerts between 21:30 and 23:59 if no transaction was recorded.
 * @returns Promise resolving to true if enabled successfully
 */
async function enableReminder(): Promise<boolean> {
    try {
        // First check if we can schedule exact alarms
        const alarmsResult = await ReminderPlugin.canScheduleExactAlarms();
        if (!alarmsResult.canSchedule) {
            canScheduleAlarms.value = false;
            return false;
        }

        const result = await ReminderPlugin.enableReminder();
        isEnabled.value = result.enabled;
        return result.enabled;
    } catch (error) {
        console.error('Failed to enable reminder:', error);
        return false;
    }
}

/**
 * Disables the daily transaction reminder.
 * Cancels all scheduled alarms.
 * @returns Promise resolving to true if disabled successfully
 */
async function disableReminder(): Promise<boolean> {
    try {
        const result = await ReminderPlugin.disableReminder();
        isEnabled.value = result.enabled;
        return !result.enabled;
    } catch (error) {
        console.error('Failed to disable reminder:', error);
        return false;
    }
}

/**
 * Toggles the reminder on or off.
 * @returns Promise resolving to the new enabled state
 */
async function toggleReminder(): Promise<boolean> {
    if (isEnabled.value) {
        await disableReminder();
    } else {
        await enableReminder();
    }
    return isEnabled.value;
}

/**
 * Records that a transaction was made today.
 * This prevents the reminder from showing for the rest of the day.
 * Should be called whenever a transaction is created.
 */
async function recordTransaction(): Promise<void> {
    try {
        const result = await ReminderPlugin.recordTransaction();
        hasTransactionToday.value = result.recorded;
    } catch (error) {
        console.error('Failed to record transaction:', error);
    }
}

/**
 * Opens the system settings to allow scheduling exact alarms.
 * Only needed for Android 12+ (API 31+) when permission is not granted.
 */
async function openAlarmSettings(): Promise<void> {
    try {
        await ReminderPlugin.openAlarmSettings();
    } catch (error) {
        console.error('Failed to open alarm settings:', error);
    }
}

/**
 * Dismisses the current reminder alert if showing.
 */
async function dismissAlert(): Promise<void> {
    try {
        await ReminderPlugin.dismissAlert();
    } catch (error) {
        console.error('Failed to dismiss alert:', error);
    }
}

/**
 * Refreshes the reminder state.
 * Useful after returning from system settings.
 */
async function refresh(): Promise<void> {
    try {
        const enabledResult = await ReminderPlugin.isReminderEnabled();
        isEnabled.value = enabledResult.enabled;

        const alarmsResult = await ReminderPlugin.canScheduleExactAlarms();
        canScheduleAlarms.value = alarmsResult.canSchedule;

        const transactionResult = await ReminderPlugin.hasTransactionToday();
        hasTransactionToday.value = transactionResult.hasTransaction;
    } catch (error) {
        console.error('Failed to refresh reminder state:', error);
    }
}

/**
 * Composable for managing daily transaction reminders.
 * @returns Object containing reminder state and methods
 * @example
 * ```vue
 * <script setup lang="ts">
 * const { isEnabled, enableReminder, disableReminder, recordTransaction } = useReminder();
 *
 * // Enable the reminder
 * await enableReminder();
 *
 * // Record when a transaction is created
 * await recordTransaction();
 * </script>
 * ```
 */
export function useReminder() {
    return {
        // State
        isEnabled,
        canScheduleAlarms,
        hasTransactionToday,
        isInitialized,
        isNative,

        // Methods
        initialize,
        enableReminder,
        disableReminder,
        toggleReminder,
        recordTransaction,
        openAlarmSettings,
        dismissAlert,
        refresh,
    };
}
