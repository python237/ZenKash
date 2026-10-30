<template>
    <q-btn
        unelevated
        :color="color"
        :label="label"
        :icon="icon"
        :loading="loading"
        :disable="disable"
        no-caps
        class="btn-action"
        v-bind="$attrs"
        @click="$emit('click')"
    />
</template>

<script setup lang="ts">
defineProps<{
    label?: string;
    icon?: string;
    color?: string;
    loading?: boolean;
    disable?: boolean;
}>();

defineEmits<{
    click: [];
}>();
</script>

<style lang="scss" scoped>
.btn-action {
    border-radius: $radius-control;
    font-weight: 700;
    min-height: 44px;
    padding: 8px 16px;
}
</style>
