<template>
    <ModalBase
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="isEditing ? t('bets.editBet') : t('bets.addBet')"
        size="md"
    >
        <q-form @submit.prevent="save" class="q-gutter-md">
            <!-- Stake -->
            <InputNumber
                v-model="form.stake"
                :label="t('bets.stake')"
                :suffix="currencySymbol"
                :error="errors.stake"
                autofocus
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
import type { Bet } from 'src/types/bet';
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
    bet?: Bet | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [bet: Bet];
}>();

const { t } = useI18n();
const betStore = useBetStore();
const settingsStore = useSettingsStore();

/**
 * Gets a local date string (YYYY-MM-DD) for the given date.
 * @param date - The date to convert, defaults to now
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

// Schema
const schema = z.object({
    stake: z.number().positive(t('validation.positiveNumber')),
    date: z.string().min(1, t('validation.required')),
    description: z.string().optional(),
});

const { form, errors, validate, reset } = useFormValidation(schema, {
    stake: 0,
    date: getLocalDateString(),
    description: '',
});

const isEditing = computed(() => !!props.bet);
const isLoading = computed(() => betStore.isLoading);

// Currency
const currencyCode = computed(() => settingsStore.defaultCurrency ?? CurrencyCode.XOF);
const currencySymbol = computed(() => CURRENCIES[currencyCode.value]?.symbol ?? currencyCode.value);

// Watch dialog open
watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) {
            if (props.bet) {
                reset({
                    stake: props.bet.stake,
                    date: getLocalDateString(props.bet.placedAt),
                    description: props.bet.description ?? '',
                });
            } else {
                reset();
            }
        }
    },
);

/**
 * Closes the bet dialog by emitting the update:modelValue event with false.
 */
function close() {
    emit('update:modelValue', false);
}

/**
 * Places a new bet or updates an existing one.
 * Validates the form, calls the bet store, and emits the saved event.
 * @returns {Promise<void>} Resolves when the save operation completes.
 */
async function save() {
    if (!validate()) return;

    try {
        let bet: Bet | null;

        if (isEditing.value && props.bet) {
            bet = await betStore.update(props.bet.id, {
                stake: form.stake,
                placedAt: parseDateWithTime(form.date),
                description: form.description || undefined,
            });
        } else {
            bet = await betStore.place({
                gameId: props.game.id,
                stake: form.stake,
                placedAt: parseDateWithTime(form.date),
                description: form.description || undefined,
            });
        }

        if (bet) emit('saved', bet);
        close();
    } catch (error) {
        console.error('Failed to save bet:', error);
    }
}
</script>
