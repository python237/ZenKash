<template>
    <button type="button" class="investment-row" @click="$emit('click')">
        <span class="zk-tile zk-tile--lg" :class="`zk-tile--${typeTone}`">
            <q-icon :name="typeIcon" size="22px" />
        </span>

        <span class="investment-row__body">
            <span class="investment-row__title">{{ investment.label }}</span>
            <span class="investment-row__meta">
                {{ investment.quantity }} {{ t(`investments.units`) }} × {{ formattedRate }}
            </span>
        </span>

        <span class="investment-row__value">
            <span class="investment-row__amount">{{ formattedValue }}</span>
            <span class="investment-row__perf" :class="`investment-row__perf--${health}`">
                {{ formattedGainLoss }}
            </span>
        </span>
    </button>
</template>

<script setup lang="ts">
import { displayAmount } from 'src/composables/usePrivacy';
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

/** Tile tone per investment type (zk-tile modifier). */
const typeTone = computed(() => {
    const tones: Record<string, string> = {
        stock: 'blue',
        crypto: 'amber',
        other: 'violet',
    };
    return tones[props.investment.type] ?? 'violet';
});

// Formatting
const currency = computed(() => CURRENCIES[props.investment.currency]);

const formattedRate = computed(() => {
    return displayAmount(
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: props.investment.currency,
            minimumFractionDigits: currency.value?.decimals ?? 0,
            maximumFractionDigits: currency.value?.decimals ?? 2,
        }).format(props.investment.currentRate),
    );
});

const formattedValue = computed(() => {
    const value = props.investment.quantity * props.investment.currentRate;
    return displayAmount(
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: props.investment.currency,
            minimumFractionDigits: currency.value?.decimals ?? 0,
            maximumFractionDigits: currency.value?.decimals ?? 2,
        }).format(value),
    );
});

const formattedGainLoss = computed(() => {
    if (!stats.value) return '0%';
    const percent = stats.value.gainLossPercent;
    const sign = percent > 0 ? '+' : percent < 0 ? '−' : '';
    return `${sign}${Math.abs(percent).toFixed(1)}%`;
});
</script>

<style lang="scss" scoped>
.investment-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 68px;
    padding: 12px 0;
    border: 0;
    background: none;
    color: $text-primary;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    &__body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    &__title {
        font-size: 14px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__meta {
        font-size: 12px;
        color: $text-secondary;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__value {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
        flex-shrink: 0;
    }

    &__amount {
        font-size: 14px;
        font-weight: 700;
    }

    &__perf {
        font-size: 12px;
        font-weight: 700;
        color: $text-secondary;

        &--positive {
            color: $positive;
        }

        &--negative {
            color: $negative;
        }
    }
}
</style>
