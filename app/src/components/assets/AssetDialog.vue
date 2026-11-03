<template>
    <ModalBase
        :model-value="modelValue"
        :title="asset ? t('assets.edit') : t('assets.add')"
        max-width="480px"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <q-form class="asset-form" @submit.prevent="save">
            <label class="field">
                <span class="field__label">{{ t('assets.name') }}</span>
                <InputSingle
                    v-model="form.name"
                    :placeholder="t('assets.namePlaceholder')"
                    :error="errors.name"
                />
            </label>

            <!-- Category -->
            <div class="field">
                <span class="field__label">{{ t('assets.category') }}</span>
                <div class="category-chips">
                    <button
                        v-for="category in ASSET_CATEGORIES"
                        :key="category.id"
                        type="button"
                        class="category-chip"
                        :class="{ 'category-chip--active': form.category === category.id }"
                        :aria-pressed="form.category === category.id"
                        @click="form.category = category.id"
                    >
                        <span class="category-chip__icon" :style="toneStyle(category.color)">
                            <q-icon :name="category.icon" size="15px" />
                        </span>
                        {{ t(`assets.categories.${category.id}`) }}
                    </button>
                </div>
            </div>

            <!-- Depreciation pace: preset rates only, never typed freely -->
            <div class="field">
                <span class="field__label">
                    {{ t('assets.depreciation') }} ·
                    {{ t(`assets.categories.${form.category}`) }}
                </span>
                <div class="pace-grid" role="radiogroup" :aria-label="t('assets.depreciation')">
                    <button
                        v-for="pace in DEPRECIATION_PACES"
                        :key="pace"
                        type="button"
                        role="radio"
                        class="pace"
                        :class="{ 'pace--active': form.pace === pace }"
                        :aria-checked="form.pace === pace"
                        @click="form.pace = pace"
                    >
                        <span class="pace__rate">{{ preset.rates[pace] }} %</span>
                        <span class="pace__label">
                            {{ t(`assets.paces.${pace}`) }}
                            <template v-if="pace === 'standard'"
                                >· {{ t('assets.recommended') }}</template
                            >
                        </span>
                    </button>
                </div>
                <span class="field__hint">{{ t(`assets.paceHints.${form.pace}`) }}</span>
            </div>

            <div class="field-row">
                <label class="field">
                    <span class="field__label">{{ t('assets.purchasePrice') }}</span>
                    <InputNumber
                        v-model="form.purchasePrice"
                        :min="0"
                        :suffix="currencySymbol"
                        :error="errors.purchasePrice"
                    />
                </label>
                <label class="field">
                    <span class="field__label">{{ t('assets.purchaseDate') }}</span>
                    <InputDate
                        v-model="form.purchaseDate"
                        :date-options="notInFuture"
                        :error="errors.purchaseDate"
                    />
                </label>
            </div>

            <!-- Condition -->
            <div class="field">
                <span class="field__label">{{ t('assets.condition') }}</span>
                <div class="condition-switch" role="radiogroup" :aria-label="t('assets.condition')">
                    <button
                        v-for="condition in ASSET_CONDITIONS"
                        :key="condition"
                        type="button"
                        role="radio"
                        class="condition-switch__btn"
                        :class="{ 'condition-switch__btn--active': form.condition === condition }"
                        :aria-checked="form.condition === condition"
                        @click="form.condition = condition"
                    >
                        {{ t(`assets.conditions.${condition}`) }}
                    </button>
                </div>
            </div>

            <!-- Live estimate -->
            <div class="estimate">
                <span class="estimate__text">
                    <span class="estimate__label">{{ t('assets.estimateToday') }}</span>
                    <span class="zk-caption">{{ estimateFormula }}</span>
                </span>
                <span class="estimate__value">{{ formatCurrency(estimate) }}</span>
            </div>

            <p class="no-transaction">{{ t('assets.noTransaction') }}</p>
        </q-form>

        <template #actions>
            <BtnPrimary
                :label="asset ? t('common.save') : t('assets.save')"
                :loading="isSaving"
                @click="save"
            />
        </template>
    </ModalBase>
</template>

<script setup lang="ts">
import type {
    AssetCategory,
    AssetCondition,
    AssetWithStats,
    DepreciationPace,
} from 'src/types/asset';
import {
    ASSET_CATEGORIES,
    ASSET_CONDITIONS,
    CONDITION_RESALE_FACTOR,
    DEPRECIATION_PACES,
} from 'src/types/asset';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import { categoryPreset, resaleValueAt, yearsBetween } from 'src/services/asset-valuation';
import { toneStyle } from 'src/services/tone';
import { useAssetStore } from 'src/stores/asset';
import ModalBase from '../modals/ModalBase.vue';
import InputSingle from '../inputs/InputSingle.vue';
import InputNumber from '../inputs/InputNumber.vue';
import InputDate from '../inputs/InputDate.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';

const props = defineProps<{
    modelValue: boolean;
    /** Asset to edit; null or undefined to create one */
    asset?: AssetWithStats | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [];
}>();

const { t } = useI18n();
const assetStore = useAssetStore();
const settingsStore = useSettingsStore();
const { formatCurrency } = useCurrency();

/**
 * Local date string (YYYY-MM-DD) of a date.
 * @param date - The date
 * @returns The date string
 */
function toDateInput(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Editable fields of the sheet */
interface AssetForm {
    name: string;
    category: AssetCategory;
    pace: DepreciationPace;
    condition: AssetCondition;
    purchasePrice: number;
    purchaseDate: string;
}

const form = reactive<AssetForm>({
    name: '',
    category: 'furniture',
    pace: 'standard',
    condition: 'good',
    purchasePrice: 0,
    purchaseDate: toDateInput(new Date()),
});
const errors = reactive<{
    name?: string | undefined;
    purchasePrice?: string | undefined;
    purchaseDate?: string | undefined;
}>({});
const isSaving = ref(false);

const preset = computed(() => categoryPreset(form.category));

const currency = computed(
    () => props.asset?.currency ?? settingsStore.defaultCurrency ?? CurrencyCode.XOF,
);
const currencySymbol = computed(() => CURRENCIES[currency.value]?.symbol ?? currency.value);

const purchaseDate = computed(() => new Date(`${form.purchaseDate}T12:00:00`));

// Estimated resale value with the current form values
const estimate = computed(() =>
    form.purchasePrice > 0 && form.purchaseDate
        ? resaleValueAt({
              category: form.category,
              pace: form.pace,
              condition: form.condition,
              purchasePrice: form.purchasePrice,
              purchaseDate: purchaseDate.value,
          })
        : 0,
);

const estimateFormula = computed(() =>
    t('assets.formula', {
        rate: preset.value.rates[form.pace],
        years: yearsBetween(purchaseDate.value, new Date()).toFixed(1).replace('.', ','),
        resale: Math.round(CONDITION_RESALE_FACTOR[form.condition] * 100),
    }),
);

/**
 * Only past or current dates can be a purchase date.
 * @param date - Date in YYYY/MM/DD format (QDate)
 * @returns Whether the date is selectable
 */
function notInFuture(date: string): boolean {
    return date <= toDateInput(new Date()).replace(/-/g, '/');
}

// Fill the form when the sheet opens
watch(
    () => props.modelValue,
    (open: boolean) => {
        if (!open) return;
        errors.name = undefined;
        errors.purchasePrice = undefined;
        errors.purchaseDate = undefined;
        const asset = props.asset;
        form.name = asset?.name ?? '';
        form.category = asset?.category ?? 'furniture';
        form.pace = asset?.pace ?? 'standard';
        form.condition = asset?.condition ?? 'good';
        form.purchasePrice = asset?.purchasePrice ?? 0;
        form.purchaseDate = toDateInput(asset?.purchaseDate ?? new Date());
    },
);

/**
 * Validates the form.
 * @returns True when every field is valid
 */
function validate(): boolean {
    errors.name = form.name.trim() ? undefined : t('validation.required');
    errors.purchasePrice = form.purchasePrice > 0 ? undefined : t('validation.positiveNumber');
    errors.purchaseDate = form.purchaseDate ? undefined : t('validation.required');
    return !errors.name && !errors.purchasePrice && !errors.purchaseDate;
}

/**
 * Creates or updates the asset. No transaction is ever recorded.
 */
async function save(): Promise<void> {
    if (!validate() || isSaving.value) return;
    isSaving.value = true;
    try {
        const data = {
            name: form.name.trim(),
            category: form.category,
            pace: form.pace,
            condition: form.condition,
            purchasePrice: form.purchasePrice,
            purchaseDate: purchaseDate.value,
        };
        if (props.asset) {
            await assetStore.update(props.asset.id, data);
        } else {
            await assetStore.create({ ...data, currency: currency.value });
        }
        emit('saved');
        emit('update:modelValue', false);
    } finally {
        isSaving.value = false;
    }
}
</script>

<style lang="scss" scoped>
.asset-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;

    &__label {
        font-size: 12px;
        font-weight: 600;
        color: $text-secondary;
    }

    &__hint {
        font-size: 12px;
        line-height: 1.4;
        color: $text-secondary;
    }

    :deep(.q-field--with-bottom) {
        padding-bottom: 0;
    }
}

.field-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.category-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.category-chip {
    height: 36px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px 0 6px;
    border-radius: 999px;
    border: 1px solid $border-color;
    background: $bg-card;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: $grey-ink;
    cursor: pointer;

    &--active {
        border: 1.5px solid $text-primary;
        color: $text-primary;
    }

    &__icon {
        width: 24px;
        height: 24px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
}

.pace-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
}

.pace {
    min-height: 60px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    padding: 6px 4px;
    border-radius: $radius-control;
    border: 1px solid $border-color;
    background: $bg-card;
    font-family: inherit;
    color: $text-primary;
    cursor: pointer;

    &--active {
        border: 2px solid $primary;
        background: $primary-soft;
    }

    &__rate {
        font-size: 17px;
        font-weight: 800;
    }

    &__label {
        font-size: 11px;
        font-weight: 600;
        color: $text-secondary;
        text-align: center;
    }
}

.condition-switch {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
    padding: 4px;
    border-radius: $radius-control;
    background: $bg-page;

    &__btn {
        min-height: 40px;
        border: 0;
        border-radius: 11px;
        background: transparent;
        color: $text-secondary;
        font-family: inherit;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;

        &--active {
            background: $bg-card;
            color: $text-primary;
            box-shadow: 0 1px 3px rgba(18, 26, 23, 0.12);
        }
    }
}

.estimate {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 16px;
    background: $bg-page;

    &__text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    &__label {
        font-size: 12px;
        font-weight: 600;
        color: $text-secondary;
    }

    &__value {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -0.02em;
        white-space: nowrap;
    }
}

.no-transaction {
    margin: 0;
    text-align: center;
    font-size: 12px;
    color: $text-secondary;
}
</style>
