<template>
    <ModalBase
        v-model="isOpen"
        :title="
            isEditing
                ? t('masterCategories.editMasterCategory')
                : t('masterCategories.addMasterCategory')
        "
        persistent
    >
        <q-form @submit.prevent="save" class="q-gutter-md">
            <!-- Name -->
            <InputSingle
                v-model="form.name"
                :label="t('common.name')"
                :error="getError('name') ?? ''"
                autofocus
                @blur="touch('name')"
            />

            <!-- Icon selector -->
            <div>
                <div class="field-label">{{ t('masterCategories.icon') }}</div>
                <div class="icon-grid" role="radiogroup" :aria-label="t('masterCategories.icon')">
                    <button
                        v-for="icon in availableIcons"
                        :key="icon"
                        type="button"
                        role="radio"
                        class="icon-tile"
                        :class="{ 'icon-tile--selected': form.icon === icon }"
                        :aria-checked="form.icon === icon"
                        :aria-label="icon"
                        @click="form.icon = icon"
                    >
                        <q-icon :name="icon" size="22px" />
                    </button>
                </div>
            </div>

            <!-- Color selector -->
            <div>
                <div class="field-label">{{ t('masterCategories.color') }}</div>
                <div class="color-grid" role="radiogroup" :aria-label="t('masterCategories.color')">
                    <BtnColor
                        v-for="color in availableColors"
                        :key="color.value"
                        :color="toneOf(color.value).fg"
                        :aria-label="color.value"
                        :selected="form.color === color.value"
                        @click="form.color = color.value"
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
import type { MasterCategory, CategoryType } from 'src/types/master-category';
import ModalBase from '../modals/ModalBase.vue';
import InputSingle from '../inputs/InputSingle.vue';
import BtnColor from '../buttons/BtnColor.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useFormValidation } from 'src/composables/useFormValidation';
import { toneOf } from 'src/services/tone';

const props = defineProps<{
    modelValue: boolean;
    category?: MasterCategory | null;
    type: CategoryType;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [category: MasterCategory];
}>();

const { t } = useI18n();
const store = useMasterCategoryStore();

// Validation schema
const schema = z.object({
    name: z.string().min(1, t('validation.required')),
    icon: z.string().min(1),
    color: z.string().min(1),
});

// Form with validation
const { form, getError, touch, validate, reset, isValid } = useFormValidation(schema, {
    name: '',
    icon: 'category',
    color: 'teal',
});

// Dialog state
const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
});

const isEditing = computed(() => !!props.category);
const isLoading = computed(() => store.isLoading);

// Reset form when dialog opens
watch(
    () => props.modelValue,
    (open: boolean) => {
        if (open) {
            if (props.category) {
                reset({
                    name: props.category.name,
                    icon: props.category.icon,
                    color: props.category.color,
                });
            } else {
                reset();
            }
        }
    },
);

// Available icons
const availableIcons = [
    'home',
    'restaurant',
    'local_grocery_store',
    'directions_car',
    'local_hospital',
    'school',
    'shopping_bag',
    'sports_esports',
    'movie',
    'flight',
    'pets',
    'child_care',
    'fitness_center',
    'spa',
    'work',
    'account_balance',
    'attach_money',
    'card_giftcard',
    'volunteer_activism',
    'savings',
    'trending_up',
    'business_center',
    'receipt_long',
    'payments',
];

// Available colors (stored by name, rendered through the calm tone palette)
const availableColors = [
    'teal',
    'blue',
    'indigo',
    'purple',
    'pink',
    'red',
    'orange',
    'amber',
    'green',
    'cyan',
].map((value) => ({ value }));

/**
 * Closes the master category dialog by setting isOpen to false.
 */
function close() {
    isOpen.value = false;
}

/**
 * Saves the master category (creates new or updates existing).
 * Validates the form, calls the appropriate store method, and emits the saved event.
 * @returns {Promise<void>} Resolves when the save operation completes.
 */
async function save() {
    if (!validate()) return;

    try {
        const data = {
            name: form.name.trim(),
            icon: form.icon,
            color: form.color,
            type: props.type,
        };

        let result: MasterCategory | null;
        if (isEditing.value && props.category) {
            result = await store.update(props.category.id, data);
        } else {
            result = await store.create(data);
        }

        if (result) {
            emit('saved', result);
            close();
        }
    } catch (error) {
        console.error('Failed to save category:', error);
    }
}
</script>

<style lang="scss" scoped>
.field-label {
    font-size: 13px;
    font-weight: 600;
    color: $text-secondary;
    margin-bottom: 8px;
}

.icon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(46px, 1fr));
    gap: 8px;
}

.icon-tile {
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: $radius-control;
    background: $bg-page;
    color: $text-secondary;
    font-family: inherit;
    cursor: pointer;
    transition:
        background-color 0.15s ease,
        box-shadow 0.15s ease;

    &--selected {
        background: $primary-soft;
        color: $primary;
        box-shadow: inset 0 0 0 2px $primary;
    }
}

.color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(46px, 1fr));
    gap: 8px;
}
</style>
