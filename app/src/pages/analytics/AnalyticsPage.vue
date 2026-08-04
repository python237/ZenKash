<template>
    <q-page class="q-pa-md">
        <!-- Period + filters, shared by every tab -->
        <div class="row items-center no-wrap q-mb-sm">
            <PeriodChips class="col" />
            <div class="filter-button q-ml-sm">
                <BtnIcon icon="tune" @click="showFilters = true" />
                <q-badge v-if="activeFilterCount > 0" color="primary" floating rounded>
                    {{ activeFilterCount }}
                </q-badge>
            </div>
        </div>

        <TabNav v-model="tab" :tabs="tabs" variant="pills" class="q-mb-md" />

        <BreakdownTab v-if="tab === 'breakdown'" :range-label="rangeLabel" />
        <EvolutionTab v-else-if="tab === 'evolution'" />
        <ComparisonTab v-else />

        <AnalyticsFilterSheet v-model="showFilters" />
    </q-page>
</template>

<script setup lang="ts">
import BtnIcon from 'src/components/buttons/BtnIcon.vue';
import TabNav from 'src/components/tabs/TabNav.vue';
import AnalyticsFilterSheet from 'src/components/analytics/AnalyticsFilterSheet.vue';
import BreakdownTab from 'src/components/analytics/BreakdownTab.vue';
import ComparisonTab from 'src/components/analytics/ComparisonTab.vue';
import EvolutionTab from 'src/components/analytics/EvolutionTab.vue';
import PeriodChips from 'src/components/analytics/PeriodChips.vue';
import { useAnalytics } from 'src/composables/useAnalytics';
import { useAnalyticsFilters } from 'src/composables/useAnalyticsFilters';

const { t, locale } = useI18n();
const route = useRoute();
usePage({ title: t('analytics.title'), showHeader: true, showBack: true });

const { activeFilterCount } = useAnalyticsFilters();
const { range, loadAll } = useAnalytics();

const showFilters = ref(false);

/** Tab identifiers, also accepted as the `tab` query parameter. */
const TAB_NAMES = ['breakdown', 'evolution', 'comparison'];

// Deep-linkable: /analytics?tab=evolution opens straight on that view.
const requestedTab = route.query.tab;
const tab = ref(
    typeof requestedTab === 'string' && TAB_NAMES.includes(requestedTab)
        ? requestedTab
        : 'breakdown',
);

const tabs = computed(() => [
    { value: 'breakdown', label: t('analytics.tabs.breakdown') },
    { value: 'evolution', label: t('analytics.tabs.evolution') },
    { value: 'comparison', label: t('analytics.tabs.comparison') },
]);

/** Human-readable label of the selected period. */
const rangeLabel = computed(() => {
    const formatter = new Intl.DateTimeFormat(locale.value, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    return `${formatter.format(range.value.start)} – ${formatter.format(range.value.end)}`;
});

onMounted(async () => {
    await loadAll();
});
</script>

<style lang="scss" scoped>
.filter-button {
    position: relative;
    flex-shrink: 0;
}
</style>
