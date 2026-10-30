<template>
    <button type="button" class="wallet-card" @click="emit('click')">
        <span class="zk-tile zk-tile--blue">
            <q-icon :name="wallet.icon" size="20px" />
        </span>
        <span class="wallet-card__body">
            <span class="wallet-card__name">{{ wallet.name }}</span>
            <span class="wallet-card__balance zk-amount">{{ formattedBalance }}</span>
        </span>
    </button>
</template>

<script setup lang="ts">
import type { Wallet } from 'src/types/wallet';

const props = defineProps<{
    wallet: Wallet;
    balance?: number;
}>();

const emit = defineEmits<{
    click: [];
}>();

const { formatCurrency } = useCurrency();

// Balance in the wallet's own currency
const formattedBalance = computed(() => formatCurrency(props.balance ?? 0, props.wallet.currency));
</script>

<style lang="scss" scoped>
.wallet-card {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 22px;
    min-height: 132px;
    padding: 16px;
    border: 0;
    border-radius: $radius-card;
    background: $bg-card;
    color: $text-primary;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: transform 0.15s ease;

    &:active {
        transform: scale(0.98);
    }

    &__body {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    &__name {
        font-size: 13px;
        font-weight: 600;
        color: $text-secondary;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__balance {
        font-size: 17px;
        letter-spacing: -0.02em;
        overflow-wrap: anywhere;
    }
}
</style>
