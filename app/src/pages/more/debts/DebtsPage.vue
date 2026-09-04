<template>
    <q-page class="q-pa-md">
        <!-- What is owed, both ways -->
        <div v-if="debts.length > 0" class="row q-col-gutter-sm q-mb-md">
            <div class="col-6">
                <q-card flat bordered class="tile">
                    <div class="text-caption text-grey-6">{{ t('debts.totalReceivable') }}</div>
                    <div class="text-subtitle1 text-weight-medium text-positive">
                        {{ formatCurrency(totalReceivable) }}
                    </div>
                    <div class="text-caption text-grey-6">
                        {{ t('debts.openCount', { count: debtStore.receivables.length }) }}
                    </div>
                </q-card>
            </div>
            <div class="col-6">
                <q-card flat bordered class="tile">
                    <div class="text-caption text-grey-6">{{ t('debts.totalPayable') }}</div>
                    <div class="text-subtitle1 text-weight-medium text-negative">
                        {{ formatCurrency(totalPayable) }}
                    </div>
                    <div class="text-caption text-grey-6">
                        {{ t('debts.openCount', { count: debtStore.payables.length }) }}
                    </div>
                </q-card>
            </div>
        </div>

        <!-- Empty state -->
        <div v-if="debts.length === 0" class="empty-state">
            <q-icon name="handshake" size="64px" color="grey-4" />
            <div class="text-grey-6 q-mt-md">{{ t('debts.noDebts') }}</div>
        </div>

        <!-- List, unsettled first -->
        <div v-else class="debt-list">
            <DebtCard
                v-for="debt in debts"
                :key="debt.id"
                :debt="debt"
                class="q-mb-sm"
                @click="openEdit(debt)"
                @delete="openDelete(debt)"
                @repay="openRepay(debt)"
            />
        </div>

        <q-page-sticky position="bottom-right" :offset="[18, 18]">
            <BtnFab icon="add" @click="openCreate" />
        </q-page-sticky>

        <DebtDialog v-model="showDialog" :debt="selected" />
        <DebtRepaymentDialog v-model="showRepayment" :debt="toRepay" />

        <ModalConfirm
            v-model="showDeleteConfirm"
            :title="t('common.delete')"
            :message="t('debts.deleteConfirm')"
            variant="danger"
            :confirm-label="t('common.delete')"
            @confirm="onDelete"
        />
    </q-page>
</template>

<script setup lang="ts">
import type { Debt, DebtWithStats } from 'src/types/debt';
import { useDebtStore } from 'src/stores/debt';
import DebtCard from 'src/components/debts/DebtCard.vue';
import DebtDialog from 'src/components/debts/DebtDialog.vue';
import DebtRepaymentDialog from 'src/components/debts/DebtRepaymentDialog.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';
import BtnFab from 'src/components/buttons/BtnFab.vue';

const { t } = useI18n();
usePage({ title: t('debts.title'), showHeader: true, showBack: true });

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

/** Debts with something still outstanding come first, overdue at the very top. */
const debts = computed(() =>
    [...debtStore.debtsWithStats].sort((a: DebtWithStats, b: DebtWithStats) => {
        if (a.isSettled !== b.isSettled) return a.isSettled ? 1 : -1;
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
    }),
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
 * Opens the delete confirmation.
 * @param debt - The debt to delete
 */
function openDelete(debt: DebtWithStats): void {
    toDelete.value = debtStore.getById(debt.id) ?? null;
    showDeleteConfirm.value = true;
}

/**
 * Deletes the selected debt.
 * @returns Promise resolving when the debt is deleted
 */
async function onDelete(): Promise<void> {
    if (!toDelete.value) return;
    await debtStore.remove(toDelete.value.id);
    toDelete.value = null;
    showDeleteConfirm.value = false;
}
</script>

<style lang="scss" scoped>
.tile {
    height: 100%;
    padding: 12px;
    border-radius: 12px;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
}

.debt-list {
    display: flex;
    flex-direction: column;
}
</style>
