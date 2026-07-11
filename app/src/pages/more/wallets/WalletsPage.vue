<template>
    <q-page class="q-pa-md">
        <!-- Wallet List -->
        <WalletGrid :wallets="wallets" @select="goToDetail" />

        <!-- Add FAB -->
        <q-page-sticky position="bottom-right" :offset="[18, 18]">
            <BtnFab icon="add" @click="openCreate" />
        </q-page-sticky>

        <!-- Create Dialog -->
        <WalletDialog v-model="showDialog" @saved="onSaved" />
    </q-page>
</template>

<script setup lang="ts">
import type { Wallet } from 'src/types/wallet';
import WalletGrid from 'src/components/wallets/WalletGrid.vue';
import WalletDialog from 'src/components/wallets/WalletDialog.vue';
import BtnFab from 'src/components/buttons/BtnFab.vue';

const { t } = useI18n();
const router = useRouter();
usePage({ title: t('wallets.title'), showHeader: true, showBack: true });

const store = useWalletStore();

// State
const showDialog = ref(false);

// Load wallets (game wallets are managed from the Games section, hidden here)
const wallets = computed(() => store.nonGameWallets);

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
