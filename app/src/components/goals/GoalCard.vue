<template>
    <article class="goal-card">
        <!-- Header -->
        <div class="goal-card__head">
            <span
                class="zk-tile zk-tile--lg"
                :class="goal.isReached && !goal.isClosed ? 'zk-tile--green' : ''"
                :style="tileStyle"
            >
                <q-icon :name="goal.isClosed ? 'o_flag' : (goal.icon ?? 'flag')" size="22px" />
            </span>
            <button type="button" class="goal-card__body" @click="$emit('click')">
                <span class="goal-card__name">{{ goal.name }}</span>
                <span v-if="goal.isClosed" class="goal-card__meta">
                    {{
                        t('goals.closing.closedMeta', {
                            amount: formatAmount(goal.currentAmount),
                            date: formattedClosedAt,
                        })
                    }}
                </span>
                <span v-else-if="!goal.walletExists" class="goal-card__meta text-negative">
                    {{ t('goals.walletMissing') }}
                </span>
                <span v-else class="goal-card__meta">
                    {{ formatAmount(goal.currentAmount) }} /
                    {{ formatAmount(goal.targetAmount) }}
                </span>
                <span v-if="goal.sharesWallet" class="goal-card__meta goal-card__meta--warn">
                    {{ t('goals.sharedWallet') }}
                </span>
            </button>
            <span v-if="pill" class="zk-pill" :class="pill.tone ? `zk-pill--${pill.tone}` : ''">
                {{ pill.label }}
            </span>
            <BtnIcon
                v-if="goal.isClosed"
                icon="o_undo"
                :aria-label="t('goals.closing.reopen')"
                @click="$emit('reopen')"
            />
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

        <!-- Reached, not closed yet: invite to close before spending -->
        <div v-if="goal.isReached && !goal.isClosed" class="goal-card__close">
            <span class="goal-card__meta">{{ t('goals.closing.invite') }}</span>
            <button type="button" class="goal-card__cta" @click="$emit('close')">
                <q-icon name="o_flag" size="18px" />
                {{ t('goals.closing.action') }}
            </button>
        </div>

        <!-- Closed: state of the linked wallet -->
        <div v-if="goal.isClosed && wallet" class="goal-card__row goal-card__foot">
            <span class="goal-card__wallet">
                <q-icon
                    :name="wallet.closedAt ? 'o_lock' : 'o_account_balance_wallet'"
                    size="16px"
                />
                <span v-if="wallet.closedAt">
                    {{ t('goals.closing.walletClosed', { name: wallet.name }) }}
                </span>
                <span v-else>
                    {{
                        t('goals.closing.walletOpen', {
                            name: wallet.name,
                            amount: formatAmount(wallet.balance),
                        })
                    }}
                </span>
            </span>
            <button
                v-if="!wallet.closedAt"
                type="button"
                class="zk-link"
                @click="$emit('close-wallet')"
            >
                {{ t('wallets.closing.action') }}
            </button>
        </div>

        <!-- Footer: deadline and monthly effort -->
        <div v-if="!goal.isReached" class="goal-card__row goal-card__foot">
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
    close: [];
    'close-wallet': [];
    reopen: [];
}>();

const { t, locale } = useI18n();
const { formatCurrency, formatPercent } = useCurrency();
const walletStore = useWalletStore();

/** Linked wallet, when it still exists. */
const wallet = computed(() => walletStore.getWalletById(props.goal.walletId));

/** Goals in progress get a calm pink tile; reached ones turn green, closed ones grey. */
const tileStyle = computed(() => (props.goal.isReached ? undefined : toneStyle('pink')));

/**
 * Status pill: closed (grey), reached (green), or on track / behind when a
 * deadline is set.
 */
const pill = computed((): { label: string; tone: string } | null => {
    if (props.goal.isClosed) return { label: t('goals.closing.closed'), tone: '' };
    if (props.goal.isReached) return { label: t('goals.reached'), tone: 'green' };
    if (!props.goal.deadline || props.goal.onTrack === null) return null;
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

const formattedClosedAt = computed(() => {
    if (!props.goal.closedAt) return '';
    return new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' }).format(
        props.goal.closedAt,
    );
});

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

    &__close {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding-top: 12px;
        border-top: 1px solid $border-light;
        line-height: 1.5;
    }

    &__cta {
        height: 42px;
        border: 0;
        border-radius: 14px;
        background: $text-primary;
        color: #ffffff;
        font-family: inherit;
        font-size: 14px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        cursor: pointer;
    }

    &__wallet {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
    }
}
</style>
