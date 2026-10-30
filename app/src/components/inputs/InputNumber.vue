<template>
    <q-input
        ref="inputRef"
        :model-value="text"
        :label="label"
        :placeholder="placeholder"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        :disable="disable"
        :readonly="readonly"
        :error="!!error"
        :error-message="error"
        :hint="hint"
        :autofocus="autofocus"
        outlined
        dense
        class="input-number"
        v-bind="$attrs"
        @update:model-value="onInput"
        @blur="$emit('blur')"
    >
        <template v-if="icon || $slots.prepend" #prepend>
            <slot name="prepend">
                <q-icon v-if="icon" :name="icon" color="grey-6" />
            </slot>
        </template>
        <template v-if="suffix || $slots.append" #append>
            <slot name="append">
                <span v-if="suffix" class="text-caption text-grey-6">{{ suffix }}</span>
            </slot>
        </template>
    </q-input>
</template>

<script setup lang="ts">
import type { QInput } from 'quasar';
import { formatInputNumber, parseInputNumber } from 'src/services/number-format';

const props = defineProps<{
    modelValue: number;
    label?: string;
    placeholder?: string;
    step?: number | string;
    min?: number;
    max?: number;
    icon?: string;
    suffix?: string;
    hint?: string | undefined;
    disable?: boolean;
    readonly?: boolean;
    autofocus?: boolean;
    error?: string | undefined;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: number];
    blur: [];
}>();

const inputRef = ref<QInput | null>(null);

// Displayed text, with thousands grouped ("1 000 000")
const text = ref(formatInputNumber(props.modelValue));

// Re-format when the value changes from outside (form reset, edit, ...)
watch(
    () => props.modelValue,
    (value: number) => {
        const current = parseInputNumber(text.value, allowNegative.value).value;
        if (current !== value) text.value = formatInputNumber(value);
    },
);

const allowNegative = computed(() => props.min === undefined || props.min < 0);

/**
 * Handles typing: re-groups the digits, keeps the caret after the same digit,
 * and emits the parsed numeric value.
 * @param value - The raw input value
 */
function onInput(value: string | number | null): void {
    const raw = String(value ?? '');
    const native = inputRef.value?.getNativeElement() as HTMLInputElement | undefined;
    const caret = native?.selectionStart ?? raw.length;
    // Characters that matter (digits, separator, sign) before the caret
    const significantBefore = raw.slice(0, caret).replace(/[^\d,.-]/g, '').length;

    const parsed = parseInputNumber(raw, allowNegative.value);
    text.value = parsed.text;
    emit('update:modelValue', parsed.value);

    void nextTick(() => {
        if (!native || document.activeElement !== native) return;
        let seen = 0;
        let position = 0;
        while (position < parsed.text.length && seen < significantBefore) {
            if (/[\d,-]/.test(parsed.text.charAt(position))) seen++;
            position++;
        }
        native.setSelectionRange(position, position);
    });
}
</script>

<style lang="scss" scoped>
.input-number {
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

    :deep(.q-field__native) {
        padding-top: 14px;
        font-size: 15px;
        color: $text-primary;
    }

    :deep(.q-field__label) {
        font-size: 14px;
        color: $text-secondary;
    }

    :deep(.q-field__native) {
        font-variant-numeric: tabular-nums;
    }
}
</style>
