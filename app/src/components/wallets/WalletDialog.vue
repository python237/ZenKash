<template>
    <ModalBase
        v-model="isOpen"
        :title="isEditing ? t('wallets.editWallet') : t('wallets.addWallet')"
        persistent
    >
        <q-form @submit.prevent="save" class="q-gutter-md">
            <!-- Name -->
            <InputSingle
                v-model="form.name"
                :label="t('common.name')"
                :error="getError('name') ?? ''"
                autofocus
                @blur="touch('name')"
            />

            <!-- Currency select (only on create) -->
            <q-select
                v-if="!isEditing"
                v-model="form.currency"
                :options="currencyOptions"
                :label="t('settings.currency')"
                :error="!!getError('currency')"
                :error-message="getError('currency')"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                outlined
                dense
                behavior="dialog"
                popup-content-class="select-popup-clean"
                class="select-field"
                @blur="touch('currency')"
            />

            <!-- Initial balance (only on create) -->
            <InputNumber
                v-if="!isEditing"
                v-model="form.balance"
                :label="t('wallets.initialBalance')"
                :error="getError('balance') ?? ''"
                :hint="t('wallets.initialBalanceHint')"
                @blur="touch('balance')"
            />

            <!-- Icon selector -->
            <div>
                <div class="field-label">{{ t('wallets.icon') }}</div>
                <div class="icon-grid">
                    <BtnIcon
                        v-for="icon in availableIcons"
                        :key="icon"
                        :icon="icon"
                        :color="form.icon === icon ? 'primary' : 'grey-6'"
                        :selected="form.icon === icon"
                        @click="form.icon = icon"
                    />
                </div>
            </div>
        </q-form>

        <template #actions>
            <BtnLink :label="t('common.cancel')" @click="close" />
            <BtnPrimary
                :label="t('common.save')"
                :loading="isLoading"
                :disable="!isValid"
                @click="save"
            />
        </template>
    </ModalBase>
</template>

<script setup lang="ts">
import { z } from 'zod/v4';
import type { Wallet } from 'src/types/wallet';
import type { CurrencyCode } from 'src/types/currency';
import { getCurrencyOptions } from 'src/types/currency';
import ModalBase from '../modals/ModalBase.vue';
import InputSingle from '../inputs/InputSingle.vue';
import InputNumber from '../inputs/InputNumber.vue';
import BtnIcon from '../buttons/BtnIcon.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useFormValidation } from 'src/composables/useFormValidation';
import { useSettingsStore } from 'src/stores/settings';

const props = defineProps<{
    modelValue: boolean;
    wallet?: Wallet | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [wallet: Wallet];
}>();

const { t } = useI18n();
const store = useWalletStore();
const settingsStore = useSettingsStore();

// Currency options
const currencyOptions = computed(() => getCurrencyOptions(t));

// Validation schema
const schema = z.object({
    name: z.string().min(1, t('validation.required')),
    currency: z.string().min(1, t('validation.required')),
    icon: z.string().min(1),
    balance: z.number().min(0, t('validation.positiveNumber')),
});

// Default currency from settings
const defaultCurrency = computed(() => settingsStore.defaultCurrency ?? 'XOF');

// Form with validation
const { form, getError, touch, validate, reset, isValid } = useFormValidation(schema, {
    name: '',
    currency: defaultCurrency.value,
    icon: 'account_balance_wallet',
    balance: 0,
});

// Dialog state
const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
});

const isEditing = computed(() => !!props.wallet);
const isLoading = computed(() => store.isLoading);

// Reset form when dialog opens
watch(
    () => props.modelValue,
    (open: boolean) => {
        if (open) {
            if (props.wallet) {
                reset({
                    name: props.wallet.name,
                    currency: props.wallet.currency,
                    icon: props.wallet.icon,
                    balance: props.wallet.balance,
                });
            } else {
                reset({
                    name: '',
                    currency: defaultCurrency.value,
                    icon: 'account_balance_wallet',
                    balance: 0,
                });
            }
        }
    },
);

// Available icons for wallets
const availableIcons = [
    'account_balance_wallet',
    'payments',
    'account_balance',
    'credit_card',
    'savings',
    'attach_money',
    'currency_exchange',
    'phone_android',
    'trending_up',
    'pie_chart',
    'diamond',
    'home',
    'apartment',
    'work',
    'school',
    'local_atm',
    'monetization_on',
    'toll',
    'euro',
    'currency_bitcoin',
];

/**
 * Closes the wallet dialog by setting the open state to false.
 */
function close() {
    isOpen.value = false;
}

/**
 * Saves the wallet to the store.
 * Creates a new wallet or updates an existing one based on edit mode.
 * Emits 'saved' event on success and closes the dialog.
 */
async function save() {
    if (!validate()) return;

    try {
        let wallet: Wallet;

        if (isEditing.value && props.wallet) {
            // Update - currency and balance are not changed here
            const updated = await store.update(props.wallet.id, {
                name: form.name,
                icon: form.icon,
            });
            if (!updated) return;
            wallet = updated;
        } else {
            // Create - include currency and initial balance
            wallet = await store.create({
                name: form.name,
                currency: form.currency as CurrencyCode,
                icon: form.icon,
                balance: form.balance,
            });
        }

        emit('saved', wallet);
        close();
    } catch (error) {
        console.error('Failed to save wallet:', error);
    }
}
</script>

<style lang="scss" scoped>
.field-label {
    font-size: 12px;
    color: var(--q-grey-7);
    margin-bottom: 8px;
}

.icon-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
}
</style>
