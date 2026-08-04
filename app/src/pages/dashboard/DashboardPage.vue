<template>
    <q-page class="q-pa-md">
        <!-- Month Filter -->
        <div class="month-nav q-mb-md">
            <BtnIcon icon="chevron_left" @click="prevMonth" />
            <q-btn flat no-caps class="month-label" @click="showMonthPicker = true">
                <span class="text-subtitle1 text-weight-medium text-capitalize">{{
                    formattedMonth
                }}</span>
                <q-icon name="arrow_drop_down" size="sm" />
            </q-btn>
            <BtnIcon icon="chevron_right" :disable="isCurrentMonth" @click="nextMonth" />
        </div>

        <!-- Month Picker Dialog -->
        <q-dialog v-model="showMonthPicker">
            <q-date
                v-model="selectedMonth"
                emit-immediately
                mask="YYYY/MM"
                default-view="Months"
                minimal
                years-in-month-view
                @update:model-value="showMonthPicker = false"
            />
        </q-dialog>

        <!-- Global Balance Card -->
        <q-card class="balance-card bg-dark text-white q-mb-md" flat>
            <q-card-section class="q-pa-md">
                <div class="text-caption text-grey-5">{{ t('report.totalBalance') }}</div>
                <div class="text-h4 text-weight-bold q-mt-xs">{{ formattedGlobalBalance }}</div>
                <div class="text-caption text-grey-5 q-mt-xs">
                    {{ walletStore.wallets.length }} {{ t('wallets.title').toLowerCase() }}
                </div>
            </q-card-section>
        </q-card>

        <!-- Net Worth Card -->
        <q-card
            class="networth-card q-mb-md clickable"
            flat
            bordered
            @click="router.push({ name: 'net-worth' })"
        >
            <q-card-section class="q-pa-md row items-center justify-between">
                <div>
                    <div class="text-caption text-grey-6">{{ t('netWorth.total') }}</div>
                    <div class="text-h6 text-weight-bold q-mt-xs">
                        {{ formatCurrency(netWorthTotal) }}
                    </div>
                    <div
                        v-if="netWorthDelta"
                        class="text-caption q-mt-xs"
                        :class="netWorthDelta.amount >= 0 ? 'text-positive' : 'text-negative'"
                    >
                        <q-icon
                            :name="netWorthDelta.amount >= 0 ? 'trending_up' : 'trending_down'"
                            size="14px"
                        />
                        {{ netWorthDelta.percent > 0 ? '+' : ''
                        }}{{ netWorthDelta.percent.toFixed(1) }}%
                        {{ t('netWorth.vsPrevious') }}
                    </div>
                </div>
                <q-icon name="show_chart" color="primary" size="28px" />
            </q-card-section>
        </q-card>

        <!-- Analytics shortcut -->
        <q-card
            class="q-mb-md clickable-card"
            flat
            bordered
            @click="router.push({ name: 'analytics' })"
        >
            <q-card-section class="row items-center q-pa-md">
                <q-avatar color="teal-1" text-color="teal-9" size="48px" class="q-mr-md">
                    <q-icon name="insights" size="24px" />
                </q-avatar>
                <div class="col">
                    <div class="text-subtitle2 text-weight-medium">{{ t('analytics.title') }}</div>
                    <div class="text-caption text-grey-6">{{ t('analytics.subtitle') }}</div>
                </div>
                <q-icon name="chevron_right" color="grey-5" size="24px" />
            </q-card-section>
        </q-card>

        <!-- Quick Stats Row -->
        <div class="stats-row q-mb-md">
            <!-- Income -->
            <q-card class="stat-card" flat bordered>
                <q-card-section class="q-pa-sm text-center">
                    <q-icon name="arrow_downward" color="positive" size="20px" />
                    <div class="text-caption text-grey-6">{{ t('report.income') }}</div>
                    <div class="text-subtitle2 text-weight-bold text-positive">
                        {{ formattedIncome }}
                    </div>
                </q-card-section>
            </q-card>

            <!-- Expenses -->
            <q-card class="stat-card" flat bordered>
                <q-card-section class="q-pa-sm text-center">
                    <q-icon name="arrow_upward" color="negative" size="20px" />
                    <div class="text-caption text-grey-6">{{ t('report.expenses') }}</div>
                    <div class="text-subtitle2 text-weight-bold text-negative">
                        {{ formattedExpenses }}
                    </div>
                </q-card-section>
            </q-card>

            <!-- Games (net: withdrawals received - deposits sent) -->
            <q-card class="stat-card" flat bordered>
                <q-card-section class="q-pa-sm text-center">
                    <q-icon name="casino" color="deep-orange" size="20px" />
                    <div class="text-caption text-grey-6">{{ t('games.title') }}</div>
                    <div class="text-subtitle2 text-weight-bold" :class="gamesTextClass">
                        {{ formattedGames }}
                    </div>
                </q-card-section>
            </q-card>

            <!-- Net -->
            <q-card class="stat-card" flat bordered>
                <q-card-section class="q-pa-sm text-center">
                    <q-icon name="account_balance" :color="netColor" size="20px" />
                    <div class="text-caption text-grey-6">{{ t('report.net') }}</div>
                    <div class="text-subtitle2 text-weight-bold" :class="netTextClass">
                        {{ formattedNet }}
                    </div>
                </q-card-section>
            </q-card>
        </div>

        <!-- Distribution Chart -->
        <q-card class="q-mb-md" flat bordered>
            <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">
                    {{ t('report.expenseDistribution') }}
                </div>

                <div
                    v-if="expenseDistribution.length === 0"
                    class="text-center text-grey-6 q-py-lg"
                >
                    {{ t('report.noExpenses') }}
                </div>

                <div v-else>
                    <!-- Distribution bars -->
                    <div
                        v-for="item in expenseDistribution"
                        :key="item.id"
                        class="distribution-item clickable q-mb-sm"
                        @click="goToMasterCategoryDetail(item.id)"
                    >
                        <div class="row items-center justify-between q-mb-xs">
                            <span class="text-body2">{{ item.name }}</span>
                            <div class="row items-center">
                                <span class="text-body2 text-weight-medium q-mr-xs">{{
                                    formatPercent(item.percent)
                                }}</span>
                                <q-icon name="chevron_right" color="grey-5" size="18px" />
                            </div>
                        </div>
                        <q-linear-progress
                            :value="item.percent / 100"
                            :color="item.color ?? 'primary'"
                            track-color="grey-3"
                            rounded
                            size="8px"
                        />
                        <div class="text-caption text-grey-6 q-mt-xs">
                            {{ formatCurrency(item.amount) }}
                        </div>
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- Investments Summary -->
        <q-card
            class="q-mb-md clickable-card"
            flat
            bordered
            @click="router.push({ name: 'investments' })"
        >
            <q-card-section class="row items-center q-pa-md">
                <q-avatar color="blue-1" text-color="blue" size="48px" class="q-mr-md">
                    <q-icon name="trending_up" size="24px" />
                </q-avatar>
                <div class="col">
                    <div class="text-caption text-grey-6">{{ t('report.investments') }}</div>
                    <div class="text-h6 text-weight-bold">{{ formattedInvestmentValue }}</div>
                    <div class="text-caption" :class="investmentHealthClass">
                        {{ formattedInvestmentGain }}
                    </div>
                </div>
                <q-icon name="chevron_right" color="grey-5" size="24px" />
            </q-card-section>
        </q-card>

        <!-- Projects Summary -->
        <q-card
            class="q-mb-md clickable-card"
            flat
            bordered
            @click="router.push({ name: 'projects' })"
        >
            <q-card-section class="row items-center q-pa-md">
                <q-avatar color="purple-1" text-color="purple" size="48px" class="q-mr-md">
                    <q-icon name="rocket_launch" size="24px" />
                </q-avatar>
                <div class="col">
                    <div class="text-caption text-grey-6">{{ t('report.projects') }}</div>
                    <div class="text-h6 text-weight-bold">{{ formattedProjectInvested }}</div>
                    <div class="text-caption" :class="projectRoiClass">
                        ROI: {{ formattedProjectRoi }} · {{ formattedProjectDividends }}
                    </div>
                </div>
                <q-icon name="chevron_right" color="grey-5" size="24px" />
            </q-card-section>
        </q-card>

        <!-- Budget Alerts -->
        <q-card v-if="exceededBudgets.length > 0" class="q-mb-md" flat bordered>
            <q-card-section>
                <div class="row items-center q-mb-md">
                    <q-icon name="warning" color="negative" size="24px" class="q-mr-sm" />
                    <span class="text-subtitle1 text-weight-medium text-negative">
                        {{ t('report.budgetAlerts') }}
                    </span>
                </div>

                <div
                    v-for="budget in exceededBudgets"
                    :key="budget.id"
                    class="budget-alert q-mb-sm"
                >
                    <div class="row items-center justify-between">
                        <span class="text-body2">{{ budget.categoryName }}</span>
                        <span class="text-body2 text-negative text-weight-medium">
                            {{ formatCurrency(budget.spent) }} / {{ formatCurrency(budget.amount) }}
                        </span>
                    </div>
                    <q-linear-progress
                        :value="1"
                        color="negative"
                        track-color="red-1"
                        rounded
                        size="4px"
                        class="q-mt-xs"
                    />
                </div>
            </q-card-section>
        </q-card>

        <!-- Category Pie Chart -->
        <q-card class="q-mb-md" flat bordered>
            <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">
                    {{ t('report.categoryDistribution') }}
                </div>

                <div
                    v-if="categoryDistribution.length === 0"
                    class="text-center text-grey-6 q-py-lg"
                >
                    {{ t('report.noExpenses') }}
                </div>

                <div v-else class="pie-chart-container">
                    <Pie :data="pieChartData" :options="pieChartOptions" />
                </div>

                <!-- Legend -->
                <div v-if="categoryDistribution.length > 0" class="pie-legend q-mt-md">
                    <div v-for="item in categoryDistribution" :key="item.id" class="legend-item">
                        <span
                            class="legend-color"
                            :style="{ backgroundColor: item.chartColor }"
                        ></span>
                        <span class="legend-label text-caption">{{ item.name }}</span>
                        <span class="legend-value text-caption text-grey-6">{{
                            formatPercent(item.percent)
                        }}</span>
                    </div>
                </div>
            </q-card-section>
        </q-card>
    </q-page>
</template>

<script setup lang="ts">
import { Pie } from 'vue-chartjs';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    type ChartData,
    type ChartOptions,
} from 'chart.js';
import type { MasterCategory } from 'src/types/master-category';
import type { Category } from 'src/types/category';
import type { Wallet } from 'src/types/wallet';
import type { BudgetWithStats } from 'src/types/budget';
import { useBudgetStore } from 'src/stores/budget';
import { useNetWorthStore } from 'src/stores/net-worth';
import { MAX_SERIES, OTHER_COLOR, colorAt } from 'src/services/chart';
import { useCurrency } from 'src/composables/useCurrency';
import BtnIcon from 'src/components/buttons/BtnIcon.vue';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const { t, locale } = useI18n();
const router = useRouter();
usePage({ title: t('report.title'), showHeader: true });

// Stores
const walletStore = useWalletStore();
const transactionStore = useTransactionStore();
const categoryStore = useCategoryStore();
const masterCategoryStore = useMasterCategoryStore();
const investmentStore = useInvestmentStore();
const projectStore = useProjectStore();
const budgetStore = useBudgetStore();
const settingsStore = useSettingsStore();
const exchangeRateStore = useExchangeRateStore();
const gameStore = useGameStore();
const netWorthStore = useNetWorthStore();

// Game transfer classification (deposits = expense, withdrawals = income)
const { classifyTransfer } = useGameTransfers();

// State
const showMonthPicker = ref(false);

// Month selection
const now = new Date();
const selectedMonth = ref(`${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`);

const isCurrentMonth = computed(() => {
    const current = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth.value === current;
});

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

const monthFilter = computed(() => {
    const parts = selectedMonth.value.split('/');
    const year = parts[0] ?? '2024';
    const month = parts[1] ?? '01';
    return `${year}-${month}`;
});

/**
 * Navigates to the previous month in the date selector.
 * Updates the selectedMonth ref to the month before the current selection.
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
 * Navigates to the next month in the date selector.
 * Does nothing if already at the current month.
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

// Currency formatting and conversion (shared with every other money screen)
const { formatCurrency, formatPercent, convert, convertFromWallet } = useCurrency();

// Global balance (sum of non-game wallets converted to default currency).
// Game wallets are excluded: their money may be locked on the platform.
const globalBalance = computed(() => {
    return walletStore.nonGameWallets.reduce(
        (total: number, wallet: Wallet) => total + convert(wallet.balance, wallet.currency),
        0,
    );
});

const formattedGlobalBalance = computed(() => formatCurrency(globalBalance.value));

// Net worth (from latest snapshot, or live computation as fallback)
const netWorthTotal = computed(
    () => netWorthStore.latest?.total ?? netWorthStore.computeCurrent().total,
);
const netWorthDelta = computed(() => netWorthStore.deltaVsPrevious);

// Monthly income/expenses
const monthlyStats = computed(() => {
    const transactions = transactionStore.filterTransactions({ month: monthFilter.value });

    let income = 0;
    let expenses = 0;
    let games = 0; // net game balance = transfers received - transfers sent

    for (const tx of transactions) {
        if (tx.type === 'income') {
            income += convertFromWallet(tx.amount, tx.walletId);
        } else if (tx.type === 'expense') {
            expenses += convertFromWallet(tx.amount, tx.walletId);
        } else if (tx.type === 'transfer') {
            // Game transfers form a separate "games" bucket: received (withdrawal) minus
            // sent (deposit). Keeps income/expense clean and the net faithful.
            const cls = classifyTransfer(tx);
            if (cls) {
                const converted = convert(cls.amount, cls.currency);
                if (cls.kind === 'withdrawal') games += converted;
                else games -= converted;
            }
        }
    }

    return { income, expenses, games, net: income - expenses + games };
});

const formattedIncome = computed(() => formatCurrency(monthlyStats.value.income));
const formattedExpenses = computed(() => formatCurrency(monthlyStats.value.expenses));
const formattedNet = computed(() => {
    const net = monthlyStats.value.net;
    const prefix = net >= 0 ? '+' : '';
    return prefix + formatCurrency(net);
});
const netColor = computed(() => (monthlyStats.value.net >= 0 ? 'positive' : 'negative'));
const netTextClass = computed(() =>
    monthlyStats.value.net >= 0 ? 'text-positive' : 'text-negative',
);
const formattedGames = computed(() => {
    const value = monthlyStats.value.games;
    const prefix = value >= 0 ? '+' : '';
    return prefix + formatCurrency(value);
});
const gamesTextClass = computed(() =>
    monthlyStats.value.games >= 0 ? 'text-positive' : 'text-negative',
);

// Expense distribution by master category
/**
 * Represents a distribution item for expense breakdown visualization.
 */
interface DistributionItem {
    id: string;
    name: string;
    amount: number;
    percent: number;
    color?: string;
    chartColor?: string;
}

const expenseDistribution = computed((): DistributionItem[] => {
    const transactions = transactionStore.filterTransactions({
        month: monthFilter.value,
        type: 'expense',
    });

    // Group by master category
    const byMasterCategory = new Map<string, number>();

    for (const tx of transactions) {
        if (tx.type !== 'expense') continue;

        const category = categoryStore.getCategoryById(tx.categoryId) as Category | undefined;
        if (!category) continue;

        const masterCategoryId = category.masterCategoryId;
        const converted = convertFromWallet(tx.amount, tx.walletId);

        const current = byMasterCategory.get(masterCategoryId) ?? 0;
        byMasterCategory.set(masterCategoryId, current + converted);
    }

    // Calculate total
    let total = 0;
    for (const amount of byMasterCategory.values()) {
        total += amount;
    }

    if (total === 0) return [];

    // Build distribution items
    const items: DistributionItem[] = [];
    for (const [mcId, amount] of byMasterCategory) {
        const mc = masterCategoryStore.getMasterCategoryById(mcId) as MasterCategory | undefined;
        if (!mc) continue;

        items.push({
            id: mcId,
            name: mc.name,
            amount,
            percent: (amount / total) * 100,
            color: mc.color,
        });
    }

    // Sort by amount descending
    return items.sort((a, b) => b.amount - a.amount);
});

// Expense distribution by category (for pie chart)
const categoryDistribution = computed((): DistributionItem[] => {
    const transactions = transactionStore.filterTransactions({
        month: monthFilter.value,
        type: 'expense',
    });

    // Group by category
    const byCategory = new Map<string, number>();

    for (const tx of transactions) {
        if (tx.type !== 'expense') continue;

        const converted = convertFromWallet(tx.amount, tx.walletId);
        const current = byCategory.get(tx.categoryId) ?? 0;
        byCategory.set(tx.categoryId, current + converted);
    }

    // Calculate total
    let total = 0;
    for (const amount of byCategory.values()) {
        total += amount;
    }

    if (total === 0) return [];

    // Build distribution items, largest first
    const named: { id: string; name: string; amount: number }[] = [];
    for (const [catId, amount] of byCategory) {
        const cat = categoryStore.getCategoryById(catId) as Category | undefined;
        if (!cat) continue;
        named.push({ id: catId, name: cat.name, amount });
    }
    named.sort((a, b) => b.amount - a.amount);

    // The palette is never cycled: beyond its last slot the remainder is folded
    // into a single "other" slice, so a color always means one category.
    const items: DistributionItem[] = named.slice(0, MAX_SERIES).map((item, index) => ({
        ...item,
        percent: (item.amount / total) * 100,
        chartColor: colorAt(index),
    }));

    const foldedAmount = named.slice(MAX_SERIES).reduce((sum, item) => sum + item.amount, 0);

    if (foldedAmount > 0) {
        items.push({
            id: 'other',
            name: t('analytics.other'),
            amount: foldedAmount,
            percent: (foldedAmount / total) * 100,
            chartColor: OTHER_COLOR,
        });
    }

    return items;
});

// Pie chart data
const pieChartData = computed((): ChartData<'pie'> => {
    const distribution = categoryDistribution.value;
    return {
        labels: distribution.map((item) => item.name),
        datasets: [
            {
                data: distribution.map((item) => item.amount),
                backgroundColor: distribution.map((item) => item.chartColor ?? '#999'),
                borderWidth: 2,
                borderColor: '#fff',
            },
        ],
    };
});

// Pie chart options
const pieChartOptions = computed(
    (): ChartOptions<'pie'> => ({
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
            legend: {
                display: false, // We use custom legend
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const value = Number(context.raw);
                        const data = context.dataset.data;
                        const total = Array.isArray(data)
                            ? data.reduce((a, b) => Number(a) + Number(b), 0)
                            : 0;
                        const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                        return `${formatCurrency(value)} (${percent}%)`;
                    },
                },
            },
        },
    }),
);

// Investment summary
const investmentSummary = computed(() => investmentStore.summary);

const formattedInvestmentValue = computed(() =>
    formatCurrency(investmentSummary.value.totalCurrentValue),
);

const formattedInvestmentGain = computed(() => {
    const gain = investmentSummary.value.totalGainLoss;
    const percent = investmentSummary.value.totalGainLossPercent;
    const prefix = gain >= 0 ? '+' : '';
    return `${prefix}${formatCurrency(gain)} (${prefix}${percent.toFixed(1)}%)`;
});

const investmentHealthClass = computed(() =>
    investmentSummary.value.totalGainLoss >= 0 ? 'text-positive' : 'text-negative',
);

// Project summary
const projectSummary = computed(() => {
    const projects = projectStore.projects;
    let totalInvested = 0;
    let totalDividends = 0;

    for (const p of projects) {
        totalInvested += p.totalInvested;
        totalDividends += p.totalDividends;
    }

    const roi = totalInvested > 0 ? (totalDividends / totalInvested) * 100 : 0;

    return { totalInvested, totalDividends, roi };
});

const formattedProjectInvested = computed(() => formatCurrency(projectSummary.value.totalInvested));
const formattedProjectDividends = computed(() =>
    formatCurrency(projectSummary.value.totalDividends),
);
const formattedProjectRoi = computed(() => {
    const roi = projectSummary.value.roi;
    const prefix = roi >= 0 ? '+' : '';
    return `${prefix}${roi.toFixed(1)}%`;
});
const projectRoiClass = computed(() =>
    projectSummary.value.roi >= 0 ? 'text-positive' : 'text-negative',
);

// Exceeded budgets
const exceededBudgets = computed(() => {
    const budgetsWithStats = budgetStore.getBudgetsWithStats(monthFilter.value);
    return budgetsWithStats
        .filter((b: BudgetWithStats) => b.isExceeded)
        .map((b: BudgetWithStats) => ({
            id: b.id,
            categoryName: b.category?.name ?? b.masterCategory?.name ?? '-',
            amount: b.amount,
            spent: b.spent,
        }));
});

// Navigation
/**
 * Navigates to the master category detail page for expense breakdown.
 * Passes the currently selected month as a query parameter.
 * @param {string} masterCategoryId - The ID of the master category to view
 * @returns {void}
 */
function goToMasterCategoryDetail(masterCategoryId: string): void {
    void router.push({
        name: 'master-category-report',
        params: { id: masterCategoryId },
        query: { month: selectedMonth.value },
    });
}

// Load data
onMounted(async () => {
    await Promise.all([
        settingsStore.loadSettings(),
        exchangeRateStore.loadAll(),
        walletStore.loadAll(),
        transactionStore.loadAll(),
        categoryStore.loadAll(),
        masterCategoryStore.loadAll(),
        investmentStore.loadAll(),
        projectStore.loadAll(),
        budgetStore.loadAll(),
        gameStore.loadAll(),
        netWorthStore.loadAll(),
    ]);
    // Keep the current-month net worth snapshot in sync
    await netWorthStore.captureCurrent();
});
</script>

<style lang="scss" scoped>
.month-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.month-label {
    min-width: 180px;
}

.balance-card {
    border-radius: 16px;
}

.stats-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.stat-card {
    border-radius: 12px;
}

.clickable-card {
    cursor: pointer;
    transition: transform 0.2s;

    &:active {
        transform: scale(0.98);
    }
}

.distribution-item {
    &:last-child {
        margin-bottom: 0 !important;
    }

    &.clickable {
        cursor: pointer;
        padding: 8px;
        margin: -8px;
        margin-bottom: 8px !important;
        border-radius: 8px;
        transition: background-color 0.2s;

        &:hover {
            background-color: rgba(0, 0, 0, 0.04);
        }

        &:active {
            background-color: rgba(0, 0, 0, 0.08);
        }
    }
}

.budget-alert {
    padding: 8px;
    background: rgba(244, 67, 54, 0.05);
    border-radius: 8px;

    &:last-child {
        margin-bottom: 0 !important;
    }
}

.pie-chart-container {
    max-width: 280px;
    margin: 0 auto;
}

.pie-legend {
    display: grid;
    // Falls back to a single column on narrow screens rather than squeezing
    // two unreadable ones.
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 8px;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    // Without this the grid cell refuses to shrink and the label overflows.
    min-width: 0;
}

.legend-color {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    flex-shrink: 0;
}

.legend-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.legend-value {
    flex-shrink: 0;
}
</style>
