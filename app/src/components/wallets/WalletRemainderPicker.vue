<template>
    <div class="remainder">
        <template v-if="wallet.balance < 0">
            <span class="remainder__warn">
                {{ t('wallets.closing.negative', { amount: formattedBalance }) }}
            </span>
        </template>
        <template v-else-if="targets.length === 0">
            <span class="remainder__warn">
                {{ t('wallets.closing.noTarget', { amount: formattedBalance }) }}
            </span>
        </template>
        <template v-else>
            <span class="remainder__label">
                {{ t('wallets.closing.remainder', { amount: formattedBalance }) }}
            </span>
            <div class="remainder__chips" role="radiogroup">
                <button
                    v-for="target in targets"
                    :key="target.id"
                    type="button"
                    role="radio"
                    class="chip"
                    :class="{ 'chip--active': modelValue === target.id }"
                    :aria-checked="modelValue === target.id"
                    @click="emit('update:modelValue', target.id)"
                >
                    {{ target.name }}
                </button>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import type { Wallet } from 'src/types/wallet';
import { useWalletClosing } from 'src/composables/useWalletClosing';

const props = defineProps<{
    wallet: Wallet;
    modelValue: string;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: string];
}>();

const { t } = useI18n();
const { formatCurrency } = useCurrency();
const { targetsFor } = useWalletClosing();

const targets = computed(() => targetsFor(props.wallet));

const formattedBalance = computed(() =>
    formatCurrency(Math.abs(props.wallet.balance), props.wallet.currency),
);

// Preselect the first target so a single tap closes the wallet
watch(
    targets,
    (list: Wallet[]) => {
        if (!list.some((w) => w.id === props.modelValue)) {
            emit('update:modelValue', list[0]?.id ?? '');
        }
    },
    { immediate: true },
);
</script>

<style lang="scss" scoped>
.remainder {
    display: flex;
    flex-direction: column;
    gap: 10px;

    &__label {
        font-size: 13px;
        font-weight: 700;
        color: $text-primary;
    }

    &__warn {
        font-size: 12px;
        line-height: 1.5;
        color: $negative;
        background: $negative-soft;
        border-radius: 12px;
        padding: 8px 10px;
    }

    &__chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }
}

.chip {
    height: 34px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid $border-color;
    background: $bg-card;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: $text-primary;
    cursor: pointer;

    &--active {
        background: $text-primary;
        border-color: $text-primary;
        color: #ffffff;
    }
}
</style>
