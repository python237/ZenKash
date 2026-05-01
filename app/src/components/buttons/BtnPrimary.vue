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
    border-radius: 8px;
    font-weight: 600;
    padding: 8px 20px;
}
</style>
