<template>
    <ModalBase
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :title="isExport ? t('backup.exportTitle') : t('backup.importTitle')"
        max-width="420px"
    >
        <div class="column q-gutter-md">
            <div class="text-body2 text-grey-7">
                {{ isExport ? t('backup.exportHint') : t('backup.importHint') }}
            </div>

            <q-banner v-if="!isExport" dense class="bg-orange-1 text-orange-9 rounded-borders">
                <template #avatar>
                    <q-icon name="warning" color="orange" />
                </template>
                {{ t('backup.importWarning') }}
            </q-banner>

            <InputSingle
                v-model="password"
                type="password"
                :label="t('backup.password')"
                icon="lock"
                :error="passwordError"
            />

            <InputSingle
                v-if="isExport"
                v-model="confirmPassword"
                type="password"
                :label="t('backup.confirmPassword')"
                icon="lock"
                :error="confirmError"
            />

            <div v-if="statusError" class="text-negative text-caption">{{ statusError }}</div>

            <div class="row justify-end q-gutter-sm q-mt-sm">
                <BtnLink :label="t('common.cancel')" @click="close" />
                <BtnPrimary
                    :label="isExport ? t('backup.export') : t('backup.chooseAndImport')"
                    :loading="busy"
                    @click="submit"
                />
            </div>
        </div>
    </ModalBase>
</template>

<script setup lang="ts">
import ModalBase from '../modals/ModalBase.vue';
import InputSingle from '../inputs/InputSingle.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { exportBackup, importBackup, pickBackupFile } from 'src/services/backup';

const MIN_PASSWORD_LENGTH = 6;

const props = defineProps<{
    modelValue: boolean;
    mode: 'export' | 'import';
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    done: [];
}>();

const { t } = useI18n();

const password = ref('');
const confirmPassword = ref('');
const passwordError = ref<string | undefined>(undefined);
const confirmError = ref<string | undefined>(undefined);
const statusError = ref('');
const busy = ref(false);

const isExport = computed(() => props.mode === 'export');

watch(
    () => props.modelValue,
    (isOpen) => {
        if (isOpen) {
            password.value = '';
            confirmPassword.value = '';
            passwordError.value = undefined;
            confirmError.value = undefined;
            statusError.value = '';
        }
    },
);

/**
 * Closes the dialog.
 */
function close(): void {
    emit('update:modelValue', false);
}

/**
 * Validates the password fields.
 * @returns True if the inputs are valid
 */
function validate(): boolean {
    passwordError.value = undefined;
    confirmError.value = undefined;

    if (password.value.length < MIN_PASSWORD_LENGTH) {
        passwordError.value = t('backup.passwordTooShort', { min: MIN_PASSWORD_LENGTH });
        return false;
    }
    if (isExport.value && confirmPassword.value !== password.value) {
        confirmError.value = t('backup.passwordMismatch');
        return false;
    }
    return true;
}

/**
 * Runs the export or import flow.
 * @returns Promise that resolves when the operation completes
 */
async function submit(): Promise<void> {
    if (!validate()) return;
    statusError.value = '';
    busy.value = true;

    try {
        if (isExport.value) {
            await exportBackup(password.value);
            emit('done');
            close();
            return;
        }

        const content = await pickBackupFile();
        if (content === null) {
            busy.value = false;
            return;
        }
        await importBackup(content, password.value);
        // Reload so every store rehydrates from the restored database
        window.location.reload();
    } catch (error) {
        const code = error instanceof Error ? error.message : '';
        if (code === 'WRONG_PASSWORD') statusError.value = t('backup.wrongPassword');
        else if (code === 'INVALID_FILE') statusError.value = t('backup.invalidFile');
        else statusError.value = t('messages.error');
    } finally {
        busy.value = false;
    }
}
</script>
