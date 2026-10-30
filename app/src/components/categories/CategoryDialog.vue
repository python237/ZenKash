<template>
    <ModalBase
        v-model="isOpen"
        :title="isEditing ? t('categories.editCategory') : t('categories.addCategory')"
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

            <!-- Master Category select -->
            <q-select
                v-model="form.masterCategoryId"
                :options="masterCategoryOptions"
                :label="t('categories.masterCategory')"
                :error="!!getError('masterCategoryId')"
                :error-message="getError('masterCategoryId')"
                option-value="value"
                option-label="label"
                emit-value
                map-options
                outlined
                dense
                behavior="dialog"
                popup-content-class="select-popup-clean"
                class="select-field"
                @blur="touch('masterCategoryId')"
            >
                <template #option="{ itemProps, opt }">
                    <q-item v-bind="itemProps">
                        <q-item-section avatar>
                            <span class="zk-tile zk-tile--sm" :style="toneStyle(opt.color)">
                                <q-icon :name="opt.icon" size="18px" />
                            </span>
                        </q-item-section>
                        <q-item-section>
                            <q-item-label>{{ opt.label }}</q-item-label>
                        </q-item-section>
                    </q-item>
                </template>
                <template #selected-item="{ opt }">
                    <div class="row items-center q-gutter-sm">
                        <span class="zk-tile option-tile" :style="toneStyle(opt.color)">
                            <q-icon :name="opt.icon" size="16px" />
                        </span>
                        <span>{{ opt.label }}</span>
                    </div>
                </template>
            </q-select>

            <!-- Icon selector -->
            <div>
                <div class="field-label">{{ t('categories.icon') }}</div>
                <div class="icon-grid" role="radiogroup" :aria-label="t('categories.icon')">
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
import type { Category, CategoryWithMaster } from 'src/types/category';
import type { MasterCategory } from 'src/types/master-category';
import ModalBase from '../modals/ModalBase.vue';
import InputSingle from '../inputs/InputSingle.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import { useFormValidation } from 'src/composables/useFormValidation';
import { toneStyle } from 'src/services/tone';

const props = defineProps<{
    modelValue: boolean;
    category?: CategoryWithMaster | null;
    masterCategories: MasterCategory[];
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [category: Category];
}>();

const { t } = useI18n();
const store = useCategoryStore();

// Validation schema
const schema = z.object({
    name: z.string().min(1, t('validation.required')),
    masterCategoryId: z.string().min(1, t('validation.required')),
    icon: z.string().min(1),
});

// Form with validation
const { form, getError, touch, validate, reset, isValid } = useFormValidation(schema, {
    name: '',
    masterCategoryId: '',
    icon: 'label',
});

// Dialog state
const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
});

const isEditing = computed(() => !!props.category);
const isLoading = computed(() => store.isLoading);

// Master category options for select (color kept as the stored name, see toneStyle)
const masterCategoryOptions = computed(() =>
    props.masterCategories.map((mc) => ({
        value: mc.id,
        label: mc.name,
        icon: mc.icon,
        color: mc.color,
    })),
);

// Reset form when dialog opens
watch(
    () => props.modelValue,
    (open: boolean) => {
        if (open) {
            if (props.category) {
                reset({
                    name: props.category.name,
                    masterCategoryId: props.category.masterCategoryId,
                    icon: props.category.icon,
                });
            } else {
                reset({
                    name: '',
                    masterCategoryId: props.masterCategories[0]?.id ?? '',
                    icon: 'label',
                });
            }
        }
    },
);

// Available icons
const availableIcons = [
    'label',
    'local_offer',
    'sell',
    'bookmark',
    'star',
    'favorite',
    'shopping_cart',
    'store',
    'local_mall',
    'restaurant',
    'local_cafe',
    'fastfood',
    'local_bar',
    'local_pizza',
    'directions_car',
    'directions_bus',
    'local_gas_station',
    'local_parking',
    'home',
    'apartment',
    'business',
    'work',
    'school',
    'fitness_center',
];

/**
 * Closes the category dialog by setting isOpen to false
 */
function close(): void {
    isOpen.value = false;
}

/**
 * Saves the category to the database (creates or updates based on editing state)
 * @returns Promise that resolves when save is complete
 */
async function save(): Promise<void> {
    if (!validate()) return;

    try {
        const data = {
            name: form.name.trim(),
            masterCategoryId: form.masterCategoryId,
            icon: form.icon,
        };

        let result: Category | null;
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

.option-tile {
    width: 28px;
    height: 28px;
    border-radius: 9px;
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
</style>
