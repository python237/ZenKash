<template>
    <ModalBase
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="t('debts.addRepayment')"
        max-width="400px"
    >
        <q-form v-if="debt" @submit.prevent="save" class="q-gutter-md">
            <div class="text-body2">
                {{ debt.counterparty }} ·
                <span class="text-grey-7">
                    {{ t('debts.outstanding') }}:
                    {{ formatCurrency(debt.outstanding, debt.currency) }}
                </span>
            </div>

            <InputNumber
                v-model="form.amount"
                :label="t('common.amount')"
                :suffix="currencySymbol"
                :error="errors.amount"
            />

            <InputDate v-model="form.date" :label="t('common.date')" />

            <div class="row justify-end q-gutter-sm q-mt-md">
                <BtnLink :label="t('common.cancel')" @click="close" />
                <BtnPrimary :label="t('common.save')" type="submit" :loading="isLoading" />
            </div>
        </q-form>
    </ModalBase>
</template>

<script setup lang="ts">
import { z } from 'zod/v4';
import type { DebtWithStats } from 'src/types/debt';
import { CURRENCIES } from 'src/types/currency';
import ModalBase from '../modals/ModalBase.vue';
import InputNumber from '../inputs/InputNumber.vue';
import InputDate from '../inputs/InputDate.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useFormValidation } from 'src/composables/useFormValidation';

const props = defineProps<{
    modelValue: boolean;
    debt?: DebtWithStats | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [];
}>();

const { t } = useI18n();
const { formatCurrency } = useCurrency();
const transactionStore = useTransactionStore();

const schema = z.object({
    amount: z.number().positive(t('validation.positiveNumber')),
    date: z.string().min(1, t('validation.required')),
});

/**
 * Formats a Date as a YYYY-MM-DD string for the date input.
 * @param d - The date to format
 * @returns The formatted date string
 */
function toDateInput(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const { form, errors, validate, reset } = useFormValidation(schema, {
    amount: 0,
    date: toDateInput(new Date()),
});

const isLoading = computed(() => transactionStore.isLoading);

const currencySymbol = computed(() =>
    props.debt ? (CURRENCIES[props.debt.currency]?.symbol ?? props.debt.currency) : '',
);

watch(
    () => props.modelValue,
    (isOpen: boolean) => {
        // A repayment defaults to what is left: settling in full is the common case.
        if (isOpen) reset({ amount: props.debt?.outstanding ?? 0, date: toDateInput(new Date()) });
    },
);

/**
 * Closes the dialog.
 */
function close(): void {
    emit('update:modelValue', false);
}

/**
 * Records the repayment as a debt transaction, which moves the wallet balance
 * and advances the debt's repaid total in one step.
 * @returns Promise resolving when the repayment is recorded
 */
async function save(): Promise<void> {
    if (!props.debt || !validate()) return;

    try {
        await transactionStore.create({
            type: 'debt',
            debtTransactionType: 'repayment',
            debtId: props.debt.id,
            amount: form.amount,
            date: new Date(form.date),
            walletId: props.debt.walletId,
            description: props.debt.counterparty,
        });

        emit('saved');
        close();
    } catch (error) {
        console.error('Failed to record repayment:', error);
    }
}
</script>
