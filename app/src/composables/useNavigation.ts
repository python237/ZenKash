/**
 * Navigation Composable
 *
 * Provides centralized navigation management for the Zenkash application.
 * Handles page titles, header visibility, back button, and bottom navigation state.
 * Also provides utility functions for programmatic navigation.
 * @module composables/useNavigation
 */

import type { Router } from 'vue-router';

/** Current page title displayed in the header */
const pageTitle = ref('');
const showHeader = ref(false);
const showBackButton = ref(false);
const showBottomNav = ref(true);

/** Router instance (set from boot file) */
let routerInstance: Router | null = null;

/** Navigation history stack for proper back navigation */
const historyStack: string[] = [];

/**
 * Initializes the navigation system with the Vue Router instance.
 * Sets up route tracking for proper back navigation on mobile.
 * Must be called from the boot file before using navigation functions.
 * @param router - The Vue Router instance to use for navigation
 */
export function initNavigation(router: Router) {
    routerInstance = router;

    // Track navigation for proper back button handling
    router.afterEach((to, from) => {
        const toPath = to.path;
        const fromPath = from.path;

        // If navigating back (last item in history is current destination), pop it
        if (historyStack.length > 0 && historyStack[historyStack.length - 1] === toPath) {
            historyStack.pop();
        } else if (fromPath && fromPath !== toPath) {
            // Normal navigation forward, push the previous path
            historyStack.push(fromPath);
        }
    });
}

/**
 * Checks if there is navigation history to go back to.
 * @returns True if there are previous pages in the history stack
 */
export function canGoBack(): boolean {
    return historyStack.length > 0;
}

/**
 * Clears the navigation history stack.
 * Useful when resetting navigation state.
 */
export function clearHistory() {
    historyStack.length = 0;
}

/**
 * Navigates to the specified path.
 * Can be used anywhere in the application without needing the composable.
 * @param path - The route path to navigate to
 */
export async function navigateTo(path: string) {
    if (!routerInstance) {
        console.warn('Router not initialized');
        return;
    }
    try {
        await routerInstance.push(path);
    } catch (error) {
        console.warn('Navigation failed:', error);
    }
}

/**
 * Navigates back to the previous page in the browser history.
 */
export function goBack() {
    routerInstance?.back();
}

/**
 * Navigates to the home page (root path).
 */
export function goHome() {
    void navigateTo('/');
}

/**
 * Gets the current route path.
 * @returns The current route path, or '/' if router is not initialized
 */
export function getCurrentPath(): string {
    return routerInstance?.currentRoute.value.path ?? '/';
}

/**
 * Navigation composable for Vue components.
 * Provides reactive state for page header, title, and navigation controls,
 * along with navigation utility methods.
 * @returns An object containing navigation state and methods
 * @example
 * ```ts
 * const { pageTitle, setPageTitle, goBack, navigateTo } = useNavigation();
 * setPageTitle('My Page');
 * ```
 */
export function useNavigation() {
    /**
     * Sets the page title displayed in the header.
     * @param title - The title to display
     */
    const setPageTitle = (title: string) => {
        pageTitle.value = title;
    };

    /**
     * Controls the visibility of the page header.
     * @param show - Whether to show the header
     */
    const setShowHeader = (show: boolean) => {
        showHeader.value = show;
    };

    /**
     * Controls the visibility of the back button in the header.
     * @param show - Whether to show the back button
     */
    const setShowBackButton = (show: boolean) => {
        showBackButton.value = show;
    };

    /**
     * Controls the visibility of the bottom navigation bar.
     * @param show - Whether to show the bottom navigation
     */
    const setShowBottomNav = (show: boolean) => {
        showBottomNav.value = show;
    };

    return {
        pageTitle: computed(() => pageTitle.value),
        showHeader: computed(() => showHeader.value),
        showBackButton: computed(() => showBackButton.value),
        showBottomNav: computed(() => showBottomNav.value),
        setPageTitle,
        setShowHeader,
        setShowBackButton,
        setShowBottomNav,
        goBack,
        navigateTo,
        goHome,
        getCurrentPath,
    };
}
