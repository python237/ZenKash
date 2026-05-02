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

        <q-list bordered class="rounded-borders q-mb-lg">
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

            <!-- Daily Reminder (native only) -->
            <q-item v-if="isNativePlatform">
                <q-item-section avatar>
                    <q-icon name="notifications_active" color="purple" />
                </q-item-section>
                <q-item-section>
                    <q-item-label>{{ t('settings.reminder') }}</q-item-label>
                    <q-item-label caption>{{ t('settings.reminderDescription') }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                    <q-toggle
                        :model-value="reminderEnabled"
                        :disable="!canScheduleAlarms && !reminderEnabled"
                        color="primary"
                        @update:model-value="toggleReminder"
                    />
                </q-item-section>
            </q-item>

            <!-- Alarm permission warning -->
            <q-item
                v-if="isNativePlatform && !canScheduleAlarms"
                clickable
                v-ripple
                @click="openAlarmSettings"
            >
                <q-item-section avatar>
                    <q-icon name="warning" color="orange" />
                </q-item-section>
                <q-item-section>
                    <q-item-label class="text-orange">{{
                        t('settings.alarmPermissionRequired')
                    }}</q-item-label>
                    <q-item-label caption>{{ t('settings.openAlarmSettings') }}</q-item-label>
                </q-item-section>
                <q-item-section side>
                    <q-icon name="chevron_right" color="grey-5" />
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
import { useReminder } from 'src/composables/useReminder';

const { t } = useI18n();
const router = useRouter();
usePage({ title: t('settings.title'), showHeader: true, showBack: true });

const settingsStore = useSettingsStore();
const exchangeRateStore = useExchangeRateStore();

// Reminder system
const {
    isEnabled: reminderEnabled,
    canScheduleAlarms,
    isNative: isNativePlatform,
    initialize: initializeReminder,
    enableReminder,
    disableReminder,
    openAlarmSettings,
    refresh: refreshReminder,
} = useReminder();

// Load data
onMounted(async () => {
    await settingsStore.loadSettings();
    await exchangeRateStore.loadAll();
    if (isNativePlatform.value) {
        await initializeReminder();
    }
});

// Refresh reminder state when returning to settings
onActivated(async () => {
    if (isNativePlatform.value) {
        await refreshReminder();
    }
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
 */
function goToExchangeRates(): void {
    void router.push({ name: 'exchange-rates' });
}

/**
 * Toggles the daily transaction reminder on/off.
 * @param value - The new enabled state
 */
async function toggleReminder(value: boolean): Promise<void> {
    if (value) {
        await enableReminder();
    } else {
        await disableReminder();
    }
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
