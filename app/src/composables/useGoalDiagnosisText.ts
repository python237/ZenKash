/**
 * Goal Diagnosis Text Composable
 *
 * Turns the codes emitted by `services/goal-diagnosis` into localized sentences.
 * Same contract as `useAllocationText`: the service reasons, the view speaks.
 * @module composables/useGoalDiagnosisText
 */

import type { CurrencyCode } from 'src/types/currency';
import type { DiagnosisMessage, DiagnosisSeverity } from 'src/types/goal-diagnosis';
import { GoalHealth } from 'src/types/goal-diagnosis';
import { useCurrency } from './useCurrency';

/** Message parameters holding money rather than a count. */
const AMOUNT_PARAMS = new Set(['amount', 'gap', 'required', 'capacity', 'spare', 'low', 'high']);

/** Quasar color of each severity level. */
const SEVERITY_COLOR: Record<DiagnosisSeverity, string> = {
    info: 'primary',
    warning: 'warning',
    critical: 'negative',
};

/** Icon of each severity level. */
const SEVERITY_ICON: Record<DiagnosisSeverity, string> = {
    info: 'info',
    warning: 'warning',
    critical: 'error',
};

/** Quasar color of each goal health. */
const HEALTH_COLOR: Record<GoalHealth, string> = {
    [GoalHealth.Reachable]: 'positive',
    [GoalHealth.Tight]: 'warning',
    [GoalHealth.Unreachable]: 'negative',
    [GoalHealth.Undated]: 'grey-6',
    [GoalHealth.Unknown]: 'grey-5',
};

/**
 * Provides the localized wording of a diagnosis.
 * @returns Message, health and severity formatters
 */
export function useGoalDiagnosisText() {
    const { t } = useI18n();
    const { formatCurrency } = useCurrency();

    /**
     * Renders a verdict or note as a sentence.
     * @param message - Code, figures and severity
     * @param currency - Currency the amounts are expressed in
     * @returns The localized sentence
     */
    function explain(message: DiagnosisMessage, currency: CurrencyCode): string {
        const params: Record<string, string> = {};
        for (const [key, value] of Object.entries(message.params)) {
            params[key] = AMOUNT_PARAMS.has(key) ? formatCurrency(value, currency) : String(value);
        }
        return t(`goals.diagnosis.messages.${message.code}`, params);
    }

    /**
     * Short label of a goal's health.
     * @param health - The health to name
     * @returns The localized label
     */
    function healthLabel(health: GoalHealth): string {
        return t(`goals.diagnosis.health.${health}`);
    }

    /**
     * Color of a goal's health.
     * @param health - The health to color
     * @returns The Quasar color name
     */
    function healthColor(health: GoalHealth): string {
        return HEALTH_COLOR[health];
    }

    /**
     * Color of a message severity.
     * @param severity - The severity to color
     * @returns The Quasar color name
     */
    function severityColor(severity: DiagnosisSeverity): string {
        return SEVERITY_COLOR[severity];
    }

    /**
     * Icon of a message severity.
     * @param severity - The severity to illustrate
     * @returns The Material icon name
     */
    function severityIcon(severity: DiagnosisSeverity): string {
        return SEVERITY_ICON[severity];
    }

    return { explain, healthLabel, healthColor, severityColor, severityIcon };
}
