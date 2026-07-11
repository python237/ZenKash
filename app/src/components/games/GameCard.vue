<template>
    <q-card
        class="game-card"
        :class="{
            'game-card--positive': health === 'positive',
            'game-card--negative': health === 'negative',
        }"
        flat
        bordered
        @click="$emit('click')"
    >
        <q-card-section class="row items-center q-pa-md">
            <!-- Icon -->
            <div class="game-icon q-mr-md">
                <q-avatar color="primary-1" text-color="primary" size="48px">
                    <q-icon :name="game.icon" size="24px" />
                </q-avatar>
            </div>

            <!-- Info -->
            <div class="col">
                <div class="text-subtitle1 text-weight-medium">{{ game.name }}</div>
                <div class="text-caption text-grey-6">
                    {{ t('games.balance') }}: {{ formattedBalance }}
                </div>
                <div v-if="game.pendingCount > 0" class="text-caption text-orange-8">
                    {{ game.pendingCount }} {{ t('games.pendingBets') }}
                </div>
            </div>

            <!-- Net result -->
            <div class="text-right">
                <div class="health-indicator" :class="`health-indicator--${health}`">
                    <q-icon :name="healthIcon" size="14px" />
                    {{ formattedNet }}
                </div>
                <div class="text-caption text-grey-6">{{ t('games.netResult') }}</div>
            </div>

            <!-- Chevron -->
            <q-icon name="chevron_right" color="grey-5" size="24px" class="q-ml-sm" />
        </q-card-section>
    </q-card>
</template>

<script setup lang="ts">
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

const healthIcon = computed(() => {
    if (health.value === 'positive') return 'arrow_upward';
    if (health.value === 'negative') return 'arrow_downward';
    return 'remove';
});

/**
 * Formats a numeric amount as a localized currency string.
 * @param amount - The amount to format
 * @returns The formatted currency string
 */
function formatAmount(amount: number): string {
    return new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: currencyCode.value,
        minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
        maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
    }).format(amount);
}

const formattedBalance = computed(() => formatAmount(props.game.balance));

const formattedNet = computed(() => {
    const prefix = props.game.netResult >= 0 ? '+' : '';
    return prefix + formatAmount(props.game.netResult);
});
</script>

<style lang="scss" scoped>
.game-card {
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    &--positive {
        border-left: 3px solid $positive;
    }

    &--negative {
        border-left: 3px solid $negative;
    }
}

.game-icon {
    display: flex;
    align-items: center;
    justify-content: center;
}

.health-indicator {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
    font-size: 14px;
    font-weight: 700;

    &--positive {
        color: $positive;
    }

    &--negative {
        color: $negative;
    }

    &--neutral {
        color: $grey-6;
    }
}
</style>
