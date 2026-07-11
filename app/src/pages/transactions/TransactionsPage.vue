<template>
    <q-page class="q-pa-md">
        <!-- Summary Cards -->
        <div class="summary-section q-mb-lg">
            <!-- Balance Card -->
            <q-card class="summary-card summary-card--value" flat>
                <q-card-section class="q-pa-md">
                    <div class="text-caption balance-label">{{ t('transactions.balance') }}</div>
                    <div class="summary-value q-mt-xs">{{ formattedBalance }}</div>
                    <div class="summary-currency">{{ currencyLabel }}</div>
                    <div class="text-caption balance-label q-mt-xs">
                        {{ summary.transactionCount }} {{ t('transactions.transactionsCount') }}
                    </div>
                </q-card-section>
            </q-card>

            <!-- Income / Expense / Games Cards -->
            <div class="summary-row">
                <q-card
                    class="summary-card summary-card--mini clickable"
                    flat
                    bordered
                    @click="openBreakdown('income')"
                >
                    <q-card-section class="q-pa-sm column items-center text-center">
                        <q-avatar size="30px" color="positive" text-color="white">
                            <q-icon name="arrow_downward" size="16px" />
                        </q-avatar>
                        <div class="text-caption text-grey-6 q-mt-xs">
                            {{ t('transactions.income') }}
                        </div>
                        <div class="summary-value-mini text-positive">{{ formattedIncome }}</div>
                    </q-card-section>
                </q-card>

                <q-card
                    class="summary-card summary-card--mini clickable"
                    flat
                    bordered
                    @click="openBreakdown('expense')"
                >
                    <q-card-section class="q-pa-sm column items-center text-center">
                        <q-avatar size="30px" color="negative" text-color="white">
                            <q-icon name="arrow_upward" size="16px" />
                        </q-avatar>
                        <div class="text-caption text-grey-6 q-mt-xs">
                            {{ t('transactions.expense') }}
                        </div>
                        <div class="summary-value-mini text-negative">{{ formattedExpense }}</div>
                    </q-card-section>
                </q-card>

                <q-card class="summary-card summary-card--mini" flat bordered>
                    <q-card-section class="q-pa-sm column items-center text-center">
                        <q-avatar size="30px" color="deep-orange" text-color="white">
                            <q-icon name="casino" size="16px" />
                        </q-avatar>
                        <div class="text-caption text-grey-6 q-mt-xs">{{ t('games.title') }}</div>
                        <div class="summary-value-mini" :class="gamesTextClass">
                            {{ formattedGames }}
                        </div>
                    </q-card-section>
                </q-card>
            </div>
        </div>

        <!-- Filter Tabs -->
        <TabNav v-model="activeFilter" :tabs="filterTabs" variant="pills" class="q-mb-md" />

        <!-- Month Selector -->
        <div class="month-selector q-mb-md">
            <BtnIcon icon="chevron_left" @click="prevMonth" />
            <div class="month-label" @click="showMonthPicker = true">
                {{ formattedMonth }}
                <q-icon name="expand_more" size="18px" class="q-ml-xs" />
            </div>
            <BtnIcon icon="chevron_right" :disable="isCurrentMonth" @click="nextMonth" />
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

        <!-- Transaction List -->
        <TransactionList
            :transactions="filteredTransactions"
            @select="openEdit"
            @delete="onDelete"
            @duplicate="onDuplicate"
        />

        <!-- Add FAB with menu -->
        <q-page-sticky position="bottom-right" :offset="[18, 18]">
            <q-fab
                v-model="fabOpen"
                icon="add"
                active-icon="close"
                direction="up"
                color="primary"
                padding="12px"
            >
                <q-fab-action color="positive" icon="arrow_downward" @click="openCreate('income')">
                    <q-tooltip anchor="center left" self="center right">{{
                        t('transactions.addIncome')
                    }}</q-tooltip>
                </q-fab-action>
                <q-fab-action color="negative" icon="arrow_upward" @click="openCreate('expense')">
                    <q-tooltip anchor="center left" self="center right">{{
                        t('transactions.addExpense')
                    }}</q-tooltip>
                </q-fab-action>
                <q-fab-action color="blue" icon="swap_horiz" @click="openCreate('transfer')">
                    <q-tooltip anchor="center left" self="center right">{{
                        t('transactions.addTransfer')
                    }}</q-tooltip>
                </q-fab-action>
            </q-fab>
        </q-page-sticky>

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
import TabNav from 'src/components/tabs/TabNav.vue';
import BtnIcon from 'src/components/buttons/BtnIcon.vue';

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
const fabOpen = ref(false);

// Breakdown modal state
const showBreakdownModal = ref(false);
const breakdownType = ref<'income' | 'expense'>('expense');

// Month selection
const now = new Date();
const selectedMonth = ref(`${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`);
const showMonthPicker = ref(false);

// Filter tabs
const filterTabs = computed(() => [
    { value: 'all', label: t('common.all') },
    { value: 'income', label: t('transactions.income') },
    { value: 'expense', label: t('transactions.expense') },
    { value: 'transfer', label: t('transactions.transfer') },
]);

// Current month check
const isCurrentMonth = computed(() => {
    const current = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth.value === current;
});

// Formatted month
const formattedMonth = computed(() => {
    const parts = selectedMonth.value.split('/');
    const year = parts[0] ?? '2024';
    const month = parts[1] ?? '01';
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return new Intl.DateTimeFormat(locale.value, {
        month: 'long',
        year: 'numeric',
    }).format(date);
});

// Month navigation
/**
 * Navigates to the previous month in the transaction view.
 * Updates the selected month state to show transactions from the previous month.
 * @returns {void}
 */
function prevMonth(): void {
    const parts = selectedMonth.value.split('/').map(Number);
    const year = parts[0] ?? 2024;
    const month = parts[1] ?? 1;
    const date = new Date(year, month - 2);
    selectedMonth.value = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Navigates to the next month in the transaction view.
 * Does nothing if already viewing the current month.
 * @returns {void}
 */
function nextMonth(): void {
    if (isCurrentMonth.value) return;
    const parts = selectedMonth.value.split('/').map(Number);
    const year = parts[0] ?? 2024;
    const month = parts[1] ?? 1;
    const date = new Date(year, month);
    selectedMonth.value = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

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

// Summary calculations
const summary = computed(() => {
    const txs = filteredTransactions.value;
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
    return new Intl.NumberFormat(locale.value, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

const formattedBalance = computed(() => formatAmount(summary.value.balance));
const formattedIncome = computed(() => '+' + formatAmount(summary.value.totalIncome));
const formattedExpense = computed(() => '-' + formatAmount(summary.value.totalExpense));
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

// Open create dialog
/**
 * Opens the dialog to create a new transaction of the specified type.
 * Clears any previously selected or duplicate transaction before showing the dialog.
 * @param {TransactionType} type - The type of transaction to create (income, expense, or transfer)
 * @returns {void}
 */
function openCreate(type: TransactionType): void {
    selectedTransaction.value = null;
    duplicateFromTransaction.value = null;
    initialType.value = type;
    showDialog.value = true;
    fabOpen.value = false;
}

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
@use 'sass:color';

.summary-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.summary-card {
    border-radius: 16px;
    overflow: hidden;

    &--value {
        background: linear-gradient(
            135deg,
            $primary 0%,
            color.adjust($primary, $lightness: -10%) 100%
        );
        color: white;

        .balance-label {
            color: rgba(255, 255, 255, 0.7);
        }

        .summary-value {
            color: white;
        }

        .summary-currency {
            color: rgba(255, 255, 255, 0.7);
        }
    }

    &--mini {
        flex: 1;
        border-radius: 12px;
    }
}

.summary-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
}

.summary-value {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
}

.summary-value-mini {
    font-size: 15px;
    font-weight: 600;
    white-space: nowrap;
    line-height: 1.2;
}

.summary-currency {
    font-size: 14px;
    font-weight: 500;
}

.month-selector {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;

    .month-label {
        display: flex;
        align-items: center;
        font-weight: 600;
        font-size: 16px;
        text-transform: capitalize;
        cursor: pointer;
        padding: 8px 16px;
        border-radius: 20px;
        background: $grey-2;
        transition: background 0.2s;

        &:hover {
            background: $grey-3;
        }
    }
}

.clickable {
    cursor: pointer;
    transition:
        transform 0.15s,
        box-shadow 0.15s;

    &:active {
        transform: scale(0.98);
    }
}
</style>
