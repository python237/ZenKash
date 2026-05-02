<template>
    <ModalBase
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="dialogTitle"
        size="md"
    >
        <q-form @submit.prevent="save" class="q-gutter-md">
            <!-- Amount -->
            <InputNumber
                v-model="form.amount"
                :label="t('common.amount')"
                :suffix="currencySymbol"
                :error="errors.amount"
                autofocus
            />

            <!-- Wallet -->
            <q-select
                v-model="form.walletId"
                :options="walletOptions"
                :label="t('transactions.sourceWallet')"
                outlined
                emit-value
                map-options
                :error="!!errors.walletId"
                :error-message="errors.walletId"
            />

            <!-- Date -->
            <InputDate v-model="form.date" :label="t('common.date')" />

            <!-- Description -->
            <q-input
                v-model="form.description"
                :label="t('common.description')"
                outlined
                autogrow
                :input-style="{ minHeight: '60px' }"
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
import type { Project } from 'src/types/project';
import type { Transaction } from 'src/types/transaction';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import ModalBase from '../modals/ModalBase.vue';
import InputNumber from '../inputs/InputNumber.vue';
import InputDate from '../inputs/InputDate.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useFormValidation } from 'src/composables/useFormValidation';

const props = defineProps<{
    modelValue: boolean;
    project: Project;
    transactionType: 'injection' | 'dividend';
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [transaction: Transaction];
}>();

const { t } = useI18n();
const transactionStore = useTransactionStore();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();

/**
 * Gets today's date as a local date string (YYYY-MM-DD).
 * @returns The date string in YYYY-MM-DD format
 */
function getLocalDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Schema
const schema = z.object({
    amount: z.number().positive(t('validation.positiveNumber')),
    walletId: z.string().min(1, t('validation.required')),
    date: z.string().min(1, t('validation.required')),
    description: z.string().optional(),
});

const { form, errors, validate, reset } = useFormValidation(schema, {
    amount: 0,
    walletId: '',
    date: getLocalDateString(),
    description: '',
});

const isLoading = computed(() => transactionStore.isLoading);

// Dialog title
const dialogTitle = computed(() => {
    return props.transactionType === 'injection'
        ? t('transactions.addInjection')
        : t('transactions.addDividend');
});

// Currency
const currencyCode = computed(() => settingsStore.defaultCurrency ?? CurrencyCode.XOF);
const currencySymbol = computed(() => CURRENCIES[currencyCode.value]?.symbol ?? currencyCode.value);

// Wallet options
const walletOptions = computed(() =>
    walletStore.wallets.map((w: { id: string; name: string }) => ({
        value: w.id,
        label: w.name,
    })),
);

// Watch dialog open
watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) {
            reset();
            // Set first wallet as default if available
            if (walletOptions.value.length > 0 && !form.walletId) {
                form.walletId = walletOptions.value[0]?.value ?? '';
            }
        }
    },
);

/**
 * Closes the project transaction dialog by emitting the update:modelValue event with false.
 */
function close() {
    emit('update:modelValue', false);
}

/**
 * Saves the project transaction (injection or dividend).
 * Validates the form, creates the transaction via store, and emits the saved event.
 * @returns {Promise<void>} Resolves when the save operation completes.
 */
async function save() {
    if (!validate()) return;

    try {
        const transaction = await transactionStore.create({
            type: 'project',
            amount: form.amount,
            walletId: form.walletId,
            projectId: props.project.id,
            projectTransactionType: props.transactionType,
            date: new Date(form.date),
            description: form.description || undefined,
        });

        emit('saved', transaction);
        close();
    } catch (error) {
        console.error('Failed to save transaction:', error);
    }
}
</script>
