<template>
    <q-page class="q-pa-md">
        <!-- Empty state -->
        <div v-if="rates.length === 0" class="empty-state">
            <q-icon name="swap_horiz" size="64px" color="grey-4" />
            <div class="text-grey-6 q-mt-md">{{ t('settings.noExchangeRates') }}</div>
        </div>

        <!-- Rates list -->
        <q-list v-else bordered class="rounded-borders">
            <template v-for="(rate, index) in rates" :key="rate.id">
                <q-item clickable v-ripple @click="editRate(rate)">
                    <q-item-section>
                        <q-item-label>
                            1 {{ rate.fromCurrency }} = {{ rate.rate }} {{ rate.toCurrency }}
                        </q-item-label>
                        <q-item-label caption>
                            {{ formatDate(rate.updatedAt) }}
                        </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <BtnIcon
                            dense
                            icon="delete"
                            color="negative"
                            size="sm"
                            @click.stop="confirmDelete(rate)"
                        />
                    </q-item-section>
                </q-item>
                <q-separator v-if="index < rates.length - 1" />
            </template>
        </q-list>

        <!-- Add FAB -->
        <q-page-sticky position="bottom-right" :offset="[18, 18]">
            <BtnFab icon="add" @click="openCreate" />
        </q-page-sticky>

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
import type { ExchangeRate, CurrencyCode } from 'src/types/currency';
import { useSettingsStore } from 'src/stores/settings';
import { useExchangeRateStore } from 'src/stores/exchange-rate';
import ExchangeRateDialog from 'src/components/settings/ExchangeRateDialog.vue';
import ModalConfirm from 'src/components/modals/ModalConfirm.vue';
import BtnIcon from 'src/components/buttons/BtnIcon.vue';
import BtnFab from 'src/components/buttons/BtnFab.vue';

const { t } = useI18n();
usePage({ title: t('settings.exchangeRates'), showHeader: true, showBack: true });

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
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
}

.rounded-borders {
    border-radius: 12px;
    overflow: hidden;
}
</style>
