<template>
    <div v-if="wallets.length === 0" class="empty-state">
        <q-icon name="account_balance_wallet" size="64px" color="grey-4" />
        <div class="text-grey-6 q-mt-md">{{ t('wallets.noWallets') }}</div>
    </div>

    <div v-else class="wallet-list">
        <WalletCard
            v-for="wallet in wallets"
            :key="wallet.id"
            :wallet="wallet"
            :balance="wallet.balance"
            @click="emit('select', wallet)"
        />
    </div>
</template>

<script setup lang="ts">
import type { Wallet } from 'src/types/wallet';
import WalletCard from './WalletCard.vue';

defineProps<{
    wallets: Wallet[];
}>();

const emit = defineEmits<{
    select: [wallet: Wallet];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
}

.wallet-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}
</style>
