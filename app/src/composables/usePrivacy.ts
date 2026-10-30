/**
 * Privacy Composable
 *
 * Masks every amount shown in the app when the user turns on "hide amounts"
 * (eye button on the dashboard). The state is persisted in the settings store.
 * @module composables/usePrivacy
 */

import { useSettingsStore } from 'src/stores/settings';

/** Placeholder displayed instead of an amount */
export const AMOUNT_MASK = '•••••';

/**
 * Returns the masked placeholder when amounts are hidden, the text otherwise.
 * Call it from any formatter that renders money.
 * @param text - The formatted amount
 * @returns The text to display
 */
export function maskAmount(text: string): string {
    return useSettingsStore().amountsHidden ? AMOUNT_MASK : text;
}

/**
 * Privacy composable for components.
 * @returns The reactive hidden state and a toggle action
 */
export function usePrivacy() {
    const settingsStore = useSettingsStore();

    /**
     * Toggles the masking of amounts and persists the choice.
     */
    async function toggleAmounts(): Promise<void> {
        await settingsStore.setAmountsHidden(!settingsStore.amountsHidden);
    }

    return {
        amountsHidden: computed(() => settingsStore.amountsHidden),
        toggleAmounts,
    };
}
