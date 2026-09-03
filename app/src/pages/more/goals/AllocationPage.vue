<template>
    <q-page class="q-pa-md">
        <!-- Amount to spread. The currency drives which goals are analyzed:
             goals are never converted, so no plan depends on an exchange rate. -->
        <q-card flat bordered class="input-card q-pa-md q-mb-md">
            <div class="row q-col-gutter-sm">
                <div class="col-7">
                    <InputNumber
                        v-model="amount"
                        :label="t('goals.allocation.amount')"
                        :suffix="currencySymbol"
                    />
                </div>
                <div class="col-5">
                    <q-select
                        v-model="currency"
                        :options="currencyOptions"
                        :label="t('goals.allocation.currency')"
                        outlined
                        dense
                        emit-value
                        map-options
                    />
                </div>
            </div>

            <div v-if="notes.length > 0" class="text-caption text-grey-6 q-mt-sm">
                <div v-for="note in notes" :key="note">{{ note }}</div>
            </div>
            <div v-if="result.excluded.sharedWallet > 0" class="text-caption text-warning q-mt-xs">
                {{
                    t('goals.allocation.sharedWalletWarning', {
                        count: result.excluded.sharedWallet,
                    })
                }}
            </div>
        </q-card>

        <!-- Nothing to work on -->
        <div v-if="result.eligible.length === 0" class="empty-state">
            <q-icon name="savings" size="64px" color="grey-4" />
            <div class="text-grey-6 q-mt-md">{{ t('goals.allocation.noEligible') }}</div>
        </div>

        <template v-else>
            <TabNav v-model="tab" :tabs="tabs" variant="pills" class="q-mb-md" />

            <div v-if="amount <= 0" class="empty-state">
                <q-icon name="edit" size="48px" color="grey-4" />
                <div class="text-grey-6 q-mt-md">{{ t('goals.allocation.enterAmount') }}</div>
            </div>

            <template v-else>
                <!-- General tab: which strategy, and the rule that picked it -->
                <q-card v-if="tab === GENERAL_TAB" flat bordered class="recommendation q-mb-md">
                    <q-card-section>
                        <div class="text-caption text-grey-6">
                            {{ t('goals.allocation.recommendedStrategy') }}
                        </div>
                        <div class="text-h6 text-weight-medium">
                            {{ strategyLabel(result.recommendation.strategy) }}
                        </div>
                        <div class="text-body2 q-mt-xs">
                            {{ explain(result.recommendation.explanation, currency) }}
                        </div>
                    </q-card-section>
                </q-card>

                <AllocationPlanList
                    :plan="activePlan"
                    :goals="result.eligible"
                    :currency="currency"
                    :recommended="activePlan.strategy === result.recommendation.strategy"
                />
            </template>
        </template>
    </q-page>
</template>

<script setup lang="ts">
import type { TabItem } from 'src/components/tabs/TabNav.vue';
import type { CurrencyCode } from 'src/types/currency';
import { CURRENCIES } from 'src/types/currency';
import { AllocationStrategy } from 'src/types/goal-allocation';
import { useSavingsGoalStore } from 'src/stores/savings-goal';
import { allocatableCurrencies, buildAllocation } from 'src/services/goal-allocation';
import { useAllocationText } from 'src/composables/useAllocationText';
import InputNumber from 'src/components/inputs/InputNumber.vue';
import TabNav from 'src/components/tabs/TabNav.vue';
import AllocationPlanList from 'src/components/goals/AllocationPlanList.vue';

/** Tab showing the recommendation instead of a fixed strategy. */
const GENERAL_TAB = 'general';

/** Order the strategy tabs are displayed in. */
const STRATEGIES = [
    AllocationStrategy.Balanced,
    AllocationStrategy.Snowball,
    AllocationStrategy.Deadline,
    AllocationStrategy.AtRisk,
];

const { t } = useI18n();
usePage({ title: t('goals.allocation.title'), showHeader: true, showBack: true });

const goalStore = useSavingsGoalStore();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();
const { defaultCurrency } = useCurrency();
const { explain, strategyLabel } = useAllocationText();

const amount = ref(0);
const currency = ref<CurrencyCode>(defaultCurrency.value);
const tab = ref(GENERAL_TAB);

onMounted(async () => {
    await Promise.all([settingsStore.loadSettings(), goalStore.loadAll(), walletStore.loadAll()]);
    // Start on the currency that carries the most open goals, so the screen is
    // useful without touching the selector.
    const [mostUsed] = allocatableCurrencies(goalStore.goalsWithStats);
    currency.value = mostUsed ?? defaultCurrency.value;
});

const currencyOptions = computed(() => {
    const codes = allocatableCurrencies(goalStore.goalsWithStats);
    if (!codes.includes(currency.value)) codes.push(currency.value);
    return codes.map((code: CurrencyCode) => ({ value: code, label: code }));
});

const currencySymbol = computed(() => CURRENCIES[currency.value]?.symbol ?? currency.value);

const result = computed(() =>
    buildAllocation(goalStore.goalsWithStats, {
        currency: currency.value,
        available: amount.value,
        decimals: CURRENCIES[currency.value]?.decimals ?? 0,
    }),
);

const activePlan = computed(() =>
    tab.value === GENERAL_TAB
        ? result.value.plans[result.value.recommendation.strategy]
        : result.value.plans[tab.value as AllocationStrategy],
);

const tabs = computed<TabItem[]>(() => [
    { value: GENERAL_TAB, label: t('goals.allocation.tabs.general') },
    ...STRATEGIES.map((strategy) => ({ value: strategy, label: strategyLabel(strategy) })),
]);

/** What the analysis left out, spelled out so nothing disappears silently. */
const notes = computed(() => {
    const { excluded } = result.value;
    const lines: string[] = [];

    if (excluded.otherCurrency > 0) {
        lines.push(t('goals.allocation.excluded.otherCurrency', { count: excluded.otherCurrency }));
    }
    if (excluded.reached > 0) {
        lines.push(t('goals.allocation.excluded.reached', { count: excluded.reached }));
    }
    if (excluded.walletMissing > 0) {
        lines.push(t('goals.allocation.excluded.walletMissing', { count: excluded.walletMissing }));
    }

    return lines;
});
</script>

<style lang="scss" scoped>
.input-card,
.recommendation {
    border-radius: 12px;
}

.recommendation {
    border-left: 3px solid $primary;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    text-align: center;
}
</style>
