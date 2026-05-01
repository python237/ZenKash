<template>
    <q-btn
        flat
        color="negative"
        :label="label"
        :icon="icon"
        :loading="loading"
        :disable="disable"
        no-caps
        class="btn-error"
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
.btn-error {
    font-weight: 600;
    padding: 8px 20px;
}
</style>
