<template>
    <q-btn
        outline
        color="primary"
        :label="label"
        :icon="icon"
        :loading="loading"
        :disable="disable"
        no-caps
        class="btn-secondary"
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
.btn-secondary {
    border-radius: 8px;
    font-weight: 600;
    padding: 8px 20px;
}
</style>
