<template>
    <q-page class="zk-page">
        <!-- What is owed, both ways -->
        <div v-if="debts.length > 0" class="summary-grid">
            <div class="summary-tile">
                <span class="zk-caption">{{ t('debts.totalReceivable') }}</span>
                <span class="zk-amount summary-tile__amount text-positive">
                    {{ formatCurrency(totalReceivable) }}
                </span>
                <span class="zk-caption">
                    {{ t('debts.openCount', { count: debtStore.receivables.length }) }}
                </span>
            </div>
            <div class="summary-tile">
                <span class="zk-caption">{{ t('debts.totalPayable') }}</span>
                <span class="zk-amount summary-tile__amount text-negative">
                    {{ formatCurrency(totalPayable) }}
                </span>
                <span class="zk-caption">
                    {{ t('debts.openCount', { count: debtStore.payables.length }) }}
                </span>
            </div>
        </div>

        <!-- Status filter -->
        <div
            v-if="debts.length > 0"
            class="chips"
            role="tablist"
            :aria-label="t('debts.statusFilter')"
        >
            <button
                v-for="option in statusOptions"
                :key="option.value"
                type="button"
                role="tab"
                class="chip"
                :class="{ 'chip--active': statusFilter === option.value }"
                :aria-selected="statusFilter === option.value"
                @click="statusFilter = option.value"
            >
                {{ option.label }}
            </button>
        </div>

        <!-- Empty state -->
        <div v-if="debts.length === 0" class="zk-empty">
            <span class="zk-empty__icon">
                <q-icon name="o_handshake" size="30px" />
            </span>
            <span class="zk-empty__title">{{ t('debts.noDebts') }}</span>
        </div>

        <div v-else-if="visibleDebts.length === 0" class="zk-empty">
            <span class="zk-empty__title">
                {{ statusFilter === 'open' ? t('debts.noOpenDebts') : t('debts.noSettledDebts') }}
            </span>
        </div>

        <!-- List, overdue first -->
        <div v-else class="debt-list">
            <DebtCard
                v-for="debt in visibleDebts"
                :key="debt.id"
                :debt="debt"
                @click="openEdit(debt)"
                @repay="openRepay(debt)"
                @undo="openUndo(debt)"
            />
        </div>

        <DebtDialog v-model="showDialog" :debt="selected" @delete="onDeleteFromDialog" />
        <DebtRepaymentDialog v-model="showRepayment" :debt="toRepay" />

        <ModalConfirm
            v-model="showUndoConfirm"
            :title="t('debts.undoRepayment')"
            :message="undoMessage"
            :subtitle="t('debts.undoRepaymentHint')"
            :confirm-label="t('debts.undoRepayment')"
            :loading="isUndoing"
            max-width="400px"
            @confirm="onUndo"
        />

        <!-- Deleting a debt is never silent about its money: the answer is required -->
        <ModalConfirm
            v-model="showDeleteConfirm"
            :title="t('common.delete')"
            :message="t('debts.deleteConfirm')"
            variant="danger"
            :confirm-label="t('common.delete')"
            :confirm-disable="deleteTransactions === null"
            :loading="isDeleting"
            max-width="400px"
            @confirm="onDelete"
        >
            <div class="q-mt-md">
                <div class="text-body2 text-weight-medium">
                    {{ t('debts.deleteTransactionsQuestion', { count: linkedCount }) }}
                </div>
                <q-option-group
                    v-model="deleteTransactions"
                    :options="deleteOptions"
                    type="radio"
                    dense
                    class="q-mt-xs"
                />
                <div class="text-caption text-grey-7 q-mt-xs">
                    {{
                        deleteTransactions === true
                            ? t('debts.deleteTransactionsYesHint')
                            : deleteTransactions === false
                              ? t('debts.deleteTransactionsNoHint')
                              : t('debts.deleteTransactionsRequired')
                    }}
                </div>
            </div>
        </ModalConfirm>
    </q-page>
</template>

<script setup lang="ts">
import type { Debt, DebtWithStats } from 'src/types/debt';
import type { Transaction } from 'src/types/transaction';
import { useDebtStore } from 'src/stores/debt';
import DebtCard from 'src/components/debts/DebtCard.vue';
import DebtDialog from 'src/components/debts/DebtDialog.vue';
import DebtRepaymentDialog from 'src/components/debts/DebtRepaymentDialog.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';

const { t, locale } = useI18n();
usePage({
    title: t('debts.title'),
    showHeader: true,
    showBack: true,
    actions: [{ icon: 'add', label: t('common.add'), onClick: () => openCreate() }],
});

const route = useRoute();
const router = useRouter();
const debtStore = useDebtStore();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();
const transactionStore = useTransactionStore();
const { formatCurrency, convert } = useCurrency();

const showDialog = ref(false);
const showRepayment = ref(false);
const showDeleteConfirm = ref(false);
const selected = ref<Debt | null>(null);
const toRepay = ref<DebtWithStats | null>(null);
const toDelete = ref<Debt | null>(null);
/** Null until the user answers: the delete button stays blocked. */
const deleteTransactions = ref<boolean | null>(null);
const isDeleting = ref(false);
const showUndoConfirm = ref(false);
const toUndo = ref<DebtWithStats | null>(null);
const isUndoing = ref(false);

/** Debts with something still outstanding come first, overdue at the very top. */
const debts = computed(() =>
    [...debtStore.debtsWithStats].sort((a: DebtWithStats, b: DebtWithStats) => {
        if (a.isSettled !== b.isSettled) return a.isSettled ? 1 : -1;
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
    }),
);

// Status filter chips (open debts first, as on the validated mockup)
const statusFilter = ref<'open' | 'settled'>('open');
const statusOptions = computed((): { value: 'open' | 'settled'; label: string }[] => [
    { value: 'open', label: t('debts.filterOpen') },
    { value: 'settled', label: t('debts.filterSettled') },
]);

const visibleDebts = computed(() =>
    debts.value.filter((debt) => debt.isSettled === (statusFilter.value === 'settled')),
);

/**
 * Sums outstanding amounts, converted into the default currency.
 * @param rows - The debts to total
 * @returns The total in the default currency
 */
function totalOutstanding(rows: DebtWithStats[]): number {
    return rows.reduce((sum, debt) => sum + convert(debt.outstanding, debt.currency), 0);
}

const totalReceivable = computed(() => totalOutstanding(debtStore.receivables));
const totalPayable = computed(() => totalOutstanding(debtStore.payables));

onMounted(async () => {
    await Promise.all([
        settingsStore.loadSettings(),
        debtStore.loadAll(),
        walletStore.loadAll(),
        transactionStore.loadAll(),
    ]);
    // Opened from the dashboard quick action: start a new debt right away
    if (route.query.add) {
        openCreate();
        void router.replace({ query: {} });
    }
});

/**
 * Opens the dialog to record a new debt.
 */
function openCreate(): void {
    selected.value = null;
    showDialog.value = true;
}

/**
 * Opens the dialog to edit a debt.
 * @param debt - The debt to edit
 */
function openEdit(debt: DebtWithStats): void {
    selected.value = debtStore.getById(debt.id) ?? null;
    showDialog.value = true;
}

/**
 * Opens the repayment dialog.
 * @param debt - The debt being repaid
 */
function openRepay(debt: DebtWithStats): void {
    toRepay.value = debt;
    showRepayment.value = true;
}

/**
 * Most recent repayment of a debt: the one undone first.
 * @param debtId - The debt identifier
 * @returns The latest repayment transaction, if any
 */
function lastRepayment(debtId: string): Transaction | undefined {
    return transactionStore
        .getTransactionsByDebtId(debtId)
        .filter((tx) => tx.type === 'debt' && tx.debtTransactionType === 'repayment')
        .sort(
            (a, b) =>
                b.date.getTime() - a.date.getTime() ||
                b.createdAt.getTime() - a.createdAt.getTime(),
        )[0];
}

const undoMessage = computed(() => {
    const repayment = toUndo.value ? lastRepayment(toUndo.value.id) : undefined;
    if (!toUndo.value || !repayment) return '';
    return t('debts.undoRepaymentConfirm', {
        amount: formatCurrency(repayment.amount, toUndo.value.currency),
        date: new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(repayment.date),
    });
});

/**
 * Opens the confirmation to undo the last repayment of a settled debt.
 * @param debt - The settled debt
 */
function openUndo(debt: DebtWithStats): void {
    toUndo.value = debt;
    showUndoConfirm.value = true;
}

/**
 * Removes the last repayment. Going through the transaction store reverts the
 * wallet balance and the repaid total together, so the debt reopens with the
 * money back where it was.
 * @returns Promise resolving when the repayment is removed
 */
async function onUndo(): Promise<void> {
    const repayment = toUndo.value ? lastRepayment(toUndo.value.id) : undefined;
    if (!repayment) return;

    isUndoing.value = true;
    try {
        await transactionStore.remove(repayment.id);
        toUndo.value = null;
        showUndoConfirm.value = false;
    } finally {
        isUndoing.value = false;
    }
}

/** Movements recorded against the debt being deleted. */
const linkedCount = computed(() =>
    toDelete.value ? transactionStore.getTransactionsByDebtId(toDelete.value.id).length : 0,
);

const deleteOptions = computed(() => [
    { label: t('common.yes'), value: true },
    { label: t('common.no'), value: false },
]);

/**
 * Starts the delete flow from the edit sheet.
 * @param debt - The debt being edited
 */
function onDeleteFromDialog(debt: Debt): void {
    showDialog.value = false;
    openDelete(debt);
}

/**
 * Opens the delete confirmation, with the transaction question unanswered.
 * @param debt - The debt to delete
 */
function openDelete(debt: Debt): void {
    toDelete.value = debtStore.getById(debt.id) ?? null;
    deleteTransactions.value = null;
    showDeleteConfirm.value = true;
}

/**
 * Deletes the selected debt, and its movements when the user asked for it.
 *
 * Removing a movement goes through the transaction store so the wallet balance
 * is reverted with it — deleting the row alone would leave the money moved with
 * nothing to show for it. The debt goes last, so those reverts still find it.
 * @returns Promise resolving when the deletion completes
 */
async function onDelete(): Promise<void> {
    if (!toDelete.value || deleteTransactions.value === null) return;

    isDeleting.value = true;
    try {
        if (deleteTransactions.value) {
            const linked = transactionStore.getTransactionsByDebtId(toDelete.value.id);
            for (const transaction of linked) {
                await transactionStore.remove(transaction.id);
            }
        }

        await debtStore.remove(toDelete.value.id);
        toDelete.value = null;
        showDeleteConfirm.value = false;
    } finally {
        isDeleting.value = false;
    }
}
</script>

<style lang="scss" scoped>
.summary-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.summary-tile {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 16px;
    border-radius: 20px;
    background: $bg-card;
    min-width: 0;

    &__amount {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -0.02em;
        overflow-wrap: anywhere;
    }
}

.chips {
    display: flex;
    gap: 8px;
}

.chip {
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

.debt-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>
