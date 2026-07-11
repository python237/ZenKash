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
                :label="direction === 'withdraw' ? t('games.withdrawAmount') : t('common.amount')"
                :suffix="currencySymbol"
                :hint="direction === 'withdraw' ? netReceivedHint : ''"
                :error="errors.amount"
                autofocus
            />

            <!-- Counterpart wallet (non-game) -->
            <q-select
                v-model="form.walletId"
                :options="walletOptions"
                :label="
                    direction === 'deposit'
                        ? t('transactions.fromWallet')
                        : t('transactions.toWallet')
                "
                outlined
                emit-value
                map-options
                :error="!!errors.walletId"
                :error-message="errors.walletId"
            />

            <!-- Fee -->
            <InputNumber
                v-model="form.fee"
                :label="t('transactions.transferFee')"
                :hint="t('transactions.transferFeeHint')"
                :suffix="currencySymbol"
                :min="0"
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
import type { Game } from 'src/types/game';
import type { Transaction } from 'src/types/transaction';
import type { Wallet } from 'src/types/wallet';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import ModalBase from '../modals/ModalBase.vue';
import InputNumber from '../inputs/InputNumber.vue';
import InputDate from '../inputs/InputDate.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useFormValidation } from 'src/composables/useFormValidation';

const props = defineProps<{
    modelValue: boolean;
    game: Game;
    direction: 'deposit' | 'withdraw';
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

// Schema
const schema = z.object({
    amount: z.number().positive(t('validation.positiveNumber')),
    walletId: z.string().min(1, t('validation.required')),
    fee: z.number().min(0),
    date: z.string().min(1, t('validation.required')),
    description: z.string().optional(),
});

const { form, errors, validate, reset } = useFormValidation(schema, {
    amount: 0,
    walletId: '',
    fee: 0,
    date: getLocalDateString(),
    description: '',
});

const isLoading = computed(() => transactionStore.isLoading);

const dialogTitle = computed(() =>
    props.direction === 'deposit' ? t('games.deposit') : t('games.withdraw'),
);

// For withdrawals, show how much the destination wallet will actually receive (amount - fee)
const netReceivedHint = computed(() => {
    const net = Math.max(0, form.amount - form.fee);
    return t('games.netReceived', { amount: `${net} ${currencySymbol.value}` });
});

// Currency
const currencyCode = computed(() => settingsStore.defaultCurrency ?? CurrencyCode.XOF);
const currencySymbol = computed(() => CURRENCIES[currencyCode.value]?.symbol ?? currencyCode.value);

// Only non-game wallets can be the counterpart (guaranteed liquidity)
const walletOptions = computed(() =>
    walletStore.nonGameWallets.map((w: Wallet) => ({ value: w.id, label: w.name })),
);

// Watch dialog open
watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) {
            reset();
            if (walletOptions.value.length > 0) {
                form.walletId = walletOptions.value[0]?.value ?? '';
            }
        }
    },
);

/**
 * Closes the transfer dialog by emitting the update:modelValue event with false.
 */
function close() {
    emit('update:modelValue', false);
}

/**
 * Records the deposit/withdrawal as a regular transfer between the game wallet
 * and the selected non-game wallet.
 * @returns {Promise<void>} Resolves when the operation completes.
 */
async function save() {
    if (!validate()) return;

    const fromWalletId = props.direction === 'deposit' ? form.walletId : props.game.walletId;
    const toWalletId = props.direction === 'deposit' ? props.game.walletId : form.walletId;

    // The transfer store computes: source -= amount + fee, destination += amount.
    // - deposit: amount = full amount, fee = fee. Source (non-game) loses amount + fee,
    //   the game is credited the amount.
    // - withdrawal: amount = net (amount - fee), fee = fee. The game (source) is debited the
    //   full amount (net + fee), the destination receives only the net (amount - fee).
    //   The stored fee only affects the wallet balance here; report calculations use the net
    //   `amount` for game transfers and never re-apply the fee.
    if (props.direction === 'withdraw' && form.fee >= form.amount) {
        errors.value.amount = t('games.withdrawFeeTooHigh');
        return;
    }

    const transferAmount =
        props.direction === 'withdraw' ? form.amount - form.fee : form.amount;

    try {
        const transaction = await transactionStore.create({
            type: 'transfer',
            amount: transferAmount,
            date: parseDateWithTime(form.date),
            fromWalletId,
            toWalletId,
            ...(form.fee && { fee: form.fee }),
            ...(form.description && { description: form.description }),
        });

        emit('saved', transaction);
        close();
    } catch (error) {
        console.error('Failed to save transfer:', error);
    }
}
</script>
