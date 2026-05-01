<template>
    <q-card class="wallet-card" flat bordered @click="emit('click')">
        <q-card-section class="row items-center no-wrap q-pa-md">
            <!-- Icon -->
            <q-avatar class="bg-primary-1" size="44px">
                <q-icon :name="wallet.icon" color="primary" size="22px" />
            </q-avatar>

            <!-- Content -->
            <div class="wallet-content q-ml-md">
                <div class="wallet-name">{{ wallet.name }}</div>
                <div class="wallet-balance">{{ formattedBalance }}</div>
            </div>

            <!-- Chevron -->
            <q-icon name="chevron_right" color="grey-5" size="20px" class="q-ml-auto" />
        </q-card-section>
    </q-card>
</template>

<script setup lang="ts">
import type { Wallet } from 'src/types/wallet';
import { CURRENCIES } from 'src/types/currency';

const props = defineProps<{
    wallet: Wallet;
    balance?: number;
}>();

const emit = defineEmits<{
    click: [];
}>();

// Format balance with wallet's currency
const formattedBalance = computed(() => {
    const amount = props.balance ?? 0;
    const currency = CURRENCIES[props.wallet.currency];
    const decimals = currency?.decimals ?? 0;

    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: props.wallet.currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(amount);
});
</script>

<style lang="scss" scoped>
.wallet-card {
    border-radius: 12px;
    transition: all 0.2s ease;
    cursor: pointer;

    &:hover {
        background-color: rgba(0, 0, 0, 0.02);
    }

    &:active {
        transform: scale(0.98);
    }
}

.wallet-content {
    flex: 1;
    min-width: 0;
}

.wallet-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--q-dark);
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.wallet-balance {
    font-size: 13px;
    font-weight: 500;
    color: var(--q-grey-7);
    margin-top: 2px;
}
</style>
