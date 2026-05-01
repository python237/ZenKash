<template>
    <q-btn
        flat
        round
        size="md"
        :style="{ backgroundColor: color }"
        class="btn-color"
        :class="{ 'btn-color--selected': selected }"
        v-bind="$attrs"
        @click="$emit('click')"
    >
        <q-icon v-if="selected" name="check" color="white" />
    </q-btn>
</template>

<script setup lang="ts">
defineProps<{
    color: string;
    selected?: boolean;
}>();

defineEmits<{
    click: [];
}>();
</script>

<style lang="scss" scoped>
.btn-color {
    width: 32px;
    height: 32px;
    min-width: 32px;
    min-height: 32px;
    padding: 0;
    border-radius: 50%;

    &--selected {
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.2);
    }
}
</style>
