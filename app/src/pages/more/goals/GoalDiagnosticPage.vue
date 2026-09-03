<template>
    <q-page class="q-pa-md">
        <!-- The one thing to act on -->
        <q-card flat bordered class="verdict q-mb-md" :class="`verdict--${verdict.severity}`">
            <q-card-section>
                <div class="row items-center q-gutter-xs">
                    <q-icon
                        :name="severityIcon(verdict.severity)"
                        :color="severityColor(verdict.severity)"
                        size="20px"
                    />
                    <div class="text-caption text-grey-6">{{ t('goals.diagnosis.verdict') }}</div>
                </div>
                <div class="text-body1 q-mt-xs">{{ explain(verdict, currency) }}</div>
            </q-card-section>
        </q-card>

        <!-- Measured, not declared -->
        <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-4">
                <q-card flat bordered class="tile">
                    <div class="text-caption text-grey-6">{{ t('goals.diagnosis.capacity') }}</div>
                    <div class="text-subtitle2 text-weight-medium">
                        {{ formatCurrency(diagnosis.capacity.monthly, currency) }}
                    </div>
                    <div class="text-caption text-grey-6">{{ t('goals.perMonth') }}</div>
                </q-card>
            </div>
            <div class="col-4">
                <q-card flat bordered class="tile">
                    <div class="text-caption text-grey-6">{{ t('goals.diagnosis.required') }}</div>
                    <div class="text-subtitle2 text-weight-medium">
                        {{ formatCurrency(diagnosis.requiredMonthly, currency) }}
                    </div>
                    <div class="text-caption text-grey-6">{{ t('goals.perMonth') }}</div>
                </q-card>
            </div>
            <div class="col-4">
                <q-card flat bordered class="tile">
                    <div class="text-caption text-grey-6">{{ t('goals.diagnosis.gap') }}</div>
                    <div
                        class="text-subtitle2 text-weight-medium"
                        :class="diagnosis.gap > 0 ? 'text-negative' : 'text-positive'"
                    >
                        {{ formatCurrency(Math.abs(diagnosis.gap), currency) }}
                    </div>
                    <div class="text-caption text-grey-6">
                        {{ diagnosis.gap > 0 ? t('goals.diagnosis.short') : t('goals.diagnosis.spare') }}
                    </div>
                </q-card>
            </div>
        </div>

        <!-- Supporting observations -->
        <q-card v-if="diagnosis.notes.length > 0" flat bordered class="notes q-mb-md">
            <q-list dense>
                <q-item v-for="note in diagnosis.notes" :key="note.code">
                    <q-item-section avatar class="note-icon">
                        <q-icon
                            :name="severityIcon(note.severity)"
                            :color="severityColor(note.severity)"
                            size="18px"
                        />
                    </q-item-section>
                    <q-item-section>
                        <q-item-label caption>{{ explain(note, currency) }}</q-item-label>
                    </q-item-section>
                </q-item>
            </q-list>
        </q-card>

        <!-- Goal by goal, worst first -->
        <div class="text-subtitle2 text-weight-medium q-mb-sm">
            {{ t('goals.diagnosis.byGoal') }}
        </div>

        <div v-if="diagnosis.goals.length === 0" class="empty-state">
            <q-icon name="flag" size="48px" color="grey-4" />
            <div class="text-grey-6 q-mt-md">{{ t('goals.diagnosis.noGoals') }}</div>
        </div>

        <q-card
            v-for="entry in diagnosis.goals"
            :key="entry.goalId"
            flat
            bordered
            class="goal-row q-mb-sm"
        >
            <q-card-section class="q-pa-md">
                <div class="row items-center q-mb-xs">
                    <div class="col text-subtitle2 text-weight-medium">
                        {{ goalName(entry.goalId) }}
                    </div>
                    <q-badge :color="healthColor(entry.health)" outline>
                        {{ healthLabel(entry.health) }}
                    </q-badge>
                </div>

                <div class="text-caption text-grey-7">
                    {{ t('goals.diagnosis.requiredVsShare') }}
                    {{ formatCurrency(entry.requiredMonthly, currency) }} /
                    {{ formatCurrency(entry.monthlyShare, currency) }}{{ t('goals.perMonth') }}
                </div>

                <!-- The corrective action, in figures -->
                <div v-if="needsAction(entry.health)" class="text-caption q-mt-xs">
                    <div v-if="entry.feasibleDate" :class="`text-${healthColor(entry.health)}`">
                        {{
                            t('goals.diagnosis.reachableOn', {
                                date: formatDate(entry.feasibleDate),
                            })
                        }}
                    </div>
                    <div v-if="entry.feasibleTarget !== null" class="text-grey-7">
                        {{
                            t('goals.diagnosis.feasibleTarget', {
                                amount: formatCurrency(entry.feasibleTarget, currency),
                            })
                        }}
                    </div>
                    <div v-if="!entry.feasibleDate" class="text-negative">
                        {{ t('goals.diagnosis.noProgress') }}
                    </div>
                </div>
                <div
                    v-else-if="entry.feasibleDate"
                    class="text-caption text-grey-7 q-mt-xs"
                >
                    {{ t('goals.diagnosis.reachableOn', { date: formatDate(entry.feasibleDate) }) }}
                </div>
            </q-card-section>
        </q-card>

        <!-- Diagnosis first, then where today's money goes -->
        <div class="q-mt-lg">
            <BtnSecondary
                :label="t('goals.allocation.title')"
                icon="auto_awesome"
                class="full-width"
                @click="openAllocation"
            />
        </div>
    </q-page>
</template>

<script setup lang="ts">
import type { SavingsGoalWithStats } from 'src/types/savings-goal';
import { GoalHealth } from 'src/types/goal-diagnosis';
import { useSavingsGoalStore } from 'src/stores/savings-goal';
import { useGoalDiagnosis } from 'src/composables/useGoalDiagnosis';
import { useGoalDiagnosisText } from 'src/composables/useGoalDiagnosisText';
import BtnSecondary from 'src/components/buttons/BtnSecondary.vue';

const { t, locale } = useI18n();
usePage({ title: t('goals.diagnosis.title'), showHeader: true, showBack: true });

const router = useRouter();
const goalStore = useSavingsGoalStore();
const { formatCurrency } = useCurrency();
const { diagnosis, loadAll } = useGoalDiagnosis();
const { explain, healthLabel, healthColor, severityColor, severityIcon } = useGoalDiagnosisText();

const currency = computed(() => diagnosis.value.currency);
const verdict = computed(() => diagnosis.value.verdict);

onMounted(async () => {
    await loadAll();
});

const namesById = computed(
    () =>
        new Map(
            goalStore.goalsWithStats.map((goal: SavingsGoalWithStats) => [goal.id, goal.name]),
        ),
);

/**
 * Resolves a goal name from its identifier.
 * @param goalId - The goal identifier
 * @returns The goal name, or the raw identifier if it vanished
 */
function goalName(goalId: string): string {
    return namesById.value.get(goalId) ?? goalId;
}

/**
 * Whether a goal needs a corrective action spelled out.
 * @param health - The goal's health
 * @returns True when the deadline will not hold comfortably
 */
function needsAction(health: GoalHealth): boolean {
    return health === GoalHealth.Unreachable || health === GoalHealth.Tight;
}

/**
 * Formats a projected date.
 * @param date - The date to format
 * @returns The localized month and year
 */
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat(locale.value, { month: 'long', year: 'numeric' }).format(date);
}

/**
 * Opens the allocation screen, the natural next step once the diagnosis is read.
 */
function openAllocation(): void {
    void router.push({ name: 'goal-allocation' });
}
</script>

<style lang="scss" scoped>
.verdict,
.notes,
.goal-row,
.tile {
    border-radius: 12px;
}

.verdict {
    border-left: 3px solid $primary;

    &--warning {
        border-left-color: $warning;
    }

    &--critical {
        border-left-color: $negative;
    }
}

.tile {
    height: 100%;
    padding: 12px;
}

.note-icon {
    min-width: 28px;
    padding-right: 0;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 24px;
    text-align: center;
}
</style>
