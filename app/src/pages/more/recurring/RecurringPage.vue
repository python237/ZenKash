<template>
    <q-page class="q-pa-md">
        <!-- Projected month-end balance -->
        <q-card v-if="items.length > 0" class="projected-card bg-dark text-white q-mb-md" flat>
            <q-card-section class="q-pa-md">
                <div class="text-caption text-grey-5">{{ t('recurring.projectedMonthEnd') }}</div>
                <div class="text-h5 text-weight-bold q-mt-xs">
                    {{ formatCurrency(projectedBalance) }}
                </div>
                <div class="text-caption text-grey-5 q-mt-xs">{{ t('recurring.projectedHint') }}</div>
            </q-card-section>
        </q-card>

        <!-- Empty state -->
        <div v-if="items.length === 0" class="empty-state">
            <q-icon name="autorenew" size="64px" color="grey-4" />
            <div class="text-grey-6 q-mt-md">{{ t('recurring.noRecurring') }}</div>
        </div>

        <!-- List -->
        <div v-else class="recurring-list">
            <RecurringCard
                v-for="item in items"
                :key="item.id"
                :recurring="item"
                :currency="defaultCurrency"
                class="q-mb-sm"
                @click="openEdit(item)"
                @toggle="(value) => onToggle(item, value)"
                @delete="openDelete(item)"
            />
        </div>

        <!-- Add FAB -->
        <q-page-sticky position="bottom-right" :offset="[18, 18]">
            <BtnFab icon="add" @click="openCreate" />
        </q-page-sticky>

        <!-- Create/Edit Dialog -->
        <RecurringDialog v-model="showDialog" :recurring="selected" />

        <!-- Delete Confirmation -->
        <ModalConfirm
            v-model="showDeleteConfirm"
            :title="t('common.delete')"
            :message="t('recurring.deleteConfirm')"
            variant="danger"
            :confirm-label="t('common.delete')"
            @confirm="onDelete"
        />
    </q-page>
</template>

<script setup lang="ts">
import type { RecurringTransaction } from 'src/types/recurring-transaction';
import type { Wallet } from 'src/types/wallet';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import { useRecurringTransactionStore } from 'src/stores/recurring-transaction';
import RecurringCard from 'src/components/recurring/RecurringCard.vue';
import RecurringDialog from 'src/components/recurring/RecurringDialog.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';
import BtnFab from 'src/components/buttons/BtnFab.vue';

const { t, locale } = useI18n();
usePage({ title: t('recurring.title'), showHeader: true, showBack: true });

const recurringStore = useRecurringTransactionStore();
const walletStore = useWalletStore();
const categoryStore = useCategoryStore();
const masterCategoryStore = useMasterCategoryStore();
const settingsStore = useSettingsStore();
const exchangeRateStore = useExchangeRateStore();

// State
const showDialog = ref(false);
const showDeleteConfirm = ref(false);
const selected = ref<RecurringTransaction | null>(null);
const toDelete = ref<RecurringTransaction | null>(null);

const items = computed(() => recurringStore.items);
const defaultCurrency = computed(() => settingsStore.defaultCurrency ?? CurrencyCode.XOF);
const currencyInfo = computed(() => CURRENCIES[defaultCurrency.value]);

/**
 * Formats an amount as a localized currency string.
 * @param amount - The amount to format
 * @returns The formatted currency string
 */
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: defaultCurrency.value,
        minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
        maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
    }).format(amount);
}

// Current liquid balance (non-game wallets converted to default currency)
const currentLiquid = computed(() =>
    walletStore.nonGameWallets.reduce(
        (sum: number, w: Wallet) =>
            sum + exchangeRateStore.convertWithDefault(w.balance, w.currency, defaultCurrency.value),
        0,
    ),
);

// Projected end-of-month balance from upcoming recurring occurrences
const projectedBalance = computed(() => {
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const occurrences = recurringStore.upcoming(monthEnd);

    let delta = 0;
    for (const occ of occurrences) {
        const wallet = walletStore.getWalletById(occ.walletId);
        const currency = wallet?.currency ?? defaultCurrency.value;
        const converted = exchangeRateStore.convertWithDefault(
            occ.amount,
            currency,
            defaultCurrency.value,
        );
        delta += occ.type === 'income' ? converted : -converted;
    }

    return currentLiquid.value + delta;
});

onMounted(async () => {
    await Promise.all([
        settingsStore.loadSettings(),
        exchangeRateStore.loadAll(),
        recurringStore.loadAll(),
        walletStore.loadAll(),
        categoryStore.loadAll(),
        masterCategoryStore.loadAll(),
    ]);
});

/**
 * Opens the dialog to create a new recurring rule.
 */
function openCreate(): void {
    selected.value = null;
    showDialog.value = true;
}

/**
 * Opens the dialog to edit an existing recurring rule.
 * @param item - The rule to edit
 */
function openEdit(item: RecurringTransaction): void {
    selected.value = item;
    showDialog.value = true;
}

/**
 * Toggles a rule's active state.
 * @param item - The rule to toggle
 * @param value - The new active state
 * @returns Promise that resolves when the state is persisted
 */
async function onToggle(item: RecurringTransaction, value: boolean): Promise<void> {
    await recurringStore.toggleActive(item.id, value);
}

/**
 * Opens the delete confirmation for a rule.
 * @param item - The rule to delete
 */
function openDelete(item: RecurringTransaction): void {
    toDelete.value = item;
    showDeleteConfirm.value = true;
}

/**
 * Deletes the selected recurring rule.
 * @returns Promise that resolves when the rule is deleted
 */
async function onDelete(): Promise<void> {
    if (!toDelete.value) return;
    await recurringStore.remove(toDelete.value.id);
    toDelete.value = null;
    showDeleteConfirm.value = false;
}
</script>

<style lang="scss" scoped>
.projected-card {
    border-radius: 16px;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
}

.recurring-list {
    display: flex;
    flex-direction: column;
}
</style>
