<template>
    <article class="goal-card">
        <!-- Header -->
        <div class="goal-card__head">
            <span
                class="zk-tile zk-tile--lg"
                :class="goal.isReached ? 'zk-tile--green' : ''"
                :style="tileStyle"
            >
                <q-icon :name="goal.icon ?? 'flag'" size="22px" />
            </span>
            <button type="button" class="goal-card__body" @click="$emit('click')">
                <span class="goal-card__name">{{ goal.name }}</span>
                <span v-if="!goal.walletExists" class="goal-card__meta text-negative">
                    {{ t('goals.walletMissing') }}
                </span>
                <span v-else-if="goal.isReached" class="goal-card__meta">
                    {{ t('goals.reached') }} · {{ formatAmount(goal.targetAmount) }}
                </span>
                <span v-else class="goal-card__meta">
                    {{ formatAmount(goal.currentAmount) }} /
                    {{ formatAmount(goal.targetAmount) }}
                </span>
                <span v-if="goal.sharesWallet" class="goal-card__meta goal-card__meta--warn">
                    {{ t('goals.sharedWallet') }}
                </span>
            </button>
            <span v-if="pill" class="zk-pill" :class="`zk-pill--${pill.tone}`">
                {{ pill.label }}
            </span>
            <BtnIcon
                icon="o_delete"
                color="negative"
                :aria-label="t('common.delete')"
                @click="$emit('delete')"
            />
        </div>

        <!-- Completion rate -->
        <div v-if="!goal.isReached" class="goal-card__progress">
            <div class="goal-card__row">
                <span>{{ t('goals.completionRate') }}</span>
                <span class="goal-card__strong">{{ formatPercent(goal.percent) }}</span>
            </div>
            <div class="zk-progress">
                <div :style="progressStyle" />
            </div>
        </div>

        <!-- Footer: deadline and monthly effort -->
        <div v-if="goal.deadline || !goal.isReached" class="goal-card__row goal-card__foot">
            <span v-if="goal.deadline">
                {{ formattedDeadline }}
                <template v-if="goal.monthsLeft !== null">
                    · {{ t('goals.monthsLeft', { count: goal.monthsLeft }) }}
                </template>
            </span>
            <span v-else-if="!goal.isReached">
                {{ t('goals.remaining') }} {{ formatAmount(goal.remaining) }}
            </span>
            <span v-if="!goal.isReached && goal.requiredMonthly !== null" class="goal-card__strong">
                {{ formatAmount(goal.requiredMonthly) }}{{ t('goals.perMonth') }}
            </span>
        </div>
    </article>
</template>

<script setup lang="ts">
import type { SavingsGoalWithStats } from 'src/types/savings-goal';
import { toneStyle } from 'src/services/tone';
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

/** Goals in progress get a calm pink tile; reached ones turn green. */
const tileStyle = computed(() => (props.goal.isReached ? undefined : toneStyle('pink')));

/** Status pill: on track (green) or behind (orange), only when a deadline is set. */
const pill = computed((): { label: string; tone: string } | null => {
    if (props.goal.isReached || !props.goal.deadline || props.goal.onTrack === null) return null;
    return props.goal.onTrack
        ? { label: t('goals.onTrack'), tone: 'green' }
        : { label: t('goals.behind'), tone: 'orange' };
});

/** Progress fill: amber when the goal is behind schedule. */
const progressStyle = computed(() => ({
    width: `${Math.min(Math.max(props.goal.percent, 0), 100)}%`,
    background: props.goal.onTrack === false ? '#d97a2b' : undefined,
}));

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
    background: $bg-card;
    border-radius: $radius-card;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    &__head {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    &__body {
        flex: 1;
        min-width: 0;
        min-height: 44px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 2px;
        padding: 0;
        border: 0;
        background: none;
        color: inherit;
        font-family: inherit;
        text-align: left;
        cursor: pointer;
    }

    &__name {
        font-size: 15px;
        font-weight: 700;
        color: $text-primary;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__meta {
        font-size: 12px;
        color: $text-secondary;

        &--warn {
            color: $amber;
            font-weight: 600;
        }
    }

    &__progress {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    &__row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        font-size: 12px;
        color: $text-secondary;
    }

    &__foot {
        padding-top: 10px;
        border-top: 1px solid $border-light;
    }

    &__strong {
        font-weight: 700;
        color: $text-primary;
    }
}
</style>
