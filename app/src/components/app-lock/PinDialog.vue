<template>
    <ModalBase
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="dialogTitle"
        max-width="360px"
    >
        <PinPad
            v-model="pin"
            :title="stepTitle"
            :subtitle="stepSubtitle"
            :error="error"
            :length="PIN_LENGTH"
            @complete="onComplete"
        />
    </ModalBase>
</template>

<script setup lang="ts">
import ModalBase from '../modals/ModalBase.vue';
import PinPad from './PinPad.vue';
import { useAppLock, PIN_LENGTH } from 'src/composables/useAppLock';

/** App-lock dialog operation mode. */
type Mode = 'set' | 'change' | 'disable';
/** Current step in the PIN entry flow. */
type Step = 'current' | 'new' | 'confirm';

const props = defineProps<{
    modelValue: boolean;
    mode: Mode;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    done: [];
}>();

const { t } = useI18n();
const { verify, setPin, disable } = useAppLock();

const pin = ref('');
const error = ref('');
const step = ref<Step>('new');
const firstPin = ref('');

const dialogTitle = computed(() => {
    if (props.mode === 'set') return t('appLock.setPin');
    if (props.mode === 'change') return t('appLock.changePin');
    return t('appLock.disable');
});

const stepTitle = computed(() => {
    switch (step.value) {
        case 'current':
            return t('appLock.enterCurrentPin');
        case 'confirm':
            return t('appLock.confirmPin');
        default:
            return t('appLock.newPin');
    }
});

const stepSubtitle = computed(() =>
    props.mode === 'disable' ? t('appLock.disableHint') : undefined,
);

/**
 * Resets the dialog to its initial step for the current mode.
 */
function resetState(): void {
    pin.value = '';
    firstPin.value = '';
    error.value = '';
    step.value = props.mode === 'set' ? 'new' : 'current';
}

watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) resetState();
    },
    { immediate: true },
);

watch(pin, (value) => {
    if (value.length > 0) error.value = '';
});

/**
 * Closes the dialog and signals completion.
 */
function finish(): void {
    emit('done');
    emit('update:modelValue', false);
}

/**
 * Advances the PIN flow when a full PIN has been entered.
 * @param value - The entered PIN
 * @returns Promise that resolves when the step is handled
 */
async function onComplete(value: string): Promise<void> {
    // Disable: single verify step
    if (props.mode === 'disable') {
        const ok = await disable(value);
        if (ok) finish();
        else fail(t('appLock.wrongPin'));
        return;
    }

    // Change: verify current PIN first
    if (props.mode === 'change' && step.value === 'current') {
        if (await verify(value)) {
            pin.value = '';
            step.value = 'new';
        } else {
            fail(t('appLock.wrongPin'));
        }
        return;
    }

    // Set / change: capture the new PIN, then confirm it
    if (step.value === 'new') {
        firstPin.value = value;
        pin.value = '';
        step.value = 'confirm';
        return;
    }

    // Confirm
    if (value === firstPin.value) {
        await setPin(value);
        finish();
    } else {
        firstPin.value = '';
        step.value = 'new';
        fail(t('appLock.pinMismatch'));
    }
}

/**
 * Shows an error and clears the current PIN entry.
 * @param message - The error message to display
 */
function fail(message: string): void {
    error.value = message;
    pin.value = '';
}
</script>
