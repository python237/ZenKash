<template>
    <article class="recurring-card" :class="{ 'recurring-card--inactive': !recurring.isActive }">
        <div class="recurring-card__head">
            <span class="zk-tile" :class="isIncome ? 'zk-tile--green' : 'zk-tile--orange'">
                <q-icon :name="typeIcon" size="20px" />
            </span>

            <button type="button" class="recurring-card__body" @click="$emit('click')">
                <span class="recurring-card__name">{{ categoryName }}</span>
                <span class="recurring-card__meta">{{ frequencyLabel }} · {{ walletName }}</span>
            </button>

            <q-toggle
                :model-value="recurring.isActive"
                color="primary"
                :aria-label="recurring.isActive ? t('recurring.active') : t('recurring.inactive')"
                @update:model-value="$emit('toggle', $event)"
            />
        </div>

        <div class="recurring-card__foot">
            <button type="button" class="recurring-card__next" @click="$emit('click')">
                {{ t('recurring.nextOccurrence') }} {{ formattedNextRun }} ·
                {{ recurring.autoPost ? t('recurring.autoPost') : t('recurring.reminderOnly') }}
            </button>
            <span class="recurring-card__amount" :class="amountClass">
                {{ amountSign }}{{ formattedAmount }}
            </span>
            <BtnIcon
                icon="o_delete"
                color="negative"
                :aria-label="t('common.delete')"
                @click="$emit('delete')"
            />
        </div>
    </article>
</template>

<script setup lang="ts">
import { displayAmount } from 'src/composables/usePrivacy';
import type { RecurringTransaction } from 'src/types/recurring-transaction';
import { CURRENCIES, type CurrencyCode } from 'src/types/currency';
import BtnIcon from '../buttons/BtnIcon.vue';

const props = defineProps<{
    recurring: RecurringTransaction;
    currency: CurrencyCode;
}>();

defineEmits<{
    click: [];
    toggle: [value: boolean];
    delete: [];
}>();

const { t, locale } = useI18n();
const categoryStore = useCategoryStore();
const walletStore = useWalletStore();

const isIncome = computed(() => props.recurring.type === 'income');
const typeIcon = computed(() => (isIncome.value ? 'arrow_downward' : 'arrow_upward'));
const amountClass = computed(() => (isIncome.value ? 'text-positive' : 'text-negative'));
const amountSign = computed(() => (isIncome.value ? '+' : '−'));

const categoryName = computed(
    () => categoryStore.getCategoryById(props.recurring.categoryId)?.name ?? '—',
);
const walletName = computed(() => walletStore.getWalletById(props.recurring.walletId)?.name ?? '—');

const formattedAmount = computed(() => {
    const info = CURRENCIES[props.currency];
    return displayAmount(
        new Intl.NumberFormat(locale.value, {
            style: 'currency',
            currency: props.currency,
            minimumFractionDigits: info?.decimals ?? 0,
            maximumFractionDigits: info?.decimals ?? 0,
        }).format(props.recurring.amount),
    );
});

const formattedNextRun = computed(() =>
    new Intl.DateTimeFormat(locale.value, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(props.recurring.nextRun),
);

const frequencyLabel = computed(() => {
    const count = props.recurring.intervalCount;
    switch (props.recurring.frequency) {
        case 'weekly':
            return t('recurring.everyWeek', { count });
        case 'yearly':
            return t('recurring.everyYear', { count });
        default:
            return t('recurring.everyMonth', { count });
    }
});
</script>

<style lang="scss" scoped>
.recurring-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 14px 16px;
    border-radius: 20px;
    background: $bg-card;

    &--inactive {
        opacity: 0.6;
    }

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
        font-size: 14px;
        font-weight: 700;
        color: $text-primary;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__meta {
        font-size: 12px;
        color: $text-secondary;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__foot {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-top: 6px;
        border-top: 1px solid $border-light;
    }

    &__next {
        flex: 1;
        min-width: 0;
        padding: 0;
        border: 0;
        background: none;
        font-family: inherit;
        font-size: 12px;
        color: $text-secondary;
        text-align: left;
        cursor: pointer;
    }

    &__amount {
        flex-shrink: 0;
        font-size: 14px;
        font-weight: 700;
    }
}
</style>
