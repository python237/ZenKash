<template>
    <q-page class="zk-page">
        <!-- Total available, converted into the default currency -->
        <div v-if="wallets.length > 0" class="wallets-total">
            <span class="zk-caption">{{ t('report.availableBalance') }}</span>
            <span class="zk-amount zk-amount--lg">{{ formatCurrency(totalBalance) }}</span>
        </div>

        <!-- Wallet List -->
        <WalletGrid :wallets="wallets" @select="goToDetail" />

        <!-- Create Dialog -->
        <WalletDialog v-model="showDialog" @saved="onSaved" />
    </q-page>
</template>

<script setup lang="ts">
import type { Wallet } from 'src/types/wallet';
import WalletGrid from 'src/components/wallets/WalletGrid.vue';
import WalletDialog from 'src/components/wallets/WalletDialog.vue';

const { t } = useI18n();
const router = useRouter();
usePage({
    title: t('wallets.title'),
    showHeader: true,
    showBack: true,
    actions: [{ icon: 'add', label: t('common.add'), onClick: () => openCreate() }],
});

const store = useWalletStore();

// State
const showDialog = ref(false);

// Load wallets (game wallets are managed from the Games section, hidden here)
const wallets = computed(() => store.nonGameWallets);

const { formatCurrency, convert } = useCurrency();

/** Sum of the listed wallets, converted into the default currency. */
const totalBalance = computed(() =>
    wallets.value.reduce((sum, wallet) => sum + convert(wallet.balance, wallet.currency), 0),
);

onMounted(() => {
    void store.loadAll();
});

// Navigate to wallet detail
/**
 * Navigates to the detail page for a specific wallet.
 * @param {Wallet} wallet - The wallet to view details for
 * @returns {void}
 */
function goToDetail(wallet: Wallet): void {
    void router.push({ name: 'wallet-detail', params: { id: wallet.id } });
}

// Open create dialog
/**
 * Opens the dialog to create a new wallet.
 * @returns {void}
 */
function openCreate(): void {
    showDialog.value = true;
}

// On wallet saved
/**
 * Callback handler when a wallet is saved.
 * The wallet list updates automatically via reactive store.
 * @returns {void}
 */
function onSaved(): void {
    // Wallet was saved - list will update automatically
}
</script>

<style lang="scss" scoped>
.wallets-total {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 4px;
}
</style>
