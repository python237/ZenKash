<template>
    <q-input
        :model-value="modelValue"
        :label="label"
        :placeholder="placeholder"
        :disable="disable"
        :readonly="readonly"
        :error="!!error"
        :error-message="error"
        :rows="rows"
        type="textarea"
        outlined
        class="input-multiline"
        v-bind="$attrs"
        @update:model-value="$emit('update:modelValue', String($event ?? ''))"
        @blur="$emit('blur')"
    />
</template>

<script setup lang="ts">
withDefaults(
    defineProps<{
        modelValue: string;
        label?: string;
        placeholder?: string;
        disable?: boolean;
        readonly?: boolean;
        error?: string;
        rows?: number;
    }>(),
    {
        rows: 3,
    },
);

defineEmits<{
    'update:modelValue': [value: string];
    blur: [];
}>();
</script>

<style lang="scss" scoped>
.input-multiline {
    :deep(.q-field__control) {
        border-radius: 10px;
    }

    :deep(.q-field__control:before) {
        border-color: $border-color;
    }

    :deep(.q-field__control:hover:before) {
        border-color: $primary;
    }

    :deep(.q-field__native) {
        padding-top: 12px;
        font-size: 15px;
        color: $text-primary;
    }

    :deep(.q-field__label) {
        font-size: 14px;
        color: $text-secondary;
    }

    :deep(.q-field--focused .q-field__label) {
        color: $primary;
    }
}
</style>
