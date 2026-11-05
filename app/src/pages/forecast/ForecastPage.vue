<template>
    <q-page class="zk-page">
        <TabNav v-model="tab" :tabs="tabs" />
        <NetWorthForecastPanel v-if="tab === 'networth'" @show-cash-flow="tab = 'cash'" />
        <CashFlowPanel v-else />
    </q-page>
</template>

<script setup lang="ts">
import TabNav from 'src/components/tabs/TabNav.vue';
import NetWorthForecastPanel from 'src/components/forecast/NetWorthForecastPanel.vue';
import CashFlowPanel from 'src/components/forecast/CashFlowPanel.vue';

/** Tabs of the forecast screen. */
type ForecastTab = 'networth' | 'cash';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

usePage({ title: t('forecast.title'), showHeader: true, showBack: true });

const tabs = computed(() => [
    { value: 'networth', label: t('forecast.tabNetWorth') },
    { value: 'cash', label: t('forecast.tabCashFlow') },
]);

/** Active tab, kept in the query so the back button and old links land right. */
const tab = computed<ForecastTab>({
    get: () => (route.query.tab === 'cash' ? 'cash' : 'networth'),
    set: (value: ForecastTab) => {
        void router.replace({ query: { ...route.query, tab: value } });
    },
});
</script>
