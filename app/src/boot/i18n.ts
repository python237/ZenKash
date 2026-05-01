import { defineBoot } from '#q-app/wrappers';
import { createI18n } from 'vue-i18n';

import messages from 'src/i18n';

/**
 *
 */
export type MessageLanguages = keyof typeof messages;
// Type-define 'en' as the master schema for the resource
/**
 *
 */
export type MessageSchema = (typeof messages)['en'];

// Supported locales
const SUPPORTED_LOCALES: MessageLanguages[] = ['en', 'fr'];
const DEFAULT_LOCALE: MessageLanguages = 'fr';

/**
 * Detect user's preferred locale from browser/device
 * Falls back to 'fr' if not supported
 * @returns The detected or default locale
 */
function getDeviceLocale(): MessageLanguages {
    // Get browser/device language
    const deviceLang =
        navigator.language ||
        (navigator as { userLanguage?: string }).userLanguage ||
        DEFAULT_LOCALE;

    // Extract base language code (e.g., 'fr-FR' -> 'fr')
    const baseLang = deviceLang.split('-')[0]?.toLowerCase() ?? DEFAULT_LOCALE;

    // Check if supported
    if (SUPPORTED_LOCALES.includes(baseLang as MessageLanguages)) {
        return baseLang as MessageLanguages;
    }

    return DEFAULT_LOCALE;
}

/* eslint-disable @typescript-eslint/no-empty-object-type */
declare module 'vue-i18n' {
    // define the locale messages schema
    /**
     *
     */
    export interface DefineLocaleMessage extends MessageSchema {}

    // define the datetime format schema
    /**
     *
     */
    export interface DefineDateTimeFormat {}

    // define the number format schema
    /**
     *
     */
    export interface DefineNumberFormat {}
}
/* eslint-enable @typescript-eslint/no-empty-object-type */

export default defineBoot(({ app }) => {
    const i18n = createI18n<{ message: MessageSchema }, MessageLanguages>({
        locale: getDeviceLocale(),
        fallbackLocale: DEFAULT_LOCALE,
        legacy: false,
        messages,
    });

    // Set i18n instance on app
    app.use(i18n);
});
