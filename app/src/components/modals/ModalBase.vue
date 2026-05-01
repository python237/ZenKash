<template>
    <q-dialog v-model="isOpen" :persistent="persistent" @hide="$emit('hide')">
        <q-card class="modal-base" :style="{ maxWidth: maxWidth }">
            <!-- Header -->
            <q-card-section class="modal-header">
                <div class="modal-title">{{ title }}</div>
                <BtnIcon v-if="showClose" dense icon="close" color="grey-6" @click="close" />
            </q-card-section>

            <q-separator />

            <!-- Content -->
            <q-card-section class="modal-content">
                <slot />
            </q-card-section>

            <!-- Actions -->
            <template v-if="$slots.actions">
                <q-separator />
                <q-card-actions align="right" class="modal-actions">
                    <slot name="actions" />
                </q-card-actions>
            </template>
        </q-card>
    </q-dialog>
</template>

<script setup lang="ts">
import BtnIcon from '../buttons/BtnIcon.vue';

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
        maxWidth: '400px',
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
    border-radius: 16px;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
}

.modal-title {
    font-size: 16px;
    font-weight: 600;
    color: $text-primary;
}

.modal-content {
    padding: 16px;
}

.modal-actions {
    padding: 12px 16px;
}
</style>
