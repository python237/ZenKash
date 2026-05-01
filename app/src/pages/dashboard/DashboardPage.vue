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
                    <div
                        v-for="item in categoryDistribution.slice(0, 6)"
                        :key="item.id"
                        class="legend-item"
                    >
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
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import { useBudgetStore } from 'src/stores/budget';
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

// Currency
const defaultCurrency = computed(() => settingsStore.defaultCurrency ?? CurrencyCode.XOF);
const currencyInfo = computed(() => CURRENCIES[defaultCurrency.value]);

// Currency formatting
/**
 * Formats a numeric amount as a localized currency string.
 * Uses the user's default currency and locale settings.
 * @param {number} amount - The amount to format
 * @returns {string} The formatted currency string
 */
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: defaultCurrency.value,
        minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
        maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
    }).format(amount);
}

/**
 * Formats a numeric value as a percentage string with one decimal place.
 * @param {number} value - The percentage value to format
 * @returns {string} The formatted percentage string (e.g., "45.5%")
 */
function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
}

// Global balance (sum of all wallets converted to default currency)
const globalBalance = computed(() => {
    return walletStore.wallets.reduce((total: number, wallet: Wallet) => {
        const converted = exchangeRateStore.convertWithDefault(
            wallet.balance,
            wallet.currency,
            defaultCurrency.value,
        );
        return total + converted;
    }, 0);
});

const formattedGlobalBalance = computed(() => formatCurrency(globalBalance.value));

// Monthly income/expenses
const monthlyStats = computed(() => {
    const transactions = transactionStore.filterTransactions({ month: monthFilter.value });

    let income = 0;
    let expenses = 0;

    for (const tx of transactions) {
        if (tx.type === 'income') {
            // Get wallet currency and convert
            const wallet = walletStore.getWalletById(tx.walletId);
            const currency = wallet?.currency ?? defaultCurrency.value;
            income += exchangeRateStore.convertWithDefault(
                tx.amount,
                currency,
                defaultCurrency.value,
            );
        } else if (tx.type === 'expense') {
            const wallet = walletStore.getWalletById(tx.walletId);
            const currency = wallet?.currency ?? defaultCurrency.value;
            expenses += exchangeRateStore.convertWithDefault(
                tx.amount,
                currency,
                defaultCurrency.value,
            );
        }
    }

    return { income, expenses, net: income - expenses };
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

// Chart colors palette
const chartColors = [
    '#4CAF50',
    '#2196F3',
    '#FF9800',
    '#E91E63',
    '#9C27B0',
    '#00BCD4',
    '#795548',
    '#607D8B',
    '#FF5722',
    '#3F51B5',
    '#8BC34A',
    '#FFC107',
    '#673AB7',
    '#009688',
    '#CDDC39',
];

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
        const wallet = walletStore.getWalletById(tx.walletId);
        const currency = wallet?.currency ?? defaultCurrency.value;
        const converted = exchangeRateStore.convertWithDefault(
            tx.amount,
            currency,
            defaultCurrency.value,
        );

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

        const categoryId = tx.categoryId;
        const wallet = walletStore.getWalletById(tx.walletId);
        const currency = wallet?.currency ?? defaultCurrency.value;
        const converted = exchangeRateStore.convertWithDefault(
            tx.amount,
            currency,
            defaultCurrency.value,
        );

        const current = byCategory.get(categoryId) ?? 0;
        byCategory.set(categoryId, current + converted);
    }

    // Calculate total
    let total = 0;
    for (const amount of byCategory.values()) {
        total += amount;
    }

    if (total === 0) return [];

    // Build distribution items
    const items: DistributionItem[] = [];
    let colorIndex = 0;
    for (const [catId, amount] of byCategory) {
        const cat = categoryStore.getCategoryById(catId) as Category | undefined;
        if (!cat) continue;

        items.push({
            id: catId,
            name: cat.name,
            amount,
            percent: (amount / total) * 100,
            chartColor: chartColors[colorIndex % chartColors.length] ?? '#999',
        });
        colorIndex++;
    }

    // Sort by amount descending
    return items.sort((a, b) => b.amount - a.amount);
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
    ]);
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
    grid-template-columns: repeat(3, 1fr);
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
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
}

.legend-color {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    flex-shrink: 0;
}

.legend-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.legend-value {
    flex-shrink: 0;
}
</style>
