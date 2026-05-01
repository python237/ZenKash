<template>
    <ModalBase v-model="isOpen" :title="title" persistent :max-width="maxWidth">
        <p class="text-body1">{{ message }}</p>
        <p v-if="subtitle" class="text-caption text-grey-7">{{ subtitle }}</p>

        <template #actions>
            <BtnLink :label="cancelLabel" @click="cancel" />
            <BtnError
                v-if="variant === 'danger'"
                :label="confirmLabel"
                :loading="loading"
                @click="confirm"
            />
            <BtnPrimary v-else :label="confirmLabel" :loading="loading" @click="confirm" />
        </template>
    </ModalBase>
</template>

<script setup lang="ts">
import ModalBase from './ModalBase.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnError from '../buttons/BtnError.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        title: string;
        message: string;
        subtitle?: string;
        confirmLabel?: string;
        cancelLabel?: string;
        variant?: 'default' | 'danger';
        loading?: boolean;
        maxWidth?: string;
    }>(),
    {
        confirmLabel: 'Confirmer',
        cancelLabel: 'Annuler',
        variant: 'default',
        loading: false,
        maxWidth: '350px',
    },
);

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    confirm: [];
    cancel: [];
}>();

const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
});

/**
 * Handles the cancel action by emitting the cancel event and closing the dialog.
 */
function cancel() {
    emit('cancel');
    isOpen.value = false;
}

/**
 * Handles the confirm action by emitting the confirm event.
 * Note: The dialog is not automatically closed; the parent should handle closing.
 */
function confirm() {
    emit('confirm');
}
</script>
