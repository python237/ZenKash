<template>
    <q-page class="q-pa-md">
        <!-- Currency Section -->
        <div class="section-title">{{ t('settings.currency') }}</div>

        <q-list bordered class="rounded-borders q-mb-lg">
            <!-- Default Currency (read-only) -->
            <q-item>
                <q-item-section avatar>
                    <q-icon name="currency_exchange" color="primary" />
                </q-item-section>
                <q-item-section>
                    <q-item-label>{{ t('settings.defaultCurrency') }}</q-item-label>
                    <q-item-label caption>{{ defaultCurrencyLabel }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                    <q-icon name="lock" color="grey-5" size="18px" />
                </q-item-section>
            </q-item>

            <q-separator />

            <!-- Exchange Rates -->
            <q-item clickable v-ripple @click="goToExchangeRates">
                <q-item-section avatar>
                    <q-icon name="swap_horiz" color="orange" />
                </q-item-section>
                <q-item-section>
                    <q-item-label>{{ t('settings.exchangeRates') }}</q-item-label>
                    <q-item-label caption
                        >{{ ratesCount }}
                        {{ t('settings.exchangeRates').toLowerCase() }}</q-item-label
                    >
                </q-item-section>
                <q-item-section side>
                    <q-icon name="chevron_right" color="grey-5" />
                </q-item-section>
            </q-item>
        </q-list>

        <!-- App Section -->
        <div class="section-title">{{ t('more.application') }}</div>

        <q-list bordered class="rounded-borders">
            <!-- Language -->
            <q-item>
                <q-item-section avatar>
                    <q-icon name="language" color="blue" />
                </q-item-section>
                <q-item-section>
                    <q-item-label>{{ t('settings.language') }}</q-item-label>
                    <q-item-label caption>Français</q-item-label>
                </q-item-section>
            </q-item>

            <q-separator />

            <!-- About -->
            <q-item clickable v-ripple>
                <q-item-section avatar>
                    <q-icon name="info" color="grey" />
                </q-item-section>
                <q-item-section>
                    <q-item-label>{{ t('settings.about') }}</q-item-label>
                    <q-item-label caption>Zenkash v1.0.0</q-item-label>
                </q-item-section>
            </q-item>
        </q-list>
    </q-page>
</template>

<script setup lang="ts">
import { CURRENCIES } from 'src/types/currency';
import { useSettingsStore } from 'src/stores/settings';
import { useExchangeRateStore } from 'src/stores/exchange-rate';

const { t } = useI18n();
const router = useRouter();
usePage({ title: t('settings.title'), showHeader: true, showBack: true });

const settingsStore = useSettingsStore();
const exchangeRateStore = useExchangeRateStore();

// Load data
onMounted(async () => {
    await settingsStore.loadSettings();
    await exchangeRateStore.loadAll();
});

// Default currency display
const defaultCurrencyLabel = computed(() => {
    const currencyCode = settingsStore.defaultCurrency;
    if (!currencyCode) return '-';
    const currency = CURRENCIES[currencyCode];
    return currency ? `${t(`currencies.${currency.code}`)} (${currency.symbol})` : currencyCode;
});

// Exchange rates count
const ratesCount = computed(() => exchangeRateStore.rates.length);

// Navigate to exchange rates
/**
 * Navigates to the exchange rates configuration page.
 * @returns {void}
 */
function goToExchangeRates(): void {
    void router.push({ name: 'exchange-rates' });
}
</script>

<style lang="scss" scoped>
.section-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--q-grey-7);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
}

.rounded-borders {
    border-radius: 12px;
    overflow: hidden;
}
</style>
