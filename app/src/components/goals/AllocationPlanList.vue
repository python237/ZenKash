<template>
    <q-card class="plan-card" flat bordered>
        <!-- What the strategy optimizes for, and what it did -->
        <q-card-section class="q-pb-sm">
            <div class="row items-center q-gutter-xs q-mb-xs">
                <div class="text-subtitle1 text-weight-medium">{{ strategyLabel(plan.strategy) }}</div>
                <q-badge v-if="recommended" color="primary" rounded>
                    {{ t('goals.allocation.recommended') }}
                </q-badge>
            </div>
            <div class="text-caption text-grey-6">{{ strategyDescription(plan.strategy) }}</div>
            <div class="text-body2 q-mt-sm">{{ explain(plan.explanation, currency) }}</div>

            <!-- Same three figures on every tab, so plans can be compared at a glance -->
            <div class="row q-gutter-xs q-mt-sm">
                <q-chip dense square icon="task_alt" color="green-1" text-color="green-9">
                    {{ t('goals.allocation.summary.completed', { count: plan.completedCount }) }}
                </q-chip>
                <q-chip
                    dense
                    square
                    icon="schedule"
                    :color="plan.atRiskGoalIds.length > 0 ? 'orange-1' : 'grey-2'"
                    :text-color="plan.atRiskGoalIds.length > 0 ? 'orange-9' : 'grey-7'"
                >
                    {{ t('goals.allocation.summary.atRisk', { count: plan.atRiskGoalIds.length }) }}
                </q-chip>
                <q-chip dense square icon="savings" color="grey-2" text-color="grey-8">
                    {{
                        t('goals.allocation.summary.leftover', {
                            amount: formatCurrency(plan.leftover, currency),
                        })
                    }}
                </q-chip>
            </div>
        </q-card-section>

        <q-separator />

        <!-- Allocations, in the order the strategy decided them -->
        <q-list v-if="plan.lines.length > 0" separator>
            <q-item v-for="(line, index) in plan.lines" :key="line.goalId">
                <q-item-section avatar>
                    <q-avatar :color="line.completes ? 'positive' : 'primary'" text-color="white" size="32px">
                        {{ index + 1 }}
                    </q-avatar>
                </q-item-section>
                <q-item-section>
                    <q-item-label>{{ goalName(line.goalId) }}</q-item-label>
                    <q-item-label caption>
                        <template v-if="line.completes">{{ t('goals.reached') }} 🎉</template>
                        <template v-else>
                            {{ t('goals.remaining') }}:
                            {{ formatCurrency(line.remainingAfter, currency) }} ·
                            {{ formatPercent(line.percentAfter) }}
                        </template>
                    </q-item-label>
                </q-item-section>
                <q-item-section side>
                    <div class="text-weight-medium text-primary">
                        +{{ formatCurrency(line.amount, currency) }}
                    </div>
                    <q-icon
                        v-if="!line.coversPace && !line.completes"
                        name="warning"
                        color="warning"
                        size="16px"
                    >
                        <q-tooltip>{{ t('goals.allocation.paceNotCovered') }}</q-tooltip>
                    </q-icon>
                </q-item-section>
            </q-item>
        </q-list>

        <q-card-section v-else class="text-caption text-grey-6">
            {{ t('goals.allocation.noLines') }}
        </q-card-section>

        <!-- Goals the plan leaves short of their monthly pace -->
        <q-card-section v-if="atRiskNames.length > 0" class="at-risk">
            <q-icon name="schedule" size="16px" color="orange-9" />
            {{ t('goals.allocation.stillBehind', { goals: atRiskNames.join(', ') }) }}
        </q-card-section>
    </q-card>
</template>

<script setup lang="ts">
import type { CurrencyCode } from 'src/types/currency';
import type { AllocationPlan } from 'src/types/goal-allocation';
import type { SavingsGoalWithStats } from 'src/types/savings-goal';
import { useAllocationText } from 'src/composables/useAllocationText';

const props = defineProps<{
    /** Plan to render */
    plan: AllocationPlan;
    /** Goals the plan was computed on, for name resolution */
    goals: SavingsGoalWithStats[];
    /** Currency every amount is expressed in */
    currency: CurrencyCode;
    /** Whether this plan is the one the engine puts forward */
    recommended?: boolean;
}>();

const { t } = useI18n();
const { formatCurrency, formatPercent } = useCurrency();
const { explain, strategyLabel, strategyDescription } = useAllocationText();

const namesById = computed(
    () => new Map(props.goals.map((goal: SavingsGoalWithStats) => [goal.id, goal.name])),
);

/**
 * Resolves a goal name from its identifier.
 * @param goalId - The goal identifier
 * @returns The goal name, or the raw identifier if it vanished
 */
function goalName(goalId: string): string {
    return namesById.value.get(goalId) ?? goalId;
}

const atRiskNames = computed(() => props.plan.atRiskGoalIds.map(goalName));
</script>

<style lang="scss" scoped>
.plan-card {
    border-radius: 12px;
}

.at-risk {
    font-size: 12px;
    color: $warning;
    border-top: 1px solid $border-light;
}
</style>
