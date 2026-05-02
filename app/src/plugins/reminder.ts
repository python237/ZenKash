/**
 * Reminder Plugin - Capacitor Plugin Interface
 * This plugin provides daily transaction reminder functionality.
 * It schedules periodic checks between 21:30 and 23:59 to remind users
 * to record their daily transactions.
 * @module plugins/reminder
 */

import { registerPlugin } from '@capacitor/core';

/**
 * Result of enabling/disabling the reminder.
 */
export interface ReminderEnabledResult {
    /** Whether the reminder is currently enabled */
    enabled: boolean;
}

/**
 * Result of recording a transaction.
 */
export interface RecordTransactionResult {
    /** Whether the transaction was recorded successfully */
    recorded: boolean;
    /** The date the transaction was recorded for (YYYY-MM-DD) */
    date: string;
}

/**
 * Result of checking if a transaction exists today.
 */
export interface HasTransactionResult {
    /** Whether a transaction was recorded today */
    hasTransaction: boolean;
    /** The last date a transaction was recorded (YYYY-MM-DD) */
    lastDate: string;
    /** Today's date (YYYY-MM-DD) */
    today: string;
}

/**
 * Result of checking alarm scheduling permission.
 */
export interface CanScheduleAlarmsResult {
    /** Whether the app can schedule exact alarms */
    canSchedule: boolean;
}

/**
 * ReminderPlugin interface.
 * Provides methods to manage daily transaction reminders.
 */
export interface ReminderPluginInterface {
    /**
     * Enables the daily transaction reminder.
     * Schedules alarms to check every 5 minutes between 21:30 and 23:59.
     * @returns Promise resolving to the enabled status
     */
    enableReminder(): Promise<ReminderEnabledResult>;

    /**
     * Disables the daily transaction reminder.
     * Cancels all scheduled alarms.
     * @returns Promise resolving to the enabled status
     */
    disableReminder(): Promise<ReminderEnabledResult>;

    /**
     * Checks if the reminder is currently enabled.
     * @returns Promise resolving to the enabled status
     */
    isReminderEnabled(): Promise<ReminderEnabledResult>;

    /**
     * Records that a transaction was made today.
     * This prevents the reminder from showing for the rest of the day.
     * @returns Promise resolving to the recording result
     */
    recordTransaction(): Promise<RecordTransactionResult>;

    /**
     * Checks if a transaction was recorded today.
     * @returns Promise resolving to the transaction status
     */
    hasTransactionToday(): Promise<HasTransactionResult>;

    /**
     * Checks if the app has permission to schedule exact alarms.
     * Required for Android 12+ (API 31+).
     * @returns Promise resolving to the permission status
     */
    canScheduleExactAlarms(): Promise<CanScheduleAlarmsResult>;

    /**
     * Opens the system settings to allow scheduling exact alarms.
     * Only needed for Android 12+ (API 31+).
     * @returns Promise resolving when settings are opened
     */
    openAlarmSettings(): Promise<void>;

    /**
     * Dismisses the current reminder alert if showing.
     * @returns Promise resolving when the alert is dismissed
     */
    dismissAlert(): Promise<void>;
}

/**
 * Web implementation of the ReminderPlugin.
 * Provides stub implementations for browser/development use.
 */
class ReminderPluginWeb implements ReminderPluginInterface {
    private enabled = false;
    private lastTransactionDate = '';

    enableReminder(): Promise<ReminderEnabledResult> {
        this.enabled = true;
        return Promise.resolve({ enabled: true });
    }

    disableReminder(): Promise<ReminderEnabledResult> {
        this.enabled = false;
        return Promise.resolve({ enabled: false });
    }

    isReminderEnabled(): Promise<ReminderEnabledResult> {
        return Promise.resolve({ enabled: this.enabled });
    }

    recordTransaction(): Promise<RecordTransactionResult> {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        this.lastTransactionDate = today;
        return Promise.resolve({ recorded: true, date: today });
    }

    hasTransactionToday(): Promise<HasTransactionResult> {
        const now = new Date();
        const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        return Promise.resolve({
            hasTransaction: this.lastTransactionDate === today,
            lastDate: this.lastTransactionDate,
            today,
        });
    }

    canScheduleExactAlarms(): Promise<CanScheduleAlarmsResult> {
        return Promise.resolve({ canSchedule: true });
    }

    openAlarmSettings(): Promise<void> {
        return Promise.resolve();
    }

    dismissAlert(): Promise<void> {
        return Promise.resolve();
    }
}

/**
 * The ReminderPlugin instance.
 * Uses native implementation on Android, web stub on browser.
 */
export const ReminderPlugin = registerPlugin<ReminderPluginInterface>('ReminderPlugin', {
    web: () => new ReminderPluginWeb(),
});
