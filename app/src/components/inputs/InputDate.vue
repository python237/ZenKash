<template>
    <q-input
        :model-value="modelValue"
        :label="label"
        :placeholder="placeholder"
        :disable="disable"
        :readonly="readonly"
        :error="!!error"
        :error-message="error"
        outlined
        dense
        class="input-date"
        v-bind="$attrs"
        @update:model-value="$emit('update:modelValue', String($event ?? ''))"
        @blur="$emit('blur')"
    >
        <template #append>
            <q-icon name="event" class="cursor-pointer" color="grey-6">
                <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date
                        :model-value="modelValue"
                        :mask="mask"
                        :options="dateOptions"
                        @update:model-value="$emit('update:modelValue', $event)"
                    >
                        <div class="row items-center justify-end">
                            <q-btn v-close-popup :label="closeLabel" color="primary" flat />
                        </div>
                    </q-date>
                </q-popup-proxy>
            </q-icon>
        </template>
    </q-input>
</template>

<script setup lang="ts">
withDefaults(
    defineProps<{
        modelValue: string;
        label?: string;
        placeholder?: string;
        mask?: string;
        closeLabel?: string;
        dateOptions?: (date: string) => boolean;
        disable?: boolean;
        readonly?: boolean;
        error?: string | undefined;
    }>(),
    {
        mask: 'YYYY-MM-DD',
        closeLabel: 'OK',
    },
);

defineEmits<{
    'update:modelValue': [value: string];
    blur: [];
}>();
</script>

<style lang="scss" scoped>
.input-date {
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
}
</style>
