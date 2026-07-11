<template>
    <ModalBase
        v-model="isOpen"
        :title="isEditing ? t('games.editGame') : t('games.addGame')"
        persistent
    >
        <q-form @submit.prevent="save" class="q-gutter-md">
            <!-- Name -->
            <InputSingle
                v-model="form.name"
                :label="t('games.name')"
                :error="getError('name') ?? ''"
                autofocus
                @blur="touch('name')"
            />

            <!-- Wallet creation hint (create only) -->
            <div v-if="!isEditing" class="hint-text">
                {{ t('games.walletCreatedHint') }}
            </div>

            <!-- Icon selector -->
            <div>
                <div class="field-label">{{ t('games.icon') }}</div>
                <div class="icon-grid">
                    <BtnIcon
                        v-for="icon in availableIcons"
                        :key="icon"
                        :icon="icon"
                        :color="form.icon === icon ? 'primary' : 'grey-6'"
                        :selected="form.icon === icon"
                        @click="form.icon = icon"
                    />
                </div>
            </div>
        </q-form>

        <template #actions>
            <BtnLink :label="t('common.cancel')" @click="close" />
            <BtnPrimary
                :label="t('common.save')"
                :loading="isLoading"
                :disable="!isValid"
                @click="save"
            />
        </template>
    </ModalBase>
</template>

<script setup lang="ts">
import { z } from 'zod/v4';
import type { Game } from 'src/types/game';
import ModalBase from '../modals/ModalBase.vue';
import InputSingle from '../inputs/InputSingle.vue';
import BtnIcon from '../buttons/BtnIcon.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useFormValidation } from 'src/composables/useFormValidation';

const props = defineProps<{
    modelValue: boolean;
    game?: Game | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [game: Game];
}>();

const { t } = useI18n();
const gameStore = useGameStore();

const DEFAULT_ICON = 'casino';

// Validation schema
const schema = z.object({
    name: z.string().min(1, t('validation.required')),
    icon: z.string().min(1),
});

const { form, getError, touch, validate, reset, isValid } = useFormValidation(schema, {
    name: '',
    icon: DEFAULT_ICON,
});

// Dialog state
const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
});

const isEditing = computed(() => !!props.game);
const isLoading = computed(() => gameStore.isLoading);

// Reset form when dialog opens
watch(
    () => props.modelValue,
    (open: boolean) => {
        if (open) {
            if (props.game) {
                reset({ name: props.game.name, icon: props.game.icon });
            } else {
                reset({ name: '', icon: DEFAULT_ICON });
            }
        }
    },
);

// Available icons for games
const availableIcons = [
    'casino',
    'sports_soccer',
    'sports_basketball',
    'sports_esports',
    'sports',
    'stadium',
    'poker_chip',
    'style',
    'toll',
    'attach_money',
];

/**
 * Closes the game dialog by setting the open state to false.
 */
function close() {
    isOpen.value = false;
}

/**
 * Saves the game to the store (creates a new game + wallet, or updates an existing one).
 * Emits 'saved' event on success and closes the dialog.
 */
async function save() {
    if (!validate()) return;

    try {
        let game: Game;

        if (isEditing.value && props.game) {
            const updated = await gameStore.update(props.game.id, {
                name: form.name,
                icon: form.icon,
            });
            if (!updated) return;
            game = updated;
        } else {
            game = await gameStore.create({ name: form.name, icon: form.icon });
        }

        emit('saved', game);
        close();
    } catch (error) {
        console.error('Failed to save game:', error);
    }
}
</script>

<style lang="scss" scoped>
.field-label {
    font-size: 12px;
    color: var(--q-grey-7);
    margin-bottom: 8px;
}

.hint-text {
    font-size: 12px;
    color: var(--q-grey-6);
}

.icon-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
}
</style>
