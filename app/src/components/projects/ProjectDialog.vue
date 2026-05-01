<template>
    <ModalBase
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="isEditing ? t('projects.editProject') : t('projects.addProject')"
        size="md"
    >
        <q-form @submit.prevent="save" class="q-gutter-md">
            <!-- Name -->
            <InputSingle
                v-model="form.name"
                :label="t('common.name')"
                :error="errors.name"
                autofocus
            />

            <!-- Description -->
            <q-input
                v-model="form.description"
                :label="t('common.description')"
                type="textarea"
                outlined
                autogrow
                :input-style="{ minHeight: '80px' }"
            />

            <!-- Buttons -->
            <div class="row justify-end q-gutter-sm q-mt-lg">
                <BtnLink :label="t('common.cancel')" @click="close" />
                <BtnPrimary :label="t('common.save')" type="submit" :loading="isLoading" />
            </div>
        </q-form>
    </ModalBase>
</template>

<script setup lang="ts">
import { z } from 'zod/v4';
import type { Project } from 'src/types/project';
import ModalBase from '../modals/ModalBase.vue';
import InputSingle from '../inputs/InputSingle.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useFormValidation } from 'src/composables/useFormValidation';

const props = defineProps<{
    modelValue: boolean;
    project?: Project | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [project: Project];
}>();

const { t } = useI18n();
const projectStore = useProjectStore();

// Schema
const schema = z.object({
    name: z.string().min(1, t('validation.required')),
    description: z.string().optional(),
});

const { form, errors, validate, reset } = useFormValidation(schema, {
    name: '',
    description: '',
});

const isEditing = computed(() => !!props.project);
const isLoading = computed(() => projectStore.isLoading);

// Watch for project changes
watch(
    () => props.project,
    (newProject) => {
        if (newProject) {
            form.name = newProject.name;
            form.description = newProject.description ?? '';
        } else {
            reset();
        }
    },
    { immediate: true },
);

// Watch dialog open
watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen && !props.project) {
            reset();
        }
    },
);

/**
 * Closes the project dialog by emitting the update:modelValue event with false.
 */
function close() {
    emit('update:modelValue', false);
}

/**
 * Saves the project (creates new or updates existing).
 * Validates the form, calls the appropriate store method, and emits the saved event.
 * @returns {Promise<void>} Resolves when the save operation completes.
 */
async function save() {
    if (!validate()) return;

    try {
        let project: Project;

        if (isEditing.value && props.project) {
            const updated = await projectStore.update(props.project.id, {
                name: form.name,
                description: form.description || undefined,
            });
            if (!updated) throw new Error('Failed to update project');
            project = updated;
        } else {
            project = await projectStore.create({
                name: form.name,
                description: form.description || undefined,
            });
        }

        emit('saved', project);
        close();
    } catch (error) {
        console.error('Failed to save project:', error);
    }
}
</script>
