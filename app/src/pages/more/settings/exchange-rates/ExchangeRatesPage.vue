<template>
    <q-page class="zk-page">
        <p class="rates-hint">
            {{ t('settings.exchangeRatesHint', { currency: defaultCurrency || '-' }) }}
        </p>

        <!-- Empty state -->
        <div v-if="rates.length === 0" class="zk-empty">
            <div class="zk-empty__icon">
                <q-icon name="swap_horiz" size="30px" />
            </div>
            <div class="zk-empty__title">{{ t('settings.noExchangeRates') }}</div>
        </div>

        <!-- Rates list -->
        <div v-else class="list-card">
            <div v-for="(rate, index) in rates" :key="rate.id" class="rate-row">
                <button type="button" class="rate-row__main" @click="editRate(rate)">
                    <span class="zk-tile rate-row__tile" :style="toneStyle(tileColor(index))">
                        {{ rate.fromCurrency }}
                    </span>
                    <span class="rate-row__body">
                        <span class="rate-row__title">
                            1 {{ rate.fromCurrency }} = {{ formatRate(rate.rate) }}
                            {{ rate.toCurrency }}
                        </span>
                        <span class="rate-row__subtitle">
                            {{ t('settings.updatedOn', { date: formatDate(rate.updatedAt) }) }}
                        </span>
                    </span>
                </button>

                <q-btn
                    flat
                    round
                    icon="more_vert"
                    class="rate-row__options"
                    :aria-label="t('common.options')"
                >
                    <q-menu anchor="bottom right" self="top right" auto-close>
                        <q-list class="row-menu">
                            <q-item clickable @click="editRate(rate)">
                                <q-item-section avatar>
                                    <q-icon name="o_edit" size="20px" />
                                </q-item-section>
                                <q-item-section>{{ t('common.edit') }}</q-item-section>
                            </q-item>
                            <q-item clickable class="row-menu__danger" @click="confirmDelete(rate)">
                                <q-item-section avatar>
                                    <q-icon name="o_delete" size="20px" />
                                </q-item-section>
                                <q-item-section>{{ t('common.delete') }}</q-item-section>
                            </q-item>
                        </q-list>
                    </q-menu>
                </q-btn>
            </div>
        </div>

        <!-- Create/Edit Dialog -->
        <ExchangeRateDialog
            v-model="showDialog"
            :rate="selectedRate"
            :default-currency="defaultCurrency"
            @saved="onSaved"
        />

        <!-- Delete Confirmation -->
        <ModalConfirm
            v-model="showDeleteConfirm"
            :title="t('common.delete')"
            :message="t('messages.confirmDelete')"
            confirm-color="negative"
            :confirm-label="t('common.delete')"
            @confirm="onDelete"
        />
    </q-page>
</template>

<script setup lang="ts">
import { normalizeSpaces } from 'src/services/number-format';
import type { ExchangeRate, CurrencyCode } from 'src/types/currency';
import { useSettingsStore } from 'src/stores/settings';
import { useExchangeRateStore } from 'src/stores/exchange-rate';
import ExchangeRateDialog from 'src/components/settings/ExchangeRateDialog.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';
import { toneStyle } from 'src/services/tone';

const { t } = useI18n();
usePage({
    title: t('settings.exchangeRates'),
    showHeader: true,
    showBack: true,
    actions: [{ icon: 'add', label: t('common.add'), onClick: () => openCreate() }],
});

const settingsStore = useSettingsStore();
const exchangeRateStore = useExchangeRateStore();

// State
const showDialog = ref(false);
const showDeleteConfirm = ref(false);
const selectedRate = ref<ExchangeRate | null>(null);

// Data
const rates = computed(() => exchangeRateStore.rates);
const defaultCurrency = computed(() => settingsStore.defaultCurrency as CurrencyCode);

// Load data
onMounted(async () => {
    await settingsStore.loadSettings();
    await exchangeRateStore.loadAll();
});

// Tile colors, cycled so neighbouring currencies stay distinguishable
const TILE_COLORS = ['blue', 'teal', 'amber', 'purple', 'cyan'];

/**
 * Picks the tile color of a rate row.
 * @param {number} index - Position of the rate in the list
 * @returns {string} A stored color name understood by toneStyle
 */
function tileColor(index: number): string {
    return TILE_COLORS[index % TILE_COLORS.length] ?? 'grey';
}

/**
 * Formats a rate with the French digit grouping, keeping up to 6 decimals.
 * @param {number} value - The conversion rate
 * @returns {string} The formatted rate
 */
function formatRate(value: number): string {
    return normalizeSpaces(
        new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 }).format(value),
    );
}

// Format date
/**
 * Formats a date to a localized short date and time string.
 * @param {Date} date - The date to format
 * @returns {string} The formatted date string in 'fr-FR' locale
 */
function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
    }).format(date);
}

// Open create dialog
/**
 * Opens the dialog to create a new exchange rate.
 * Clears any previously selected rate before showing the dialog.
 * @returns {void}
 */
function openCreate(): void {
    selectedRate.value = null;
    showDialog.value = true;
}

// Edit rate
/**
 * Opens the dialog to edit an existing exchange rate.
 * @param {ExchangeRate} rate - The exchange rate to edit
 * @returns {void}
 */
function editRate(rate: ExchangeRate): void {
    selectedRate.value = rate;
    showDialog.value = true;
}

// On rate saved
/**
 * Callback handler when an exchange rate is saved.
 * The rate list updates automatically via reactive store.
 * @returns {void}
 */
function onSaved(): void {
    // Rate saved - list will update automatically
}

// Confirm delete
/**
 * Opens the delete confirmation dialog for an exchange rate.
 * @param {ExchangeRate} rate - The exchange rate to delete
 * @returns {void}
 */
function confirmDelete(rate: ExchangeRate): void {
    selectedRate.value = rate;
    showDeleteConfirm.value = true;
}

// Delete rate
/**
 * Deletes the currently selected exchange rate from the store.
 * Clears the selection after successful deletion.
 * @returns {Promise<void>}
 */
async function onDelete(): Promise<void> {
    if (!selectedRate.value) return;
    await exchangeRateStore.remove(selectedRate.value.id);
    selectedRate.value = null;
}
</script>

<style lang="scss" scoped>
.rates-hint {
    margin: 0;
    padding: 0 4px;
    font-size: 13px;
    line-height: 1.5;
    color: $text-secondary;
}

.list-card {
    background: $bg-card;
    border-radius: $radius-card;
    padding: 4px 6px 4px 16px;
    display: flex;
    flex-direction: column;
}

.rate-row {
    display: flex;
    align-items: center;
    gap: 4px;

    & + & {
        border-top: 1px solid $border-light;
    }

    &__main {
        flex: 1;
        min-width: 0;
        min-height: 70px;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 0;
        border: 0;
        background: transparent;
        font-family: inherit;
        text-align: left;
        color: $text-primary;
        cursor: pointer;
    }

    &__tile {
        width: 42px;
        height: 42px;
        border-radius: 13px;
        font-size: 12px;
        font-weight: 800;
    }

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
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__subtitle {
        font-size: 12px;
        color: $text-secondary;
    }

    &__options {
        width: 44px;
        height: 44px;
        color: $text-secondary;
    }
}

.row-menu {
    min-width: 180px;
    padding: 4px 0;

    .q-item {
        min-height: 48px;
        font-weight: 600;
        color: $text-primary;
    }

    .q-item__section--avatar {
        min-width: 36px;
        color: $text-secondary;
    }

    &__danger,
    &__danger .q-item__section--avatar {
        color: $negative;
    }
}
</style>
