<template>
    <q-dialog v-model="isOpen" maximized transition-show="slide-up" transition-hide="slide-down">
        <q-card class="breakdown-modal">
            <!-- Header -->
            <q-toolbar class="bg-white text-dark">
                <q-toolbar-title class="text-weight-bold">
                    {{ t(`transactions.${type}Breakdown`) }}
                </q-toolbar-title>
                <BtnIcon icon="close" @click="isOpen = false" />
            </q-toolbar>

            <!-- Tabs -->
            <TabNav v-model="activeTab" :tabs="tabs" variant="underline" class="q-px-md" />

            <q-card-section class="q-pa-md">
                <!-- Master Category Tab -->
                <div v-if="activeTab === 'master'">
                    <div
                        v-if="masterCategoryData.length === 0"
                        class="text-center text-grey-6 q-py-xl"
                    >
                        {{ t('common.noData') }}
                    </div>
                    <div v-else>
                        <!-- Pie Chart -->
                        <div class="pie-chart-container q-mb-lg">
                            <Pie :data="masterCategoryChartData" :options="pieChartOptions" />
                        </div>

                        <!-- Legend List -->
                        <q-list separator>
                            <q-item
                                v-for="item in masterCategoryData"
                                :key="item.id"
                                class="q-pa-sm"
                            >
                                <q-item-section avatar>
                                    <q-avatar
                                        :style="{ backgroundColor: item.color }"
                                        text-color="white"
                                        size="40px"
                                    >
                                        <q-icon :name="item.icon" size="20px" />
                                    </q-avatar>
                                </q-item-section>
                                <q-item-section>
                                    <q-item-label class="text-weight-medium">{{
                                        item.name
                                    }}</q-item-label>
                                    <q-item-label caption
                                        >{{ item.transactionCount }} transactions</q-item-label
                                    >
                                </q-item-section>
                                <q-item-section side>
                                    <q-item-label class="text-weight-bold">{{
                                        formatCurrency(item.amount)
                                    }}</q-item-label>
                                    <q-item-label caption>{{
                                        formatPercent(item.percent)
                                    }}</q-item-label>
                                </q-item-section>
                            </q-item>
                        </q-list>
                    </div>
                </div>

                <!-- Category Tab -->
                <div v-if="activeTab === 'category'">
                    <div v-if="categoryData.length === 0" class="text-center text-grey-6 q-py-xl">
                        {{ t('common.noData') }}
                    </div>
                    <div v-else>
                        <!-- Pie Chart -->
                        <div class="pie-chart-container q-mb-lg">
                            <Pie :data="categoryChartData" :options="pieChartOptions" />
                        </div>

                        <!-- Legend List -->
                        <q-list separator>
                            <q-item v-for="item in categoryData" :key="item.id" class="q-pa-sm">
                                <q-item-section avatar>
                                    <q-avatar
                                        :style="{ backgroundColor: item.color }"
                                        text-color="white"
                                        size="40px"
                                    >
                                        <q-icon :name="item.icon ?? 'label'" size="20px" />
                                    </q-avatar>
                                </q-item-section>
                                <q-item-section>
                                    <q-item-label class="text-weight-medium">{{
                                        item.name
                                    }}</q-item-label>
                                    <q-item-label caption>
                                        {{ item.masterCategoryName }} •
                                        {{ item.transactionCount }} transactions
                                    </q-item-label>
                                </q-item-section>
                                <q-item-section side>
                                    <q-item-label class="text-weight-bold">{{
                                        formatCurrency(item.amount)
                                    }}</q-item-label>
                                    <q-item-label caption>{{
                                        formatPercent(item.percent)
                                    }}</q-item-label>
                                </q-item-section>
                            </q-item>
                        </q-list>
                    </div>
                </div>
            </q-card-section>
        </q-card>
    </q-dialog>
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
import type { TransactionWithRelations } from 'src/types/transaction';
import type { CurrencyCode } from 'src/types/currency';
import TabNav from 'src/components/tabs/TabNav.vue';
import BtnIcon from 'src/components/buttons/BtnIcon.vue';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const props = defineProps<{
    modelValue: boolean;
    type: 'income' | 'expense';
    transactions: TransactionWithRelations[];
    defaultCurrency: CurrencyCode;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const { t, locale } = useI18n();

// Stores
const categoryStore = useCategoryStore();
const masterCategoryStore = useMasterCategoryStore();
const exchangeRateStore = useExchangeRateStore();

// Open state
const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
});

// Active tab
const activeTab = ref<'master' | 'category'>('master');

// Tab config
const tabs = computed(() => [
    { value: 'master', label: t('masterCategories.title') },
    { value: 'category', label: t('categories.title') },
]);

// Chart colors palette
const chartColors = [
    '#0d9488',
    '#f59e0b',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
    '#ef4444',
    '#3b82f6',
    '#f97316',
    '#14b8a6',
];

// Get transactions of the right type
const filteredTransactions = computed(() => {
    return props.transactions.filter((tx) => {
        if (props.type === 'income') {
            return (
                tx.type === 'income' ||
                (tx.type === 'project' && tx.projectTransactionType === 'dividend') ||
                (tx.type === 'investment' && tx.investmentTransactionType === 'sell')
            );
        } else {
            return (
                tx.type === 'expense' ||
                (tx.type === 'project' && tx.projectTransactionType === 'injection') ||
                (tx.type === 'investment' && tx.investmentTransactionType === 'buy')
            );
        }
    });
});

// Calculate total
const totalAmount = computed(() => {
    return filteredTransactions.value.reduce((sum, tx) => {
        const txCurrency =
            tx.type === 'investment'
                ? (tx.investment?.currency ?? props.defaultCurrency)
                : (tx.wallet?.currency ?? props.defaultCurrency);
        return (
            sum + exchangeRateStore.convertWithDefault(tx.amount, txCurrency, props.defaultCurrency)
        );
    }, 0);
});

// Master category breakdown
const masterCategoryData = computed(() => {
    const map = new Map<string, { amount: number; count: number }>();
    let projectAmount = 0;
    let projectCount = 0;
    let investmentAmount = 0;
    let investmentCount = 0;

    for (const tx of filteredTransactions.value) {
        // Handle project transactions
        if (tx.type === 'project') {
            const walletCurrency = tx.wallet?.currency ?? props.defaultCurrency;
            projectAmount += exchangeRateStore.convertWithDefault(
                tx.amount,
                walletCurrency,
                props.defaultCurrency,
            );
            projectCount++;
            continue;
        }

        // Handle investment transactions
        if (tx.type === 'investment') {
            const currency = tx.investment?.currency ?? props.defaultCurrency;
            investmentAmount += exchangeRateStore.convertWithDefault(
                tx.amount,
                currency,
                props.defaultCurrency,
            );
            investmentCount++;
            continue;
        }

        // Handle regular transactions with categories
        if (!tx.category?.masterCategory?.id) continue;
        const mcId = tx.category.masterCategory.id;
        const walletCurrency = tx.wallet?.currency ?? props.defaultCurrency;
        const amount = exchangeRateStore.convertWithDefault(
            tx.amount,
            walletCurrency,
            props.defaultCurrency,
        );

        const existing = map.get(mcId) ?? { amount: 0, count: 0 };
        existing.amount += amount;
        existing.count += 1;
        map.set(mcId, existing);
    }

    const result = [];
    let colorIndex = 0;

    for (const [mcId, data] of map.entries()) {
        const mc = masterCategoryStore.masterCategories.find((m) => m.id === mcId);
        if (!mc) continue;

        result.push({
            id: mcId,
            name: mc.name,
            icon: mc.icon,
            color: mc.color ?? chartColors[colorIndex % chartColors.length],
            amount: data.amount,
            transactionCount: data.count,
            percent: totalAmount.value > 0 ? (data.amount / totalAmount.value) * 100 : 0,
        });
        colorIndex++;
    }

    // Add project entry if there are project transactions
    if (projectCount > 0) {
        result.push({
            id: '__project__',
            name: t('projects.title'),
            icon: 'rocket_launch',
            color: props.type === 'income' ? '#9c27b0' : '#ff9800', // Purple for dividend, Orange for injection
            amount: projectAmount,
            transactionCount: projectCount,
            percent: totalAmount.value > 0 ? (projectAmount / totalAmount.value) * 100 : 0,
        });
    }

    // Add investment entry if there are investment transactions
    if (investmentCount > 0) {
        result.push({
            id: '__investment__',
            name: t('investments.title'),
            icon: 'trending_up',
            color: props.type === 'income' ? '#ffc107' : '#009688', // Amber for sell, Teal for buy
            amount: investmentAmount,
            transactionCount: investmentCount,
            percent: totalAmount.value > 0 ? (investmentAmount / totalAmount.value) * 100 : 0,
        });
    }

    return result.sort((a, b) => b.amount - a.amount);
});

// Category breakdown
const categoryData = computed(() => {
    const map = new Map<string, { amount: number; count: number }>();
    const projectMap = new Map<string, { name: string; amount: number; count: number }>();
    const investmentMap = new Map<string, { name: string; amount: number; count: number }>();

    for (const tx of filteredTransactions.value) {
        // Handle project transactions - group by project
        if (tx.type === 'project') {
            const projectId = tx.projectId ?? '__unknown__';
            const projectName = tx.project?.name ?? t('common.noData');
            const walletCurrency = tx.wallet?.currency ?? props.defaultCurrency;
            const amount = exchangeRateStore.convertWithDefault(
                tx.amount,
                walletCurrency,
                props.defaultCurrency,
            );

            const existing = projectMap.get(projectId) ?? {
                name: projectName,
                amount: 0,
                count: 0,
            };
            existing.amount += amount;
            existing.count += 1;
            projectMap.set(projectId, existing);
            continue;
        }

        // Handle investment transactions - group by investment
        if (tx.type === 'investment') {
            const investmentId = tx.investment?.id ?? '__unknown__';
            const investmentName = tx.investment?.label ?? t('common.noData');
            const currency = tx.investment?.currency ?? props.defaultCurrency;
            const amount = exchangeRateStore.convertWithDefault(
                tx.amount,
                currency,
                props.defaultCurrency,
            );

            const existing = investmentMap.get(investmentId) ?? {
                name: investmentName,
                amount: 0,
                count: 0,
            };
            existing.amount += amount;
            existing.count += 1;
            investmentMap.set(investmentId, existing);
            continue;
        }

        // Handle regular transactions with categories
        if (!tx.categoryId) continue;
        const catId = tx.categoryId;
        const walletCurrency = tx.wallet?.currency ?? props.defaultCurrency;
        const amount = exchangeRateStore.convertWithDefault(
            tx.amount,
            walletCurrency,
            props.defaultCurrency,
        );

        const existing = map.get(catId) ?? { amount: 0, count: 0 };
        existing.amount += amount;
        existing.count += 1;
        map.set(catId, existing);
    }

    const result = [];
    let colorIndex = 0;

    for (const [catId, data] of map.entries()) {
        const cat = categoryStore.categories.find((c) => c.id === catId);
        if (!cat) continue;

        const mc = masterCategoryStore.masterCategories.find((m) => m.id === cat.masterCategoryId);

        result.push({
            id: catId,
            name: cat.name,
            icon: cat.icon,
            color: chartColors[colorIndex % chartColors.length],
            masterCategoryName: mc?.name ?? '',
            amount: data.amount,
            transactionCount: data.count,
            percent: totalAmount.value > 0 ? (data.amount / totalAmount.value) * 100 : 0,
        });
        colorIndex++;
    }

    // Add project entries
    for (const [projectId, data] of projectMap.entries()) {
        result.push({
            id: `project-${projectId}`,
            name: data.name,
            icon: 'rocket_launch',
            color: props.type === 'income' ? '#9c27b0' : '#ff9800',
            masterCategoryName: t('projects.title'),
            amount: data.amount,
            transactionCount: data.count,
            percent: totalAmount.value > 0 ? (data.amount / totalAmount.value) * 100 : 0,
        });
    }

    // Add investment entries
    for (const [investmentId, data] of investmentMap.entries()) {
        result.push({
            id: `investment-${investmentId}`,
            name: data.name,
            icon: 'trending_up',
            color: props.type === 'income' ? '#ffc107' : '#009688',
            masterCategoryName: t('investments.title'),
            amount: data.amount,
            transactionCount: data.count,
            percent: totalAmount.value > 0 ? (data.amount / totalAmount.value) * 100 : 0,
        });
    }

    return result.sort((a, b) => b.amount - a.amount);
});

// Chart data for master categories
const masterCategoryChartData = computed<ChartData<'pie'>>(() => ({
    labels: masterCategoryData.value.map((item) => item.name),
    datasets: [
        {
            data: masterCategoryData.value.map((item) => item.amount),
            backgroundColor: masterCategoryData.value.map((item) => item.color),
            borderWidth: 0,
        },
    ],
}));

// Chart data for categories
const categoryChartData = computed<ChartData<'pie'>>(() => ({
    labels: categoryData.value.map((item) => item.name),
    datasets: [
        {
            data: categoryData.value.map((item) => item.amount),
            backgroundColor: categoryData.value.map((item) => item.color),
            borderWidth: 0,
        },
    ],
}));

// Chart options
const pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            callbacks: {
                label: (context) => {
                    const value = context.raw as number;
                    const percent =
                        totalAmount.value > 0
                            ? ((value / totalAmount.value) * 100).toFixed(1)
                            : '0';
                    return `${formatCurrency(value)} (${percent}%)`;
                },
            },
        },
    },
};

/**
 * Formats a numeric amount as a currency string using the default currency.
 * @param amount - The numeric amount to format
 * @returns The formatted currency string
 */
function formatCurrency(amount: number): string {
    return new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: props.defaultCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Formats a numeric value as a percentage string with one decimal place.
 * @param percent - The percentage value to format
 * @returns The formatted percentage string with % symbol
 */
function formatPercent(percent: number): string {
    return `${percent.toFixed(1)}%`;
}
</script>

<style lang="scss" scoped>
.breakdown-modal {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.pie-chart-container {
    max-width: 280px;
    margin: 0 auto;
}
</style>
