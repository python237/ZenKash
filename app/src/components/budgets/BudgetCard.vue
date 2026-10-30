<template>
    <button type="button" class="budget-card" @click="$emit('click')">
        <!-- Header: Icon & Name -->
        <span class="budget-card__head">
            <span class="zk-tile zk-tile--sm" :style="tileStyle">
                <q-icon :name="budgetIcon" size="18px" />
            </span>
            <span class="budget-card__body">
                <span class="budget-card__name">{{ budgetName }}</span>
                <span v-if="budget.category" class="budget-card__meta">
                    {{ budget.masterCategory?.name }}
                </span>
            </span>
            <span class="budget-card__status" :class="`budget-card__status--${level}`">
                {{ statusText }}
            </span>
        </span>

        <!-- Progress bar -->
        <span class="zk-progress">
            <span
                class="budget-card__fill"
                :class="`budget-card__fill--${level}`"
                :style="{ width: `${progressValue * 100}%` }"
            />
        </span>

        <!-- Stats row -->
        <span class="budget-card__row">
            <span>{{ formattedSpent }} / {{ formattedAmount }}</span>
            <span :class="{ 'budget-card__over': budget.isExceeded }">
                {{ budget.isExceeded ? t('budgets.exceeded') : t('budgets.remaining') }}
                {{ formattedRemaining }}
            </span>
        </span>
    </button>
</template>

<script setup lang="ts">
import { displayAmount } from 'src/composables/usePrivacy';
import type { BudgetWithStats } from 'src/types/budget';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import { toneStyle } from 'src/services/tone';

const props = defineProps<{
    budget: BudgetWithStats;
    currency?: CurrencyCode;
}>();

defineEmits<{
    click: [];
}>();

const { t } = useI18n();
const settingsStore = useSettingsStore();

// Currency
const currencyCode = computed(
    () => props.currency ?? settingsStore.defaultCurrency ?? CurrencyCode.XOF,
);
const currencyInfo = computed(() => CURRENCIES[currencyCode.value]);

// Budget name (category or master category name)
const budgetName = computed(() => {
    if (props.budget.category) return props.budget.category.name;
    if (props.budget.masterCategory) return props.budget.masterCategory.name;
    return t('common.noData');
});

// Budget icon
const budgetIcon = computed(() => {
    if (props.budget.category?.icon) return props.budget.category.icon;
    if (props.budget.masterCategory?.icon) return props.budget.masterCategory.icon;
    return 'account_balance_wallet';
});

/** Consumption level: over the limit, close to it (80%+), or fine. */
const level = computed(() => {
    if (props.budget.isExceeded) return 'over';
    if (props.budget.percentUsed >= 80) return 'near';
    return 'ok';
});

// Tile tone: orange when exceeded, amber near the limit, category color otherwise
const tileStyle = computed(() => {
    if (level.value === 'over') return toneStyle('orange');
    if (level.value === 'near') return toneStyle('amber');
    return toneStyle(props.budget.masterCategory?.color ?? 'primary');
});

// Progress
const progressValue = computed(() => Math.min(props.budget.percentUsed / 100, 1));

// Status

const statusText = computed(() => {
    const percent = props.budget.percentUsed.toFixed(0);
    return `${percent}%`;
});

// Formatting
const formattedAmount = computed(() => {
    return displayAmount(
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currencyCode.value,
            minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
            maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
        }).format(props.budget.amount),
    );
});

const formattedSpent = computed(() => {
    return displayAmount(
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currencyCode.value,
            minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
            maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
        }).format(props.budget.spent),
    );
});

const formattedRemaining = computed(() => {
    const value = Math.abs(props.budget.remaining);
    return displayAmount(
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currencyCode.value,
            minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
            maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
        }).format(value),
    );
});
</script>

<style lang="scss" scoped>
.budget-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 100%;
    padding: 14px 16px;
    border: 0;
    border-radius: 20px;
    background: $bg-card;
    color: $text-primary;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    &__head {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    &__body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
    }

    &__name {
        font-size: 14px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__meta {
        font-size: 12px;
        color: $text-secondary;
    }

    &__status {
        flex-shrink: 0;
        font-size: 13px;
        font-weight: 700;
        color: $primary;

        &--near {
            color: $amber;
        }

        &--over {
            color: $negative;
        }
    }

    .zk-progress {
        display: block;
    }

    &__fill {
        display: block;
        height: 100%;
        border-radius: 999px;
        background: $primary;

        &--near {
            background: $warning;
        }

        &--over {
            background: $negative;
        }
    }

    &__row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-size: 12px;
        color: $text-secondary;
    }

    &__over {
        color: $negative;
        font-weight: 600;
    }
}
</style>
