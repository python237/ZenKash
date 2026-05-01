<template>
    <q-card
        class="budget-card"
        :class="{
            'budget-card--exceeded': budget.isExceeded,
            'budget-card--warning': !budget.isExceeded && budget.percentUsed >= 80,
        }"
        flat
        bordered
        @click="$emit('click')"
    >
        <q-card-section class="q-pa-md">
            <!-- Header: Icon & Name -->
            <div class="row items-center q-mb-sm">
                <q-avatar :color="avatarColor" text-color="white" size="40px" class="q-mr-md">
                    <q-icon :name="budgetIcon" size="20px" />
                </q-avatar>
                <div class="col">
                    <div class="text-subtitle1 text-weight-medium">{{ budgetName }}</div>
                    <div v-if="budget.category" class="text-caption text-grey-6">
                        {{ budget.masterCategory?.name }}
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-subtitle2 text-weight-bold">{{ formattedAmount }}</div>
                    <div class="text-caption" :class="statusClass">{{ statusText }}</div>
                </div>
            </div>

            <!-- Progress bar -->
            <q-linear-progress
                :value="progressValue"
                :color="progressColor"
                track-color="grey-3"
                rounded
                size="8px"
                class="q-mt-sm"
            />

            <!-- Stats row -->
            <div class="row justify-between q-mt-sm text-caption">
                <span class="text-grey-6"> {{ t('budgets.spent') }}: {{ formattedSpent }} </span>
                <span :class="statusClass">
                    {{ budget.isExceeded ? t('budgets.exceeded') : t('budgets.remaining') }}:
                    {{ formattedRemaining }}
                </span>
            </div>
        </q-card-section>
    </q-card>
</template>

<script setup lang="ts">
import type { BudgetWithStats } from 'src/types/budget';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';

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

// Avatar color
const avatarColor = computed(() => {
    if (props.budget.isExceeded) return 'negative';
    if (props.budget.percentUsed >= 80) return 'warning';
    if (props.budget.masterCategory?.color) return props.budget.masterCategory.color;
    return 'primary';
});

// Progress
const progressValue = computed(() => Math.min(props.budget.percentUsed / 100, 1));

const progressColor = computed(() => {
    if (props.budget.isExceeded) return 'negative';
    if (props.budget.percentUsed >= 80) return 'warning';
    return 'positive';
});

// Status
const statusClass = computed(() => {
    if (props.budget.isExceeded) return 'text-negative';
    if (props.budget.percentUsed >= 80) return 'text-warning';
    return 'text-positive';
});

const statusText = computed(() => {
    const percent = props.budget.percentUsed.toFixed(0);
    return `${percent}%`;
});

// Formatting
const formattedAmount = computed(() => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currencyCode.value,
        minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
        maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
    }).format(props.budget.amount);
});

const formattedSpent = computed(() => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currencyCode.value,
        minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
        maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
    }).format(props.budget.spent);
});

const formattedRemaining = computed(() => {
    const value = Math.abs(props.budget.remaining);
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currencyCode.value,
        minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
        maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
    }).format(value);
});
</script>

<style lang="scss" scoped>
.budget-card {
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    &--exceeded {
        border-left: 3px solid $negative;
    }

    &--warning {
        border-left: 3px solid $warning;
    }
}
</style>
