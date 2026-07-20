<template>
    <ModalBase
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="isEditing ? t('recurring.editRecurring') : t('recurring.addRecurring')"
        max-width="460px"
    >
        <q-form @submit.prevent="save" class="q-gutter-md">
            <!-- Type -->
            <q-btn-toggle
                v-model="form.type"
                spread
                no-caps
                unelevated
                toggle-color="primary"
                color="grey-2"
                text-color="grey-8"
                :options="typeOptions"
                @update:model-value="onTypeChange"
            />

            <!-- Amount -->
            <InputNumber
                v-model="form.amount"
                :label="t('common.amount')"
                :suffix="currencySymbol"
                :error="errors.amount"
            />

            <!-- Category -->
            <q-select
                v-model="form.categoryId"
                :options="categoryOptions"
                :label="t('categories.category')"
                outlined
                dense
                emit-value
                map-options
                :error="!!errors.categoryId"
                :error-message="errors.categoryId"
            />

            <!-- Wallet -->
            <q-select
                v-model="form.walletId"
                :options="walletOptions"
                :label="t('investments.wallet')"
                outlined
                dense
                emit-value
                map-options
                :error="!!errors.walletId"
                :error-message="errors.walletId"
            />

            <!-- Frequency -->
            <q-select
                v-model="form.frequency"
                :options="frequencyOptions"
                :label="t('recurring.frequency')"
                outlined
                dense
                emit-value
                map-options
            />

            <div class="row recurring-row">
                <!-- Interval -->
                <div class="col">
                    <InputNumber
                        v-model="form.intervalCount"
                        :label="t('recurring.interval')"
                        :min="1"
                    />
                </div>
                <!-- Day of month -->
                <div v-if="form.frequency === 'monthly'" class="col">
                    <InputNumber
                        v-model="form.dayOfMonth"
                        :label="t('recurring.dayOfMonth')"
                        :min="1"
                        :max="31"
                    />
                </div>
            </div>

            <div class="row recurring-row">
                <!-- Start date -->
                <div class="col">
                    <InputDate
                        v-model="form.startDate"
                        :label="t('recurring.startDate')"
                        :error="errors.startDate"
                    />
                </div>
                <!-- End date -->
                <div class="col">
                    <InputDate v-model="form.endDate" :label="t('recurring.endDateOptional')" />
                </div>
            </div>

            <!-- Description -->
            <InputSingle v-model="form.description" :label="t('common.description')" />

            <!-- Auto-post -->
            <q-item tag="label" class="q-px-none">
                <q-item-section>
                    <q-item-label>{{ t('recurring.autoPost') }}</q-item-label>
                    <q-item-label caption>{{ t('recurring.autoPostHint') }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                    <q-toggle v-model="form.autoPost" color="primary" />
                </q-item-section>
            </q-item>

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
import type { RecurringTransaction } from 'src/types/recurring-transaction';
import { CategoryType, type MasterCategory } from 'src/types/master-category';
import type { Category } from 'src/types/category';
import type { Wallet } from 'src/types/wallet';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import ModalBase from '../modals/ModalBase.vue';
import InputNumber from '../inputs/InputNumber.vue';
import InputDate from '../inputs/InputDate.vue';
import InputSingle from '../inputs/InputSingle.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useFormValidation } from 'src/composables/useFormValidation';
import { useRecurringTransactionStore } from 'src/stores/recurring-transaction';

const props = defineProps<{
    modelValue: boolean;
    recurring?: RecurringTransaction | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [recurring: RecurringTransaction];
}>();

const { t } = useI18n();
const recurringStore = useRecurringTransactionStore();
const categoryStore = useCategoryStore();
const masterCategoryStore = useMasterCategoryStore();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();

// Schema
const schema = z.object({
    type: z.enum(['income', 'expense']),
    amount: z.number().positive(t('validation.positiveNumber')),
    categoryId: z.string().min(1, t('validation.required')),
    walletId: z.string().min(1, t('validation.required')),
    frequency: z.enum(['weekly', 'monthly', 'yearly']),
    intervalCount: z.number().positive(t('validation.positiveNumber')),
    dayOfMonth: z.number(),
    startDate: z.string().min(1, t('validation.required')),
    endDate: z.string(),
    description: z.string(),
    autoPost: z.boolean(),
});

const today = new Date();

/**
 * Formats a Date as a YYYY-MM-DD string for the date input.
 * @param d - The date to format
 * @returns The formatted date string
 */
function toDateInput(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const { form, errors, validate, reset } = useFormValidation(schema, {
    type: 'expense',
    amount: 0,
    categoryId: '',
    walletId: '',
    frequency: 'monthly',
    intervalCount: 1,
    dayOfMonth: today.getDate(),
    startDate: toDateInput(today),
    endDate: '',
    description: '',
    autoPost: true,
});

const isEditing = computed(() => !!props.recurring);
const isLoading = computed(() => recurringStore.isLoading);

// Currency symbol
const currencySymbol = computed(() => {
    const code = settingsStore.defaultCurrency ?? CurrencyCode.XOF;
    return CURRENCIES[code]?.symbol ?? code;
});

// Options
const typeOptions = computed(() => [
    { label: t('transactions.income'), value: 'income' },
    { label: t('transactions.expense'), value: 'expense' },
]);

const frequencyOptions = computed(() => [
    { label: t('recurring.weekly'), value: 'weekly' },
    { label: t('recurring.monthly'), value: 'monthly' },
    { label: t('recurring.yearly'), value: 'yearly' },
]);

const categoryOptions = computed(() => {
    const wantType = form.type === 'income' ? CategoryType.Income : CategoryType.Expense;
    const masterIds = masterCategoryStore.masterCategories
        .filter((mc: MasterCategory) => mc.type === wantType)
        .map((mc: MasterCategory) => mc.id);
    return categoryStore.categories
        .filter((c: Category) => masterIds.includes(c.masterCategoryId))
        .map((c: Category) => ({ value: c.id, label: c.name }));
});

const walletOptions = computed(() =>
    walletStore.nonGameWallets.map((w: Wallet) => ({ value: w.id, label: w.name })),
);

/**
 * Resets the selected category when the transaction type changes,
 * since the available categories differ per type.
 */
function onTypeChange(): void {
    form.categoryId = '';
}

/**
 * Populates the form from an existing recurring rule.
 * @param recurring - The recurring rule to edit
 */
function populate(recurring: RecurringTransaction): void {
    form.type = recurring.type;
    form.amount = recurring.amount;
    form.categoryId = recurring.categoryId;
    form.walletId = recurring.walletId;
    form.frequency = recurring.frequency;
    form.intervalCount = recurring.intervalCount;
    form.dayOfMonth = recurring.dayOfMonth ?? new Date(recurring.startDate).getDate();
    form.startDate = toDateInput(recurring.startDate);
    form.endDate = recurring.endDate ? toDateInput(recurring.endDate) : '';
    form.description = recurring.description ?? '';
    form.autoPost = recurring.autoPost;
}

watch(
    () => props.recurring,
    (value: RecurringTransaction | null | undefined) => {
        if (value) populate(value);
        else reset({ startDate: toDateInput(new Date()), dayOfMonth: new Date().getDate() });
    },
    { immediate: true },
);

watch(
    () => props.modelValue,
    (isOpen: boolean) => {
        if (isOpen && !props.recurring) {
            reset({ startDate: toDateInput(new Date()), dayOfMonth: new Date().getDate() });
        }
    },
);

/**
 * Closes the dialog.
 */
function close(): void {
    emit('update:modelValue', false);
}

/**
 * Saves the recurring rule (create or update).
 * @returns Promise that resolves when the save completes
 */
async function save(): Promise<void> {
    if (!validate()) return;

    try {
        const data = {
            type: form.type,
            amount: form.amount,
            categoryId: form.categoryId,
            walletId: form.walletId,
            description: form.description || undefined,
            frequency: form.frequency,
            intervalCount: form.intervalCount,
            dayOfMonth: form.frequency === 'monthly' ? form.dayOfMonth : undefined,
            startDate: new Date(form.startDate),
            endDate: form.endDate ? new Date(form.endDate) : undefined,
            autoPost: form.autoPost,
        };

        let recurring: RecurringTransaction;
        if (isEditing.value && props.recurring) {
            const updated = await recurringStore.update(props.recurring.id, data);
            if (!updated) throw new Error('Failed to update recurring transaction');
            recurring = updated;
        } else {
            recurring = await recurringStore.create(data);
        }

        emit('saved', recurring);
        close();
    } catch (error) {
        console.error('Failed to save recurring transaction:', error);
    }
}
</script>

<style lang="scss" scoped>
.recurring-row {
    gap: 16px;
    flex-wrap: nowrap;
}
</style>
