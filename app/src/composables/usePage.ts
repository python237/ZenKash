/**
 * Page Composable
 *
 * Simplifies page setup by automatically configuring navigation state on mount.
 * Wraps useNavigation to provide a convenient API for page components.
 * @module composables/usePage
 */

/**
 * Configuration options for page setup.
 */
interface PageConfig {
    /** The page title to display in the header */
    title?: string;
    /** Whether to show the header (default: false) */
    showHeader?: boolean;
    /** Whether to show the back button (default: false) */
    showBack?: boolean;
    /** Whether to show the bottom navigation (default: opposite of showBack) */
    showNav?: boolean;
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
    const { setPageTitle, setShowHeader, setShowBackButton, setShowBottomNav } = useNavigation();

    onMounted(() => {
        setPageTitle(config.title ?? '');
        setShowHeader(config.showHeader ?? false);
        setShowBackButton(config.showBack ?? false);
        // Hide bottom nav on sub-pages (pages with back button) unless explicitly set
        setShowBottomNav(config.showNav ?? !config.showBack);
    });

    return useNavigation();
}
