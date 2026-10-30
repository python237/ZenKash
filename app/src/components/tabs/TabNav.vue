<template>
    <q-tabs
        :model-value="modelValue"
        class="tab-nav"
        :class="[`tab-nav--${variant}`]"
        :active-color="variant === 'pills' ? 'dark' : 'primary'"
        :indicator-color="variant === 'pills' ? 'transparent' : 'primary'"
        align="justify"
        mobile-arrows
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
        variant: 'pills',
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
        background-color: transparent;
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

    // Pills variant: segmented control
    &--pills {
        background-color: $grey-soft;
        border-radius: $radius-control;
        padding: 4px;
        min-height: 48px;

        :deep(.q-tab) {
            min-height: 40px;
            font-size: 14px;
            font-weight: 600;
            color: $text-secondary;
            border-radius: 11px;
            margin: 0 2px;
        }

        :deep(.q-tab--active) {
            font-weight: 700;
            color: $text-primary;
            background-color: $bg-card;
            box-shadow: 0 1px 3px rgba(18, 26, 23, 0.12);
        }

        :deep(.q-tab__indicator),
        :deep(.q-focus-helper) {
            display: none;
        }
    }
}
</style>
