<template>
    <q-card class="goal-card" flat bordered>
        <q-card-section class="q-pa-md">
            <!-- Header -->
            <div class="row items-center q-mb-sm">
                <q-avatar :color="avatarColor" text-color="white" size="40px" class="q-mr-md">
                    <q-icon :name="goal.icon ?? 'flag'" size="20px" />
                </q-avatar>
                <div class="col clickable" @click="$emit('click')">
                    <div class="text-subtitle1 text-weight-medium">{{ goal.name }}</div>
                    <div v-if="!goal.walletExists" class="text-caption text-negative">
                        {{ t('goals.walletMissing') }}
                    </div>
                    <div v-else class="text-caption text-grey-6">
                        {{ formatAmount(goal.currentAmount) }} /
                        {{ formatAmount(goal.targetAmount) }}
                    </div>
                    <div v-if="goal.sharesWallet" class="text-caption text-warning">
                        {{ t('goals.sharedWallet') }}
                    </div>
                </div>
                <BtnIcon dense icon="delete" color="negative" @click="$emit('delete')" />
            </div>

            <!-- Completion rate -->
            <div class="row items-center justify-between q-mb-xs">
                <span class="text-caption text-grey-6">{{ t('goals.completionRate') }}</span>
                <span class="text-caption text-weight-medium" :class="`text-${progressColor}`">
                    {{ formatPercent(goal.percent) }}
                </span>
            </div>

            <!-- Progress -->
            <q-linear-progress
                :value="goal.percent / 100"
                :color="progressColor"
                track-color="grey-3"
                rounded
                size="8px"
            />

            <!-- Footer -->
            <div class="row items-center justify-between q-mt-sm">
                <div class="text-caption text-grey-7">
                    <template v-if="goal.isReached">{{ t('goals.reached') }} 🎉</template>
                    <template v-else>
                        {{ t('goals.remaining') }}: {{ formatAmount(goal.remaining) }}
                    </template>
                </div>
                <div v-if="goal.deadline" class="text-caption row items-center q-gutter-xs">
                    <q-badge
                        v-if="goal.onTrack !== null && !goal.isReached"
                        :color="badgeColor"
                        outline
                    >
                        {{ goal.onTrack ? t('goals.onTrack') : t('goals.behind') }}
                    </q-badge>
                    <span
                        v-if="!goal.isReached && goal.requiredMonthly !== null"
                        class="text-grey-7"
                    >
                        {{ t('goals.requiredMonthly') }}
                        {{ formatAmount(goal.requiredMonthly) }}{{ t('goals.perMonth') }}
                    </span>
                </div>
            </div>
            <div v-if="goal.deadline" class="text-caption text-grey-6 q-mt-xs">
                <q-icon name="event" size="14px" /> {{ formattedDeadline }}
                <span v-if="goal.monthsLeft !== null">
                    · {{ t('goals.monthsLeft', { count: goal.monthsLeft }) }}
                </span>
            </div>
        </q-card-section>
    </q-card>
</template>

<script setup lang="ts">
import type { SavingsGoalWithStats } from 'src/types/savings-goal';
import BtnIcon from '../buttons/BtnIcon.vue';

const props = defineProps<{
    goal: SavingsGoalWithStats;
}>();

defineEmits<{
    click: [];
    delete: [];
}>();

const { t, locale } = useI18n();
const { formatCurrency, formatPercent } = useCurrency();

const avatarColor = computed(() => (props.goal.isReached ? 'positive' : 'pink-5'));

const progressColor = computed(() => {
    if (props.goal.isReached) return 'positive';
    if (props.goal.onTrack === false) return 'warning';
    return 'primary';
});

const badgeColor = computed(() => (props.goal.onTrack ? 'positive' : 'warning'));

/**
 * Formats an amount in the goal's own currency (the linked wallet's), not the
 * user's default one — the target is expressed in that currency.
 * @param amount - The amount to format
 * @returns The formatted currency string
 */
function formatAmount(amount: number): string {
    return formatCurrency(amount, props.goal.currency);
}

const formattedDeadline = computed(() => {
    if (!props.goal.deadline) return '';
    return new Intl.DateTimeFormat(locale.value, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(props.goal.deadline);
});
</script>

<style lang="scss" scoped>
.goal-card {
    border-radius: 12px;
}
</style>
