<template>
    <q-page class="zk-page">
        <template v-if="wallet">
            <!-- Header card -->
            <section class="zk-hero wallet-hero">
                <span class="wallet-hero__icon">
                    <q-icon :name="wallet.icon" size="24px" />
                </span>
                <div class="wallet-hero__body">
                    <span class="zk-hero__label">{{ wallet.name }} · {{ wallet.currency }}</span>
                    <span class="zk-amount zk-amount--lg">{{ formattedBalance }}</span>
                </div>
            </section>

            <!-- Actions -->
            <div class="actions">
                <button type="button" class="action" @click="openHistory">
                    <span class="zk-tile zk-tile--sm zk-tile--blue">
                        <q-icon name="history" size="20px" />
                    </span>
                    {{ t('wallets.history.title') }}
                </button>
                <button type="button" class="action" @click="openEdit">
                    <span class="zk-tile zk-tile--sm">
                        <q-icon name="o_edit" size="20px" />
                    </span>
                    {{ t('common.edit') }}
                </button>
                <button type="button" class="action action--danger" @click="confirmDelete">
                    <span class="zk-tile zk-tile--sm zk-tile--orange">
                        <q-icon name="o_delete" size="20px" />
                    </span>
                    {{ t('common.delete') }}
                </button>
            </div>

            <!-- Latest operations -->
            <section class="recent">
                <div class="zk-section-head recent__head">
                    <h2 class="zk-section-title">{{ t('wallets.latestOperations') }}</h2>
                    <button type="button" class="zk-link" @click="openHistory">
                        {{ t('common.seeAll') }}
                    </button>
                </div>
                <TransactionList :transactions="recentTransactions" :show-date-headers="false" />
            </section>
        </template>

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
import { displayAmount } from 'src/composables/usePrivacy';
import WalletDialog from 'src/components/wallets/WalletDialog.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';
import TransactionList from 'src/components/transactions/TransactionList.vue';
import { CURRENCIES } from 'src/types/currency';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const store = useWalletStore();

// Get wallet from route param
const walletId = computed(() => route.params.id as string);
const wallet = computed(() => store.getWalletById(walletId.value));

// Page title
usePage({ title: () => wallet.value?.name ?? '', showHeader: true, showBack: true });

const transactionStore = useTransactionStore();

// Latest operations touching this wallet
const recentTransactions = computed(() =>
    transactionStore.getTransactionsWithRelations({ walletId: walletId.value }).slice(0, 5),
);

// Load wallets and transactions if not loaded
onMounted(() => {
    void store.loadAll();
    void transactionStore.loadAll();
});

// Format balance with wallet's currency
const formattedBalance = computed(() => {
    if (!wallet.value) return '';
    const amount = wallet.value.balance;
    const currencyCode = wallet.value.currency;
    const currency = CURRENCIES[currencyCode];
    const decimals = currency?.decimals ?? 0;

    return displayAmount(
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(amount),
    );
});

// State
const showDialog = ref(false);
const showDeleteConfirm = ref(false);

// Actions
/**
 * Opens the wallet's operation history.
 * @returns {void}
 */
function openHistory(): void {
    void router.push({ name: 'wallet-history', params: { id: walletId.value } });
}

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
.wallet-hero {
    flex-direction: row;
    align-items: center;
    gap: 16px;

    &__icon {
        width: 48px;
        height: 48px;
        flex-shrink: 0;
        border-radius: 14px;
        background: rgba(143, 227, 207, 0.16);
        color: $hero-accent;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    &__body {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
    }
}

.actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}

.action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px 4px;
    border: 0;
    border-radius: $radius-tile;
    background: $bg-card;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: $text-primary;
    cursor: pointer;

    &--danger {
        color: $negative;
    }
}

.recent {
    display: flex;
    flex-direction: column;
    gap: 6px;

    &__head {
        padding: 0 4px;
    }
}
</style>
