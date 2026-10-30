/**
 * Page Composable
 *
 * Simplifies page setup by automatically configuring navigation state on mount.
 * Wraps useNavigation to provide a convenient API for page components.
 * @module composables/usePage
 */

import type { MaybeRefOrGetter } from 'vue';
import type { HeaderAction } from './useNavigation';

/**
 * Configuration options for page setup.
 */
interface PageConfig {
    /** The page title to display in the header (may be reactive) */
    title?: MaybeRefOrGetter<string>;
    /** Whether to show the header (default: false) */
    showHeader?: boolean;
    /** Whether to show the back button (default: false) */
    showBack?: boolean;
    /** Whether to show the bottom navigation (default: opposite of showBack) */
    showNav?: boolean;
    /** Action buttons displayed on the right side of the header */
    actions?: MaybeRefOrGetter<HeaderAction[]>;
}

/**
 * Page setup composable that configures navigation state on component mount.
 * Automatically sets page title, header visibility, back button, and bottom navigation.
 * @param config - Configuration options for the page
 * @returns The useNavigation composable for additional navigation control
 * @example
 * ```ts
 * // In a page component
 * const nav = usePage({
 *   title: 'Add Transaction',
 *   showHeader: true,
 *   showBack: true
 * });
 * ```
 */
export function usePage(config: PageConfig = {}) {
    const { setPageTitle, setShowHeader, setShowBackButton, setShowBottomNav, setHeaderActions } =
        useNavigation();

    watch(
        () => toValue(config.title),
        (title) => setPageTitle(title ?? ''),
    );
    watch(
        () => toValue(config.actions),
        (actions) => setHeaderActions(actions ?? []),
    );

    onMounted(() => {
        setPageTitle(toValue(config.title) ?? '');
        setHeaderActions(toValue(config.actions) ?? []);
        setShowHeader(config.showHeader ?? false);
        setShowBackButton(config.showBack ?? false);
        // Hide bottom nav on sub-pages (pages with back button) unless explicitly set
        setShowBottomNav(config.showNav ?? !config.showBack);
    });

    return useNavigation();
}
