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
    border-radius: 8px;
    font-weight: 600;
    padding: 8px 16px;
}
</style>
