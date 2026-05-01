<template>
    <ModalBase
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="isEditing ? t('investments.editInvestment') : t('investments.addInvestment')"
        size="md"
    >
        <q-form @submit.prevent="save" class="q-gutter-md">
            <!-- Label -->
            <InputSingle
                v-model="form.label"
                :label="t('investments.label')"
                :error="errors.label"
                autofocus
            />

            <!-- Type (only on create) -->
            <q-select
                v-if="!isEditing"
                v-model="form.type"
                :options="typeOptions"
                :label="t('common.type')"
                outlined
                emit-value
                map-options
                :error="!!errors.type"
                :error-message="errors.type"
            />

            <!-- Quantity (only on create - updated via transactions) -->
            <InputNumber
                v-if="!isEditing"
                v-model="form.quantity"
                :label="t('investments.quantity')"
                :step="0.0001"
                :error="errors.quantity"
            />

            <!-- Current Rate -->
            <InputNumber
                v-model="form.currentRate"
                :label="t('investments.rate')"
                :step="0.01"
                :suffix="currencySymbol"
                :error="errors.currentRate"
            />

            <!-- Currency (only on create) -->
            <q-select
                v-if="!isEditing"
                v-model="form.currency"
                :options="currencyOptions"
                :label="t('settings.currency')"
                outlined
                emit-value
                map-options
                :error="!!errors.currency"
                :error-message="errors.currency"
            />

            <!-- Wallet -->
            <q-select
                v-if="!isEditing"
                v-model="form.walletId"
                :options="walletOptions"
                :label="t('investments.sourceWallet')"
                outlined
                emit-value
                map-options
                :error="!!errors.walletId"
                :error-message="errors.walletId"
            />

            <!-- Buttons -->
            <div class="row justify-end q-gutter-sm q-mt-lg">
                <BtnLink :label="t('common.cancel')" @click="close" />
                <BtnPrimary :label="t('common.save')" type="submit" :loading="isLoading" />
            </div>
        </q-form>
    </ModalBase>
</template>

<script setup lang="ts">
import { z } from 'zod/v4';
import type { InvestmentItem } from 'src/types/investment';
import type { CurrencyCode } from 'src/types/currency';
import { getCurrencyOptions, CURRENCIES } from 'src/types/currency';
import ModalBase from '../modals/ModalBase.vue';
import InputSingle from '../inputs/InputSingle.vue';
import InputNumber from '../inputs/InputNumber.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useFormValidation } from 'src/composables/useFormValidation';
import { useInvestmentStore } from 'src/stores/investment';
import { useWalletStore } from 'src/stores/wallet';
import { useSettingsStore } from 'src/stores/settings';

const props = defineProps<{
    modelValue: boolean;
    investment?: InvestmentItem | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [investment: InvestmentItem];
}>();

const { t } = useI18n();
const investmentStore = useInvestmentStore();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();

// Schema
const schema = z.object({
    label: z.string().min(1, t('validation.required')),
    type: z.enum(['stock', 'crypto', 'other']),
    quantity: z.number().min(0, t('validation.positiveNumber')),
    currentRate: z.number().positive(t('validation.positiveNumber')),
    currency: z.string().min(1, t('validation.required')),
    walletId: z.string().min(1, t('validation.required')),
});

const { form, errors, validate, reset } = useFormValidation(schema, {
    label: '',
    type: 'stock',
    quantity: 0,
    currentRate: 0,
    currency: settingsStore.defaultCurrency ?? 'XOF',
    walletId: '',
});

const isEditing = computed(() => !!props.investment);
const isLoading = computed(() => investmentStore.isLoading);

// Type options
const typeOptions = computed(() => [
    { value: 'stock', label: t('investments.types.stock') },
    { value: 'crypto', label: t('investments.types.crypto') },
    { value: 'other', label: t('investments.types.other') },
]);

// Currency options
const currencyOptions = computed(() => getCurrencyOptions(t));

// Wallet options
const walletOptions = computed(() =>
    walletStore.wallets.map((w: { id: string; name: string }) => ({
        value: w.id,
        label: w.name,
    })),
);

// Currency symbol
const currencySymbol = computed(() => {
    const code = isEditing.value ? props.investment?.currency : form.currency;
    if (!code) return '';
    return CURRENCIES[code as CurrencyCode]?.symbol ?? code;
});

// Watch for investment changes (editing)
watch(
    () => props.investment,
    (investment: InvestmentItem | null | undefined) => {
        if (investment) {
            reset({
                label: investment.label,
                type: investment.type,
                quantity: investment.quantity,
                currentRate: investment.currentRate,
                currency: investment.currency,
                walletId: investment.walletId,
            });
        }
    },
    { immediate: true },
);

// Reset form when dialog opens for create
watch(
    () => props.modelValue,
    (open: boolean) => {
        if (open && !props.investment) {
            reset({
                label: '',
                type: 'stock',
                quantity: 0,
                currentRate: 0,
                currency: settingsStore.defaultCurrency ?? 'XOF',
                walletId: walletStore.wallets[0]?.id ?? '',
            });
        }
    },
);

// Load wallets
onMounted(async () => {
    await walletStore.loadAll();
    await settingsStore.loadSettings();
});

/**
 * Closes the investment dialog by emitting update:modelValue with false
 */
function close(): void {
    emit('update:modelValue', false);
}

/**
 * Saves the investment to the database (creates or updates based on editing state)
 * @returns Promise that resolves when save is complete
 */
async function save(): Promise<void> {
    if (!validate()) return;

    try {
        let saved: InvestmentItem;

        if (isEditing.value && props.investment) {
            // Type is immutable - only update label and rate
            const updated = await investmentStore.updateItem(props.investment.id, {
                label: form.label,
                currentRate: form.currentRate,
            });
            if (!updated) throw new Error('Failed to update');
            saved = updated;
        } else {
            saved = await investmentStore.createItem({
                label: form.label,
                type: form.type,
                quantity: form.quantity,
                currentRate: form.currentRate,
                currency: form.currency as CurrencyCode,
                walletId: form.walletId,
            });
        }

        emit('saved', saved);
        close();
    } catch (error) {
        console.error('Failed to save investment:', error);
    }
}
</script>
