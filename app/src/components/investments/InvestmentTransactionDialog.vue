<template>
    <ModalBase
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="transactionType === 'buy' ? t('investments.buy') : t('investments.sell')"
        size="md"
    >
        <q-form @submit.prevent="save" class="q-gutter-md">
            <!-- Wallet info (read-only) -->
            <InputSingle
                :model-value="walletName"
                :label="t('investments.wallet')"
                readonly
                disable
            >
                <template #append>
                    <q-icon name="lock" size="18px" color="grey-5" />
                </template>
            </InputSingle>

            <!-- Available balance for buy / Available quantity for sell -->
            <q-banner v-if="transactionType === 'buy'" dense class="bg-blue-1 text-blue-9">
                <template #avatar>
                    <q-icon name="account_balance_wallet" />
                </template>
                {{ t('investments.availableBalance') }}: {{ formattedAvailableBalance }}
            </q-banner>

            <!-- Quantity -->
            <InputNumber
                v-model="form.quantity"
                :label="t('investments.quantity')"
                :step="0.0001"
                :error="errors.quantity"
                :hint="
                    transactionType === 'sell'
                        ? `${t('investments.available')}: ${availableQuantity}`
                        : undefined
                "
            />

            <!-- Price per unit -->
            <InputNumber
                v-model="form.pricePerUnit"
                :label="t('investments.pricePerUnit')"
                :step="0.01"
                :suffix="currencySymbol"
                :error="errors.pricePerUnit"
            />

            <!-- Total (calculated) -->
            <InputSingle
                :model-value="formattedTotal"
                :label="t('investments.total')"
                readonly
                disable
            />

            <!-- Date -->
            <InputDate
                v-model="form.date"
                :label="t('common.date')"
                :close-label="t('common.close')"
                :error="errors.date"
            />

            <!-- Buttons -->
            <div class="row justify-end q-gutter-sm q-mt-lg">
                <BtnLink :label="t('common.cancel')" @click="close" />
                <BtnPrimary
                    :label="
                        transactionType === 'buy' ? t('investments.buy') : t('investments.sell')
                    "
                    type="submit"
                    :loading="isLoading"
                    :color="transactionType === 'buy' ? 'positive' : 'negative'"
                />
            </div>
        </q-form>
    </ModalBase>
</template>

<script setup lang="ts">
import { z } from 'zod/v4';
import type {
    InvestmentItem,
    InvestmentTransaction,
    InvestmentTransactionType,
} from 'src/types/investment';
import { CURRENCIES } from 'src/types/currency';
import ModalBase from '../modals/ModalBase.vue';
import InputSingle from '../inputs/InputSingle.vue';
import InputNumber from '../inputs/InputNumber.vue';
import InputDate from '../inputs/InputDate.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useFormValidation } from 'src/composables/useFormValidation';
import { useInvestmentStore } from 'src/stores/investment';
import { useWalletStore } from 'src/stores/wallet';

const props = defineProps<{
    modelValue: boolean;
    investment: InvestmentItem;
    transactionType: InvestmentTransactionType;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [transaction: InvestmentTransaction];
}>();

const { t } = useI18n();
const investmentStore = useInvestmentStore();
const walletStore = useWalletStore();

/**
 * Gets today's date as a local date string (YYYY-MM-DD).
 * @param date - Optional date, defaults to now
 * @returns The date string in YYYY-MM-DD format
 */
function getLocalDateString(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parses a date string (YYYY-MM-DD) and combines it with the current time.
 * @param dateString - The date string in YYYY-MM-DD format
 * @returns A Date object with the parsed date and current time
 */
function parseDateWithTime(dateString: string): Date {
    const parts = dateString.split('-').map(Number);
    const year = parts[0] ?? new Date().getFullYear();
    const month = parts[1] ?? 1;
    const day = parts[2] ?? 1;
    const now = new Date();
    return new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
}

// Computed transaction type from props
const transactionType = computed(() => props.transactionType);

// Schema (no walletId needed - uses investment's wallet)
const schema = z.object({
    quantity: z.number().positive(t('validation.positiveNumber')),
    pricePerUnit: z.number().positive(t('validation.positiveNumber')),
    date: z.string().min(1, t('validation.required')),
});

const { form, errors, validate, reset } = useFormValidation(schema, {
    quantity: 0,
    pricePerUnit: props.investment?.currentRate ?? 0,
    date: getLocalDateString(),
});

const isLoading = computed(() => investmentStore.isLoading);

// Wallet info
const wallet = computed(() => {
    if (!props.investment) return null;
    return walletStore.wallets.find((w: { id: string }) => w.id === props.investment.walletId);
});

const walletName = computed(() => wallet.value?.name ?? '-');

// Available balance for buying (wallet balance)
const availableBalance = computed(() => {
    if (!wallet.value) return 0;
    // Use the actual wallet balance
    return wallet.value.balance;
});

const formattedAvailableBalance = computed(() => {
    if (!props.investment) return '0';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: props.investment.currency,
    }).format(availableBalance.value);
});

// Available quantity for selling
const availableQuantity = computed(() => props.investment?.quantity ?? 0);

// Currency symbol
const currencySymbol = computed(() => {
    if (!props.investment) return '';
    return CURRENCIES[props.investment.currency]?.symbol ?? props.investment.currency;
});

// Calculated total
const total = computed(() => form.quantity * form.pricePerUnit);

const formattedTotal = computed(() => {
    if (!props.investment) return '0';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: props.investment.currency,
    }).format(total.value);
});

// Reset form when dialog opens
watch(
    () => props.modelValue,
    (open: boolean) => {
        if (open) {
            reset({
                quantity: 0,
                pricePerUnit: props.investment?.currentRate ?? 0,
                date: getLocalDateString(),
            });
        }
    },
);

// Load wallets
onMounted(async () => {
    await walletStore.loadAll();
});

/**
 * Closes the transaction dialog by emitting update:modelValue with false
 */
function close(): void {
    emit('update:modelValue', false);
}

/**
 * Saves the investment transaction (buy or sell) to the database
 * Validates quantity against available stock (for sell) or wallet balance (for buy)
 * @returns Promise that resolves when save is complete
 */
async function save(): Promise<void> {
    if (!validate()) return;

    const transactionTotal = form.quantity * form.pricePerUnit;

    // Check sell quantity
    if (transactionType.value === 'sell' && form.quantity > availableQuantity.value) {
        errors.value.quantity = t('investments.insufficientQuantity');
        return;
    }

    // Check buy balance (available balance must be >= transaction total)
    // Note: availableBalance is typically negative (money spent) or positive (money from sales)
    // For a buy to succeed, we need: walletBalance + availableBalance >= transactionTotal
    // TODO: Integrate with actual wallet balance when transactions module is ready
    if (transactionType.value === 'buy' && availableBalance.value < transactionTotal) {
        errors.value.quantity = t('investments.insufficientBalance');
        return;
    }

    try {
        const transaction = await investmentStore.addTransaction({
            investmentItemId: props.investment.id,
            type: transactionType.value,
            quantity: form.quantity,
            pricePerUnit: form.pricePerUnit,
            date: parseDateWithTime(form.date),
        });

        emit('saved', transaction);
        close();
    } catch (error) {
        console.error('Failed to save transaction:', error);
    }
}
</script>
