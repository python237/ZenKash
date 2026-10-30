<template>
    <q-btn
        unelevated
        color="primary"
        :label="label"
        :icon="icon"
        :loading="loading"
        :disable="disable"
        no-caps
        class="btn-primary"
        v-bind="$attrs"
        @click="$emit('click')"
    />
</template>

<script setup lang="ts">
defineProps<{
    label?: string;
    icon?: string;
    loading?: boolean;
    disable?: boolean;
}>();

defineEmits<{
    click: [];
}>();
</script>

<style lang="scss" scoped>
.btn-primary {
    border-radius: $radius-control;
    font-weight: 700;
    min-height: 44px;
    padding: 8px 20px;
}
</style>
