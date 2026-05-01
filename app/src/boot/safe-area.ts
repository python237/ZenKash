import { boot } from 'quasar/wrappers';
import { SafeArea } from 'capacitor-plugin-safe-area';
import { Capacitor } from '@capacitor/core';

export default boot(async () => {
    // Only apply on native platforms
    if (!Capacitor.isNativePlatform()) return;

    try {
        // Get safe area insets
        const { insets } = await SafeArea.getSafeAreaInsets();

        // Set CSS variables for safe area
        const root = document.documentElement;
        root.style.setProperty('--safe-area-top', `${insets.top}px`);
        root.style.setProperty('--safe-area-right', `${insets.right}px`);
        root.style.setProperty('--safe-area-bottom', `${insets.bottom}px`);
        root.style.setProperty('--safe-area-left', `${insets.left}px`);

        // Listen for orientation changes
        void SafeArea.addListener('safeAreaChanged', ({ insets }) => {
            root.style.setProperty('--safe-area-top', `${insets.top}px`);
            root.style.setProperty('--safe-area-right', `${insets.right}px`);
            root.style.setProperty('--safe-area-bottom', `${insets.bottom}px`);
            root.style.setProperty('--safe-area-left', `${insets.left}px`);
        });
    } catch (error) {
        console.warn('Safe area plugin not available:', error);
    }
});
