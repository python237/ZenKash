<template>
    <q-page class="zk-page">
        <!-- Month + search -->
        <div class="toolbar">
            <label class="search">
                <q-icon name="search" size="20px" />
                <span class="sr-only">{{ t('common.search') }}</span>
                <input
                    v-model="searchQuery"
                    type="search"
                    class="search__input"
                    :placeholder="t('transactions.searchPlaceholder')"
                />
            </label>
            <button type="button" class="month-chip" @click="showMonthPicker = true">
                <q-icon name="o_calendar_month" size="18px" />
                {{ formattedMonth }}
            </button>
        </div>

        <!-- Month picker dialog -->
        <q-dialog v-model="showMonthPicker">
            <q-date
                v-model="selectedMonth"
                emit-immediately
                default-view="Months"
                years-in-month-view
                minimal
                @update:model-value="showMonthPicker = false"
            />
        </q-dialog>

        <!-- Filter chips -->
        <div class="chips" role="tablist" :aria-label="t('transactions.filterLabel')">
            <button
                v-for="tab in filterTabs"
                :key="tab.value"
                type="button"
                role="tab"
                class="chip"
                :class="{ 'chip--active': activeFilter === tab.value }"
                :aria-selected="activeFilter === tab.value"
                @click="activeFilter = tab.value"
            >
                {{ tab.label }}
            </button>
        </div>

        <!-- Summary strip -->
        <div class="summary">
            <button type="button" class="summary__card" @click="openBreakdown('income')">
                <span class="zk-caption">{{ t('transactions.inflows') }}</span>
                <span class="summary__value text-positive">{{ formattedIncome }}</span>
            </button>
            <button type="button" class="summary__card" @click="openBreakdown('expense')">
                <span class="zk-caption">{{ t('transactions.outflows') }}</span>
                <span class="summary__value text-negative">{{ formattedExpense }}</span>
            </button>
        </div>
        <div class="summary-caption zk-caption">
            <span>
                {{ t('transactions.balance') }} :
                <strong :class="summary.balance >= 0 ? 'text-positive' : 'text-negative'">
                    {{ formattedBalance }} {{ currencyLabel }}
                </strong>
                · {{ summary.transactionCount }} {{ t('transactions.transactionsCount') }}
            </span>
            <span v-if="summary.totalGames !== 0">
                {{ t('games.title') }} :
                <strong :class="gamesTextClass">{{ formattedGames }}</strong>
            </span>
        </div>

        <!-- Transaction List -->
        <TransactionList
            :transactions="listedTransactions"
            @select="openEdit"
            @delete="onDelete"
            @duplicate="onDuplicate"
        />

        <!-- Create/Edit Dialog -->
        <TransactionDialog
            v-model="showDialog"
            :transaction="selectedTransaction"
            :initial-type="initialType"
            :duplicate-from="duplicateFromTransaction"
            @saved="onTransactionSaved"
        />

        <!-- Breakdown Modal -->
        <TransactionBreakdownModal
            v-model="showBreakdownModal"
            :type="breakdownType"
            :transactions="filteredTransactions"
            :default-currency="defaultCurrency"
        />
    </q-page>
</template>

<script setup lang="ts">
import { maskAmount } from 'src/composables/usePrivacy';
import type {
    Transaction,
    TransactionType,
    TransactionWithRelations,
    TransactionFilters,
} from 'src/types/transaction';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import TransactionList from 'src/components/transactions/TransactionList.vue';
import TransactionDialog from 'src/components/transactions/TransactionDialog.vue';
import TransactionBreakdownModal from 'src/components/transactions/TransactionBreakdownModal.vue';

const { t, locale } = useI18n();
usePage({ title: t('transactions.title'), showHeader: true });

const transactionStore = useTransactionStore();
const walletStore = useWalletStore();
const categoryStore = useCategoryStore();
const masterCategoryStore = useMasterCategoryStore();
const projectStore = useProjectStore();
const settingsStore = useSettingsStore();
const exchangeRateStore = useExchangeRateStore();
const investmentStore = useInvestmentStore();
const gameStore = useGameStore();

// Game transfer classification (deposits = expense, withdrawals = income)
const { classifyTransfer } = useGameTransfers();

// State
const showDialog = ref(false);
const selectedTransaction = ref<Transaction | null>(null);
const duplicateFromTransaction = ref<Transaction | null>(null);
const initialType = ref<TransactionType>('expense');
const activeFilter = ref<'all' | TransactionType>('all');
const searchQuery = ref('');

// Breakdown modal state
const showBreakdownModal = ref(false);
const breakdownType = ref<'income' | 'expense'>('expense');

// Month selection
const now = new Date();
const selectedMonth = ref(`${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`);
const showMonthPicker = ref(false);

// Filter tabs
const filterTabs = computed((): { value: 'all' | TransactionType; label: string }[] => [
    { value: 'all', label: t('common.all') },
    { value: 'income', label: t('transactions.income') },
    { value: 'expense', label: t('transactions.expense') },
    { value: 'transfer', label: t('transactions.transfer') },
    { value: 'debt', label: t('debts.title') },
]);

// Formatted month
const formattedMonth = computed(() => {
    const parts = selectedMonth.value.split('/');
    const year = parts[0] ?? '2024';
    const month = parts[1] ?? '01';
    const date = new Date(parseInt(year), parseInt(month) - 1);
    const text = new Intl.DateTimeFormat(locale.value, {
        month: 'long',
        year: 'numeric',
    }).format(date);
    return text.charAt(0).toUpperCase() + text.slice(1);
});

// Convert selected month to filter format
const monthFilter = computed(() => {
    const parts = selectedMonth.value.split('/');
    const year = parts[0] ?? '2024';
    const month = parts[1] ?? '01';
    return `${year}-${month}`;
});

// Get investment transactions for the month as TransactionWithRelations
const investmentTransactionsForMonth = computed((): TransactionWithRelations[] => {
    const monthStr = monthFilter.value; // 'YYYY-MM'

    return investmentStore.transactions
        .filter((tx) => {
            const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date);
            const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
            return txMonth === monthStr;
        })
        .map((tx) => {
            const item = investmentStore.getItemById(tx.investmentItemId);
            const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date);
            const createdAt = tx.createdAt instanceof Date ? tx.createdAt : new Date(tx.createdAt);

            return {
                id: `inv-${tx.id}`,
                type: 'investment' as const,
                amount: tx.quantity * tx.pricePerUnit,
                date: txDate,
                createdAt: createdAt,
                updatedAt: createdAt,
                investment: item
                    ? {
                          id: item.id,
                          label: item.label,
                          type: item.type,
                          currency: item.currency,
                      }
                    : undefined,
                investmentTransactionType: tx.type,
                quantity: tx.quantity,
                pricePerUnit: tx.pricePerUnit,
            };
        });
});

// Filtered transactions (regular + investment)
const filteredTransactions = computed((): TransactionWithRelations[] => {
    const filters: TransactionFilters = {
        month: monthFilter.value,
    };

    // Get regular transactions
    if (activeFilter.value !== 'all') {
        filters.type = activeFilter.value;
    }
    const regularTxs = transactionStore.getTransactionsWithRelations(filters);

    // If filtering by specific type (not 'all'), return only regular transactions
    if (activeFilter.value !== 'all') {
        return regularTxs;
    }

    // For 'all', merge regular and investment transactions
    const allTxs = [...regularTxs, ...investmentTransactionsForMonth.value];

    // Sort by date descending
    return [...allTxs].sort((a, b) => b.date.getTime() - a.date.getTime());
});

/**
 * Text a transaction can be found by in the search field.
 * @param tx - The transaction
 * @returns Lowercased searchable text
 */
function searchableText(tx: TransactionWithRelations): string {
    return [
        tx.description,
        tx.category?.name,
        tx.category?.masterCategory?.name,
        tx.wallet?.name,
        tx.fromWallet?.name,
        tx.toWallet?.name,
        tx.project?.name,
        tx.investment?.label,
        tx.debt?.counterparty,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}

// Transactions after the search query
const listedTransactions = computed((): TransactionWithRelations[] => {
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) return filteredTransactions.value;
    return filteredTransactions.value.filter((tx) => searchableText(tx).includes(query));
});

// Summary calculations
const summary = computed(() => {
    const txs = listedTransactions.value;
    const targetCurrency = defaultCurrency.value;
    let totalIncome = 0;
    let totalExpense = 0;
    let totalGames = 0; // net game balance = transfers received - transfers sent

    for (const tx of txs) {
        // Get the wallet currency for this transaction
        const walletCurrency =
            tx.investment?.currency ??
            tx.wallet?.currency ??
            tx.fromWallet?.currency ??
            targetCurrency;

        // Convert amount to default currency (use rate 1 if not configured)
        const convertedAmount = exchangeRateStore.convertWithDefault(
            tx.amount,
            walletCurrency,
            targetCurrency,
        );

        if (tx.type === 'income') {
            totalIncome += convertedAmount;
        } else if (tx.type === 'expense') {
            totalExpense += convertedAmount;
        } else if (tx.type === 'project') {
            if (tx.projectTransactionType === 'dividend') {
                totalIncome += convertedAmount;
            } else {
                totalExpense += convertedAmount;
            }
        } else if (tx.type === 'investment') {
            if (tx.investmentTransactionType === 'sell') {
                totalIncome += convertedAmount;
            } else {
                totalExpense += convertedAmount;
            }
        } else if (tx.type === 'transfer') {
            // Game transfers form a separate "games" bucket: received (withdrawal) minus
            // sent (deposit). This avoids inflating expenses with money that is recovered.
            const cls = classifyTransfer(tx);
            if (cls) {
                const converted = exchangeRateStore.convertWithDefault(
                    cls.amount,
                    cls.currency,
                    targetCurrency,
                );
                if (cls.kind === 'withdrawal') totalGames += converted;
                else totalGames -= converted;
            } else if (tx.fee) {
                // Regular (internal) transfer: only the fee is a real expense.
                const convertedFee = exchangeRateStore.convertWithDefault(
                    tx.fee,
                    walletCurrency,
                    targetCurrency,
                );
                totalExpense += convertedFee;
            }
        }
    }

    return {
        totalIncome,
        totalExpense,
        totalGames,
        balance: totalIncome - totalExpense + totalGames,
        transactionCount: txs.length,
    };
});

// Default currency
const defaultCurrency = computed(() => settingsStore.defaultCurrency ?? CurrencyCode.XOF);

const currencyLabel = computed(() => {
    const currency = CURRENCIES[defaultCurrency.value];
    return currency?.symbol ?? defaultCurrency.value;
});

// Format amounts
/**
 * Formats a numeric amount as a localized string without decimal places.
 * @param {number} amount - The amount to format
 * @returns {string} The formatted number string
 */
function formatAmount(amount: number): string {
    return maskAmount(
        new Intl.NumberFormat(locale.value, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount),
    );
}

const formattedBalance = computed(() => formatAmount(summary.value.balance));
const formattedIncome = computed(() => '+' + formatAmount(summary.value.totalIncome));
const formattedExpense = computed(() => '−' + formatAmount(summary.value.totalExpense));
const formattedGames = computed(() => {
    const value = summary.value.totalGames;
    const prefix = value >= 0 ? '+' : '';
    return prefix + formatAmount(value);
});
const gamesTextClass = computed(() =>
    summary.value.totalGames >= 0 ? 'text-positive' : 'text-negative',
);

// Load data
onMounted(async () => {
    await Promise.all([
        settingsStore.loadSettings(),
        walletStore.loadAll(),
        categoryStore.loadAll(),
        masterCategoryStore.loadAll(),
        projectStore.loadAll(),
        transactionStore.loadAll(),
        exchangeRateStore.loadAll(),
        investmentStore.loadAll(),
        gameStore.loadAll(),
    ]);
});

// Open breakdown modal
/**
 * Opens the transaction breakdown modal for income or expense analysis.
 * @param {'income' | 'expense'} type - The type of transactions to show breakdown for
 * @returns {void}
 */
function openBreakdown(type: 'income' | 'expense'): void {
    breakdownType.value = type;
    showBreakdownModal.value = true;
}

// Open edit dialog
/**
 * Opens the dialog to edit an existing transaction.
 * Retrieves the full transaction data from the store before editing.
 * @param {TransactionWithRelations} tx - The transaction to edit
 * @returns {void}
 */
function openEdit(tx: TransactionWithRelations): void {
    const fullTx = transactionStore.getTransactionById(tx.id);
    if (fullTx) {
        selectedTransaction.value = fullTx;
        duplicateFromTransaction.value = null;
        showDialog.value = true;
    }
}

// Handle duplicate transaction (swipe left)
/**
 * Creates a duplicate of an existing transaction.
 * Opens the create dialog with pre-filled data from the original transaction.
 * @param {TransactionWithRelations} tx - The transaction to duplicate
 * @returns {void}
 */
function onDuplicate(tx: TransactionWithRelations): void {
    const fullTx = transactionStore.getTransactionById(tx.id);
    if (fullTx) {
        selectedTransaction.value = null;
        duplicateFromTransaction.value = fullTx;
        showDialog.value = true;
    }
}

// Handle transaction saved
/**
 * Callback handler when a transaction is saved.
 * Clears the duplicate reference; list updates automatically via reactive store.
 * @returns {void}
 */
function onTransactionSaved(): void {
    // Transaction list will update automatically through reactive store
    duplicateFromTransaction.value = null;
}

// Handle transaction delete
/**
 * Deletes a transaction from the store.
 * @param {TransactionWithRelations} tx - The transaction to delete
 * @returns {Promise<void>}
 */
async function onDelete(tx: TransactionWithRelations): Promise<void> {
    await transactionStore.remove(tx.id);
}
</script>

<style lang="scss" scoped>
.toolbar {
    display: flex;
    gap: 10px;
}

.search {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 48px;
    padding: 0 14px;
    background: $bg-card;
    border: 1px solid $border-color;
    border-radius: 16px;
    color: $text-secondary;

    &__input {
        flex: 1;
        min-width: 0;
        border: 0;
        outline: 0;
        background: transparent;
        font-family: inherit;
        font-size: 14px;
        color: $text-primary;
    }
}

.month-chip {
    flex-shrink: 0;
    height: 48px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    border-radius: 16px;
    border: 1px solid $border-color;
    background: $bg-card;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: $text-primary;
    cursor: pointer;
}

.chips {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
    margin: 0 -20px;
    padding: 0 20px;

    &::-webkit-scrollbar {
        display: none;
    }
}

.chip {
    flex-shrink: 0;
    height: 36px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1px solid $border-color;
    background: $bg-card;
    font-family: inherit;
    font-size: 13px;
    font-weight: 600;
    color: $text-primary;
    cursor: pointer;

    &--active {
        background: $text-primary;
        border-color: $text-primary;
        color: #ffffff;
    }
}

.summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;

    &__card {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 14px;
        border: 0;
        border-radius: $radius-tile;
        background: $bg-card;
        font-family: inherit;
        text-align: left;
        cursor: pointer;
    }

    &__value {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.02em;
    }
}

.summary-caption {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: -6px;
    padding: 0 4px;
}
</style>
