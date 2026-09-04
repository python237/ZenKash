<template>
    <ModalBase
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="isEditing ? t('debts.editDebt') : t('debts.addDebt')"
        max-width="440px"
    >
        <q-form @submit.prevent="save" class="q-gutter-md">
            <!-- Direction: fixed once movements exist against the debt -->
            <q-btn-toggle
                v-if="!isEditing"
                v-model="form.direction"
                :options="directionOptions"
                spread
                unelevated
                no-caps
                toggle-color="primary"
                color="grey-2"
                text-color="grey-8"
            />

            <InputSingle
                v-model="form.counterparty"
                :label="t('debts.counterparty')"
                :error="errors.counterparty"
            />

            <InputNumber
                v-model="form.principal"
                :label="t('debts.principal')"
                :suffix="currencySymbol"
                :error="errors.principal"
                :disable="isEditing"
                :hint="isEditing ? t('debts.principalLocked') : ''"
            />

            <q-select
                v-model="form.walletId"
                :options="walletOptions"
                :label="t('debts.wallet')"
                :hint="isEditing ? '' : t('debts.walletHint')"
                outlined
                dense
                emit-value
                map-options
                :disable="isEditing"
                :error="!!errors.walletId"
                :error-message="errors.walletId"
            />

            <InputDate v-model="form.dueDate" :label="t('debts.dueDateOptional')" />

            <InputSingle
                v-model="form.description"
                :label="t('common.description')"
                :error="errors.description"
            />

            <div class="row justify-end q-gutter-sm q-mt-md">
                <BtnLink :label="t('common.cancel')" @click="close" />
                <BtnPrimary :label="t('common.save')" type="submit" :loading="isLoading" />
            </div>
        </q-form>
    </ModalBase>
</template>

<script setup lang="ts">
import { z } from 'zod/v4';
import type { Debt, DebtDirection } from 'src/types/debt';
import type { Wallet } from 'src/types/wallet';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import ModalBase from '../modals/ModalBase.vue';
import InputNumber from '../inputs/InputNumber.vue';
import InputSingle from '../inputs/InputSingle.vue';
import InputDate from '../inputs/InputDate.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useFormValidation } from 'src/composables/useFormValidation';
import { useDebtStore } from 'src/stores/debt';

const props = defineProps<{
    modelValue: boolean;
    debt?: Debt | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [debt: Debt];
}>();

const { t } = useI18n();
const debtStore = useDebtStore();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();
const transactionStore = useTransactionStore();

const schema = z.object({
    counterparty: z.string().min(1, t('validation.required')),
    direction: z.string().min(1, t('validation.required')),
    principal: z.number().positive(t('validation.positiveNumber')),
    walletId: z.string().min(1, t('validation.required')),
    dueDate: z.string(),
    description: z.string(),
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
    counterparty: '',
    direction: 'lent',
    principal: 0,
    walletId: '',
    dueDate: '',
    description: '',
});

const isEditing = computed(() => !!props.debt);
const isLoading = computed(() => debtStore.isLoading);

const directionOptions = computed(() => [
    { label: t('debts.directions.lent'), value: 'lent' },
    { label: t('debts.directions.borrowed'), value: 'borrowed' },
]);

const walletOptions = computed(() =>
    walletStore.nonGameWallets.map((w: Wallet) => ({ value: w.id, label: w.name })),
);

const currencySymbol = computed(() => {
    const wallet = walletStore.getWalletById(form.walletId);
    const code = wallet?.currency ?? settingsStore.defaultCurrency ?? CurrencyCode.XOF;
    return CURRENCIES[code]?.symbol ?? code;
});

/**
 * Populates the form from an existing debt.
 * @param debt - The debt to edit
 */
function populate(debt: Debt): void {
    form.counterparty = debt.counterparty;
    form.direction = debt.direction;
    form.principal = debt.principal;
    form.walletId = debt.walletId;
    form.dueDate = debt.dueDate ? toDateInput(debt.dueDate) : '';
    form.description = debt.description ?? '';
}

watch(
    () => props.debt,
    (value: Debt | null | undefined) => {
        if (value) populate(value);
        else reset();
    },
    { immediate: true },
);

watch(
    () => props.modelValue,
    (isOpen: boolean) => {
        if (isOpen && !props.debt) reset();
    },
);

/**
 * Closes the dialog.
 */
function close(): void {
    emit('update:modelValue', false);
}

/**
 * Saves the debt. Creating one also records the movement of the principal, so
 * the wallet balance follows immediately — the debt and its money never diverge.
 * @returns Promise resolving when the save completes
 */
async function save(): Promise<void> {
    if (!validate()) return;

    try {
        const dueDate = form.dueDate ? new Date(form.dueDate) : undefined;

        if (isEditing.value && props.debt) {
            const updated = await debtStore.update(props.debt.id, {
                counterparty: form.counterparty,
                dueDate,
                description: form.description || undefined,
            });
            if (!updated) throw new Error('Failed to update debt');
            emit('saved', updated);
        } else {
            const debt = await debtStore.create({
                counterparty: form.counterparty,
                direction: form.direction as DebtDirection,
                walletId: form.walletId,
                dueDate,
                description: form.description || undefined,
            });

            // The principal movement is a real transaction: it is what moves the
            // wallet balance and what the analytics layer reads.
            await transactionStore.create({
                type: 'debt',
                debtTransactionType: 'principal',
                debtId: debt.id,
                amount: form.principal,
                date: new Date(),
                walletId: form.walletId,
                description: form.counterparty,
            });

            emit('saved', debt);
        }

        close();
    } catch (error) {
        console.error('Failed to save debt:', error);
    }
}
</script>
