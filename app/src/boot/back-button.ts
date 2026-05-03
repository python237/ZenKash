import { boot } from 'quasar/wrappers';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import {
    initNavigation,
    goBack,
    goHome,
    getCurrentPath,
    canGoBack,
} from 'src/composables/useNavigation';

// Main tabs routes (no back navigation needed)
const MAIN_ROUTES = ['/', '/transactions', '/investments', '/projects', '/more'];

export default boot(({ router }) => {
    // Initialize shared navigation with router instance
    initNavigation(router);

    // Only handle back button on native platforms
    if (!Capacitor.isNativePlatform()) return;

    void App.addListener('backButton', () => {
        const currentPath = getCurrentPath();

        // If on main tab → exit app
        if (MAIN_ROUTES.includes(currentPath)) {
            void App.exitApp();
            return;
        }

        // If our history stack has entries → navigate back
        if (canGoBack()) {
            goBack();
        } else {
            // Fallback: go to home
            goHome();
        }
    });
});
