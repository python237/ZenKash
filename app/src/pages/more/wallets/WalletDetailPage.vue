<template>
    <q-page class="q-pa-md">
        <div v-if="wallet" class="wallet-detail">
            <!-- Header card -->
            <q-card flat bordered class="wallet-header-card">
                <q-card-section class="column items-center q-pa-lg">
                    <q-avatar class="bg-primary-1" size="72px">
                        <q-icon :name="wallet.icon" color="primary" size="36px" />
                    </q-avatar>
                    <div class="wallet-name q-mt-md">{{ wallet.name }}</div>
                    <div class="wallet-balance q-mt-sm">{{ formattedBalance }}</div>
                </q-card-section>
            </q-card>

            <!-- Actions -->
            <div class="actions-section q-mt-lg">
                <q-list bordered class="rounded-borders">
                    <q-item clickable v-ripple @click="openEdit">
                        <q-item-section avatar>
                            <q-icon name="edit" color="grey-7" />
                        </q-item-section>
                        <q-item-section>{{ t('common.edit') }}</q-item-section>
                        <q-item-section side>
                            <q-icon name="chevron_right" color="grey-5" />
                        </q-item-section>
                    </q-item>

                    <q-separator />

                    <q-item clickable v-ripple @click="confirmDelete" class="text-negative">
                        <q-item-section avatar>
                            <q-icon name="delete" color="negative" />
                        </q-item-section>
                        <q-item-section>{{ t('common.delete') }}</q-item-section>
                    </q-item>
                </q-list>
            </div>
        </div>

        <!-- Edit Dialog -->
        <WalletDialog v-model="showDialog" :wallet="wallet ?? null" @saved="onSaved" />

        <!-- Delete Confirmation -->
        <ModalConfirm
            v-model="showDeleteConfirm"
            :title="t('common.delete')"
            :message="t('wallets.deleteConfirm')"
            :sub-message="t('wallets.deleteWarning')"
            confirm-color="negative"
            :confirm-label="t('common.delete')"
            @confirm="onDelete"
        />
    </q-page>
</template>

<script setup lang="ts">
import WalletDialog from 'src/components/wallets/WalletDialog.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';
import { CURRENCIES } from 'src/types/currency';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useWalletStore();

// Get wallet from route param
const walletId = computed(() => route.params.id as string);
const wallet = computed(() => store.getWalletById(walletId.value));

// Page title
watchEffect(() => {
    if (wallet.value) {
        usePage({ title: wallet.value.name, showHeader: true, showBack: true });
    }
});

// Load wallets if not loaded
onMounted(() => {
    void store.loadAll();
});

// Format balance with wallet's currency
const formattedBalance = computed(() => {
    if (!wallet.value) return '';
    const amount = wallet.value.balance;
    const currencyCode = wallet.value.currency;
    const currency = CURRENCIES[currencyCode];
    const decimals = currency?.decimals ?? 0;

    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(amount);
});

// State
const showDialog = ref(false);
const showDeleteConfirm = ref(false);

// Actions
/**
 * Opens the wallet edit dialog.
 * @returns {void}
 */
function openEdit(): void {
    showDialog.value = true;
}

/**
 * Callback handler when the wallet is saved.
 * Data refreshes automatically via reactive store.
 * @returns {void}
 */
function onSaved(): void {
    // Wallet updated - data will refresh automatically
}

/**
 * Opens the delete confirmation dialog for the wallet.
 * @returns {void}
 */
function confirmDelete(): void {
    showDeleteConfirm.value = true;
}

/**
 * Deletes the current wallet and navigates back to the wallet list.
 * @returns {Promise<void>}
 */
async function onDelete(): Promise<void> {
    if (!wallet.value) return;
    await store.remove(wallet.value.id);
    router.back();
}
</script>

<style lang="scss" scoped>
.wallet-header-card {
    border-radius: 16px;
}

.wallet-name {
    font-size: 20px;
    font-weight: 600;
    color: var(--q-dark);
}

.wallet-balance {
    font-size: 28px;
    font-weight: 700;
    color: var(--q-primary);
}

.actions-section {
    .q-list {
        border-radius: 12px;
        overflow: hidden;
    }
}
</style>
