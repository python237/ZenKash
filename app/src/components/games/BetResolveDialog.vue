<template>
    <ModalBase
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="t('bets.resolveBet')"
        size="md"
    >
        <q-form @submit.prevent="save" class="q-gutter-md">
            <!-- Outcome selector -->
            <div class="row q-gutter-sm">
                <BtnAction
                    class="col"
                    :color="outcome === 'won' ? 'positive' : 'grey-4'"
                    :label="t('bets.won')"
                    icon="check_circle"
                    @click="outcome = 'won'"
                />
                <BtnAction
                    class="col"
                    :color="outcome === 'lost' ? 'negative' : 'grey-4'"
                    :label="t('bets.lost')"
                    icon="cancel"
                    @click="outcome = 'lost'"
                />
            </div>

            <!-- Payout (only when won) -->
            <InputNumber
                v-if="outcome === 'won'"
                v-model="form.payout"
                :label="t('bets.payout')"
                :suffix="currencySymbol"
                :error="errors.payout"
                autofocus
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
import type { Bet } from 'src/types/bet';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import ModalBase from '../modals/ModalBase.vue';
import InputNumber from '../inputs/InputNumber.vue';
import BtnAction from '../buttons/BtnAction.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useFormValidation } from 'src/composables/useFormValidation';

const props = defineProps<{
    modelValue: boolean;
    bet: Bet;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [bet: Bet];
}>();

const { t } = useI18n();
const betStore = useBetStore();
const settingsStore = useSettingsStore();

const outcome = ref<'won' | 'lost'>('won');

// Schema — payout required only when won (validated manually below)
const schema = z.object({
    payout: z.number().min(0),
});

const { form, errors, reset } = useFormValidation(schema, {
    payout: 0,
});

const isLoading = computed(() => betStore.isLoading);

// Currency
const currencyCode = computed(() => settingsStore.defaultCurrency ?? CurrencyCode.XOF);
const currencySymbol = computed(() => CURRENCIES[currencyCode.value]?.symbol ?? currencyCode.value);

// Watch dialog open — default payout to the stake as a convenience
watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) {
            outcome.value = 'won';
            reset({ payout: props.bet.stake });
        }
    },
);

/**
 * Closes the resolve dialog by emitting the update:modelValue event with false.
 */
function close() {
    emit('update:modelValue', false);
}

/**
 * Resolves the bet with the selected outcome.
 * Requires a positive payout when the outcome is a win.
 * @returns {Promise<void>} Resolves when the operation completes.
 */
async function save() {
    errors.value = {};

    if (outcome.value === 'won' && form.payout <= 0) {
        errors.value.payout = t('validation.positiveNumber');
        return;
    }

    try {
        const bet = await betStore.resolve(props.bet.id, {
            status: outcome.value,
            ...(outcome.value === 'won' && { payout: form.payout }),
        });

        if (bet) emit('saved', bet);
        close();
    } catch (error) {
        console.error('Failed to resolve bet:', error);
    }
}
</script>
