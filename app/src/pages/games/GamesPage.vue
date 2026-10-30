<template>
    <q-page class="zk-page">
        <!-- Info banner: game wallets are excluded from reports -->
        <div v-if="games.length > 0" class="info-banner">
            <q-icon name="o_info" size="18px" class="info-banner__icon" />
            <span>{{ t('games.excludedHint') }}</span>
        </div>

        <!-- Totals -->
        <div v-if="games.length > 0" class="summary-card">
            <div class="summary-card__item">
                <span class="zk-caption">{{ t('report.totalBalance') }}</span>
                <span class="zk-amount summary-card__amount">
                    {{ formatCurrency(totalBalance) }}
                </span>
            </div>
            <div class="summary-card__item">
                <span class="zk-caption">{{ t('games.netResult') }}</span>
                <span
                    class="zk-amount summary-card__amount"
                    :class="{ 'text-positive': totalNet > 0, 'text-negative': totalNet < 0 }"
                >
                    {{ formattedTotalNet }}
                </span>
            </div>
        </div>

        <!-- Games List -->
        <div v-if="games.length === 0" class="zk-empty">
            <span class="zk-empty__icon">
                <q-icon name="o_casino" size="30px" />
            </span>
            <span class="zk-empty__title">{{ t('games.noGames') }}</span>
        </div>

        <div v-else class="game-list">
            <GameCard
                v-for="game in games"
                :key="game.id"
                :game="game"
                :currency="defaultCurrency"
                @click="goToDetail(game)"
            />
        </div>

        <!-- Create Dialog -->
        <GameDialog v-model="showDialog" :game="null" @saved="onGameSaved" />
    </q-page>
</template>

<script setup lang="ts">
import type { GameWithStats } from 'src/types/game';
import { CurrencyCode } from 'src/types/currency';
import GameCard from 'src/components/games/GameCard.vue';
import GameDialog from 'src/components/games/GameDialog.vue';

const { t } = useI18n();
const router = useRouter();
usePage({
    title: t('games.title'),
    showHeader: true,
    showBack: true,
    actions: [{ icon: 'add', label: t('common.add'), onClick: () => openCreate() }],
});

const gameStore = useGameStore();
const betStore = useBetStore();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();

// State
const showDialog = ref(false);

// Load data
onMounted(async () => {
    await Promise.all([
        settingsStore.loadSettings(),
        walletStore.loadAll(),
        gameStore.loadAll(),
        betStore.loadAll(),
    ]);
});

// Games with stats
const games = computed(() => gameStore.getGamesWithStats);

// Default currency
const defaultCurrency = computed(() => settingsStore.defaultCurrency ?? CurrencyCode.XOF);

// Totals across every game (amounts as shown on each game card)
const { formatCurrency } = useCurrency();
const totalBalance = computed(() => games.value.reduce((sum, game) => sum + game.balance, 0));
const totalNet = computed(() => games.value.reduce((sum, game) => sum + game.netResult, 0));

/** Net result with an explicit sign (true minus for losses). */
const formattedTotalNet = computed(() => {
    const sign = totalNet.value > 0 ? '+' : totalNet.value < 0 ? '−' : '';
    return `${sign}${formatCurrency(Math.abs(totalNet.value))}`;
});

/**
 * Navigates to the detail page for a specific game.
 * @param {GameWithStats} game - The game to view details for
 * @returns {void}
 */
function goToDetail(game: GameWithStats): void {
    void router.push({ name: 'game-detail', params: { id: game.id } });
}

/**
 * Opens the dialog to create a new game.
 * @returns {void}
 */
function openCreate(): void {
    showDialog.value = true;
}

/**
 * Callback handler when a game is saved.
 * The game list updates automatically via reactive store.
 * @returns {void}
 */
function onGameSaved(): void {
    // Game saved, list will update automatically
}
</script>

<style lang="scss" scoped>
.info-banner {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 16px;
    background: $amber-soft;
    color: #6b4600;
    font-size: 13px;
    line-height: 1.5;

    &__icon {
        flex-shrink: 0;
        margin-top: 1px;
    }
}

.summary-card {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    padding: 18px;
    border-radius: $radius-card;
    background: $bg-card;

    &__item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        min-width: 0;
    }

    &__amount {
        font-size: 20px;
        letter-spacing: -0.02em;
        overflow-wrap: anywhere;
    }
}

.game-list {
    display: flex;
    flex-direction: column;
    padding: 4px 14px;
    border-radius: $radius-card;
    background: $bg-card;

    > * + * {
        border-top: 1px solid $border-light;
    }
}
</style>
