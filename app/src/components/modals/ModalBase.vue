<template>
    <q-dialog
        v-model="isOpen"
        :persistent="persistent"
        position="bottom"
        class="modal-sheet"
        @hide="$emit('hide')"
    >
        <q-card class="modal-base" :style="{ maxWidth: maxWidth }">
            <div class="modal-handle" aria-hidden="true" />

            <!-- Header -->
            <div class="modal-header">
                <div class="modal-title">{{ title }}</div>
                <button
                    v-if="showClose"
                    type="button"
                    class="modal-close"
                    :aria-label="$t('common.close')"
                    @click="close"
                >
                    <q-icon name="close" size="20px" />
                </button>
            </div>

            <!-- Content -->
            <div class="modal-content">
                <slot />
            </div>

            <!-- Actions -->
            <div v-if="$slots.actions" class="modal-actions">
                <slot name="actions" />
            </div>
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        title: string;
        persistent?: boolean;
        showClose?: boolean;
        maxWidth?: string;
    }>(),
    {
        persistent: false,
        showClose: true,
        maxWidth: '640px',
    },
);

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    hide: [];
}>();

const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
});

/**
 * Closes the modal by setting the isOpen value to false.
 */
function close() {
    isOpen.value = false;
}

defineExpose({ close });
</script>

<style lang="scss" scoped>
.modal-base {
    width: 100%;
    max-height: calc(92vh - var(--safe-area-top));
    display: flex;
    flex-direction: column;
    border-radius: 28px 28px 0 0 !important;
    padding-bottom: var(--safe-area-bottom);
}

.modal-handle {
    align-self: center;
    flex-shrink: 0;
    width: 40px;
    height: 5px;
    margin-top: 10px;
    border-radius: 999px;
    background: $border-color;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 14px 20px 6px;
}

.modal-title {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: $text-primary;
}

.modal-close {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border: 0;
    border-radius: 12px;
    background: $bg-page;
    color: $text-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 12px 20px;
}

// Actions: full width, primary action takes the remaining space
.modal-actions {
    display: flex;
    gap: 10px;
    padding: 12px 20px 20px;

    :deep(.q-btn) {
        flex: 1;
        min-height: 52px;
        border-radius: $radius-tile;
        font-size: 15px;
    }

    :deep(.btn-primary) {
        flex: 2;
        font-weight: 800;
    }

    :deep(.btn-link) {
        background: $bg-page;
        color: $text-primary !important;
    }

    :deep(.btn-error) {
        background: $negative-soft;
    }
}
</style>
