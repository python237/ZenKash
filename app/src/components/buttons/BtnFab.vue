<template>
    <q-btn
        fab
        :icon="icon"
        :color="color"
        :disable="disable"
        class="btn-fab"
        v-bind="$attrs"
        @click="$emit('click')"
    />
</template>

<script setup lang="ts">
withDefaults(
    defineProps<{
        icon: string;
        color?: string;
        disable?: boolean;
    }>(),
    {
        color: 'primary',
    },
);

defineEmits<{
    click: [];
}>();
</script>

<style lang="scss" scoped>
.btn-fab {
    // Default FAB styling
}
</style>
