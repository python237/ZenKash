<template>
    <article class="debt-card">
        <!-- Header -->
        <div class="debt-card__head">
            <span
                class="zk-tile debt-card__initial"
                :class="`zk-tile--${tileTone}`"
                aria-hidden="true"
            >
                {{ initial }}
            </span>
            <button type="button" class="debt-card__body" @click="$emit('click')">
                <span class="debt-card__name">{{ debt.counterparty }}</span>
                <span v-if="!debt.walletExists" class="debt-card__meta text-negative">
                    {{ t('debts.walletMissing') }}
                </span>
                <span v-else class="debt-card__meta">
                    {{ t(`debts.directions.${debt.direction}`) }} ·
                    {{ formatCurrency(debt.principal, debt.currency) }}
                </span>
            </button>
            <span v-if="status" class="zk-pill" :class="status.tone && `zk-pill--${status.tone}`">
                {{ status.label }}
            </span>
        </div>

        <!-- Repayment progress -->
        <div class="debt-card__progress">
            <div class="debt-card__progress-labels">
                <span>{{ t('debts.repaid') }} {{ formatPercent(debt.percentRepaid) }}</span>
                <span v-if="debt.dueDate" :class="{ 'text-negative': debt.isOverdue }">
                    {{ t('debts.dueOn', { date: formattedDueDate }) }}
                </span>
            </div>
            <div class="zk-progress">
                <div :style="progressStyle" />
            </div>
        </div>

        <!-- Footer -->
        <div class="debt-card__foot">
            <span class="debt-card__outstanding">
                <template v-if="debt.isSettled">{{ t('debts.settled') }}</template>
                <template v-else>
                    {{ t('debts.outstanding') }}
                    {{ formatCurrency(debt.outstanding, debt.currency) }}
                </template>
            </span>
            <div class="debt-card__actions">
                <button
                    v-if="!debt.isSettled"
                    type="button"
                    class="debt-card__action"
                    :class="{ 'debt-card__action--dark': debt.direction === 'borrowed' }"
                    @click="$emit('repay')"
                >
                    {{ t(`debts.repayAction.${debt.direction}`) }}
                </button>
                <button
                    v-else-if="debt.totalRepaid > 0"
                    type="button"
                    class="debt-card__action"
                    @click="$emit('undo')"
                >
                    {{ t('debts.undoRepayment') }}
                </button>
            </div>
        </div>
    </article>
</template>

<script setup lang="ts">
import type { DebtWithStats } from 'src/types/debt';

const props = defineProps<{
    debt: DebtWithStats;
}>();

defineEmits<{
    click: [];
    repay: [];
    undo: [];
}>();

const { t, locale } = useI18n();
const { formatCurrency, formatPercent } = useCurrency();

/** Tile tone: money lent comes back (green), borrowed money goes out (orange). */
const tileTone = computed(() => (props.debt.direction === 'lent' ? 'green' : 'orange'));

// First letter of the counterparty, shown in the tile
const initial = computed(() => props.debt.counterparty.trim().charAt(0).toUpperCase() || '?');

/** Status pill: settled, overdue, or days left before the due date. */
const status = computed((): { label: string; tone: string | null } | null => {
    if (props.debt.isSettled) return { label: t('debts.settled'), tone: 'green' };
    if (props.debt.isOverdue) return { label: t('debts.overdue'), tone: 'orange' };
    if (props.debt.daysLeft !== null) {
        return { label: t('debts.daysLeftShort', { count: props.debt.daysLeft }), tone: null };
    }
    return null;
});

/** Progress fill: green when settled or on time, amber when overdue. */
const progressStyle = computed(() => ({
    width: `${Math.min(Math.max(props.debt.percentRepaid, 0), 100)}%`,
    background: props.debt.isOverdue && !props.debt.isSettled ? '#d97a2b' : undefined,
}));

const formattedDueDate = computed(() => {
    if (!props.debt.dueDate) return '';
    return new Intl.DateTimeFormat(locale.value, {
        day: 'numeric',
        month: 'short',
        // Year only when it is not the current one
        ...(props.debt.dueDate.getFullYear() !== new Date().getFullYear() && { year: 'numeric' }),
    }).format(props.debt.dueDate);
});
</script>

<style lang="scss" scoped>
.debt-card {
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

    &__initial {
        width: 42px;
        height: 42px;
        border-radius: 13px;
        font-weight: 800;
    }

    &__body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 0;
        border: 0;
        background: none;
        text-align: left;
        font-family: inherit;
        color: inherit;
        cursor: pointer;
        min-height: 44px;
        justify-content: center;
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
    }

    &__progress {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    &__progress-labels {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-size: 12px;
        color: $text-secondary;
    }

    &__foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
    }

    &__outstanding {
        font-size: 14px;
        font-weight: 700;
        color: $text-primary;
    }

    &__actions {
        display: flex;
        align-items: center;
        gap: 4px;
    }

    &__action {
        min-height: 40px;
        padding: 0 14px;
        border-radius: 12px;
        border: 1px solid $border-color;
        background: $bg-card;
        color: $text-primary;
        font-family: inherit;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;

        &--dark {
            border-color: $text-primary;
            background: $text-primary;
            color: #ffffff;
        }
    }
}
</style>
