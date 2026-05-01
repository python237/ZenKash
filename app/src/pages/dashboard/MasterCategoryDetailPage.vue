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

        <!-- Summary Card -->
        <q-card class="summary-card bg-dark text-white q-mb-md" flat>
            <q-card-section class="q-pa-md">
                <div class="row items-center">
                    <q-avatar
                        v-if="masterCategory?.color"
                        :style="{ backgroundColor: masterCategory.color }"
                        text-color="white"
                        size="48px"
                        class="q-mr-md"
                    >
                        <q-icon :name="masterCategory?.icon ?? 'category'" size="24px" />
                    </q-avatar>
                    <div class="col">
                        <div class="text-caption text-grey-5">{{ t('report.totalExpenses') }}</div>
                        <div class="text-h5 text-weight-bold q-mt-xs">
                            {{ formattedTotalAmount }}
                        </div>
                        <div class="text-caption text-grey-5 q-mt-xs">
                            {{ categoryDistribution.length }}
                            {{ t('categories.title').toLowerCase() }}
                        </div>
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- Pie Chart -->
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

                <div v-else>
                    <div class="pie-chart-container">
                        <Pie :data="pieChartData" :options="pieChartOptions" />
                    </div>

                    <!-- Legend -->
                    <div class="pie-legend q-mt-md">
                        <div
                            v-for="item in categoryDistribution"
                            :key="item.id"
                            class="legend-item"
                        >
                            <span
                                class="legend-color"
                                :style="{ backgroundColor: item.chartColor }"
                            ></span>
                            <span class="legend-label text-body2">{{ item.name }}</span>
                            <span class="legend-value text-body2 text-weight-medium">
                                {{ formatPercent(item.percent) }}
                            </span>
                        </div>
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- Category List -->
        <q-card flat bordered>
            <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">
                    {{ t('report.details') }}
                </div>

                <div
                    v-if="categoryDistribution.length === 0"
                    class="text-center text-grey-6 q-py-md"
                >
                    {{ t('report.noExpenses') }}
                </div>

                <q-list v-else separator>
                    <q-item v-for="item in categoryDistribution" :key="item.id">
                        <q-item-section avatar>
                            <q-avatar
                                :style="{ backgroundColor: item.chartColor }"
                                text-color="white"
                                size="40px"
                            >
                                <q-icon :name="item.icon ?? 'label'" size="20px" />
                            </q-avatar>
                        </q-item-section>
                        <q-item-section>
                            <q-item-label>{{ item.name }}</q-item-label>
                            <q-item-label caption
                                >{{ item.transactionCount }} transactions</q-item-label
                            >
                        </q-item-section>
                        <q-item-section side>
                            <q-item-label class="text-weight-medium">{{
                                formatCurrency(item.amount)
                            }}</q-item-label>
                            <q-item-label caption>{{ formatPercent(item.percent) }}</q-item-label>
                        </q-item-section>
                    </q-item>
                </q-list>
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
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import BtnIcon from 'src/components/buttons/BtnIcon.vue';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const { t, locale } = useI18n();
const route = useRoute();

// Stores
const walletStore = useWalletStore();
const transactionStore = useTransactionStore();
const categoryStore = useCategoryStore();
const masterCategoryStore = useMasterCategoryStore();
const settingsStore = useSettingsStore();
const exchangeRateStore = useExchangeRateStore();

// Get master category ID from route
const masterCategoryId = computed(() => route.params.id as string);

// Get master category
const masterCategory = computed(
    () =>
        masterCategoryStore.getMasterCategoryById(masterCategoryId.value) as
            | MasterCategory
            | undefined,
);

// Page title
watchEffect(() => {
    usePage({
        title: masterCategory.value?.name ?? t('report.expenseDistribution'),
        showHeader: true,
        showBack: true,
    });
});

// State
const showMonthPicker = ref(false);

// Month selection (get from query or use current)
const now = new Date();
const initialMonth =
    (route.query.month as string) ??
    `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
const selectedMonth = ref(initialMonth);

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

// Category distribution
/**
 * Represents a category's distribution data for the expense breakdown.
 */
interface CategoryDistributionItem {
    id: string;
    name: string;
    icon?: string;
    amount: number;
    percent: number;
    transactionCount: number;
    chartColor: string;
}

const categoryDistribution = computed((): CategoryDistributionItem[] => {
    const transactions = transactionStore.filterTransactions({
        month: monthFilter.value,
        type: 'expense',
    });

    // Get categories for this master category
    const categoriesInMaster = categoryStore.getCategoriesByMasterId(masterCategoryId.value);
    const categoryIds = new Set(categoriesInMaster.map((c: Category) => c.id));

    // Group by category
    const byCategory = new Map<string, { amount: number; count: number }>();

    for (const tx of transactions) {
        if (tx.type !== 'expense') continue;
        if (!categoryIds.has(tx.categoryId)) continue;

        const wallet = walletStore.getWalletById(tx.walletId);
        const currency = wallet?.currency ?? defaultCurrency.value;
        const converted = exchangeRateStore.convertWithDefault(
            tx.amount,
            currency,
            defaultCurrency.value,
        );

        const current = byCategory.get(tx.categoryId) ?? { amount: 0, count: 0 };
        byCategory.set(tx.categoryId, {
            amount: current.amount + converted,
            count: current.count + 1,
        });
    }

    // Calculate total
    let total = 0;
    for (const { amount } of byCategory.values()) {
        total += amount;
    }

    if (total === 0) return [];

    // Build distribution items
    const items: CategoryDistributionItem[] = [];
    let colorIndex = 0;
    for (const [catId, { amount, count }] of byCategory) {
        const cat = categoryStore.getCategoryById(catId) as Category | undefined;
        if (!cat) continue;

        items.push({
            id: catId,
            name: cat.name,
            icon: cat.icon,
            amount,
            percent: (amount / total) * 100,
            transactionCount: count,
            chartColor: chartColors[colorIndex % chartColors.length] ?? '#999',
        });
        colorIndex++;
    }

    // Sort by amount descending
    return items.sort((a, b) => b.amount - a.amount);
});

// Total amount
const totalAmount = computed(() => {
    return categoryDistribution.value.reduce((sum, item) => sum + item.amount, 0);
});

const formattedTotalAmount = computed(() => formatCurrency(totalAmount.value));

// Pie chart data
const pieChartData = computed((): ChartData<'pie'> => {
    const distribution = categoryDistribution.value;
    return {
        labels: distribution.map((item) => item.name),
        datasets: [
            {
                data: distribution.map((item) => item.amount),
                backgroundColor: distribution.map((item) => item.chartColor),
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
                display: false,
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

// Load data
onMounted(async () => {
    await Promise.all([
        settingsStore.loadSettings(),
        exchangeRateStore.loadAll(),
        walletStore.loadAll(),
        transactionStore.loadAll(),
        categoryStore.loadAll(),
        masterCategoryStore.loadAll(),
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

.summary-card {
    border-radius: 16px;
}

.pie-chart-container {
    max-width: 280px;
    margin: 0 auto;
}

.pie-legend {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
}

.legend-color {
    width: 14px;
    height: 14px;
    border-radius: 4px;
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
