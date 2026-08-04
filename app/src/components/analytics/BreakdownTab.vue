<template>
    <div>
        <!-- Drill-down breadcrumb -->
        <q-chip
            v-if="drillLabel"
            removable
            color="primary"
            text-color="white"
            icon="filter_alt"
            class="q-mb-md"
            :label="drillLabel"
            @remove="clearDrill"
        />

        <AnalyticsSummary
            :summary="summary"
            :outflow-delta="outflowDelta"
            :range-label="rangeLabel"
        />

        <!-- Breakdown -->
        <q-card class="q-mb-md" flat bordered>
            <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">
                    {{ t(`analytics.dimensions.${filters.dimension}`) }}
                </div>

                <div v-if="isEmpty" class="text-center text-grey-6 q-py-lg">
                    {{ t('analytics.noData') }}
                </div>

                <template v-else>
                    <BreakdownDoughnut
                        :rows="breakdownRows"
                        :center-label="t('analytics.total')"
                        class="q-mb-md"
                    />
                    <BreakdownList :rows="breakdownRows" @select="onRowSelect" />
                </template>
            </q-card-section>
        </q-card>

        <!-- Largest single expenses -->
        <q-card v-if="topOutflows.length > 0" flat bordered>
            <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-sm">
                    {{ t('analytics.topExpenses') }}
                </div>
                <q-list separator>
                    <q-item v-for="flow in topOutflows" :key="flow.id">
                        <q-item-section>
                            <q-item-label>{{ labelOf(flow) }}</q-item-label>
                            <q-item-label caption>{{ formatDay(flow.date) }}</q-item-label>
                        </q-item-section>
                        <q-item-section side>
                            <q-item-label class="text-weight-medium">
                                {{ formatCurrency(flow.amount) }}
                            </q-item-label>
                        </q-item-section>
                    </q-item>
                </q-list>
            </q-card-section>
        </q-card>

        <!-- Flows of the selected row -->
        <ModalBase v-model="showFlows" :title="selectedRow?.name ?? ''">
            <div class="text-caption text-grey-6 q-mb-sm">
                {{ formatCurrency(selectedRow?.amount ?? 0) }} ·
                {{ t('analytics.flowCount', { count: selectedFlows.length }) }}
            </div>
            <q-list separator>
                <q-item v-for="flow in selectedFlows" :key="flow.id">
                    <q-item-section>
                        <q-item-label>{{ labelOf(flow) }}</q-item-label>
                        <q-item-label caption>{{ formatDay(flow.date) }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <q-item-label
                            class="text-weight-medium"
                            :class="flow.direction === 'in' ? 'text-positive' : 'text-negative'"
                        >
                            {{ formatCurrency(flow.amount) }}
                        </q-item-label>
                    </q-item-section>
                </q-item>
            </q-list>
        </ModalBase>
    </div>
</template>

<script setup lang="ts">
import type { BreakdownRow } from 'src/types/analytics';
import type { MasterCategory } from 'src/types/master-category';
import ModalBase from 'src/components/modals/ModalBase.vue';
import AnalyticsSummary from './AnalyticsSummary.vue';
import BreakdownDoughnut from './BreakdownDoughnut.vue';
import BreakdownList from './BreakdownList.vue';
import { useAnalytics } from 'src/composables/useAnalytics';
import { useAnalyticsFilters } from 'src/composables/useAnalyticsFilters';
import { useCurrency } from 'src/composables/useCurrency';

defineProps<{
    /** Human-readable label of the selected period */
    rangeLabel: string;
}>();

const { t, locale } = useI18n();
const masterCategoryStore = useMasterCategoryStore();
const { filters, drillIntoMasterCategory, clearDrill } = useAnalyticsFilters();
const {
    summary,
    outflowDelta,
    breakdownRows,
    flowsByKey,
    topOutflows,
    isEmpty,
    labelOf,
} = useAnalytics();
const { formatCurrency } = useCurrency();

const showFlows = ref(false);
const selectedRow = ref<BreakdownRow | null>(null);

/** Flows behind the row opened in the detail modal. */
const selectedFlows = computed(() => {
    const key = selectedRow.value?.key;
    if (!key) return [];
    return flowsByKey.value.get(key) ?? [];
});

/** Label of the active drill-down, or null when browsing the top level. */
const drillLabel = computed(() => {
    const [masterCategoryId, ...rest] = filters.value.masterCategoryIds;
    if (!masterCategoryId || rest.length > 0) return null;
    if (filters.value.dimension !== 'category') return null;

    const masterCategory = masterCategoryStore.getMasterCategoryById(masterCategoryId) as
        | MasterCategory
        | undefined;
    return masterCategory?.name ?? null;
});

/**
 * Formats a flow date for the lists.
 * @param date - The flow date
 * @returns A short localized date
 */
function formatDay(date: Date): string {
    return new Intl.DateTimeFormat(locale.value, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

/**
 * Handles a tap on a breakdown row: master categories drill one level deeper,
 * every other row opens the flows behind it.
 * @param row - The tapped row
 */
function onRowSelect(row: BreakdownRow): void {
    if (row.drillable) {
        drillIntoMasterCategory(row.key);
        return;
    }
    selectedRow.value = row;
    showFlows.value = true;
}
</script>
