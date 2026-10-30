/**
 * Navigation Composable
 *
 * Provides centralized navigation management for the Zenkash application.
 * Handles page titles, header visibility, back button, and bottom navigation state.
 * Also provides utility functions for programmatic navigation.
 * @module composables/useNavigation
 */

import type { Router } from 'vue-router';
import type { TransactionType } from 'src/types/transaction';

/** Action button rendered on the right side of the page header */
export interface HeaderAction {
    /** Material icon name */
    icon: string;
    /** Accessible label */
    label: string;
    /** Click handler */
    onClick: () => void;
    /** Visual style: filled primary (default) or outlined neutral */
    variant?: 'primary' | 'outline';
}

/** Current page title displayed in the header */
const pageTitle = ref('');
const showHeader = ref(false);
const showBackButton = ref(false);
const showBottomNav = ref(true);
const headerActions = shallowRef<HeaderAction[]>([]);
/** Opens the global "add transaction" sheet (central tab bar button) */
const quickAddOpen = ref(false);
const quickAddType = ref<TransactionType>('expense');

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

    /**
     * Sets the action buttons displayed on the right side of the header.
     * @param actions - The actions to display (empty array to clear)
     */
    const setHeaderActions = (actions: HeaderAction[]) => {
        headerActions.value = actions;
    };

    /**
     * Opens the global add-transaction sheet.
     * @param type - The transaction type preselected in the form
     */
    const openQuickAdd = (type: TransactionType = 'expense') => {
        quickAddType.value = type;
        quickAddOpen.value = true;
    };

    return {
        openQuickAdd,
        pageTitle: computed(() => pageTitle.value),
        headerActions: computed(() => headerActions.value),
        quickAddOpen,
        quickAddType,
        setHeaderActions,
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
