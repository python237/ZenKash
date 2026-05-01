<template>
    <q-btn
        flat
        color="primary"
        :label="label"
        :icon="icon"
        :loading="loading"
        :disable="disable"
        no-caps
        class="btn-link"
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
.btn-link {
    font-weight: 500;
    padding: 4px 12px;
}
</style>
