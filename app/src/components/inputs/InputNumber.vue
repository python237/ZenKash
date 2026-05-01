<template>
    <q-input
        :model-value="modelValue"
        :label="label"
        :placeholder="placeholder"
        type="number"
        :step="step"
        :min="min"
        :max="max"
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
defineProps<{
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

/**
 * Handles input value changes and emits the parsed numeric value
 * @param value - The raw input value (string, number, or null)
 */
function onInput(value: string | number | null): void {
    const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
    emit('update:modelValue', isNaN(num) ? 0 : num);
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

    // Hide number input spinners
    :deep(input[type='number']::-webkit-outer-spin-button),
    :deep(input[type='number']::-webkit-inner-spin-button) {
        -webkit-appearance: none;
        margin: 0;
    }

    :deep(input[type='number']) {
        -moz-appearance: textfield;
    }
}
</style>
