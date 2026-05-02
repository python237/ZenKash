<template>
    <ModalBase v-model="isOpen" :title="dialogTitle" persistent>
        <q-form @submit.prevent="save" class="q-gutter-md">
            <!-- Income/Expense Form -->
            <template v-if="form.type === 'income' || form.type === 'expense'">
                <!-- Amount -->
                <InputNumber
                    v-model="form.amount"
                    :label="t('common.amount')"
                    :error="getError('amount') ?? ''"
                    :suffix="selectedWalletCurrency"
                    autofocus
                    @blur="touch('amount')"
                />

                <!-- Wallet -->
                <q-select
                    v-model="form.walletId"
                    :options="walletOptions"
                    :label="t('investments.wallet')"
                    :error="!!getError('walletId')"
                    :error-message="getError('walletId')"
                    option-value="value"
                    option-label="label"
                    emit-value
                    map-options
                    outlined
                    dense
                    behavior="dialog"
                    popup-content-class="select-popup-clean"
                    class="select-field"
                    @blur="touch('walletId')"
                >
                    <template #option="{ itemProps, opt }">
                        <q-item v-bind="itemProps">
                            <q-item-section avatar>
                                <q-icon :name="opt.icon" />
                            </q-item-section>
                            <q-item-section>{{ opt.label }}</q-item-section>
                        </q-item>
                    </template>
                    <template #selected-item="{ opt }">
                        <q-icon :name="opt.icon" class="q-mr-sm" />
                        {{ opt.label }}
                    </template>
                </q-select>

                <!-- Category -->
                <q-select
                    v-model="form.categoryId"
                    :options="categoryOptions"
                    :label="t('categories.title')"
                    :error="!!getError('categoryId')"
                    :error-message="getError('categoryId')"
                    option-value="value"
                    option-label="label"
                    emit-value
                    map-options
                    outlined
                    dense
                    behavior="dialog"
                    popup-content-class="select-popup-clean"
                    class="select-field"
                    @blur="touch('categoryId')"
                >
                    <template #option="{ itemProps, opt }">
                        <q-item v-bind="itemProps">
                            <q-item-section avatar>
                                <q-icon :name="opt.icon" :color="opt.color" />
                            </q-item-section>
                            <q-item-section>
                                <q-item-label>{{ opt.label }}</q-item-label>
                                <q-item-label caption>{{ opt.masterCategoryName }}</q-item-label>
                            </q-item-section>
                        </q-item>
                    </template>
                    <template #selected-item="{ opt }">
                        <q-icon :name="opt.icon" :color="opt.color" class="q-mr-sm" />
                        {{ opt.label }}
                    </template>
                </q-select>

                <!-- Date -->
                <InputDate
                    v-model="form.date"
                    :label="t('common.date')"
                    :error="getError('date') ?? ''"
                    @blur="touch('date')"
                />

                <!-- Description -->
                <InputSingle v-model="form.description" :label="t('common.description')" />
            </template>

            <!-- Transfer Form -->
            <template v-else-if="form.type === 'transfer'">
                <!-- Amount -->
                <InputNumber
                    v-model="form.amount"
                    :label="t('common.amount')"
                    :error="getError('amount') ?? ''"
                    :suffix="fromWalletCurrency"
                    autofocus
                    @blur="touch('amount')"
                />

                <!-- From Wallet -->
                <q-select
                    v-model="form.fromWalletId"
                    :options="walletOptions"
                    :label="t('transactions.fromWallet')"
                    :error="!!getError('fromWalletId')"
                    :error-message="getError('fromWalletId')"
                    option-value="value"
                    option-label="label"
                    emit-value
                    map-options
                    outlined
                    dense
                    behavior="dialog"
                    popup-content-class="select-popup-clean"
                    class="select-field"
                    @blur="touch('fromWalletId')"
                >
                    <template #option="{ itemProps, opt }">
                        <q-item v-bind="itemProps">
                            <q-item-section avatar>
                                <q-icon :name="opt.icon" />
                            </q-item-section>
                            <q-item-section>{{ opt.label }}</q-item-section>
                        </q-item>
                    </template>
                    <template #selected-item="{ opt }">
                        <q-icon :name="opt.icon" class="q-mr-sm" />
                        {{ opt.label }}
                    </template>
                </q-select>

                <!-- To Wallet -->
                <q-select
                    v-model="form.toWalletId"
                    :options="toWalletOptions"
                    :label="t('transactions.toWallet')"
                    :error="!!getError('toWalletId')"
                    :error-message="getError('toWalletId')"
                    option-value="value"
                    option-label="label"
                    emit-value
                    map-options
                    outlined
                    dense
                    behavior="dialog"
                    popup-content-class="select-popup-clean"
                    class="select-field"
                    @blur="touch('toWalletId')"
                >
                    <template #option="{ itemProps, opt }">
                        <q-item v-bind="itemProps">
                            <q-item-section avatar>
                                <q-icon :name="opt.icon" />
                            </q-item-section>
                            <q-item-section>{{ opt.label }}</q-item-section>
                        </q-item>
                    </template>
                    <template #selected-item="{ opt }">
                        <q-icon :name="opt.icon" class="q-mr-sm" />
                        {{ opt.label }}
                    </template>
                </q-select>

                <!-- Transfer Fee -->
                <InputNumber
                    v-model="form.fee"
                    :label="t('transactions.transferFee')"
                    :hint="t('transactions.transferFeeHint')"
                    :suffix="fromWalletCurrency"
                    :min="0"
                />

                <!-- Date -->
                <InputDate
                    v-model="form.date"
                    :label="t('common.date')"
                    :error="getError('date') ?? ''"
                    @blur="touch('date')"
                />

                <!-- Description -->
                <InputSingle v-model="form.description" :label="t('common.description')" />
            </template>
        </q-form>

        <template #actions>
            <BtnLink :label="t('common.cancel')" @click="close" />
            <BtnPrimary
                :label="t('common.save')"
                :loading="isLoading"
                :disable="!isFormValid"
                @click="save"
            />
        </template>
    </ModalBase>
</template>

<script setup lang="ts">
import type { Transaction, TransactionType } from 'src/types/transaction';
import type { MasterCategory } from 'src/types/master-category';
import { CategoryType } from 'src/types/master-category';
import ModalBase from '../modals/ModalBase.vue';
import InputSingle from '../inputs/InputSingle.vue';
import InputNumber from '../inputs/InputNumber.vue';
import InputDate from '../inputs/InputDate.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';

const props = defineProps<{
    modelValue: boolean;
    transaction?: Transaction | null;
    initialType?: TransactionType;
    duplicateFrom?: Transaction | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [transaction: Transaction];
}>();

const { t } = useI18n();
const transactionStore = useTransactionStore();
const walletStore = useWalletStore();
const categoryStore = useCategoryStore();
const masterCategoryStore = useMasterCategoryStore();

/**
 * Gets today's date as a local date string (YYYY-MM-DD).
 * Uses local timezone instead of UTC to avoid midnight issues.
 * @param date - Optional date to convert, defaults to now
 * @returns The date string in YYYY-MM-DD format
 */
function getLocalDateString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Form state
const form = reactive<{
    type: TransactionType;
    amount: number;
    date: string;
    description: string;
    walletId: string;
    categoryId: string;
    fromWalletId: string;
    toWalletId: string;
    fee: number;
}>({
    type: 'expense',
    amount: 0,
    date: getLocalDateString(),
    description: '',
    walletId: '',
    categoryId: '',
    fromWalletId: '',
    toWalletId: '',
    fee: 0,
});

// Manual form validation
const errors = ref<Record<string, string>>({});
const touched = ref<Record<string, boolean>>({});

/**
 * Gets the validation error message for a form field if it has been touched.
 * @param field - The name of the form field to check
 * @returns The error message if the field has been touched and has an error, otherwise undefined
 */
function getError(field: string): string | undefined {
    return touched.value[field] ? errors.value[field] : undefined;
}

/**
 * Marks a form field as touched to enable error display.
 * @param field - The name of the form field to mark as touched
 */
function touch(field: string): void {
    touched.value[field] = true;
}

/**
 * Validates the form fields based on the transaction type.
 * Sets error messages for invalid fields.
 * @returns True if the form is valid, false otherwise
 */
function validate(): boolean {
    errors.value = {};

    if (form.amount <= 0) {
        errors.value.amount = t('validation.positiveNumber');
    }
    if (!form.date) {
        errors.value.date = t('validation.required');
    }

    if (form.type === 'income' || form.type === 'expense') {
        if (!form.walletId) errors.value.walletId = t('validation.required');
        if (!form.categoryId) errors.value.categoryId = t('validation.required');
    } else if (form.type === 'transfer') {
        if (!form.fromWalletId) errors.value.fromWalletId = t('validation.required');
        if (!form.toWalletId) errors.value.toWalletId = t('validation.required');
    }

    return Object.keys(errors.value).length === 0;
}

// Dialog state
const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
});

const isEditing = computed(() => !!props.transaction);
const isLoading = computed(() => transactionStore.isLoading);

// Dialog title
const dialogTitle = computed(() => {
    if (isEditing.value) {
        return t('transactions.editTransaction');
    }
    switch (form.type) {
        case 'income':
            return t('transactions.addIncome');
        case 'expense':
            return t('transactions.addExpense');
        case 'transfer':
            return t('transactions.addTransfer');
        default:
            return t('transactions.addTransaction');
    }
});

// Form validity
const isFormValid = computed(() => {
    if (form.amount <= 0) return false;
    if (!form.date) return false;

    switch (form.type) {
        case 'income':
        case 'expense':
            return !!form.walletId && !!form.categoryId;
        case 'transfer':
            return (
                !!form.fromWalletId && !!form.toWalletId && form.fromWalletId !== form.toWalletId
            );
        default:
            return false;
    }
});

// Wallet options
const walletOptions = computed(() => {
    return walletStore.wallets.map((w) => ({
        value: w.id,
        label: w.name,
        icon: w.icon,
        currency: w.currency,
    }));
});

// To wallet options (exclude from wallet for transfers)
const toWalletOptions = computed(() => {
    return walletOptions.value.filter((w) => w.value !== form.fromWalletId);
});

// Category options (filtered by transaction type)
const categoryOptions = computed(() => {
    const categoryType = form.type === 'income' ? CategoryType.Income : CategoryType.Expense;
    const filteredMasterCategories = masterCategoryStore.masterCategories.filter(
        (mc: MasterCategory) => mc.type === categoryType,
    );

    return categoryStore.categories
        .filter((c) =>
            filteredMasterCategories.some((mc: MasterCategory) => mc.id === c.masterCategoryId),
        )
        .map((c) => {
            const masterCategory = masterCategoryStore.getMasterCategoryById(c.masterCategoryId);
            return {
                value: c.id,
                label: c.name,
                icon: c.icon,
                color: masterCategory?.color ?? 'grey',
                masterCategoryName: masterCategory?.name ?? '',
            };
        });
});

// Selected wallet currency
const selectedWalletCurrency = computed(() => {
    const wallet = walletStore.getWalletById(form.walletId);
    return wallet?.currency ?? '';
});

// From wallet currency (for transfers)
const fromWalletCurrency = computed(() => {
    const wallet = walletStore.getWalletById(form.fromWalletId);
    return wallet?.currency ?? '';
});

// Reset form when dialog opens
watch(
    () => props.modelValue,
    (open: boolean) => {
        if (open) {
            // Reset touched state
            touched.value = {};
            errors.value = {};

            if (props.transaction) {
                // Editing existing transaction
                form.type = props.transaction.type;
                form.amount = props.transaction.amount;
                form.date = getLocalDateString(props.transaction.date);
                form.description = props.transaction.description ?? '';

                if (props.transaction.type === 'income' || props.transaction.type === 'expense') {
                    form.walletId = props.transaction.walletId;
                    form.categoryId = props.transaction.categoryId;
                } else if (props.transaction.type === 'transfer') {
                    form.fromWalletId = props.transaction.fromWalletId;
                    form.toWalletId = props.transaction.toWalletId;
                    form.fee = props.transaction.fee ?? 0;
                }
            } else if (props.duplicateFrom) {
                // Duplicating transaction (same data, today's date)
                const source = props.duplicateFrom;
                form.type = source.type;
                form.amount = source.amount;
                form.date = getLocalDateString(); // Today's date
                form.description = source.description ?? '';

                if (source.type === 'income' || source.type === 'expense') {
                    form.walletId = source.walletId;
                    form.categoryId = source.categoryId;
                } else if (source.type === 'transfer') {
                    form.fromWalletId = source.fromWalletId;
                    form.toWalletId = source.toWalletId;
                    form.fee = source.fee ?? 0;
                }
            } else {
                // Creating new transaction
                form.type = props.initialType ?? 'expense';
                form.amount = 0;
                form.date = getLocalDateString();
                form.description = '';
                form.walletId = walletStore.wallets[0]?.id ?? '';
                form.categoryId = '';
                form.fromWalletId = walletStore.wallets[0]?.id ?? '';
                form.toWalletId = walletStore.wallets[1]?.id ?? '';
                form.fee = 0;
            }
        }
    },
);

// Reset category when type changes (income/expense)
watch(
    () => form.type,
    () => {
        if (!isEditing.value) {
            form.categoryId = '';
        }
    },
);

/**
 * Closes the transaction dialog by setting the open state to false.
 */
function close(): void {
    isOpen.value = false;
}

/**
 * Saves the transaction to the store.
 * Creates a new transaction or updates an existing one based on edit mode.
 * Emits 'saved' event on success and closes the dialog.
 */
async function save(): Promise<void> {
    if (!validate()) return;

    try {
        let transaction: Transaction;
        const date = new Date(form.date);

        if (isEditing.value && props.transaction) {
            // Update existing
            const updateData: Parameters<typeof transactionStore.update>[1] = {
                amount: form.amount,
                date,
            };
            if (form.description) updateData.description = form.description;
            if (form.walletId) updateData.walletId = form.walletId;
            if (form.categoryId) updateData.categoryId = form.categoryId;
            if (form.fromWalletId) updateData.fromWalletId = form.fromWalletId;
            if (form.toWalletId) updateData.toWalletId = form.toWalletId;
            if (form.fee) updateData.fee = form.fee;

            const result = await transactionStore.update(props.transaction.id, updateData);
            if (!result) return;
            transaction = result;
        } else {
            // Create new
            switch (form.type) {
                case 'income':
                    transaction = await transactionStore.create({
                        type: 'income',
                        amount: form.amount,
                        date,
                        walletId: form.walletId,
                        categoryId: form.categoryId,
                        ...(form.description && { description: form.description }),
                    });
                    break;
                case 'expense':
                    transaction = await transactionStore.create({
                        type: 'expense',
                        amount: form.amount,
                        date,
                        walletId: form.walletId,
                        categoryId: form.categoryId,
                        ...(form.description && { description: form.description }),
                    });
                    break;
                case 'transfer':
                    transaction = await transactionStore.create({
                        type: 'transfer',
                        amount: form.amount,
                        date,
                        fromWalletId: form.fromWalletId,
                        toWalletId: form.toWalletId,
                        ...(form.fee && { fee: form.fee }),
                        ...(form.description && { description: form.description }),
                    });
                    break;
                default:
                    return;
            }
        }

        emit('saved', transaction);
        close();
    } catch (error) {
        console.error('Failed to save transaction:', error);
    }
}
</script>

<style lang="scss" scoped>
.select-field {
    :deep(.q-field__control) {
        border-radius: 10px;
        height: 48px;
    }

    :deep(.q-field__control:before) {
        border-color: $border-color;
    }

    :deep(.q-field__control:hover:before) {
        border-color: $primary;
    }
}
</style>
