<template>
    <q-page class="zk-page">
        <!-- Diagnosis first (is the plan reachable at all?), then smart allocation -->
        <div v-if="goals.length > 0" class="entry-grid">
            <button type="button" class="entry-tile entry-tile--dark" @click="openDiagnostic">
                <q-icon name="o_monitor_heart" size="22px" class="entry-tile__icon" />
                <span class="entry-tile__title">{{ t('goals.diagnosis.title') }}</span>
                <span class="entry-tile__subtitle">{{ t('goals.diagnosis.subtitle') }}</span>
            </button>
            <button type="button" class="entry-tile" @click="openAllocation">
                <q-icon name="o_auto_awesome" size="22px" class="entry-tile__icon" />
                <span class="entry-tile__title">{{ t('goals.allocation.title') }}</span>
                <span class="entry-tile__subtitle">{{ t('goals.allocation.subtitle') }}</span>
            </button>
        </div>

        <!-- Status filter -->
        <div
            v-if="goals.length > 0"
            class="chips"
            role="tablist"
            :aria-label="t('goals.statusFilter')"
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
        <div v-if="goals.length === 0" class="zk-empty">
            <span class="zk-empty__icon">
                <q-icon name="o_flag" size="30px" />
            </span>
            <span class="zk-empty__title">{{ t('goals.noGoals') }}</span>
        </div>

        <div v-else-if="visibleGoals.length === 0" class="zk-empty">
            <span class="zk-empty__title">{{ emptyLabel }}</span>
        </div>

        <!-- List -->
        <div v-else class="goal-list">
            <GoalCard
                v-for="goal in visibleGoals"
                :key="goal.id"
                :goal="goal"
                @click="openEdit(goal)"
                @delete="openDelete(goal)"
                @close="openClose(goal)"
                @close-wallet="openCloseWallet(goal)"
                @reopen="openReopen(goal)"
            />
            <p v-if="statusFilter === 'closed'" class="closed-note">
                <q-icon name="o_info" size="18px" />
                <span>{{ t('goals.closing.note') }}</span>
            </p>
        </div>

        <!-- Closing -->
        <GoalCloseDialog
            v-model="showCloseDialog"
            :goal="toClose"
            @closed="statusFilter = 'closed'"
        />
        <WalletCloseDialog v-model="showCloseWallet" :wallet="walletToClose ?? null" />

        <!-- Reopen Confirmation -->
        <ModalConfirm
            v-model="showReopenConfirm"
            :title="t('goals.closing.reopen')"
            :message="t('goals.closing.reopenConfirm')"
            :confirm-label="t('goals.closing.reopen')"
            @confirm="onReopen"
        />

        <!-- Create/Edit Dialog -->
        <GoalDialog v-model="showDialog" :goal="selected" />

        <!-- Delete Confirmation -->
        <ModalConfirm
            v-model="showDeleteConfirm"
            :title="t('common.delete')"
            :message="t('goals.deleteConfirm')"
            variant="danger"
            :confirm-label="t('common.delete')"
            @confirm="onDelete"
        />
    </q-page>
</template>

<script setup lang="ts">
import type { SavingsGoal, SavingsGoalWithStats } from 'src/types/savings-goal';
import type { Wallet } from 'src/types/wallet';
import { useSavingsGoalStore } from 'src/stores/savings-goal';
import GoalCard from 'src/components/goals/GoalCard.vue';
import GoalDialog from 'src/components/goals/GoalDialog.vue';
import GoalCloseDialog from 'src/components/goals/GoalCloseDialog.vue';
import WalletCloseDialog from 'src/components/wallets/WalletCloseDialog.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';

const { t } = useI18n();
usePage({
    title: t('goals.title'),
    showHeader: true,
    showBack: true,
    actions: [{ icon: 'add', label: t('common.add'), onClick: () => openCreate() }],
});

const router = useRouter();
const goalStore = useSavingsGoalStore();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();
const recurringStore = useRecurringTransactionStore();

// State
const showDialog = ref(false);
const showDeleteConfirm = ref(false);
const selected = ref<SavingsGoal | null>(null);
const toDelete = ref<SavingsGoal | null>(null);

const goals = computed(() => goalStore.goalsWithStats);

/** Lifecycle of a goal: saving, reached (money still there), closed (done). */
type GoalStatus = 'open' | 'reached' | 'closed';

// Status filter chips, same pattern as loans & debts
const statusFilter = ref<GoalStatus>('open');
const statusOptions = computed((): { value: GoalStatus; label: string }[] => [
    { value: 'open', label: t('goals.filterOpen') },
    { value: 'reached', label: t('goals.filterReached') },
    { value: 'closed', label: t('goals.filterClosed') },
]);

/**
 * Status of a goal, for the filter.
 * @param goal - The goal
 * @returns Its status
 */
function statusOf(goal: SavingsGoalWithStats): GoalStatus {
    if (goal.isClosed) return 'closed';
    return goal.isReached ? 'reached' : 'open';
}

const visibleGoals = computed(() =>
    goals.value.filter((goal) => statusOf(goal) === statusFilter.value),
);

const emptyLabel = computed(() => {
    if (statusFilter.value === 'closed') return t('goals.noClosedGoals');
    return statusFilter.value === 'open' ? t('goals.noOpenGoals') : t('goals.noReachedGoals');
});

// Closing state
const showCloseDialog = ref(false);
const showCloseWallet = ref(false);
const showReopenConfirm = ref(false);
const toClose = ref<SavingsGoalWithStats | null>(null);
const walletToClose = ref<Wallet | undefined>(undefined);
const toReopen = ref<SavingsGoalWithStats | null>(null);

onMounted(async () => {
    await Promise.all([
        settingsStore.loadSettings(),
        goalStore.loadAll(),
        walletStore.loadAll(),
        recurringStore.loadAll(),
    ]);
});

/**
 * Opens the financial diagnosis screen.
 */
function openDiagnostic(): void {
    void router.push({ name: 'goal-diagnostic' });
}

/**
 * Opens the smart allocation screen.
 */
function openAllocation(): void {
    void router.push({ name: 'goal-allocation' });
}

/**
 * Opens the dialog to create a new goal.
 */
function openCreate(): void {
    selected.value = null;
    showDialog.value = true;
}

/**
 * Opens the dialog to edit an existing goal.
 * @param goal - The goal to edit
 */
function openEdit(goal: SavingsGoalWithStats): void {
    selected.value = goalStore.getById(goal.id) ?? null;
    showDialog.value = true;
}

/**
 * Opens the delete confirmation for a goal.
 * @param goal - The goal to delete
 */
function openDelete(goal: SavingsGoalWithStats): void {
    toDelete.value = goalStore.getById(goal.id) ?? null;
    showDeleteConfirm.value = true;
}

/**
 * Opens the closing dialog of a reached goal.
 * @param goal - The goal to close
 */
function openClose(goal: SavingsGoalWithStats): void {
    toClose.value = goal;
    showCloseDialog.value = true;
}

/**
 * Opens the closing dialog of a closed goal's wallet.
 * @param goal - The goal whose wallet is closed
 */
function openCloseWallet(goal: SavingsGoalWithStats): void {
    walletToClose.value = walletStore.getWalletById(goal.walletId);
    showCloseWallet.value = true;
}

/**
 * Asks to reopen a closed goal.
 * @param goal - The goal to reopen
 */
function openReopen(goal: SavingsGoalWithStats): void {
    toReopen.value = goal;
    showReopenConfirm.value = true;
}

/**
 * Reopens the selected goal: progress follows the wallet again.
 * @returns Promise that resolves when reopened
 */
async function onReopen(): Promise<void> {
    if (!toReopen.value) return;
    await goalStore.reopen(toReopen.value.id);
    toReopen.value = null;
    showReopenConfirm.value = false;
}

/**
 * Deletes the selected goal.
 * @returns Promise that resolves when the goal is deleted
 */
async function onDelete(): Promise<void> {
    if (!toDelete.value) return;
    await goalStore.remove(toDelete.value.id);
    toDelete.value = null;
    showDeleteConfirm.value = false;
}
</script>

<style lang="scss" scoped>
.entry-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.entry-tile {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    padding: 16px;
    border: 0;
    border-radius: 20px;
    background: $bg-card;
    color: $text-primary;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    &__icon {
        color: $primary;
    }

    &__title {
        font-size: 14px;
        font-weight: 700;
    }

    &__subtitle {
        font-size: 12px;
        line-height: 1.4;
        color: $text-secondary;
    }

    &--dark {
        background: $hero-bg;
        color: #ffffff;

        .entry-tile__icon {
            color: $hero-accent;
        }

        .entry-tile__subtitle {
            color: $hero-muted;
        }
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

.goal-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.closed-note {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    margin: 0;
    padding: 0 4px;
    font-size: 12px;
    line-height: 1.5;
    color: $text-secondary;
}
</style>
