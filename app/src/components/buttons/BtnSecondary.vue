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
    border-radius: $radius-control;
    font-weight: 700;
    min-height: 44px;
    padding: 8px 20px;

    &:before {
        border-color: $border-color;
    }
}
</style>
