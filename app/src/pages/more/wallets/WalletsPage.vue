<template>
    <q-page class="zk-page">
        <!-- Total available, converted into the default currency -->
        <div v-if="wallets.length > 0" class="wallets-total">
            <span class="zk-caption">{{ t('report.availableBalance') }}</span>
            <span class="zk-amount zk-amount--lg">{{ formatCurrency(totalBalance) }}</span>
        </div>

        <!-- Wallet List -->
        <WalletGrid :wallets="wallets" @select="goToDetail" />

        <!-- Closed wallets, folded away: history only -->
        <section v-if="closedWallets.length > 0" class="closed">
            <button
                type="button"
                class="closed__toggle"
                :aria-expanded="showClosed"
                @click="showClosed = !showClosed"
            >
                <q-icon name="o_lock" size="18px" />
                <span class="closed__title">
                    {{ t('wallets.closing.closedList', { count: closedWallets.length }) }}
                </span>
                <q-icon :name="showClosed ? 'expand_less' : 'expand_more'" size="20px" />
            </button>
            <WalletGrid v-if="showClosed" :wallets="closedWallets" @select="goToDetail" />
        </section>

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
const closedWallets = computed(() => store.closedWallets);
const showClosed = ref(false);

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
.closed {
    display: flex;
    flex-direction: column;
    gap: 10px;

    &__toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px;
        border: 0;
        background: none;
        font-family: inherit;
        color: $text-secondary;
        cursor: pointer;
    }

    &__title {
        flex: 1;
        text-align: left;
        font-size: 14px;
        font-weight: 700;
    }
}
</style>
