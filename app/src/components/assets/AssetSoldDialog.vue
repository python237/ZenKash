<template>
    <ModalBase
        :model-value="modelValue"
        :title="t('assets.markSold')"
        max-width="440px"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <q-form class="sold-form" @submit.prevent="save">
            <p class="sold-form__hint">{{ t('assets.markSoldHint') }}</p>
            <label class="field">
                <span class="field__label">{{ t('assets.soldPrice') }}</span>
                <InputNumber v-model="price" :min="0" :suffix="currencySymbol" autofocus />
            </label>
            <label class="field">
                <span class="field__label">{{ t('assets.soldDate') }}</span>
                <InputDate v-model="date" />
            </label>
            <div v-if="asset" class="compare zk-caption">
                {{
                    t('assets.estimateWas', {
                        amount: formatCurrency(asset.resaleValue, asset.currency),
                    })
                }}
            </div>
        </q-form>

        <template #actions>
            <BtnPrimary :label="t('assets.markSold')" :loading="isSaving" @click="save" />
        </template>
    </ModalBase>
</template>

<script setup lang="ts">
import type { AssetWithStats } from 'src/types/asset';
import { CURRENCIES } from 'src/types/currency';
import { useAssetStore } from 'src/stores/asset';
import ModalBase from '../modals/ModalBase.vue';
import InputNumber from '../inputs/InputNumber.vue';
import InputDate from '../inputs/InputDate.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';

const props = defineProps<{
    modelValue: boolean;
    asset: AssetWithStats | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    saved: [];
}>();

const { t } = useI18n();
const assetStore = useAssetStore();
const { formatCurrency } = useCurrency();

const price = ref(0);
const date = ref('');
const isSaving = ref(false);

const currencySymbol = computed(() =>
    props.asset ? (CURRENCIES[props.asset.currency]?.symbol ?? props.asset.currency) : '',
);

watch(
    () => props.modelValue,
    (open: boolean) => {
        if (!open) return;
        const now = new Date();
        price.value = props.asset?.resaleValue ?? 0;
        date.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    },
);

/**
 * Marks the asset as sold. The price is kept for reference only.
 */
async function save(): Promise<void> {
    if (!props.asset || isSaving.value) return;
    isSaving.value = true;
    try {
        await assetStore.setSold(props.asset.id, price.value, new Date(`${date.value}T12:00:00`));
        emit('saved');
        emit('update:modelValue', false);
    } finally {
        isSaving.value = false;
    }
}
</script>

<style lang="scss" scoped>
.sold-form {
    display: flex;
    flex-direction: column;
    gap: 14px;

    &__hint {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: $text-secondary;
    }
}

.field {
    display: flex;
    flex-direction: column;
    gap: 6px;

    &__label {
        font-size: 12px;
        font-weight: 600;
        color: $text-secondary;
    }

    :deep(.q-field--with-bottom) {
        padding-bottom: 0;
    }
}
</style>
