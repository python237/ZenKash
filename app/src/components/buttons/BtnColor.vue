<template>
    <button
        type="button"
        role="radio"
        class="btn-color"
        :class="{ 'btn-color--selected': selected }"
        :aria-checked="!!selected"
        v-bind="$attrs"
        @click="$emit('click')"
    >
        <span class="btn-color__swatch" :style="{ backgroundColor: color }">
            <q-icon v-if="selected" name="check" size="18px" />
        </span>
    </button>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false });

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
    width: 100%;
    min-width: 44px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: $radius-control;
    background: $bg-page;
    cursor: pointer;
    transition: box-shadow 0.15s ease;

    &__swatch {
        width: 28px;
        height: 28px;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
    }

    &--selected {
        background: $bg-card;
        box-shadow: inset 0 0 0 2px $primary;
    }
}
</style>
