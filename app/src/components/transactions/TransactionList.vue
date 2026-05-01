<template>
    <div class="transaction-list">
        <!-- Empty state -->
        <div v-if="transactions.length === 0" class="empty-state">
            <q-icon name="receipt_long" size="64px" color="grey-4" />
            <div class="text-subtitle1 text-grey-6 q-mt-md">
                {{ t('transactions.noTransactions') }}
            </div>
        </div>

        <!-- Transaction list -->
        <q-list v-else separator class="rounded-borders">
            <template v-for="group in groupedTransactions" :key="group.date">
                <!-- Date header -->
                <q-item-label v-if="showDateHeaders" header class="date-header">
                    {{ formatDateHeader(group.date) }}
                </q-item-label>

                <!-- Transactions for this date -->
                <q-slide-item
                    v-for="tx in group.transactions"
                    :key="tx.id"
                    :left-color="canDuplicate(tx) ? 'primary' : undefined"
                    :right-color="canEdit(tx) ? 'negative' : undefined"
                    @left="(details: { reset: () => void }) => onSlideLeft(details, tx)"
                    @right="(details: { reset: () => void }) => onSlideRight(details, tx)"
                >
                    <template v-if="canDuplicate(tx)" #left>
                        <q-icon name="content_copy" />
                    </template>
                    <template v-if="canEdit(tx)" #right>
                        <q-icon name="delete" />
                    </template>

                    <q-item :clickable="canEdit(tx)" @click="canEdit(tx) && $emit('select', tx)">
                        <q-item-section avatar>
                            <q-avatar
                                :color="getTransactionColor(tx)"
                                text-color="white"
                                size="40px"
                            >
                                <q-icon :name="getTransactionIcon(tx)" size="20px" />
                            </q-avatar>
                        </q-item-section>

                        <q-item-section>
                            <q-item-label class="transaction-title">
                                <span class="type-indicator" :class="getTypeIndicatorClass(tx)" />
                                {{ getTransactionTitle(tx) }}
                            </q-item-label>
                            <q-item-label caption class="transaction-subtitle">
                                {{ getTransactionSubtitle(tx) }}
                            </q-item-label>
                        </q-item-section>

                        <q-item-section side>
                            <q-item-label :class="['transaction-amount', getAmountClass(tx)]">
                                {{ formatTransactionAmount(tx) }}
                            </q-item-label>
                            <q-item-label
                                v-if="tx.type === 'transfer' && tx.fee"
                                caption
                                class="text-grey-6"
                            >
                                {{ t('transactions.fee') }}: {{ formatFee(tx) }}
                            </q-item-label>
                        </q-item-section>
                    </q-item>
                </q-slide-item>
            </template>
        </q-list>

        <!-- Delete confirmation dialog -->
        <ModalConfirm
            v-model="showDeleteConfirm"
            :title="t('transactions.deleteTitle')"
            :message="t('transactions.deleteMessage')"
            :confirm-label="t('common.delete')"
            :cancel-label="t('common.cancel')"
            variant="danger"
            :loading="isDeleting"
            @confirm="confirmDelete"
            @cancel="cancelDelete"
        />
    </div>
</template>

<script setup lang="ts">
import type { TransactionWithRelations } from 'src/types/transaction';
import { CURRENCIES } from 'src/types/currency';
import ModalConfirm from '../modals/ModalConfirm.vue';

const props = withDefaults(
    defineProps<{
        transactions: TransactionWithRelations[];
        showDateHeaders?: boolean;
    }>(),
    {
        showDateHeaders: true,
    },
);

const emit = defineEmits<{
    select: [transaction: TransactionWithRelations];
    delete: [transaction: TransactionWithRelations];
    duplicate: [transaction: TransactionWithRelations];
}>();

const { t, locale } = useI18n();
const settingsStore = useSettingsStore();

// Delete state
const showDeleteConfirm = ref(false);
const transactionToDelete = ref<TransactionWithRelations | null>(null);
const isDeleting = ref(false);

/**
 * Checks if a transaction can be duplicated.
 * Only income, expense, and transfer transactions can be duplicated.
 * @param tx - The transaction to check
 * @returns True if the transaction can be duplicated, false otherwise
 */
function canDuplicate(tx: TransactionWithRelations): boolean {
    return tx.type === 'income' || tx.type === 'expense' || tx.type === 'transfer';
}

/**
 * Checks if a transaction can be edited or deleted.
 * Investment and project transactions cannot be edited directly.
 * @param tx - The transaction to check
 * @returns True if the transaction can be edited/deleted, false otherwise
 */
function canEdit(tx: TransactionWithRelations): boolean {
    return tx.type !== 'investment' && tx.type !== 'project';
}

/**
 * Handles the swipe left action on a transaction item to duplicate it.
 * @param details - Object containing the reset function for the slide item
 * @param details.reset - Function to reset the slide position
 * @param tx - The transaction that was swiped
 */
function onSlideLeft({ reset }: { reset: () => void }, tx: TransactionWithRelations) {
    if (canDuplicate(tx)) {
        emit('duplicate', tx);
    }
    reset();
}

/**
 * Handles the swipe right action on a transaction item to delete it.
 * Shows a confirmation dialog before deletion.
 * @param details - Object containing the reset function for the slide item
 * @param details.reset - Function to reset the slide position
 * @param tx - The transaction that was swiped
 */
function onSlideRight({ reset }: { reset: () => void }, tx: TransactionWithRelations) {
    if (!canEdit(tx)) {
        reset();
        return;
    }
    transactionToDelete.value = tx;
    showDeleteConfirm.value = true;
    reset();
}

/**
 * Confirms the deletion of the selected transaction.
 * Emits the 'delete' event and resets the deletion state.
 */
function confirmDelete() {
    if (!transactionToDelete.value) return;

    isDeleting.value = true;
    emit('delete', transactionToDelete.value);

    // Reset state after emitting (parent handles actual deletion)
    setTimeout(() => {
        isDeleting.value = false;
        showDeleteConfirm.value = false;
        transactionToDelete.value = null;
    }, 100);
}

/**
 * Cancels the delete confirmation dialog and clears the selected transaction.
 */
function cancelDelete() {
    transactionToDelete.value = null;
}

// Group transactions by date
const groupedTransactions = computed(() => {
    const groups: { date: string; transactions: TransactionWithRelations[] }[] = [];
    const dateMap = new Map<string, TransactionWithRelations[]>();

    for (const tx of props.transactions) {
        const dateKey = tx.date.toISOString().split('T')[0] ?? '';
        if (!dateMap.has(dateKey)) {
            dateMap.set(dateKey, []);
        }
        dateMap.get(dateKey)!.push(tx);
    }

    // Sort dates descending
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));

    for (const date of sortedDates) {
        groups.push({
            date,
            transactions: dateMap.get(date)!,
        });
    }

    return groups;
});

/**
 * Formats a date string into a human-readable header.
 * Shows 'Today' or 'Yesterday' for recent dates, otherwise shows full date.
 * @param dateStr - The ISO date string to format (YYYY-MM-DD)
 * @returns The formatted date header string
 */
function formatDateHeader(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
        return t('transactions.today');
    }
    if (dateStr === yesterday.toISOString().split('T')[0]) {
        return t('transactions.yesterday');
    }

    return new Intl.DateTimeFormat(locale.value, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(date);
}

/**
 * Gets the appropriate icon name for a transaction based on its type.
 * @param tx - The transaction to get the icon for
 * @returns The Material Design icon name
 */
function getTransactionIcon(tx: TransactionWithRelations): string {
    switch (tx.type) {
        case 'income':
            return tx.category?.icon ?? 'arrow_downward';
        case 'expense':
            return tx.category?.icon ?? 'arrow_upward';
        case 'transfer':
            return 'swap_horiz';
        case 'project':
            return tx.projectTransactionType === 'injection' ? 'add_circle' : 'payments';
        case 'investment':
            return tx.investmentTransactionType === 'buy' ? 'shopping_cart' : 'sell';
        default:
            return 'receipt';
    }
}

/**
 * Gets the CSS class for the type indicator dot based on transaction type.
 * @param tx - The transaction to get the indicator class for
 * @returns The CSS class name for styling the colored dot
 */
function getTypeIndicatorClass(tx: TransactionWithRelations): string {
    switch (tx.type) {
        case 'income':
            return 'type-income';
        case 'expense':
            return 'type-expense';
        case 'transfer':
            return 'type-transfer';
        case 'project':
            return tx.projectTransactionType === 'injection'
                ? 'type-project-injection'
                : 'type-project-dividend';
        case 'investment':
            return tx.investmentTransactionType === 'buy'
                ? 'type-investment-buy'
                : 'type-investment-sell';
        default:
            return 'type-default';
    }
}

/**
 * Gets the avatar background color for a transaction based on its type.
 * @param tx - The transaction to get the color for
 * @returns The Quasar color name or hex color value
 */
function getTransactionColor(tx: TransactionWithRelations): string {
    switch (tx.type) {
        case 'income':
            return tx.category?.masterCategory?.color ?? 'green';
        case 'expense':
            return tx.category?.masterCategory?.color ?? 'red';
        case 'transfer':
            return 'blue';
        case 'project':
            return tx.projectTransactionType === 'injection' ? 'orange' : 'purple';
        case 'investment':
            return tx.investmentTransactionType === 'buy' ? 'teal' : 'amber';
        default:
            return 'grey';
    }
}

/**
 * Gets the title text to display for a transaction.
 * Shows category name, transfer label, project name, or investment label.
 * @param tx - The transaction to get the title for
 * @returns The title string to display
 */
function getTransactionTitle(tx: TransactionWithRelations): string {
    switch (tx.type) {
        case 'income':
        case 'expense':
            return tx.category?.name ?? t('common.noData');
        case 'transfer':
            return t('transactions.transfer');
        case 'project':
            return tx.project?.name ?? t('common.noData');
        case 'investment':
            return tx.investment?.label ?? t('common.noData');
        default:
            return t('common.noData');
    }
}

/**
 * Gets the subtitle text to display for a transaction.
 * Shows wallet name, transfer direction, or transaction type details.
 * @param tx - The transaction to get the subtitle for
 * @returns The subtitle string to display
 */
function getTransactionSubtitle(tx: TransactionWithRelations): string {
    switch (tx.type) {
        case 'income':
        case 'expense':
            return tx.wallet?.name ?? '';
        case 'transfer':
            return `${tx.fromWallet?.name ?? '?'} → ${tx.toWallet?.name ?? '?'}`;
        case 'project':
            return tx.projectTransactionType === 'injection'
                ? t('transactions.injection')
                : t('transactions.dividend');
        case 'investment':
            return tx.investmentTransactionType === 'buy'
                ? `${t('investments.buy')} • ${tx.quantity} × ${formatPricePerUnit(tx)}`
                : `${t('investments.sell')} • ${tx.quantity} × ${formatPricePerUnit(tx)}`;
        default:
            return '';
    }
}

/**
 * Gets the CSS class for styling the transaction amount based on type.
 * Positive amounts (income, dividend, sell) get green, negative get red.
 * @param tx - The transaction to get the amount class for
 * @returns The CSS class name for text color styling
 */
function getAmountClass(tx: TransactionWithRelations): string {
    switch (tx.type) {
        case 'income':
            return 'text-positive';
        case 'expense':
            return 'text-negative';
        case 'transfer':
            return 'text-blue';
        case 'project':
            return tx.projectTransactionType === 'injection' ? 'text-negative' : 'text-positive';
        case 'investment':
            return tx.investmentTransactionType === 'buy' ? 'text-negative' : 'text-positive';
        default:
            return '';
    }
}

/**
 * Formats the transaction amount as a currency string with appropriate prefix.
 * @param tx - The transaction to format the amount for
 * @returns The formatted currency string with +/- prefix
 */
function formatTransactionAmount(tx: TransactionWithRelations): string {
    const currency =
        tx.investment?.currency ??
        tx.wallet?.currency ??
        tx.fromWallet?.currency ??
        settingsStore.defaultCurrency ??
        'XOF';
    const currencyInfo = CURRENCIES[currency];
    const prefix = getAmountPrefix(tx);

    const formatted = new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency,
        minimumFractionDigits: currencyInfo?.decimals ?? 0,
        maximumFractionDigits: currencyInfo?.decimals ?? 2,
    }).format(tx.amount);

    return prefix + formatted;
}

/**
 * Gets the +/- prefix for a transaction amount based on its type.
 * @param tx - The transaction to get the prefix for
 * @returns '+' for income, '-' for expense, or empty string for transfers
 */
function getAmountPrefix(tx: TransactionWithRelations): string {
    switch (tx.type) {
        case 'income':
            return '+';
        case 'expense':
            return '-';
        case 'project':
            return tx.projectTransactionType === 'injection' ? '-' : '+';
        case 'investment':
            return tx.investmentTransactionType === 'buy' ? '-' : '+';
        default:
            return '';
    }
}

/**
 * Formats the price per unit for investment transactions.
 * @param tx - The investment transaction to format
 * @returns The formatted currency string for the unit price, or empty string if not applicable
 */
function formatPricePerUnit(tx: TransactionWithRelations): string {
    if (!tx.pricePerUnit) return '';
    const currency = tx.investment?.currency ?? settingsStore.defaultCurrency ?? 'XOF';

    return new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(tx.pricePerUnit);
}

/**
 * Formats the transfer fee amount as a currency string.
 * @param tx - The transfer transaction to format the fee for
 * @returns The formatted currency string for the fee, or empty string if no fee
 */
function formatFee(tx: TransactionWithRelations): string {
    if (!tx.fee) return '';
    const currency = tx.fromWallet?.currency ?? settingsStore.defaultCurrency ?? 'XOF';
    const currencyInfo = CURRENCIES[currency];

    return new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency,
        minimumFractionDigits: currencyInfo?.decimals ?? 0,
        maximumFractionDigits: currencyInfo?.decimals ?? 2,
    }).format(tx.fee);
}
</script>

<style lang="scss" scoped>
.transaction-list {
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
        text-align: center;
    }

    .date-header {
        font-weight: 600;
        color: $text-secondary;
        text-transform: capitalize;
        padding: 16px 16px 8px;
        font-size: 13px;
    }

    .transaction-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 500;
        font-size: 15px;
        color: $text-primary;
    }

    .type-indicator {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;

        &.type-income {
            background-color: $positive;
        }

        &.type-expense {
            background-color: $negative;
        }

        &.type-transfer {
            background-color: $info;
        }

        &.type-project-injection {
            background-color: $warning;
        }

        &.type-project-dividend {
            background-color: #9c27b0; // Purple
        }

        &.type-investment-buy {
            background-color: $teal-6;
        }

        &.type-investment-sell {
            background-color: $amber-8;
        }

        &.type-default {
            background-color: $grey-5;
        }
    }

    .transaction-subtitle {
        font-size: 13px;
        color: $text-secondary;
        margin-left: 16px; // Align with title text after the dot
    }

    .transaction-amount {
        font-weight: 600;
        font-size: 15px;
    }
}
</style>
