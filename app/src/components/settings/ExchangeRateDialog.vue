<template>
    <ModalBase
        :model-value="modelValue"
        :title="isEditing ? t('settings.editExchangeRate') : t('settings.addExchangeRate')"
        persistent
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <q-form ref="formRef" @submit.prevent="save" class="q-gutter-md">
            <!-- From Currency -->
            <q-select
                v-model="form.fromCurrency"
                :options="fromCurrencyOptions"
                :label="t('settings.fromCurrency')"
                outlined
                emit-value
                map-options
                :disable="isEditing"
                :rules="currencyRules"
            />

            <!-- To Currency (locked to default) -->
            <InputSingle
                :model-value="defaultCurrencyLabel"
                :label="t('settings.toCurrency')"
                readonly
                disable
            >
                <template #append>
                    <q-icon name="lock" size="18px" color="grey-5" />
                </template>
            </InputSingle>

            <!-- Rate -->
            <InputNumber
                v-model="form.rate"
                :label="t('settings.rate')"
                :step="0.0001"
                :error="rateError"
            >
                <template #prepend>
                    <span class="text-body2">1 {{ form.fromCurrency }} =</span>
                </template>
                <template #append>
                    <span class="text-body2">{{ defaultCurrency }}</span>
                </template>
            </InputNumber>
        </q-form>

        <template #actions>
            <BtnLink :label="t('common.cancel')" @click="close" />
            <BtnPrimary :label="t('common.save')" :loading="loading" @click="formRef?.submit()" />
        </template>
    </ModalBase>
</template>

<script setup lang="ts">
import type { QForm } from 'quasar';
import type { ExchangeRate, CurrencyCode } from 'src/types/currency';
import { CURRENCIES, getCurrencyOptions } from 'src/types/currency';
import { useExchangeRateStore } from 'src/stores/exchange-rate';
import ModalBase from '../modals/ModalBase.vue';
import InputSingle from '../inputs/InputSingle.vue';
import InputNumber from '../inputs/InputNumber.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';

const props = defineProps<{
    modelValue: boolean;
    rate: ExchangeRate | null;
    defaultCurrency: CurrencyCode;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [];
}>();

const { t } = useI18n();
const exchangeRateStore = useExchangeRateStore();

// State
const loading = ref(false);
/** Form instance: submitting through it runs the field rules before save() */
const formRef = ref<QForm | null>(null);
const form = ref<{ fromCurrency: CurrencyCode | ''; rate: number }>({
    fromCurrency: '',
    rate: 1,
});

// Computed
const isEditing = computed(() => !!props.rate);

const defaultCurrencyLabel = computed(() => {
    if (!props.defaultCurrency) return '-';
    const currency = CURRENCIES[props.defaultCurrency];
    return currency
        ? `${t(`currencies.${currency.code}`)} (${currency.symbol})`
        : props.defaultCurrency;
});

// Validation rules
const currencyRules = [(val: string) => !!val || t('validation.required')];

// Rate error
const rateError = computed(() => {
    if (form.value.rate <= 0) return t('validation.positiveNumber');
    return undefined;
});

// From currency options (exclude default currency)
const fromCurrencyOptions = computed(() => {
    return getCurrencyOptions(t).filter((opt) => opt.value !== props.defaultCurrency);
});

// Watch for rate changes (editing)
watch(
    () => props.rate,
    (rate: ExchangeRate | null) => {
        if (rate) {
            form.value = {
                fromCurrency: rate.fromCurrency,
                rate: rate.rate,
            };
        } else {
            form.value = {
                fromCurrency: '',
                rate: 1,
            };
        }
    },
    { immediate: true },
);

/**
 * Closes the exchange rate dialog by emitting the update:modelValue event with false.
 */
function close() {
    emit('update:modelValue', false);
}

/**
 * Saves the exchange rate to the store.
 * Validates the form, calls the store method, and emits the saved event.
 * @returns {Promise<void>} Resolves when the save operation completes.
 */
async function save() {
    if (!form.value.fromCurrency || form.value.rate <= 0) return;

    loading.value = true;
    try {
        await exchangeRateStore.setRate(
            form.value.fromCurrency,
            props.defaultCurrency,
            form.value.rate,
        );
        emit('saved');
        close();
    } finally {
        loading.value = false;
    }
}
</script>
