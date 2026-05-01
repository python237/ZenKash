<template>
    <q-dialog
        v-model="isOpen"
        persistent
        no-esc-dismiss
        no-backdrop-dismiss
        transition-show="fade"
        transition-hide="fade"
    >
        <q-card class="onboarding-card">
            <q-card-section class="column items-center q-pa-lg">
                <!-- Icon -->
                <q-avatar class="bg-primary-1" size="80px">
                    <q-icon name="currency_exchange" color="primary" size="40px" />
                </q-avatar>

                <!-- Title -->
                <div class="text-h5 text-center q-mt-lg">{{ t('onboarding.currencyTitle') }}</div>

                <!-- Description -->
                <div class="text-body2 text-grey-7 text-center q-mt-sm">
                    {{ t('onboarding.currencyDescription') }}
                </div>

                <!-- Warning -->
                <q-banner class="bg-warning-1 text-warning q-mt-md" rounded dense>
                    <template #avatar>
                        <q-icon name="warning" color="warning" />
                    </template>
                    {{ t('onboarding.currencyWarning') }}
                </q-banner>
            </q-card-section>

            <q-card-section class="q-pt-none">
                <!-- Currency select -->
                <q-select
                    v-model="selectedCurrency"
                    :options="currencyOptions"
                    :label="t('settings.defaultCurrency')"
                    option-value="value"
                    option-label="label"
                    emit-value
                    map-options
                    outlined
                    dense
                    behavior="dialog"
                    popup-content-class="select-popup-clean"
                >
                    <template #option="{ itemProps, opt }">
                        <q-item v-bind="itemProps">
                            <q-item-section>
                                <q-item-label>{{ opt.label }}</q-item-label>
                            </q-item-section>
                        </q-item>
                    </template>
                </q-select>
            </q-card-section>

            <q-card-actions class="q-pa-md q-pt-none">
                <BtnPrimary
                    class="full-width"
                    :label="t('common.confirm')"
                    :loading="isLoading"
                    :disable="!selectedCurrency"
                    @click="confirm"
                />
            </q-card-actions>
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import type { CurrencyCode } from 'src/types/currency';
import { getCurrencyOptions } from 'src/types/currency';
import { useSettingsStore } from 'src/stores/settings';
import BtnPrimary from '../buttons/BtnPrimary.vue';

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    confirmed: [currency: CurrencyCode];
}>();

const { t } = useI18n();
const settingsStore = useSettingsStore();

const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
});

const selectedCurrency = ref<CurrencyCode | null>(null);
const isLoading = computed(() => settingsStore.isLoading);

const currencyOptions = computed(() => getCurrencyOptions(t));

/**
 * Confirms the currency selection by saving it to the settings store.
 * Emits the confirmed event with the selected currency and closes the dialog.
 * @returns {Promise<void>} Resolves when the currency is saved successfully.
 */
async function confirm() {
    if (!selectedCurrency.value) return;

    try {
        await settingsStore.setDefaultCurrency(selectedCurrency.value);
        emit('confirmed', selectedCurrency.value);
        isOpen.value = false;
    } catch (error) {
        console.error('Failed to set default currency:', error);
    }
}
</script>

<style lang="scss" scoped>
.onboarding-card {
    width: 100%;
    max-width: 360px;
    border-radius: 16px;
}

.bg-primary-1 {
    background-color: rgba(var(--q-primary-rgb), 0.1);
}

.bg-warning-1 {
    background-color: rgba(255, 193, 7, 0.1);
}
</style>
