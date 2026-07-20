<template>
    <q-card class="recurring-card" :class="{ 'recurring-card--inactive': !recurring.isActive }" flat bordered>
        <q-card-section class="q-pa-md">
            <div class="row items-center no-wrap">
                <q-avatar :color="avatarColor" text-color="white" size="40px" class="q-mr-md">
                    <q-icon :name="typeIcon" size="20px" />
                </q-avatar>

                <div class="col clickable" @click="$emit('click')">
                    <div class="text-subtitle2 text-weight-medium">{{ categoryName }}</div>
                    <div class="text-caption text-grey-6">{{ frequencyLabel }} · {{ walletName }}</div>
                </div>

                <div class="text-right q-mr-sm clickable" @click="$emit('click')">
                    <div class="text-subtitle2 text-weight-bold" :class="amountClass">
                        {{ amountSign }}{{ formattedAmount }}
                    </div>
                    <div class="text-caption text-grey-6">
                        {{ t('recurring.nextOccurrence') }}: {{ formattedNextRun }}
                    </div>
                </div>

                <q-toggle
                    :model-value="recurring.isActive"
                    color="primary"
                    dense
                    @update:model-value="$emit('toggle', $event)"
                />
            </div>

            <div class="row items-center justify-between q-mt-sm">
                <q-badge :color="recurring.autoPost ? 'primary' : 'grey-5'" outline>
                    {{ recurring.autoPost ? t('recurring.autoPost') : t('recurring.reminderOnly') }}
                </q-badge>
                <BtnIcon dense icon="delete" color="negative" @click="$emit('delete')" />
            </div>
        </q-card-section>
    </q-card>
</template>

<script setup lang="ts">
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
const avatarColor = computed(() => (isIncome.value ? 'positive' : 'negative'));
const amountClass = computed(() => (isIncome.value ? 'text-positive' : 'text-negative'));
const amountSign = computed(() => (isIncome.value ? '+' : '-'));

const categoryName = computed(
    () => categoryStore.getCategoryById(props.recurring.categoryId)?.name ?? '—',
);
const walletName = computed(
    () => walletStore.getWalletById(props.recurring.walletId)?.name ?? '—',
);

const formattedAmount = computed(() => {
    const info = CURRENCIES[props.currency];
    return new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: props.currency,
        minimumFractionDigits: info?.decimals ?? 0,
        maximumFractionDigits: info?.decimals ?? 0,
    }).format(props.recurring.amount);
});

const formattedNextRun = computed(() =>
    new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short', year: 'numeric' }).format(
        props.recurring.nextRun,
    ),
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
    border-radius: 12px;

    &--inactive {
        opacity: 0.6;
    }
}
</style>
