<template>
    <ModalBase
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="isEditing ? t('goals.editGoal') : t('goals.addGoal')"
        max-width="440px"
    >
        <q-form @submit.prevent="save" class="q-gutter-md">
            <!-- Name -->
            <InputSingle
                v-model="form.name"
                :label="t('goals.name')"
                :error="errors.name"
            />

            <!-- Target amount -->
            <InputNumber
                v-model="form.targetAmount"
                :label="t('goals.target')"
                :suffix="currencySymbol"
                :error="errors.targetAmount"
            />

            <!-- Linked wallet -->
            <q-select
                v-model="form.walletId"
                :options="walletOptions"
                :label="t('goals.wallet')"
                outlined
                dense
                emit-value
                map-options
                :error="!!errors.walletId"
                :error-message="errors.walletId"
            />

            <!-- Deadline -->
            <InputDate v-model="form.deadline" :label="t('goals.deadlineOptional')" />

            <!-- Buttons -->
            <div class="row justify-end q-gutter-sm q-mt-md">
                <BtnLink :label="t('common.cancel')" @click="close" />
                <BtnPrimary :label="t('common.save')" type="submit" :loading="isLoading" />
            </div>
        </q-form>
    </ModalBase>
</template>

<script setup lang="ts">
import { z } from 'zod/v4';
import type { SavingsGoal } from 'src/types/savings-goal';
import type { Wallet } from 'src/types/wallet';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import ModalBase from '../modals/ModalBase.vue';
import InputNumber from '../inputs/InputNumber.vue';
import InputSingle from '../inputs/InputSingle.vue';
import InputDate from '../inputs/InputDate.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useFormValidation } from 'src/composables/useFormValidation';
import { useSavingsGoalStore } from 'src/stores/savings-goal';

const props = defineProps<{
    modelValue: boolean;
    goal?: SavingsGoal | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [goal: SavingsGoal];
}>();

const { t } = useI18n();
const goalStore = useSavingsGoalStore();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();

// Schema
const schema = z.object({
    name: z.string().min(1, t('validation.required')),
    targetAmount: z.number().positive(t('validation.positiveNumber')),
    walletId: z.string().min(1, t('validation.required')),
    deadline: z.string(),
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
    name: '',
    targetAmount: 0,
    walletId: '',
    deadline: '',
});

const isEditing = computed(() => !!props.goal);
const isLoading = computed(() => goalStore.isLoading);

const walletOptions = computed(() =>
    walletStore.nonGameWallets.map((w: Wallet) => ({ value: w.id, label: w.name })),
);

// Currency symbol follows the linked wallet, falling back to the default currency
const currencySymbol = computed(() => {
    const wallet = walletStore.getWalletById(form.walletId);
    const code = wallet?.currency ?? settingsStore.defaultCurrency ?? CurrencyCode.XOF;
    return CURRENCIES[code]?.symbol ?? code;
});

/**
 * Populates the form from an existing goal.
 * @param goal - The goal to edit
 */
function populate(goal: SavingsGoal): void {
    form.name = goal.name;
    form.targetAmount = goal.targetAmount;
    form.walletId = goal.walletId;
    form.deadline = goal.deadline ? toDateInput(goal.deadline) : '';
}

watch(
    () => props.goal,
    (value: SavingsGoal | null | undefined) => {
        if (value) populate(value);
        else reset();
    },
    { immediate: true },
);

watch(
    () => props.modelValue,
    (isOpen: boolean) => {
        if (isOpen && !props.goal) reset();
    },
);

/**
 * Closes the dialog.
 */
function close(): void {
    emit('update:modelValue', false);
}

/**
 * Saves the goal (create or update).
 * @returns Promise that resolves when the save completes
 */
async function save(): Promise<void> {
    if (!validate()) return;

    try {
        const data = {
            name: form.name,
            targetAmount: form.targetAmount,
            walletId: form.walletId,
            deadline: form.deadline ? new Date(form.deadline) : undefined,
        };

        let goal: SavingsGoal;
        if (isEditing.value && props.goal) {
            const updated = await goalStore.update(props.goal.id, data);
            if (!updated) throw new Error('Failed to update goal');
            goal = updated;
        } else {
            goal = await goalStore.create(data);
        }

        emit('saved', goal);
        close();
    } catch (error) {
        console.error('Failed to save goal:', error);
    }
}
</script>
