/**
 * Reminder Boot File
 * Initializes the daily transaction reminder system on app startup.
 * Only runs on native platforms (Android/iOS).
 * @module boot/reminder
 */

import { boot } from 'quasar/wrappers';
import { Capacitor } from '@capacitor/core';
import { useReminder } from 'src/composables/useReminder';

export default boot(async () => {
    // Only initialize on native platforms
    if (!Capacitor.isNativePlatform()) {
        return;
    }

    const { initialize } = useReminder();

    try {
        await initialize();
    } catch (error) {
        console.error('[Reminder] Failed to initialize:', error);
    }
});
