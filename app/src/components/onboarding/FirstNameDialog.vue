<template>
    <ModalBase
        :model-value="modelValue"
        :title="t('onboarding.firstNameTitle')"
        :persistent="!editing"
        :show-close="editing"
        max-width="440px"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <q-form class="first-name-form" @submit.prevent="save">
            <p class="first-name-form__hint">{{ t('onboarding.firstNameHint') }}</p>
            <InputSingle
                v-model="name"
                :placeholder="t('onboarding.firstNamePlaceholder')"
                autofocus
                autocomplete="given-name"
                @keyup.enter="save"
            />
        </q-form>

        <template #actions>
            <BtnPrimary
                :label="editing ? t('common.save') : t('onboarding.continue')"
                :disable="name.trim().length === 0"
                :loading="isSaving"
                @click="save"
            />
        </template>
    </ModalBase>
</template>

<script setup lang="ts">
import ModalBase from '../modals/ModalBase.vue';
import InputSingle from '../inputs/InputSingle.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';

const props = withDefaults(
    defineProps<{
        modelValue: boolean;
        /** Editing from settings (closable) rather than the first-launch step */
        editing?: boolean;
    }>(),
    { editing: false },
);

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();
const settingsStore = useSettingsStore();

const name = ref('');
const isSaving = ref(false);

watch(
    () => props.modelValue,
    (open: boolean) => {
        if (open) name.value = settingsStore.firstName ?? '';
    },
    { immediate: true },
);

/**
 * Saves the first name and closes the sheet.
 */
async function save(): Promise<void> {
    if (name.value.trim().length === 0 || isSaving.value) return;
    isSaving.value = true;
    try {
        await settingsStore.setFirstName(name.value);
        emit('update:modelValue', false);
    } finally {
        isSaving.value = false;
    }
}
</script>

<style lang="scss" scoped>
.first-name-form {
    display: flex;
    flex-direction: column;
    gap: 12px;

    &__hint {
        margin: 0;
        font-size: 14px;
        line-height: 1.5;
        color: $text-secondary;
    }
}
</style>
