<template>
    <q-tabs
        :model-value="modelValue"
        class="tab-nav"
        :class="[`tab-nav--${variant}`]"
        :active-color="variant === 'pills' ? 'white' : 'primary'"
        :indicator-color="variant === 'pills' ? 'transparent' : 'primary'"
        align="justify"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <q-tab v-for="tab in tabs" :key="tab.value" :name="tab.value" :label="tab.label" no-caps />
    </q-tabs>
</template>

<script setup lang="ts">
/**
 *
 */
export interface TabItem {
    value: string;
    label: string;
}

withDefaults(
    defineProps<{
        modelValue: string;
        tabs: TabItem[];
        variant?: 'underline' | 'pills';
    }>(),
    {
        variant: 'underline',
    },
);

defineEmits<{
    'update:modelValue': [value: string];
}>();
</script>

<style lang="scss" scoped>
.tab-nav {
    min-height: 48px;

    // Underline variant (default)
    &--underline {
        background-color: white;
        border-bottom: 1px solid $border-light;

        :deep(.q-tab) {
            min-height: 48px;
            font-size: 14px;
            font-weight: 500;
            color: $text-secondary;
        }

        :deep(.q-tab--active) {
            font-weight: 600;
            color: $primary;
        }

        :deep(.q-tab__indicator) {
            height: 3px;
            border-radius: 3px 3px 0 0;
        }
    }

    // Pills variant (rounded background)
    &--pills {
        background-color: white;
        border-radius: 12px;
        padding: 4px;

        :deep(.q-tab) {
            min-height: 40px;
            font-size: 13px;
            font-weight: 500;
            color: $text-secondary;
            border-radius: 8px;
            margin: 0 2px;
        }

        :deep(.q-tab--active) {
            font-weight: 600;
            color: white;
            background-color: $primary;
        }

        :deep(.q-tab__indicator) {
            display: none;
        }
    }
}
</style>
