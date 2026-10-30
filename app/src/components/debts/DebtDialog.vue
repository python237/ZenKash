<template>
    <ModalBase
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="isEditing ? t('debts.editDebt') : t('debts.addDebt')"
        max-width="440px"
    >
        <q-form @submit.prevent="save" class="debt-form">
            <!-- Direction: fixed once movements exist against the debt -->
            <template v-if="!isEditing">
                <div class="direction-switch" role="tablist" :aria-label="t('debts.direction')">
                    <button
                        v-for="option in directionOptions"
                        :key="option.value"
                        type="button"
                        role="tab"
                        class="direction-switch__btn"
                        :class="{
                            'direction-switch__btn--active': form.direction === option.value,
                        }"
                        :aria-selected="form.direction === option.value"
                        @click="form.direction = option.value"
                    >
                        {{ option.label }}
                    </button>
                </div>
                <p class="direction-hint">{{ t(`debts.directionHint.${form.direction}`) }}</p>
            </template>

            <label class="field">
                <span class="field__label">{{ t('debts.counterparty') }}</span>
                <InputSingle
                    v-model="form.counterparty"
                    :placeholder="t('debts.counterpartyPlaceholder')"
                    :error="errors.counterparty"
                />
            </label>

            <label class="field">
                <span class="field__label">{{ t('debts.principal') }}</span>
                <InputNumber
                    v-model="form.principal"
                    class="amount-field"
                    :suffix="currencySymbol"
                    :error="errors.principal"
                    :disable="isEditing"
                    :hint="isEditing ? t('debts.principalLocked') : ''"
                />
            </label>

            <label class="field">
                <span class="field__label">
                    {{ t(`debts.walletLabel.${form.direction}`) }}
                </span>
                <q-select
                    v-model="form.walletId"
                    :options="walletOptions"
                    outlined
                    emit-value
                    map-options
                    behavior="dialog"
                    popup-content-class="select-popup-clean"
                    :disable="isEditing"
                    :error="!!errors.walletId"
                    :error-message="errors.walletId"
                />
            </label>

            <div class="field-row">
                <InputDate v-model="form.dueDate" :label="t('debts.dueDateOptional')" />
                <InputSingle
                    v-model="form.description"
                    :label="t('common.description')"
                    :error="errors.description"
                />
            </div>

            <div v-if="saveError" class="save-error text-caption">
                <q-icon name="error" size="16px" /> {{ saveError }}
            </div>
        </q-form>

        <template #actions>
            <BtnError
                v-if="isEditing && debt"
                :label="t('common.delete')"
                @click="$emit('delete', debt)"
            />
            <BtnPrimary :label="t('common.save')" :loading="isLoading" @click="save" />
        </template>
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
import BtnError from '../buttons/BtnError.vue';
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
    delete: [debt: Debt];
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

/** Message shown when the save could not be completed. */
const saveError = ref('');

const isEditing = computed(() => !!props.debt);
const isLoading = computed(() => debtStore.isLoading);

const directionOptions = computed((): { label: string; value: DebtDirection }[] => [
    { label: t('debts.directionChoice.lent'), value: 'lent' },
    { label: t('debts.directionChoice.borrowed'), value: 'borrowed' },
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
        saveError.value = '';
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
    saveError.value = '';

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
            // wallet balance and what sets the debt's principal. If it fails, the
            // debt must not survive on its own — it would sit in the list at 0.
            try {
                await transactionStore.create({
                    type: 'debt',
                    debtTransactionType: 'principal',
                    debtId: debt.id,
                    amount: form.principal,
                    date: new Date(),
                    walletId: form.walletId,
                    description: form.counterparty,
                });
            } catch (error) {
                await debtStore.remove(debt.id);
                throw error;
            }

            emit('saved', debt);
        }

        close();
    } catch (error) {
        console.error('Failed to save debt:', error);
        saveError.value = t('messages.error');
    }
}
</script>

<style lang="scss" scoped>
.debt-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.direction-switch {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    padding: 4px;
    border-radius: $radius-control;
    background: $bg-page;

    &__btn {
        height: 40px;
        border: 0;
        border-radius: 11px;
        background: transparent;
        color: $text-secondary;
        font-family: inherit;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;

        &--active {
            background: $bg-card;
            color: $text-primary;
            box-shadow: 0 1px 3px rgba(18, 26, 23, 0.12);
        }
    }
}

.direction-hint {
    margin: -4px 0 0;
    font-size: 13px;
    line-height: 1.5;
    color: $text-secondary;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 6px;

    &__label {
        font-size: 12px;
        font-weight: 600;
        color: $text-secondary;
    }

    :deep(.q-field--with-bottom) {
        padding-bottom: 0;
    }
}

.amount-field :deep(.q-field__native) {
    font-size: 18px;
    font-weight: 700;
}

.field-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.save-error {
    color: $negative;
}
</style>
