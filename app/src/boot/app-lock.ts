/**
 * App Lock Boot File
 * Initializes the PIN lock state on startup so the app locks immediately when
 * a PIN is configured.
 * @module boot/app-lock
 */

import { boot } from 'quasar/wrappers';
import { useAppLock } from 'src/composables/useAppLock';

export default boot(async () => {
    try {
        await useAppLock().initialize();
    } catch (error) {
        console.error('[AppLock] Failed to initialize:', error);
    }
});
