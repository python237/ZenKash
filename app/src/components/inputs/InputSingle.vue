<template>
    <q-input
        :model-value="modelValue"
        :label="label"
        :placeholder="placeholder"
        :type="type"
        :disable="disable"
        :readonly="readonly"
        :error="!!error"
        :error-message="error"
        outlined
        dense
        class="input-single"
        v-bind="$attrs"
        @update:model-value="$emit('update:modelValue', $event ?? '')"
        @blur="$emit('blur')"
    >
        <template v-if="icon" #prepend>
            <q-icon :name="icon" color="grey-6" />
        </template>
        <template v-if="$slots.append" #append>
            <slot name="append" />
        </template>
    </q-input>
</template>

<script setup lang="ts">
defineProps<{
    modelValue: string | number;
    label?: string;
    placeholder?: string;
    type?: 'text' | 'number' | 'email' | 'password' | 'tel';
    icon?: string;
    disable?: boolean;
    readonly?: boolean;
    error?: string | undefined;
}>();

defineEmits<{
    'update:modelValue': [value: string | number];
    blur: [];
}>();
</script>

<style lang="scss" scoped>
.input-single {
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

    :deep(.q-field--focused .q-field__label) {
        color: $primary;
    }

    :deep(.q-field__marginal) {
        height: 48px;
    }
}
</style>
