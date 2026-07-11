<template>
    <q-page v-if="game" class="q-pa-md">
        <!-- Header Card -->
        <q-card class="main-card q-mb-md" flat bordered>
            <q-card-section>
                <!-- Actions -->
                <div class="row items-center justify-between q-mb-md">
                    <q-badge color="primary" :label="t('games.title')" />
                    <div>
                        <BtnIcon dense icon="edit" @click="openEdit" />
                        <BtnIcon dense icon="delete" color="negative" @click="confirmDeleteGame" />
                    </div>
                </div>

                <!-- Balance available on the platform -->
                <div class="text-h4 text-weight-bold">{{ formattedBalance }}</div>
                <div class="text-caption text-grey-6">{{ t('games.balance') }}</div>

                <!-- Stats grid -->
                <div class="stats-grid q-mt-lg">
                    <div class="stat-item">
                        <div class="text-caption text-grey-6">{{ t('games.netResult') }}</div>
                        <div class="text-subtitle1 text-weight-medium" :class="netClass">
                            {{ formattedNet }}
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="text-caption text-grey-6">{{ t('games.pendingStake') }}</div>
                        <div class="text-subtitle1 text-weight-medium text-orange-8">
                            {{ formattedPending }}
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="text-caption text-grey-6">{{ t('games.totalStaked') }}</div>
                        <div class="text-subtitle1 text-weight-medium">{{ formattedStaked }}</div>
                    </div>
                    <div class="stat-item">
                        <div class="text-caption text-grey-6">{{ t('games.totalWon') }}</div>
                        <div class="text-subtitle1 text-weight-medium text-positive">
                            {{ formattedWon }}
                        </div>
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- Transfer buttons -->
        <div class="row q-gutter-sm q-mb-sm">
            <BtnAction
                class="col"
                color="primary"
                :label="t('games.deposit')"
                icon="south_west"
                @click="openTransfer('deposit')"
            />
            <BtnAction
                class="col"
                color="teal"
                :label="t('games.withdraw')"
                icon="north_east"
                @click="openTransfer('withdraw')"
            />
        </div>

        <!-- New bet button -->
        <BtnAction
            class="full-width q-mb-md"
            color="deep-orange"
            :label="t('bets.addBet')"
            icon="sports_score"
            @click="openNewBet"
        />

        <!-- Bets history -->
        <q-card flat bordered>
            <q-card-section>
                <div class="text-subtitle1 text-weight-medium q-mb-md">{{ t('bets.history') }}</div>

                <q-list v-if="bets.length > 0" separator>
                    <q-item v-for="bet in bets" :key="bet.id">
                        <q-item-section avatar>
                            <q-avatar
                                :color="statusColor(bet.status)"
                                text-color="white"
                                size="36px"
                            >
                                <q-icon :name="statusIcon(bet.status)" size="20px" />
                            </q-avatar>
                        </q-item-section>
                        <q-item-section>
                            <q-item-label>
                                {{ t('bets.stake') }}: {{ formatAmount(bet.stake) }}
                                <span v-if="bet.status === 'won' && bet.payout != null">
                                    → {{ formatAmount(bet.payout) }}
                                </span>
                            </q-item-label>
                            <q-item-label caption>
                                {{ formatDate(bet.placedAt) }} · {{ t(`bets.${bet.status}`) }}
                                <span v-if="bet.description"> · {{ bet.description }}</span>
                            </q-item-label>
                        </q-item-section>
                        <q-item-section side>
                            <div class="row items-center no-wrap">
                                <BtnIcon
                                    v-if="bet.status === 'pending'"
                                    dense
                                    icon="task_alt"
                                    color="primary"
                                    @click="openResolve(bet)"
                                />
                                <BtnIcon
                                    v-if="bet.status === 'pending'"
                                    dense
                                    icon="edit"
                                    @click="openEditBet(bet)"
                                />
                                <BtnIcon
                                    dense
                                    icon="delete"
                                    color="negative"
                                    @click="confirmDeleteBet(bet)"
                                />
                            </div>
                        </q-item-section>
                    </q-item>
                </q-list>

                <div v-else class="text-center text-grey-6 q-pa-md">{{ t('bets.noBets') }}</div>
            </q-card-section>
        </q-card>

        <!-- Dialogs -->
        <GameDialog v-model="showEditDialog" :game="game" @saved="onChanged" />
        <GameTransferDialog
            v-model="showTransferDialog"
            :game="game"
            :direction="transferDirection"
            @saved="onChanged"
        />
        <BetDialog v-model="showBetDialog" :game="game" :bet="selectedBet" @saved="onChanged" />
        <BetResolveDialog
            v-if="selectedBet"
            v-model="showResolveDialog"
            :bet="selectedBet"
            @saved="onChanged"
        />

        <ModalConfirm
            v-model="showDeleteGameConfirm"
            :title="t('common.delete')"
            :message="t('games.deleteConfirm')"
            variant="danger"
            :confirm-label="t('common.delete')"
            @confirm="onDeleteGame"
        />
        <ModalConfirm
            v-model="showDeleteBetConfirm"
            :title="t('common.delete')"
            :message="t('bets.deleteConfirm')"
            variant="danger"
            :confirm-label="t('common.delete')"
            @confirm="onDeleteBet"
        />
    </q-page>

    <!-- Not Found state -->
    <q-page v-else class="flex flex-center">
        <div class="text-grey-6">{{ t('common.notFound') }}</div>
    </q-page>
</template>

<script setup lang="ts">
import type { GameWithStats } from 'src/types/game';
import type { Bet, BetStatus } from 'src/types/bet';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import GameDialog from 'src/components/games/GameDialog.vue';
import GameTransferDialog from 'src/components/games/GameTransferDialog.vue';
import BetDialog from 'src/components/games/BetDialog.vue';
import BetResolveDialog from 'src/components/games/BetResolveDialog.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';
import BtnIcon from 'src/components/buttons/BtnIcon.vue';
import BtnAction from 'src/components/buttons/BtnAction.vue';

const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

const gameStore = useGameStore();
const betStore = useBetStore();
const walletStore = useWalletStore();
const settingsStore = useSettingsStore();

const gameId = computed(() => route.params.id as string);

const game = computed((): GameWithStats | undefined =>
    gameStore.getGamesWithStats.find((g: GameWithStats) => g.id === gameId.value),
);

// Page title
watchEffect(() => {
    if (game.value) {
        usePage({ title: game.value.name, showHeader: true, showBack: true });
    }
});

// Load data
onMounted(async () => {
    await Promise.all([
        settingsStore.loadSettings(),
        walletStore.loadAll(),
        gameStore.loadAll(),
        betStore.loadAll(),
    ]);
});

// Bets for this game
const bets = computed((): Bet[] => betStore.getBetsByGame(gameId.value));

// State
const showEditDialog = ref(false);
const showTransferDialog = ref(false);
const showBetDialog = ref(false);
const showResolveDialog = ref(false);
const showDeleteGameConfirm = ref(false);
const showDeleteBetConfirm = ref(false);
const transferDirection = ref<'deposit' | 'withdraw'>('deposit');
const selectedBet = ref<Bet | null>(null);
const betToDelete = ref<Bet | null>(null);

// Currency
const currencyCode = computed(() => settingsStore.defaultCurrency ?? CurrencyCode.XOF);
const currencyInfo = computed(() => CURRENCIES[currencyCode.value]);

/**
 * Formats a numeric amount as a localized currency string.
 * @param {number} amount - The amount to format
 * @returns {string} The formatted currency string
 */
function formatAmount(amount: number): string {
    return new Intl.NumberFormat(locale.value, {
        style: 'currency',
        currency: currencyCode.value,
        minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
        maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
    }).format(amount);
}

/**
 * Formats a date to a localized short string.
 * @param {Date} date - The date to format
 * @returns {string} The formatted date string
 */
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat(locale.value, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

const formattedBalance = computed(() => formatAmount(game.value?.balance ?? 0));
const formattedStaked = computed(() => formatAmount(game.value?.totalStaked ?? 0));
const formattedWon = computed(() => formatAmount(game.value?.totalWon ?? 0));
const formattedPending = computed(() => formatAmount(game.value?.pendingStake ?? 0));
const formattedNet = computed(() => {
    const value = game.value?.netResult ?? 0;
    const prefix = value >= 0 ? '+' : '';
    return prefix + formatAmount(value);
});
const netClass = computed(() => {
    const value = game.value?.netResult ?? 0;
    if (value > 0) return 'text-positive';
    if (value < 0) return 'text-negative';
    return '';
});

/**
 * Returns the avatar color for a bet status.
 * @param {BetStatus} status - The bet status
 * @returns {string} A Quasar color name
 */
function statusColor(status: BetStatus): string {
    if (status === 'won') return 'positive';
    if (status === 'lost') return 'negative';
    return 'orange';
}

/**
 * Returns the icon for a bet status.
 * @param {BetStatus} status - The bet status
 * @returns {string} A Material icon name
 */
function statusIcon(status: BetStatus): string {
    if (status === 'won') return 'check_circle';
    if (status === 'lost') return 'cancel';
    return 'schedule';
}

/**
 * Opens the game edit dialog.
 * @returns {void}
 */
function openEdit(): void {
    showEditDialog.value = true;
}

/**
 * Opens the deposit/withdraw dialog in the given direction.
 * @param {'deposit' | 'withdraw'} direction - The transfer direction
 * @returns {void}
 */
function openTransfer(direction: 'deposit' | 'withdraw'): void {
    transferDirection.value = direction;
    showTransferDialog.value = true;
}

/**
 * Opens the dialog to place a new bet.
 * @returns {void}
 */
function openNewBet(): void {
    selectedBet.value = null;
    showBetDialog.value = true;
}

/**
 * Opens the dialog to edit a pending bet.
 * @param {Bet} bet - The bet to edit
 * @returns {void}
 */
function openEditBet(bet: Bet): void {
    selectedBet.value = bet;
    showBetDialog.value = true;
}

/**
 * Opens the dialog to resolve a pending bet.
 * @param {Bet} bet - The bet to resolve
 * @returns {void}
 */
function openResolve(bet: Bet): void {
    selectedBet.value = bet;
    showResolveDialog.value = true;
}

/**
 * Opens the delete confirmation for the game.
 * @returns {void}
 */
function confirmDeleteGame(): void {
    showDeleteGameConfirm.value = true;
}

/**
 * Opens the delete confirmation for a bet.
 * @param {Bet} bet - The bet to delete
 * @returns {void}
 */
function confirmDeleteBet(bet: Bet): void {
    betToDelete.value = bet;
    showDeleteBetConfirm.value = true;
}

/**
 * Deletes the current game and navigates back.
 * @returns {Promise<void>}
 */
async function onDeleteGame(): Promise<void> {
    if (!game.value) return;
    await gameStore.remove(game.value.id);
    router.back();
}

/**
 * Deletes the selected bet.
 * @returns {Promise<void>}
 */
async function onDeleteBet(): Promise<void> {
    if (!betToDelete.value) return;
    await betStore.remove(betToDelete.value.id);
    betToDelete.value = null;
    showDeleteBetConfirm.value = false;
}

/**
 * Callback when any game/bet/transfer change is saved. Reactive stores refresh the view.
 * @returns {void}
 */
function onChanged(): void {
    // Stores update reactively; nothing else to do.
}
</script>

<style lang="scss" scoped>
.main-card {
    border-radius: 16px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
}

.stat-item {
    padding: 12px;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 8px;
}
</style>
