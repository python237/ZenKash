<template>
    <ModalBase
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="t('investments.updateRate')"
        size="sm"
    >
        <q-form @submit.prevent="save" class="q-gutter-md">
            <!-- Current rate (readonly) -->
            <InputSingle
                :model-value="formattedCurrentRate"
                :label="t('investments.currentRate')"
                readonly
                disable
            />

            <!-- New rate -->
            <InputNumber
                v-model="newRate"
                :label="t('investments.newRate')"
                :step="0.01"
                :suffix="currencySymbol"
                :error="error"
                autofocus
            />

            <!-- Change indicator -->
            <div v-if="rateChange !== 0" class="rate-change" :class="rateChangeClass">
                <q-icon :name="rateChange > 0 ? 'arrow_upward' : 'arrow_downward'" size="18px" />
                <span>{{ rateChangeText }}</span>
            </div>

            <!-- Buttons -->
            <div class="row justify-end q-gutter-sm q-mt-lg">
                <BtnLink :label="t('common.cancel')" @click="close" />
                <BtnPrimary :label="t('common.save')" type="submit" :loading="isLoading" />
            </div>
        </q-form>
    </ModalBase>
</template>

<script setup lang="ts">
import type { InvestmentItem } from 'src/types/investment';
import { CURRENCIES } from 'src/types/currency';
import ModalBase from '../modals/ModalBase.vue';
import InputSingle from '../inputs/InputSingle.vue';
import InputNumber from '../inputs/InputNumber.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useInvestmentStore } from 'src/stores/investment';

const props = defineProps<{
    modelValue: boolean;
    investment: InvestmentItem;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [];
}>();

const { t } = useI18n();
const investmentStore = useInvestmentStore();

// State
const newRate = ref(props.investment?.currentRate ?? 0);
const error = ref('');
const isLoading = computed(() => investmentStore.isLoading);

// Currency symbol
const currencySymbol = computed(() => {
    if (!props.investment) return '';
    return CURRENCIES[props.investment.currency]?.symbol ?? props.investment.currency;
});

// Formatted current rate
const formattedCurrentRate = computed(() => {
    if (!props.investment) return '0';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: props.investment.currency,
    }).format(props.investment.currentRate);
});

// Rate change calculation
const rateChange = computed(() => {
    if (!props.investment || newRate.value === 0) return 0;
    return ((newRate.value - props.investment.currentRate) / props.investment.currentRate) * 100;
});

const rateChangeClass = computed(() => ({
    'rate-change--positive': rateChange.value > 0,
    'rate-change--negative': rateChange.value < 0,
}));

const rateChangeText = computed(() => {
    const sign = rateChange.value > 0 ? '+' : '';
    return `${sign}${rateChange.value.toFixed(2)}%`;
});

// Reset when dialog opens
watch(
    () => props.modelValue,
    (open: boolean) => {
        if (open) {
            newRate.value = props.investment?.currentRate ?? 0;
            error.value = '';
        }
    },
);

/**
 * Closes the rate update dialog by emitting update:modelValue with false
 */
function close(): void {
    emit('update:modelValue', false);
}

/**
 * Saves the updated rate to the database and records it in rate history
 * @returns Promise that resolves when save is complete
 */
async function save(): Promise<void> {
    error.value = '';

    if (newRate.value <= 0) {
        error.value = t('validation.positiveNumber');
        return;
    }

    try {
        await investmentStore.updateRate(props.investment.id, newRate.value);
        emit('saved');
        close();
    } catch (err) {
        console.error('Failed to update rate:', err);
        error.value = t('messages.error');
    }
}
</script>

<style lang="scss" scoped>
.rate-change {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    font-weight: 600;
    padding: 8px 12px;
    border-radius: 8px;

    &--positive {
        color: var(--q-positive);
        background: rgba(76, 175, 80, 0.1);
    }

    &--negative {
        color: var(--q-negative);
        background: rgba(244, 67, 54, 0.1);
    }
}
</style>
