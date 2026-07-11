<template>
    <q-page class="q-pa-md">
        <!-- Info banner: game wallets are excluded from reports -->
        <q-banner v-if="games.length > 0" dense rounded class="info-banner q-mb-md">
            <template #avatar>
                <q-icon name="info" color="primary" />
            </template>
            {{ t('games.excludedHint') }}
        </q-banner>

        <!-- Games List -->
        <div v-if="games.length === 0" class="empty-state">
            <q-icon name="casino" size="64px" color="grey-4" />
            <div class="text-grey-6 q-mt-md">{{ t('games.noGames') }}</div>
        </div>

        <div v-else class="game-list">
            <GameCard
                v-for="game in games"
                :key="game.id"
                :game="game"
                :currency="defaultCurrency"
                class="q-mb-sm"
                @click="goToDetail(game)"
            />
        </div>

        <!-- Add FAB -->
        <q-page-sticky position="bottom-right" :offset="[18, 18]">
            <BtnFab icon="add" @click="openCreate" />
        </q-page-sticky>

        <!-- Create Dialog -->
        <GameDialog v-model="showDialog" :game="null" @saved="onGameSaved" />
    </q-page>
</template>

<script setup lang="ts">
import type { GameWithStats } from 'src/types/game';
import { CurrencyCode } from 'src/types/currency';
import GameCard from 'src/components/games/GameCard.vue';
import GameDialog from 'src/components/games/GameDialog.vue';
import BtnFab from 'src/components/buttons/BtnFab.vue';

const { t } = useI18n();
const router = useRouter();
usePage({ title: t('games.title'), showHeader: true, showBack: true });

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
    background: var(--q-primary-1, rgba(99, 102, 241, 0.08));
    font-size: 12px;
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
}

.game-list {
    display: flex;
    flex-direction: column;
}
</style>
