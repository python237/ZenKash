<template>
    <q-card
        class="investment-card"
        :class="{
            'investment-card--positive': health === 'positive',
            'investment-card--negative': health === 'negative',
        }"
        flat
        bordered
        @click="$emit('click')"
    >
        <q-card-section class="row items-center q-pa-md">
            <!-- Icon -->
            <div class="investment-icon q-mr-md">
                <q-icon :name="typeIcon" size="28px" :color="typeColor" />
            </div>

            <!-- Info -->
            <div class="col">
                <div class="text-subtitle1 text-weight-medium">{{ investment.label }}</div>
                <div class="text-caption text-grey-6">
                    {{ investment.quantity }} {{ t(`investments.units`) }} × {{ formattedRate }}
                </div>
            </div>

            <!-- Value & Health -->
            <div class="text-right">
                <div class="text-subtitle1 text-weight-bold">{{ formattedValue }}</div>
                <div class="health-indicator" :class="`health-indicator--${health}`">
                    <q-icon :name="healthIcon" size="14px" />
                    {{ formattedGainLoss }}
                </div>
            </div>

            <!-- Chevron -->
            <q-icon name="chevron_right" color="grey-5" size="24px" class="q-ml-sm" />
        </q-card-section>
    </q-card>
</template>

<script setup lang="ts">
import type { InvestmentItem } from 'src/types/investment';
import { CURRENCIES } from 'src/types/currency';
import { useInvestmentStore } from 'src/stores/investment';

const props = defineProps<{
    investment: InvestmentItem;
}>();

defineEmits<{
    click: [];
}>();

const { t } = useI18n();
const investmentStore = useInvestmentStore();

// Get stats
const stats = computed(() => investmentStore.getItemStats(props.investment.id));

// Health
const health = computed(() => stats.value?.health ?? 'neutral');

// Type icon mapping
const typeIcon = computed(() => {
    const icons: Record<string, string> = {
        stock: 'trending_up',
        crypto: 'currency_bitcoin',
        other: 'savings',
    };
    return icons[props.investment.type] ?? 'savings';
});

const typeColor = computed(() => {
    const colors: Record<string, string> = {
        stock: 'blue',
        crypto: 'orange',
        other: 'grey',
    };
    return colors[props.investment.type] ?? 'grey';
});

// Health icon
const healthIcon = computed(() => {
    if (health.value === 'positive') return 'arrow_upward';
    if (health.value === 'negative') return 'arrow_downward';
    return 'remove';
});

// Formatting
const currency = computed(() => CURRENCIES[props.investment.currency]);

const formattedRate = computed(() => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: props.investment.currency,
        minimumFractionDigits: currency.value?.decimals ?? 0,
        maximumFractionDigits: currency.value?.decimals ?? 2,
    }).format(props.investment.currentRate);
});

const formattedValue = computed(() => {
    const value = props.investment.quantity * props.investment.currentRate;
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: props.investment.currency,
        minimumFractionDigits: currency.value?.decimals ?? 0,
        maximumFractionDigits: currency.value?.decimals ?? 2,
    }).format(value);
});

const formattedGainLoss = computed(() => {
    if (!stats.value) return '0%';
    const percent = stats.value.gainLossPercent;
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(1)}%`;
});
</script>

<style lang="scss" scoped>
.investment-card {
    cursor: pointer;
    border-radius: 12px;
    transition: all 0.2s ease;

    &:active {
        transform: scale(0.98);
    }
}

.investment-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
}

.health-indicator {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;

    &--positive {
        color: var(--q-positive);
        background: rgba(76, 175, 80, 0.1);
    }

    &--negative {
        color: var(--q-negative);
        background: rgba(244, 67, 54, 0.1);
    }

    &--neutral {
        color: var(--q-grey-6);
        background: rgba(0, 0, 0, 0.05);
    }
}
</style>
