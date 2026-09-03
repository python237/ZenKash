/**
 * Allocation Text Composable
 *
 * Turns the machine-readable output of `services/goal-allocation.ts` into
 * localized sentences. The engine emits reason codes and figures only, so this
 * is the single place where an allocation becomes words.
 * @module composables/useAllocationText
 */

import type { CurrencyCode } from 'src/types/currency';
import type { AllocationExplanation, AllocationStrategy } from 'src/types/goal-allocation';
import { useCurrency } from './useCurrency';

/** Explanation parameters holding money rather than a count. */
const AMOUNT_PARAMS = new Set(['shortfall', 'reserved', 'leftover']);

/**
 * Provides labels and explanations for allocation strategies and plans.
 * @returns Strategy label/description lookups and the explanation formatter
 */
export function useAllocationText() {
    const { t } = useI18n();
    const { formatCurrency } = useCurrency();

    /**
     * Renders an engine explanation as a sentence.
     * @param explanation - Reason code and its figures
     * @param currency - Currency the amounts are expressed in
     * @returns The localized sentence
     */
    function explain(explanation: AllocationExplanation, currency: CurrencyCode): string {
        const params: Record<string, string> = {};
        for (const [key, value] of Object.entries(explanation.params)) {
            params[key] = AMOUNT_PARAMS.has(key) ? formatCurrency(value, currency) : String(value);
        }
        return t(`goals.allocation.reasons.${explanation.code}`, params);
    }

    /**
     * Short name of a strategy, used on its tab and plan header.
     * @param strategy - The strategy to name
     * @returns The localized label
     */
    function strategyLabel(strategy: AllocationStrategy): string {
        return t(`goals.allocation.strategies.${strategy}.label`);
    }

    /**
     * One-line summary of what a strategy optimizes for.
     * @param strategy - The strategy to describe
     * @returns The localized description
     */
    function strategyDescription(strategy: AllocationStrategy): string {
        return t(`goals.allocation.strategies.${strategy}.description`);
    }

    return { explain, strategyLabel, strategyDescription };
}
