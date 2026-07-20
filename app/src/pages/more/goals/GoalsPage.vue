<template>
    <q-page class="q-pa-md">
        <!-- Empty state -->
        <div v-if="goals.length === 0" class="empty-state">
            <q-icon name="flag" size="64px" color="grey-4" />
            <div class="text-grey-6 q-mt-md">{{ t('goals.noGoals') }}</div>
        </div>

        <!-- List -->
        <div v-else class="goal-list">
            <GoalCard
                v-for="goal in goals"
                :key="goal.id"
                :goal="goal"
                class="q-mb-sm"
                @click="openEdit(goal)"
                @delete="openDelete(goal)"
            />
        </div>

        <!-- Add FAB -->
        <q-page-sticky position="bottom-right" :offset="[18, 18]">
            <BtnFab icon="add" @click="openCreate" />
        </q-page-sticky>

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
import { useSavingsGoalStore } from 'src/stores/savings-goal';
import GoalCard from 'src/components/goals/GoalCard.vue';
import GoalDialog from 'src/components/goals/GoalDialog.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';
import BtnFab from 'src/components/buttons/BtnFab.vue';

const { t } = useI18n();
usePage({ title: t('goals.title'), showHeader: true, showBack: true });

const goalStore = useSavingsGoalStore();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();

// State
const showDialog = ref(false);
const showDeleteConfirm = ref(false);
const selected = ref<SavingsGoal | null>(null);
const toDelete = ref<SavingsGoal | null>(null);

const goals = computed(() => goalStore.goalsWithStats);

onMounted(async () => {
    await Promise.all([
        settingsStore.loadSettings(),
        goalStore.loadAll(),
        walletStore.loadAll(),
    ]);
});

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
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
}

.goal-list {
    display: flex;
    flex-direction: column;
}
</style>
