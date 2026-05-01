<template>
    <q-btn
        flat
        round
        :dense="dense"
        :icon="icon"
        :color="color"
        :size="size"
        :disable="disable"
        class="btn-icon"
        :class="{ 'btn-icon--selected': selected, 'btn-icon--dense': dense }"
        v-bind="$attrs"
        @click="$emit('click')"
    />
</template>

<script setup lang="ts">
defineProps<{
    icon: string;
    color?: string;
    size?: string;
    dense?: boolean;
    disable?: boolean;
    selected?: boolean;
}>();

defineEmits<{
    click: [];
}>();
</script>

<style lang="scss" scoped>
.btn-icon {
    width: 44px;
    height: 44px;

    &--dense {
        width: auto;
        height: auto;
    }

    &--selected {
        background-color: rgba($primary, 0.1);
    }
}
</style>
