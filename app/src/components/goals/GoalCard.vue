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
                        {{ formatCurrency(goal.currentAmount) }} / {{ formatCurrency(goal.targetAmount) }}
                    </div>
                </div>
                <BtnIcon dense icon="delete" color="negative" @click="$emit('delete')" />
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
                        {{ t('goals.remaining') }}: {{ formatCurrency(goal.remaining) }}
                    </template>
                </div>
                <div v-if="goal.deadline" class="text-caption row items-center q-gutter-xs">
                    <q-badge v-if="goal.onTrack !== null && !goal.isReached" :color="badgeColor" outline>
                        {{ goal.onTrack ? t('goals.onTrack') : t('goals.behind') }}
                    </q-badge>
                    <span v-if="!goal.isReached && goal.requiredMonthly !== null" class="text-grey-7">
                        {{ t('goals.requiredMonthly') }}
                        {{ formatCurrency(goal.requiredMonthly) }}{{ t('goals.perMonth') }}
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
import { CURRENCIES } from 'src/types/currency';
import BtnIcon from '../buttons/BtnIcon.vue';

const props = defineProps<{
    goal: SavingsGoalWithStats;
}>();

defineEmits<{
    click: [];
    delete: [];
}>();

const { t, locale } = useI18n();

const avatarColor = computed(() => (props.goal.isReached ? 'positive' : 'pink-5'));

const progressColor = computed(() => {
    if (props.goal.isReached) return 'positive';
    if (props.goal.onTrack === false) return 'warning';
    return 'primary';
});

const badgeColor = computed(() => (props.goal.onTrack ? 'positive' : 'warning'));

/**
 * Formats an amount using the goal's currency.
 * @param amount - The amount to format
 * @returns The formatted currency string
 */
function formatCurrency(amount: number): string {
    const info = CURRENCIES[props.goal.currency];
    return new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: props.goal.currency,
        minimumFractionDigits: info?.decimals ?? 0,
        maximumFractionDigits: info?.decimals ?? 0,
    }).format(amount);
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
