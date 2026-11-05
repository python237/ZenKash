<template>
    <q-page class="zk-page">
        <template v-if="wallet">
            <!-- Header card -->
            <section v-if="wallet.closedAt" class="closed-hero">
                <span class="closed-hero__icon">
                    <q-icon name="o_lock" size="22px" />
                </span>
                <div class="wallet-hero__body">
                    <span class="closed-hero__label">
                        {{ wallet.name }} · {{ wallet.currency }}
                        <span class="zk-pill">{{ t('wallets.closing.closed') }}</span>
                    </span>
                    <span class="zk-amount zk-amount--lg closed-hero__amount">
                        {{ formattedBalance }}
                    </span>
                    <span class="closed-hero__meta">
                        {{ t('wallets.closing.closedOn', { date: formattedClosedAt }) }}
                    </span>
                </div>
            </section>
            <section v-else class="zk-hero wallet-hero">
                <span class="wallet-hero__icon">
                    <q-icon :name="wallet.icon" size="24px" />
                </span>
                <div class="wallet-hero__body">
                    <span class="zk-hero__label">{{ wallet.name }} · {{ wallet.currency }}</span>
                    <span class="zk-amount zk-amount--lg">{{ formattedBalance }}</span>
                    <span v-if="linkedGoal?.closedAt" class="wallet-hero__goal">
                        {{ t('wallets.closing.goalClosed', { name: linkedGoal.name }) }}
                    </span>
                </div>
            </section>

            <!-- Actions of a closed wallet: read its history or reopen it -->
            <div v-if="wallet.closedAt" class="actions actions--two">
                <button type="button" class="action" @click="openHistory">
                    <span class="zk-tile zk-tile--sm zk-tile--blue">
                        <q-icon name="history" size="20px" />
                    </span>
                    {{ t('wallets.history.title') }}
                </button>
                <button
                    type="button"
                    class="action action--primary"
                    @click="showReopenConfirm = true"
                >
                    <span class="zk-tile zk-tile--sm zk-tile--green">
                        <q-icon name="o_lock_open" size="20px" />
                    </span>
                    {{ t('wallets.closing.reopen') }}
                </button>
            </div>

            <!-- Actions -->
            <div v-else class="actions" :class="{ 'actions--four': canClose }">
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
                <button
                    v-if="canClose"
                    type="button"
                    class="action"
                    @click="showCloseDialog = true"
                >
                    <span class="zk-tile zk-tile--sm">
                        <q-icon name="o_lock" size="20px" />
                    </span>
                    {{ t('wallets.closing.action') }}
                </button>
                <button type="button" class="action action--danger" @click="confirmDelete">
                    <span class="zk-tile zk-tile--sm zk-tile--orange">
                        <q-icon name="o_delete" size="20px" />
                    </span>
                    {{ t('common.delete') }}
                </button>
            </div>

            <!-- Goal tracked on this wallet -->
            <button v-if="linkedGoal" type="button" class="goal-link" @click="openGoals">
                <span
                    class="zk-tile zk-tile--sm"
                    :class="linkedGoal.closedAt ? '' : 'zk-tile--green'"
                >
                    <q-icon name="o_flag" size="18px" />
                </span>
                <span class="goal-link__body">
                    <span class="goal-link__name">
                        {{ t('wallets.closing.goal', { name: linkedGoal.name }) }}
                    </span>
                    <span class="goal-link__meta">{{ linkedGoalMeta }}</span>
                </span>
                <q-icon name="chevron_right" size="20px" class="goal-link__chevron" />
            </button>

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

        <!-- Closing -->
        <WalletCloseDialog v-model="showCloseDialog" :wallet="wallet ?? null" />

        <!-- Reopen Confirmation -->
        <ModalConfirm
            v-model="showReopenConfirm"
            :title="t('wallets.closing.reopen')"
            :message="t('wallets.closing.reopenConfirm')"
            :confirm-label="t('wallets.closing.reopen')"
            @confirm="onReopen"
        />

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
import WalletCloseDialog from 'src/components/wallets/WalletCloseDialog.vue';
import { useSavingsGoalStore } from 'src/stores/savings-goal';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';
import TransactionList from 'src/components/transactions/TransactionList.vue';
import { CURRENCIES } from 'src/types/currency';

const { t, locale } = useI18n();
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

const goalStore = useSavingsGoalStore();
const recurringStore = useRecurringTransactionStore();
const { formatCurrency } = useCurrency();

/** Goal tracked on this wallet, if any. */
const linkedGoal = computed(() => goalStore.getByWallet(walletId.value));

/** Progress line of the linked goal. */
const linkedGoalMeta = computed(() => {
    if (!linkedGoal.value) return '';
    const stats = goalStore.withStats(linkedGoal.value);
    const amount = formatCurrency(stats.currentAmount, stats.currency);
    if (stats.isClosed) return t('wallets.closing.goalClosedMeta', { amount });
    return `${amount} / ${formatCurrency(stats.targetAmount, stats.currency)}`;
});

/** Regular wallets can be closed; game wallets follow their game. */
const canClose = computed(() => !!wallet.value && !wallet.value.isGame);

const formattedClosedAt = computed(() => {
    if (!wallet.value?.closedAt) return '';
    return new Intl.DateTimeFormat(locale.value, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(wallet.value.closedAt);
});

// Load wallets and transactions if not loaded
onMounted(() => {
    void store.loadAll();
    void transactionStore.loadAll();
    void goalStore.loadAll();
    void recurringStore.loadAll();
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
const showCloseDialog = ref(false);
const showReopenConfirm = ref(false);

/**
 * Opens the goals screen.
 * @returns {void}
 */
function openGoals(): void {
    void router.push({ name: 'goals' });
}

/**
 * Reopens the wallet: it accepts movements again.
 * @returns {Promise<void>}
 */
async function onReopen(): Promise<void> {
    if (!wallet.value) return;
    await store.reopen(wallet.value.id);
    showReopenConfirm.value = false;
}

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

.wallet-hero__goal {
    font-size: 12px;
    color: $hero-accent;
}

.closed-hero {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 22px;
    border-radius: $radius-card;
    background: $grey-soft;

    &__icon {
        width: 48px;
        height: 48px;
        flex-shrink: 0;
        border-radius: 14px;
        background: $bg-card;
        color: $text-secondary;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    &__label {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        font-size: 13px;
        color: $text-secondary;
    }

    &__amount {
        color: $text-secondary;
    }

    &__meta {
        font-size: 12px;
        color: $text-secondary;
    }
}

.actions {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;

    &--two {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    &--four {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
    }
}

.goal-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border: 0;
    border-radius: $radius-tile;
    background: $bg-card;
    font-family: inherit;
    color: $text-primary;
    text-align: left;
    cursor: pointer;

    &__body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    &__name {
        font-size: 14px;
        font-weight: 600;
    }

    &__meta {
        font-size: 12px;
        color: $text-secondary;
    }

    &__chevron {
        color: $text-secondary;
    }
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

    &--primary {
        color: $primary;
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
