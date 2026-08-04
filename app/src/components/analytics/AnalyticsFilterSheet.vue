<template>
    <ModalBase
        v-model="isOpen"
        :title="t('analytics.filters')"
        max-width="440px"
        @hide="resetDraft"
    >
        <!-- Flow families -->
        <div class="field-label">{{ t('analytics.included') }}</div>
        <q-option-group
            v-model="draft.groups"
            type="checkbox"
            :options="groupOptions"
            color="primary"
            dense
            class="q-mb-md"
        />

        <!-- Grouping dimension -->
        <q-select
            v-model="draft.dimension"
            :options="dimensionOptions"
            :label="t('analytics.groupBy')"
            outlined
            dense
            emit-value
            map-options
            class="q-mb-md"
        />

        <!-- Master categories -->
        <q-select
            v-model="draft.masterCategoryIds"
            :options="masterCategoryOptions"
            :label="t('analytics.masterCategories')"
            outlined
            dense
            multiple
            use-chips
            emit-value
            map-options
            clearable
            class="q-mb-md"
        >
            <template #after-options>
                <q-item v-close-popup clickable class="done-option">
                    <q-item-section class="text-primary text-weight-medium text-center">
                        {{ t('common.close') }}
                    </q-item-section>
                </q-item>
            </template>
        </q-select>

        <!-- Categories -->
        <q-select
            v-model="draft.categoryIds"
            :options="categoryOptions"
            :label="t('analytics.categories')"
            outlined
            dense
            multiple
            use-chips
            use-input
            emit-value
            map-options
            clearable
            input-debounce="0"
            class="q-mb-md"
            @filter="filterCategories"
        >
            <template #after-options>
                <q-item v-close-popup clickable class="done-option">
                    <q-item-section class="text-primary text-weight-medium text-center">
                        {{ t('common.close') }}
                    </q-item-section>
                </q-item>
            </template>
        </q-select>

        <!-- Wallets -->
        <q-select
            v-model="draft.walletIds"
            :options="walletOptions"
            :label="t('analytics.wallets')"
            outlined
            dense
            multiple
            use-chips
            emit-value
            map-options
            clearable
            class="q-mb-md"
        >
            <template #after-options>
                <q-item v-close-popup clickable class="done-option">
                    <q-item-section class="text-primary text-weight-medium text-center">
                        {{ t('common.close') }}
                    </q-item-section>
                </q-item>
            </template>
        </q-select>

        <!-- Amount bounds -->
        <div class="row q-col-gutter-sm q-mb-md">
            <div class="col-6">
                <InputNumber
                    v-model="amountMin"
                    :label="t('analytics.amountMin')"
                    :min="0"
                    :hint="t('analytics.amountHint')"
                />
            </div>
            <div class="col-6">
                <InputNumber
                    v-model="amountMax"
                    :label="t('analytics.amountMax')"
                    :min="0"
                    :hint="t('analytics.amountHint')"
                />
            </div>
        </div>

        <!-- Description search -->
        <InputSingle
            v-model="draft.search"
            :label="t('analytics.searchDescription')"
            icon="search"
        />

        <template #actions>
            <BtnLink :label="t('analytics.resetFilters')" @click="reset" />
            <BtnPrimary :label="t('common.apply')" @click="apply" />
        </template>
    </ModalBase>
</template>

<script setup lang="ts">
import type { Category } from 'src/types/category';
import type { MasterCategory } from 'src/types/master-category';
import type { Wallet } from 'src/types/wallet';
import type { AnalyticsFilters, BreakdownDimension } from 'src/types/analytics';
import BtnLink from 'src/components/buttons/BtnLink.vue';
import BtnPrimary from 'src/components/buttons/BtnPrimary.vue';
import InputNumber from 'src/components/inputs/InputNumber.vue';
import InputSingle from 'src/components/inputs/InputSingle.vue';
import ModalBase from 'src/components/modals/ModalBase.vue';
import { FLOW_GROUPS, useAnalyticsFilters } from 'src/composables/useAnalyticsFilters';

/** A `<q-select>` option with a string value. */
interface SelectOption {
    /** Displayed text */
    label: string;
    /** Underlying identifier */
    value: string;
}

const props = defineProps<{
    /** Whether the sheet is open */
    modelValue: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const { t } = useI18n();
const { filters, resetFilters } = useAnalyticsFilters();

const categoryStore = useCategoryStore();
const masterCategoryStore = useMasterCategoryStore();
const walletStore = useWalletStore();

const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
});

// Edits are staged in a draft and only applied on confirmation, so a
// half-finished selection never re-runs the aggregations.
const draft = ref<AnalyticsFilters>(structuredClone(toRaw(filters.value)));

/** Copies the live filters back into the draft. */
function resetDraft(): void {
    draft.value = structuredClone(toRaw(filters.value));
}

watch(isOpen, (open) => {
    if (open) resetDraft();
});

const groupOptions = computed(() =>
    FLOW_GROUPS.map((group) => ({ label: t(`analytics.groups.${group}`), value: group })),
);

const dimensionOptions = computed<SelectOption[]>(() =>
    (['masterCategory', 'category', 'wallet'] satisfies BreakdownDimension[]).map((dimension) => ({
        label: t(`analytics.dimensions.${dimension}`),
        value: dimension,
    })),
);

const masterCategoryOptions = computed<SelectOption[]>(() =>
    masterCategoryStore.masterCategories.map((mc: MasterCategory) => ({
        label: mc.name,
        value: mc.id,
    })),
);

const walletOptions = computed<SelectOption[]>(() =>
    walletStore.wallets.map((wallet: Wallet) => ({ label: wallet.name, value: wallet.id })),
);

/** Categories offered in the select, narrowed by the drafted master categories. */
const availableCategories = computed<SelectOption[]>(() => {
    const selectedMasters = new Set(draft.value.masterCategoryIds);
    return categoryStore.categories
        .filter(
            (cat: Category) =>
                selectedMasters.size === 0 || selectedMasters.has(cat.masterCategoryId),
        )
        .map((cat: Category) => ({ label: cat.name, value: cat.id }));
});

const categoryOptions = ref<SelectOption[]>([]);

watch(availableCategories, (options) => {
    categoryOptions.value = options;
});

/**
 * Filters the category select as the user types.
 * @param search - Current input value
 * @param update - Callback applying the filtered options
 */
function filterCategories(search: string, update: (fn: () => void) => void): void {
    update(() => {
        const needle = search.toLowerCase();
        categoryOptions.value = needle
            ? availableCategories.value.filter((option) =>
                  option.label.toLowerCase().includes(needle),
              )
            : availableCategories.value;
    });
}

// InputNumber works with plain numbers, so 0 stands for "no bound".
const amountMin = computed({
    get: () => draft.value.amountMin ?? 0,
    set: (value: number) => {
        draft.value.amountMin = value > 0 ? value : null;
    },
});

const amountMax = computed({
    get: () => draft.value.amountMax ?? 0,
    set: (value: number) => {
        draft.value.amountMax = value > 0 ? value : null;
    },
});

/** Applies the draft to the shared filter state and closes the sheet. */
function apply(): void {
    // A cleared multi-select yields null; the filter model expects an empty list.
    filters.value = {
        ...draft.value,
        groups: draft.value.groups ?? [],
        masterCategoryIds: draft.value.masterCategoryIds ?? [],
        categoryIds: draft.value.categoryIds ?? [],
        walletIds: draft.value.walletIds ?? [],
        search: draft.value.search ?? '',
    };
    isOpen.value = false;
}

/** Restores the defaults and closes the sheet. */
function reset(): void {
    resetFilters();
    resetDraft();
    isOpen.value = false;
}

onMounted(() => {
    categoryOptions.value = availableCategories.value;
});
</script>

<style lang="scss" scoped>
.done-option {
    border-top: 1px solid $border-light;
    position: sticky;
    bottom: 0;
    background: $bg-card;
}

.field-label {
    font-size: 13px;
    font-weight: 600;
    color: $text-secondary;
    margin-bottom: 4px;
}
</style>
