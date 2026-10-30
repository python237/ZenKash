<template>
    <q-page class="zk-page dashboard">
        <!-- Greeting -->
        <header class="greeting">
            <div class="greeting__text">
                <span class="greeting__date">{{ formattedToday }}</span>
                <h1 class="greeting__title">
                    {{
                        settingsStore.firstName
                            ? t('report.greetingName', { name: settingsStore.firstName })
                            : t('report.greeting')
                    }}
                </h1>
            </div>
            <div class="greeting__actions">
                <button
                    type="button"
                    class="header-btn"
                    :aria-label="amountsHidden ? t('report.showAmounts') : t('report.hideAmounts')"
                    :aria-pressed="amountsHidden"
                    @click="toggleAmounts"
                >
                    <q-icon
                        :name="amountsHidden ? 'o_visibility_off' : 'o_visibility'"
                        size="22px"
                    />
                </button>
                <button
                    type="button"
                    class="header-btn"
                    :aria-label="t('notifications.title')"
                    @click="router.push({ name: 'notifications' })"
                >
                    <q-icon name="o_notifications" size="22px" />
                    <span v-if="notificationStore.unreadCount > 0" class="header-btn__badge">
                        {{
                            notificationStore.unreadCount > 9 ? '9+' : notificationStore.unreadCount
                        }}
                    </span>
                </button>
            </div>
        </header>

        <!-- Hero: available balance + net worth -->
        <section class="zk-hero">
            <div class="hero-balance">
                <span class="zk-hero__label">
                    {{ t('report.availableBalance') }} ·
                    {{
                        t(
                            'report.walletsCount',
                            { count: walletStore.nonGameWallets.length },
                            walletStore.nonGameWallets.length,
                        )
                    }}
                </span>
                <span class="zk-amount zk-amount--xl">{{ formattedGlobalBalance }}</span>
                <span v-if="outstandingPayables > 0" class="hero-borrowed">
                    {{
                        t('netWorth.includesBorrowed', {
                            amount: formatCurrency(outstandingPayables),
                        })
                    }}
                </span>
            </div>
            <div class="zk-hero__divider" />
            <button type="button" class="hero-networth" @click="router.push({ name: 'net-worth' })">
                <span class="hero-networth__body">
                    <span class="zk-hero__label">{{ t('netWorth.total') }}</span>
                    <span class="zk-amount hero-networth__value">
                        {{ formatCurrency(netWorthTotal) }}
                    </span>
                    <span
                        v-if="netWorthDelta"
                        class="hero-networth__delta"
                        :class="{ 'hero-networth__delta--down': netWorthDelta.amount < 0 }"
                    >
                        {{ netWorthDelta.percent > 0 ? '+' : ''
                        }}{{ netWorthDelta.percent.toFixed(1) }} %
                        {{ t('netWorth.vsPrevious') }}
                    </span>
                </span>
                <q-icon name="chevron_right" size="24px" class="hero-networth__chevron" />
            </button>
        </section>

        <!-- Quick actions -->
        <nav class="quick-actions" :aria-label="t('report.quickActions')">
            <button
                v-for="action in quickActions"
                :key="action.key"
                type="button"
                class="quick-action"
                @click="action.onClick"
            >
                <span class="zk-tile" :class="`zk-tile--${action.tone}`">
                    <q-icon :name="action.icon" size="20px" />
                </span>
                {{ action.label }}
            </button>
        </nav>

        <!-- Month summary -->
        <section class="zk-card">
            <div class="zk-section-head">
                <div class="month-nav">
                    <button
                        type="button"
                        class="month-nav__btn"
                        :aria-label="t('report.previousMonth')"
                        @click="prevMonth"
                    >
                        <q-icon name="chevron_left" size="20px" />
                    </button>
                    <button
                        type="button"
                        class="month-nav__label"
                        :aria-label="t('report.selectMonth')"
                        @click="showMonthPicker = true"
                    >
                        {{ formattedMonth }}
                    </button>
                    <button
                        type="button"
                        class="month-nav__btn"
                        :disabled="isCurrentMonth"
                        :aria-label="t('report.nextMonth')"
                        @click="nextMonth"
                    >
                        <q-icon name="chevron_right" size="20px" />
                    </button>
                </div>
                <button type="button" class="zk-link" @click="router.push({ name: 'analytics' })">
                    {{ t('analytics.title') }}
                </button>
            </div>

            <div class="month-stats">
                <div class="month-stat">
                    <span class="zk-caption">{{ t('report.income') }}</span>
                    <span class="month-stat__value text-positive">+{{ formattedIncome }}</span>
                </div>
                <div class="month-stat">
                    <span class="zk-caption">{{ t('report.expenses') }}</span>
                    <span class="month-stat__value text-negative">−{{ formattedExpenses }}</span>
                </div>
                <div class="month-stat">
                    <span class="zk-caption">{{ t('report.savings') }}</span>
                    <span class="month-stat__value">{{ formattedSavingsRate }}</span>
                </div>
            </div>

            <div class="flow-bar" aria-hidden="true">
                <div class="flow-bar__expense" :style="{ width: `${flowSplit.expense}%` }" />
                <div class="flow-bar__income" :style="{ width: `${flowSplit.income}%` }" />
            </div>

            <div class="month-footer">
                <span class="zk-caption">
                    {{ t('report.net') }} :
                    <strong :class="netTextClass">{{ formattedNet }}</strong>
                </span>
                <span v-if="monthlyStats.games !== 0" class="zk-caption">
                    {{ t('games.title') }} :
                    <strong :class="gamesTextClass">{{ formattedGames }}</strong>
                </span>
            </div>
        </section>

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

        <!-- Budgets -->
        <section v-if="topBudgets.length > 0" class="zk-card">
            <div class="zk-section-head">
                <h2 class="zk-section-title">{{ t('budgets.title') }}</h2>
                <button type="button" class="zk-link" @click="router.push({ name: 'budgets' })">
                    {{ t('common.seeAll') }}
                </button>
            </div>
            <div v-for="budget in topBudgets" :key="budget.id" class="budget-line">
                <div class="budget-line__head">
                    <span class="budget-line__name">{{ budget.name }}</span>
                    <span
                        class="budget-line__amounts"
                        :class="{ 'budget-line__amounts--alert': budget.percent >= 90 }"
                    >
                        {{ formatCurrency(budget.spent) }} / {{ formatCurrency(budget.amount) }}
                    </span>
                </div>
                <div class="zk-progress">
                    <div
                        :style="{
                            width: `${Math.min(budget.percent, 100)}%`,
                            background: budgetColor(budget.percent),
                        }"
                    />
                </div>
            </div>
        </section>

        <!-- Distribution by master category -->
        <section class="zk-card">
            <h2 class="zk-section-title">{{ t('report.expenseDistribution') }}</h2>

            <div v-if="expenseDistribution.length === 0" class="zk-caption q-py-md text-center">
                {{ t('report.noExpenses') }}
            </div>

            <button
                v-for="item in expenseDistribution"
                :key="item.id"
                type="button"
                class="distribution-item"
                @click="goToMasterCategoryDetail(item.id)"
            >
                <span class="distribution-item__head">
                    <span class="distribution-item__name">{{ item.name }}</span>
                    <span class="distribution-item__amount">
                        {{ formatCurrency(item.amount) }}
                        <span class="zk-caption">· {{ formatPercent(item.percent) }}</span>
                    </span>
                </span>
                <span class="zk-progress">
                    <span
                        class="distribution-item__fill"
                        :style="{
                            width: `${item.percent}%`,
                            background: toneOf(item.color).fg,
                        }"
                    />
                </span>
            </button>
        </section>

        <!-- Category Pie Chart -->
        <section v-if="categoryDistribution.length > 0" class="zk-card">
            <h2 class="zk-section-title">{{ t('report.categoryDistribution') }}</h2>

            <div class="pie-chart-container">
                <Pie :data="pieChartData" :options="pieChartOptions" />
            </div>

            <div class="pie-legend">
                <div v-for="item in categoryDistribution" :key="item.id" class="legend-item">
                    <span class="legend-color" :style="{ backgroundColor: item.chartColor }"></span>
                    <span class="legend-label">{{ item.name }}</span>
                    <span class="legend-value zk-caption">{{ formatPercent(item.percent) }}</span>
                </div>
            </div>
        </section>

        <!-- Recent transactions -->
        <section class="recent">
            <div class="zk-section-head recent__head">
                <h2 class="zk-section-title">{{ t('report.recent') }}</h2>
                <button
                    type="button"
                    class="zk-link"
                    @click="router.push({ name: 'transactions' })"
                >
                    {{ t('common.seeAll') }}
                </button>
            </div>
            <TransactionList :transactions="recentTransactions" :show-date-headers="false" />
        </section>
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
import TransactionList from 'src/components/transactions/TransactionList.vue';
import { useNotificationStore } from 'src/stores/notification';
import { usePrivacy } from 'src/composables/usePrivacy';
import { toneOf } from 'src/services/tone';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const { t, locale } = useI18n();
const router = useRouter();
const { openQuickAdd } = usePage({ title: t('report.title'), showHeader: false });

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
const debtStore = useDebtStore();
const notificationStore = useNotificationStore();
const { amountsHidden, toggleAmounts } = usePrivacy();

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
    const text = new Intl.DateTimeFormat(locale.value, {
        month: 'long',
        year: 'numeric',
    }).format(date);
    return text.charAt(0).toUpperCase() + text.slice(1);
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

// Borrowed money still owed: it sits in the wallets but is not the user's own
const outstandingPayables = computed(() =>
    debtStore.payables.reduce((sum, debt) => sum + convert(debt.outstanding, debt.currency), 0),
);

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
const formattedSavingsRate = computed(() => {
    const { income, net } = monthlyStats.value;
    if (income <= 0) return '—';
    return formatPercent((net / income) * 100);
});

// Expense vs income share of the month's total flow (for the split bar)
const flowSplit = computed(() => {
    const { income, expenses } = monthlyStats.value;
    const total = income + expenses;
    if (total === 0) return { income: 0, expense: 0 };
    return { income: (income / total) * 100, expense: (expenses / total) * 100 };
});

const formattedNet = computed(() => {
    const net = monthlyStats.value.net;
    const prefix = net >= 0 ? '+' : '';
    return prefix + formatCurrency(net);
});
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

// Budgets closest to their limit (top 3)
const topBudgets = computed(() =>
    budgetStore
        .getBudgetsWithStats(monthFilter.value)
        .map((b: BudgetWithStats) => ({
            id: b.id,
            name: b.category?.name ?? b.masterCategory?.name ?? '-',
            amount: b.amount,
            spent: b.spent,
            percent: b.percentUsed,
        }))
        .sort((a, b) => b.percent - a.percent)
        .slice(0, 3),
);

/**
 * Progress color for a budget: green, amber near the limit, orange when exceeded.
 * @param percent - Percentage of the budget used
 * @returns The CSS color
 */
function budgetColor(percent: number): string {
    if (percent >= 100) return '#A63E14';
    if (percent >= 80) return '#D97A2B';
    return '#0B6E5F';
}

// Latest transactions (all months)
const recentTransactions = computed(() =>
    transactionStore.getTransactionsWithRelations().slice(0, 5),
);

// Quick actions under the hero card
const quickActions = computed(() => [
    {
        key: 'expense',
        label: t('transactions.expense'),
        icon: 'arrow_upward',
        tone: 'orange',
        onClick: () => openQuickAdd('expense'),
    },
    {
        key: 'income',
        label: t('transactions.income'),
        icon: 'arrow_downward',
        tone: 'green',
        onClick: () => openQuickAdd('income'),
    },
    {
        key: 'transfer',
        label: t('transactions.transfer'),
        icon: 'swap_horiz',
        tone: 'blue',
        onClick: () => openQuickAdd('transfer'),
    },
    {
        key: 'debt',
        label: t('report.quickLoan'),
        icon: 'o_handshake',
        tone: 'amber',
        onClick: () => void router.push({ name: 'debts', query: { add: '1' } }),
    },
]);

// Today's date for the greeting header
const formattedToday = computed(() => {
    const text = new Intl.DateTimeFormat(locale.value, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(new Date());
    return text.charAt(0).toUpperCase() + text.slice(1);
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
        debtStore.loadAll(),
        notificationStore.loadAll(),
    ]);
    // Keep the current-month net worth snapshot in sync
    await netWorthStore.captureCurrent();
});
</script>

<style lang="scss" scoped>
.dashboard {
    padding-top: calc(16px + var(--safe-area-top));
}

.greeting {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0 4px;

    &__text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }

    &__actions {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
    }

    &__date {
        font-size: 13px;
        font-weight: 500;
        color: $text-secondary;
    }

    &__title {
        margin: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 24px;
        font-weight: 800;
        line-height: 1.2;
        letter-spacing: -0.02em;
    }
}

.header-btn {
    position: relative;
    width: 44px;
    height: 44px;
    padding: 0;
    border-radius: $radius-control;
    border: 1px solid $border-color;
    background: $bg-card;
    color: $text-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &__badge {
        position: absolute;
        top: -5px;
        right: -5px;
        min-width: 18px;
        height: 18px;
        padding: 0 4px;
        border-radius: 999px;
        background: $negative;
        color: #ffffff;
        font-size: 10px;
        font-weight: 800;
        line-height: 18px;
        text-align: center;
    }
}

.hero-balance {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.hero-borrowed {
    align-self: flex-start;
    font-size: 12px;
    font-weight: 600;
    color: #ffd6b8;
    background: rgba(233, 140, 74, 0.18);
    padding: 5px 10px;
    border-radius: 999px;
}

.hero-networth {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    &__body {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    &__value {
        font-size: 18px;
        font-weight: 700;
    }

    &__delta {
        font-size: 12px;
        font-weight: 600;
        color: $hero-accent;

        &--down {
            color: #ffb48a;
        }
    }

    &__chevron {
        color: $hero-muted;
    }
}

.quick-actions {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
}

.quick-action {
    border: 0;
    background: $bg-card;
    border-radius: $radius-tile;
    padding: 12px 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    font-family: inherit;
    font-size: 12px;
    font-weight: 600;
    color: $text-primary;
    cursor: pointer;
}

.month-nav {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: -8px;

    &__btn {
        width: 36px;
        height: 36px;
        border: 0;
        border-radius: 10px;
        background: transparent;
        color: $text-primary;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;

        &:disabled {
            color: $border-color;
            cursor: default;
        }
    }

    &__label {
        border: 0;
        background: transparent;
        font-family: inherit;
        font-size: 15px;
        font-weight: 700;
        color: $text-primary;
        padding: 6px 2px;
        cursor: pointer;
    }
}

.month-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}

.month-stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;

    &__value {
        font-size: 15px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
}

.flow-bar {
    display: flex;
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    background: $grey-soft;
    gap: 2px;

    &__expense {
        background: $negative;
    }

    &__income {
        background: $positive;
    }
}

.month-footer {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
}

.budget-line {
    display: flex;
    flex-direction: column;
    gap: 6px;

    &__head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 13px;
    }

    &__name {
        font-weight: 600;
    }

    &__amounts {
        color: $text-secondary;

        &--alert {
            color: $negative;
            font-weight: 600;
        }
    }
}

.distribution-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
    padding: 4px 0;
    border: 0;
    background: transparent;
    font-family: inherit;
    text-align: left;
    color: $text-primary;
    cursor: pointer;

    &__head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        font-size: 13px;
    }

    &__name {
        font-weight: 600;
    }

    &__amount {
        font-weight: 700;
    }

    &__fill {
        display: block;
        height: 100%;
        border-radius: 999px;
    }
}

.pie-chart-container {
    max-width: 240px;
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
    font-size: 13px;
}

.legend-color {
    width: 10px;
    height: 10px;
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

.recent {
    display: flex;
    flex-direction: column;
    gap: 6px;

    &__head {
        padding: 0 4px;
    }
}
</style>
