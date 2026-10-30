<template>
    <q-dialog
        v-model="isOpen"
        persistent
        maximized
        no-esc-dismiss
        no-backdrop-dismiss
        transition-show="fade"
        transition-hide="fade"
    >
        <div class="currency-step">
            <!-- Onboarding progress -->
            <div
                class="currency-step__progress"
                role="progressbar"
                :aria-valuenow="CURRENT_STEP"
                aria-valuemin="1"
                :aria-valuemax="TOTAL_STEPS"
                :aria-label="
                    t('onboarding.stepProgress', { current: CURRENT_STEP, total: TOTAL_STEPS })
                "
            >
                <span
                    v-for="i in TOTAL_STEPS"
                    :key="i"
                    class="currency-step__bar"
                    :class="{ 'currency-step__bar--done': i <= CURRENT_STEP }"
                />
            </div>

            <!-- Heading -->
            <div class="currency-step__heading">
                <h1 class="currency-step__title">{{ t('onboarding.currencyTitle') }}</h1>
                <p class="currency-step__description">
                    {{ t('onboarding.currencyDescription') }}
                </p>
            </div>

            <!-- Currency radio cards -->
            <fieldset class="currency-list">
                <legend class="sr-only">{{ t('settings.defaultCurrency') }}</legend>
                <label
                    v-for="opt in visibleOptions"
                    :key="opt.value"
                    class="currency-option"
                    :class="{ 'currency-option--selected': selectedCurrency === opt.value }"
                >
                    <span class="currency-option__code">{{ opt.value }}</span>
                    <span class="currency-option__name">{{ t(`currencies.${opt.value}`) }}</span>
                    <span class="currency-option__symbol">{{ opt.symbol }}</span>
                    <input
                        v-model="selectedCurrency"
                        class="currency-option__radio"
                        type="radio"
                        name="default-currency"
                        :value="opt.value"
                    />
                </label>

                <button
                    v-if="hiddenCount > 0"
                    type="button"
                    class="currency-list__more"
                    :aria-expanded="showAll"
                    @click="showAll = true"
                >
                    {{ t('onboarding.otherCurrencies', { count: hiddenCount }) }}
                </button>
            </fieldset>

            <div class="currency-step__spacer" />

            <!-- Final choice notice -->
            <div class="currency-step__notice" role="note">
                <q-icon name="lock" size="18px" class="currency-step__notice-icon" />
                <span>{{ t('onboarding.currencyWarning') }}</span>
            </div>

            <q-btn
                class="zk-cta currency-step__confirm"
                color="primary"
                unelevated
                no-caps
                :label="t('common.confirm')"
                :loading="isLoading"
                :disable="!selectedCurrency"
                @click="confirm"
            />
        </div>
    </q-dialog>
</template>

<script setup lang="ts">
import type { CurrencyCode } from 'src/types/currency';
import { getCurrencyOptions } from 'src/types/currency';
import { useSettingsStore } from 'src/stores/settings';

/** Number of currencies shown before the "other currencies" expander. */
const PRIMARY_COUNT = 4;
/** Onboarding progress: welcome, currency, done. */
const TOTAL_STEPS = 3;
/** Index of the currency step in the onboarding progress. */
const CURRENT_STEP = 2;

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
const showAll = ref(false);

const currencyOptions = computed(() => getCurrencyOptions(t));

/** Options rendered as radio cards (primary ones, or all once expanded). */
const visibleOptions = computed(() =>
    showAll.value ? currencyOptions.value : currencyOptions.value.slice(0, PRIMARY_COUNT),
);

/** Number of currencies hidden behind the expander. */
const hiddenCount = computed(() => currencyOptions.value.length - visibleOptions.value.length);

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
.currency-step {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-height: 100%;
    background: $bg-page;
    color: $text-primary;
    padding: calc(40px + var(--safe-area-top)) 24px calc(32px + var(--safe-area-bottom));
    overflow-y: auto;

    &__progress {
        display: flex;
        gap: 6px;
    }

    &__bar {
        flex: 1;
        height: 4px;
        border-radius: 999px;
        background: $border-color;

        &--done {
            background: $primary;
        }
    }

    &__heading {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    &__title {
        margin: 0;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.03em;
        line-height: 1.15;
    }

    &__description {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        color: $text-secondary;
    }

    &__spacer {
        flex: 1;
    }

    &__notice {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        background: $amber-soft;
        border-radius: 16px;
        padding: 12px 14px;
        color: $amber;
        font-size: 13px;
        line-height: 1.5;
    }

    &__notice-icon {
        flex-shrink: 0;
        margin-top: 1px;
    }

    &__confirm {
        min-height: 58px;
        font-size: 16px;
    }
}

.currency-list {
    border: 0;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;

    &__more {
        min-height: 48px;
        border: 1px dashed #b8c4be;
        border-radius: $radius-tile;
        background: transparent;
        font-family: inherit;
        font-size: 14px;
        font-weight: 700;
        color: $grey-ink;
        cursor: pointer;
    }
}

.currency-option {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 52px;
    background: $bg-card;
    border: 1px solid $border-color;
    border-radius: $radius-tile;
    // Compensates the 1px border so cards keep their size when selected
    padding: 15px 17px;
    cursor: pointer;

    &--selected {
        border: 2px solid $primary;
        padding: 14px 16px;
    }

    &:focus-within {
        outline: 2px solid rgba($primary, 0.35);
        outline-offset: 2px;
    }

    &__code {
        width: 44px;
        font-size: 14px;
        font-weight: 800;
    }

    &__name {
        flex: 1;
        font-size: 14px;
        font-weight: 600;
    }

    &__symbol {
        font-size: 13px;
        font-weight: 500;
        color: $text-muted;
    }

    &__radio {
        width: 20px;
        height: 20px;
        margin: 0;
        accent-color: $primary;
    }
}
</style>
