<template>
    <q-page v-if="project" class="q-pa-md">
        <!-- Header Card with main info -->
        <q-card class="main-card q-mb-md" flat bordered>
            <q-card-section>
                <!-- Actions -->
                <div class="row items-center justify-between q-mb-md">
                    <q-badge color="primary" :label="t('projects.title')" />
                    <div>
                        <BtnIcon dense icon="edit" @click="openEdit" />
                        <BtnIcon dense icon="delete" color="negative" @click="confirmDelete" />
                    </div>
                </div>

                <!-- ROI -->
                <div class="text-h4 text-weight-bold" :class="roiClass">
                    {{ formattedRoi }}
                </div>
                <div class="text-caption text-grey-6">{{ t('projects.roi') }}</div>

                <!-- Stats grid -->
                <div class="stats-grid q-mt-lg">
                    <div class="stat-item">
                        <div class="text-caption text-grey-6">
                            {{ t('projects.totalInvested') }}
                        </div>
                        <div class="text-subtitle1 text-weight-medium">{{ formattedInvested }}</div>
                    </div>
                    <div class="stat-item">
                        <div class="text-caption text-grey-6">
                            {{ t('projects.dividendsReceived') }}
                        </div>
                        <div class="text-subtitle1 text-weight-medium text-positive">
                            {{ formattedDividends }}
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="text-caption text-grey-6">{{ t('projects.netGain') }}</div>
                        <div class="text-subtitle1 text-weight-medium" :class="netGainClass">
                            {{ formattedNetGain }}
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="text-caption text-grey-6">
                            {{ t('projects.transactionCount') }}
                        </div>
                        <div class="text-subtitle1 text-weight-medium">
                            {{ transactions.length }}
                        </div>
                    </div>
                </div>

                <!-- Description -->
                <div v-if="project.description" class="q-mt-lg">
                    <div class="text-caption text-grey-6">{{ t('common.description') }}</div>
                    <div class="text-body2 q-mt-xs">{{ project.description }}</div>
                </div>
            </q-card-section>
        </q-card>

        <!-- Action buttons -->
        <div class="row q-gutter-sm q-mb-md">
            <BtnAction
                class="col"
                color="orange"
                :label="t('transactions.addInjection')"
                icon="add_circle"
                @click="openTransaction('injection')"
            />
            <BtnAction
                class="col"
                color="positive"
                :label="t('transactions.addDividend')"
                icon="payments"
                @click="openTransaction('dividend')"
            />
        </div>

        <!-- Transaction History -->
        <q-card flat bordered>
            <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">
                    {{ t('projects.history') }}
                </div>

                <q-list v-if="transactions.length > 0" separator>
                    <q-item v-for="tx in transactions" :key="tx.id">
                        <q-item-section avatar>
                            <q-avatar
                                :color="
                                    tx.projectTransactionType === 'injection'
                                        ? 'orange'
                                        : 'positive'
                                "
                                text-color="white"
                                size="36px"
                            >
                                <q-icon
                                    :name="
                                        tx.projectTransactionType === 'injection'
                                            ? 'add_circle'
                                            : 'payments'
                                    "
                                    size="20px"
                                />
                            </q-avatar>
                        </q-item-section>
                        <q-item-section>
                            <q-item-label>
                                {{
                                    tx.projectTransactionType === 'injection'
                                        ? t('transactions.injection')
                                        : t('transactions.dividend')
                                }}
                            </q-item-label>
                            <q-item-label caption>
                                {{ formatDate(tx.date) }}
                                <span v-if="tx.wallet"> - {{ tx.wallet.name }}</span>
                            </q-item-label>
                        </q-item-section>
                        <q-item-section side>
                            <q-item-label
                                :class="
                                    tx.projectTransactionType === 'injection'
                                        ? 'text-negative'
                                        : 'text-positive'
                                "
                            >
                                {{ tx.projectTransactionType === 'injection' ? '-' : '+'
                                }}{{ formatAmount(tx.amount) }}
                            </q-item-label>
                        </q-item-section>
                    </q-item>
                </q-list>

                <div v-else class="text-center text-grey-6 q-pa-md">
                    {{ t('projects.noTransactions') }}
                </div>
            </q-card-section>
        </q-card>

        <!-- Edit Dialog -->
        <ProjectDialog v-model="showEditDialog" :project="project" @saved="onProjectSaved" />

        <!-- Transaction Dialog -->
        <ProjectTransactionDialog
            v-if="project"
            v-model="showTransactionDialog"
            :project="project"
            :transaction-type="transactionType"
            @saved="onTransactionSaved"
        />

        <!-- Delete Confirmation -->
        <ModalConfirm
            v-model="showDeleteConfirm"
            :title="t('common.delete')"
            :message="t('projects.deleteConfirm')"
            variant="danger"
            :confirm-label="t('common.delete')"
            @confirm="onDelete"
        />
    </q-page>

    <!-- Loading / Not Found state -->
    <q-page v-else class="flex flex-center">
        <div class="text-grey-6">{{ t('common.notFound') }}</div>
    </q-page>
</template>

<script setup lang="ts">
import type { ProjectWithStats } from 'src/types/project';
import type { TransactionWithRelations } from 'src/types/transaction';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import ProjectDialog from 'src/components/projects/ProjectDialog.vue';
import ProjectTransactionDialog from 'src/components/projects/ProjectTransactionDialog.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';
import BtnIcon from 'src/components/buttons/BtnIcon.vue';
import BtnAction from 'src/components/buttons/BtnAction.vue';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

const projectStore = useProjectStore();
const transactionStore = useTransactionStore();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();

// Get project ID from route
const projectId = computed(() => route.params.id as string);

// Get project
const project = computed((): ProjectWithStats | undefined => {
    const projects = projectStore.getProjectsWithStats;
    return projects.find((p: ProjectWithStats) => p.id === projectId.value);
});

// Page title
watchEffect(() => {
    if (project.value) {
        usePage({ title: project.value.name, showHeader: true, showBack: true });
    }
});

// Load data
onMounted(async () => {
    await Promise.all([
        projectStore.loadAll(),
        transactionStore.loadAll(),
        walletStore.loadAll(),
        settingsStore.loadSettings(),
    ]);
});

// Currency
const currencyCode = computed(() => settingsStore.defaultCurrency ?? CurrencyCode.XOF);
const currency = computed(() => CURRENCIES[currencyCode.value]);

// State
const showEditDialog = ref(false);
const showTransactionDialog = ref(false);
const showDeleteConfirm = ref(false);
const transactionType = ref<'injection' | 'dividend'>('injection');

// Transactions for this project
const transactions = computed((): TransactionWithRelations[] => {
    if (!project.value) return [];
    return transactionStore.getTransactionsWithRelations({ projectId: projectId.value });
});

// Computed values
const netGain = computed(() => project.value?.netGain ?? 0);
const roi = computed(() => project.value?.roi ?? 0);

// Classes
const roiClass = computed(() => {
    if (roi.value > 0) return 'text-positive';
    if (roi.value < 0) return 'text-negative';
    return '';
});

const netGainClass = computed(() => {
    if (netGain.value > 0) return 'text-positive';
    if (netGain.value < 0) return 'text-negative';
    return '';
});

// Format functions
/**
 * Formats a numeric amount as a localized currency string.
 * @param {number} amount - The amount to format
 * @returns {string} The formatted currency string
 */
function formatAmount(amount: number): string {
    return new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: currencyCode.value,
        minimumFractionDigits: currency.value?.decimals ?? 0,
        maximumFractionDigits: currency.value?.decimals ?? 0,
    }).format(amount);
}

/**
 * Formats a date to a localized string with day, short month, and year.
 * @param {Date} date - The date to format
 * @returns {string} The formatted date string
 */
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat(locale.value, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

// Formatted values
const formattedInvested = computed(() => formatAmount(project.value?.totalInvested ?? 0));
const formattedDividends = computed(() => formatAmount(project.value?.totalDividends ?? 0));
const formattedNetGain = computed(() => {
    const value = netGain.value;
    const prefix = value >= 0 ? '+' : '';
    return prefix + formatAmount(value);
});
const formattedRoi = computed(() => {
    const value = roi.value;
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
});

// Actions
/**
 * Opens the project edit dialog.
 * @returns {void}
 */
function openEdit(): void {
    showEditDialog.value = true;
}

/**
 * Opens the transaction dialog for adding an injection or dividend.
 * @param {'injection' | 'dividend'} type - The type of transaction to create
 * @returns {void}
 */
function openTransaction(type: 'injection' | 'dividend'): void {
    transactionType.value = type;
    showTransactionDialog.value = true;
}

/**
 * Opens the delete confirmation dialog for the project.
 * @returns {void}
 */
function confirmDelete(): void {
    showDeleteConfirm.value = true;
}

/**
 * Deletes the current project and navigates back to the projects list.
 * @returns {Promise<void>}
 */
async function onDelete(): Promise<void> {
    if (!project.value) return;
    await projectStore.remove(project.value.id);
    router.back();
}

/**
 * Callback handler when the project is saved.
 * Data refreshes automatically via reactive store.
 * @returns {void}
 */
function onProjectSaved(): void {
    // Project updated, data will refresh automatically
}

/**
 * Callback handler when a project transaction is saved.
 * Reloads the project data to update calculated totals.
 * @returns {Promise<void>}
 */
async function onTransactionSaved(): Promise<void> {
    // Reload project to update totals
    await projectStore.reload();
}
</script>

<style lang="scss" scoped>
.main-card {
    border-radius: 16px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
}

.stat-item {
    padding: 12px;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 8px;
}
</style>
