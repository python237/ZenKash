<template>
    <ModalBase
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="isEditing ? t('budgets.editBudget') : t('budgets.addBudget')"
        size="md"
    >
        <q-form @submit.prevent="save" class="q-gutter-md">
            <!-- Category -->
            <q-select
                v-model="form.categoryId"
                :options="categoryOptions"
                :label="t('categories.category')"
                outlined
                emit-value
                map-options
                :error="!!errors.categoryId"
                :error-message="errors.categoryId"
            />

            <!-- Amount -->
            <InputNumber
                v-model="form.amount"
                :label="t('common.amount')"
                :suffix="currencySymbol"
                :error="errors.amount"
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
import type { Budget } from 'src/types/budget';
import { CategoryType, type MasterCategory } from 'src/types/master-category';
import type { Category } from 'src/types/category';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import ModalBase from '../modals/ModalBase.vue';
import InputNumber from '../inputs/InputNumber.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useFormValidation } from 'src/composables/useFormValidation';
import { useBudgetStore } from 'src/stores/budget';

const props = defineProps<{
    modelValue: boolean;
    budget?: Budget | null;
    month: string; // Format: "2024-01"
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [budget: Budget];
}>();

const { t } = useI18n();
const budgetStore = useBudgetStore();
const categoryStore = useCategoryStore();
const masterCategoryStore = useMasterCategoryStore();
const settingsStore = useSettingsStore();

// Schema
const schema = z.object({
    categoryId: z.string().min(1, t('validation.required')),
    amount: z.number().positive(t('validation.positiveNumber')),
});

const { form, errors, validate, reset } = useFormValidation(schema, {
    categoryId: '',
    amount: 0,
});

const isEditing = computed(() => !!props.budget);
const isLoading = computed(() => budgetStore.isLoading);

// Currency
const currencyCode = computed(() => settingsStore.defaultCurrency ?? CurrencyCode.XOF);
const currencySymbol = computed(() => {
    const code = currencyCode.value;
    return CURRENCIES[code]?.symbol ?? code;
});

// Category options (only expense categories)
const categoryOptions = computed(() => {
    // Get all expense master category IDs
    const expenseMasterCategoryIds = masterCategoryStore.masterCategories
        .filter((mc: MasterCategory) => mc.type === CategoryType.Expense)
        .map((mc: MasterCategory) => mc.id);

    // Get all categories that belong to expense master categories
    return categoryStore.categories
        .filter((c: Category) => expenseMasterCategoryIds.includes(c.masterCategoryId))
        .map((c: Category) => ({
            value: c.id,
            label: c.name,
        }));
});

// Watch for budget changes (editing)
watch(
    () => props.budget,
    (newBudget: Budget | null | undefined) => {
        if (newBudget) {
            form.categoryId = newBudget.categoryId ?? '';
            form.amount = newBudget.amount;
        } else {
            reset();
        }
    },
    { immediate: true },
);

// Watch dialog open
watch(
    () => props.modelValue,
    (isOpen: boolean) => {
        if (isOpen && !props.budget) {
            reset();
        }
    },
);

/**
 * Closes the budget dialog by emitting update:modelValue with false
 */
function close(): void {
    emit('update:modelValue', false);
}

/**
 * Saves the budget to the database (creates or updates based on editing state)
 * @returns Promise that resolves when save is complete
 */
async function save(): Promise<void> {
    if (!validate()) return;

    try {
        let budget: Budget;

        const data = {
            month: props.month,
            categoryId: form.categoryId,
            amount: form.amount,
        };

        if (isEditing.value && props.budget) {
            const updated = await budgetStore.update(props.budget.id, data);
            if (!updated) throw new Error('Failed to update budget');
            budget = updated;
        } else {
            budget = await budgetStore.create(data);
        }

        emit('saved', budget);
        close();
    } catch (error) {
        console.error('Failed to save budget:', error);
    }
}
</script>
