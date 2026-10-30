<template>
    <button type="button" class="game-row" @click="$emit('click')">
        <span class="zk-tile zk-tile--lg" :class="`zk-tile--${tileTone}`">
            <q-icon :name="game.icon" size="22px" />
        </span>

        <span class="game-row__body">
            <span class="game-row__title">{{ game.name }}</span>
            <span class="game-row__meta">
                {{ t('games.balance') }} {{ formattedBalance }}
                <template v-if="game.pendingCount > 0">
                    ·
                    <span class="game-row__pending">
                        {{ game.pendingCount }} {{ t('games.pendingBets') }}
                    </span>
                </template>
            </span>
        </span>

        <span class="game-row__net" :class="`game-row__net--${health}`">
            <span class="sr-only">{{ t('games.netResult') }}</span>
            {{ formattedNet }}
        </span>
    </button>
</template>

<script setup lang="ts">
import { displayAmount } from 'src/composables/usePrivacy';
import type { GameWithStats } from 'src/types/game';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';

const props = defineProps<{
    game: GameWithStats;
    currency?: CurrencyCode;
}>();

defineEmits<{
    click: [];
}>();

const { t, locale } = useI18n();
const settingsStore = useSettingsStore();

// Currency
const currencyCode = computed(
    () => props.currency ?? settingsStore.defaultCurrency ?? CurrencyCode.XOF,
);
const currencyInfo = computed(() => CURRENCIES[currencyCode.value]);

// Health based on net result
const health = computed(() => {
    if (props.game.netResult > 0) return 'positive';
    if (props.game.netResult < 0) return 'negative';
    return 'neutral';
});

/** Tile tone follows the net result: green when winning, orange when losing. */
const tileTone = computed(() => {
    if (health.value === 'positive') return 'green';
    if (health.value === 'negative') return 'orange';
    return 'blue';
});

/**
 * Formats a numeric amount as a localized currency string.
 * @param amount - The amount to format
 * @returns The formatted currency string
 */
function formatAmount(amount: number): string {
    return displayAmount(
        new Intl.NumberFormat(locale.value, {
            style: 'currency',
            currency: currencyCode.value,
            minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
            maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
        }).format(amount),
    );
}

const formattedBalance = computed(() => formatAmount(props.game.balance));

const formattedNet = computed(() => {
    const net = props.game.netResult;
    const prefix = net > 0 ? '+' : net < 0 ? '−' : '';
    return prefix + formatAmount(Math.abs(net));
});
</script>

<style lang="scss" scoped>
.game-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 70px;
    padding: 14px 0;
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
        font-size: 15px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__meta {
        font-size: 12px;
        color: $text-secondary;
    }

    &__pending {
        color: $amber;
        font-weight: 600;
    }

    &__net {
        flex-shrink: 0;
        font-size: 14px;
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
