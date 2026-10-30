<template>
    <div v-if="wallets.length === 0" class="zk-empty">
        <span class="zk-empty__icon">
            <q-icon name="o_account_balance_wallet" size="30px" />
        </span>
        <span class="zk-empty__title">{{ t('wallets.noWallets') }}</span>
    </div>

    <div v-else class="wallet-grid">
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
.wallet-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}
</style>
