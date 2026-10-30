<template>
    <q-page class="zk-page">
        <!-- Profile Section -->
        <section class="settings-section">
            <h2 class="section-title">{{ t('settings.profile') }}</h2>
            <div class="settings-card">
                <button type="button" class="settings-row" @click="showFirstNameDialog = true">
                    <span class="zk-tile zk-tile--violet">
                        <q-icon name="o_person" size="20px" />
                    </span>
                    <span class="settings-row__body">
                        <span class="settings-row__title">{{ t('settings.firstName') }}</span>
                        <span class="settings-row__value">
                            {{ settingsStore.firstName ?? '—' }}
                        </span>
                    </span>
                    <q-icon name="chevron_right" size="22px" class="settings-row__trail" />
                </button>
            </div>
        </section>

        <!-- Currency Section -->
        <section class="settings-section">
            <h2 class="section-title">{{ t('settings.currency') }}</h2>
            <div class="settings-card">
                <!-- Default Currency (read-only) -->
                <div class="settings-row">
                    <span class="zk-tile zk-tile--green">
                        <q-icon name="o_payments" size="20px" />
                    </span>
                    <span class="settings-row__body">
                        <span class="settings-row__title">{{ t('settings.defaultCurrency') }}</span>
                        <span class="settings-row__value">{{ defaultCurrencyLabel }}</span>
                    </span>
                    <q-icon
                        name="o_lock"
                        size="18px"
                        class="settings-row__trail"
                        :aria-label="t('settings.currencyLocked')"
                    />
                </div>

                <!-- Exchange Rates -->
                <button type="button" class="settings-row" @click="goToExchangeRates">
                    <span class="zk-tile zk-tile--amber">
                        <q-icon name="swap_horiz" size="20px" />
                    </span>
                    <span class="settings-row__body">
                        <span class="settings-row__title">{{ t('settings.exchangeRates') }}</span>
                        <span class="settings-row__value">
                            {{ t('settings.ratesDefined', { count: ratesCount }, ratesCount) }}
                        </span>
                    </span>
                    <q-icon name="chevron_right" size="22px" class="settings-row__trail" />
                </button>
            </div>
        </section>

        <!-- App Section -->
        <section class="settings-section">
            <h2 class="section-title">{{ t('more.application') }}</h2>
            <div class="settings-card">
                <!-- Language -->
                <div class="settings-row">
                    <span class="zk-tile zk-tile--blue">
                        <q-icon name="language" size="20px" />
                    </span>
                    <span class="settings-row__body">
                        <span class="settings-row__title">{{ t('settings.language') }}</span>
                        <span class="settings-row__value">Français</span>
                    </span>
                </div>

                <!-- Daily Reminder (native only) -->
                <div v-if="isNativePlatform" class="settings-row">
                    <span class="zk-tile zk-tile--violet">
                        <q-icon name="o_notifications_active" size="20px" />
                    </span>
                    <span class="settings-row__body">
                        <span class="settings-row__title">{{ t('settings.reminder') }}</span>
                        <span class="settings-row__value">
                            {{ t('settings.reminderDescription') }}
                        </span>
                    </span>
                    <q-toggle
                        :model-value="reminderEnabled"
                        :disable="!canScheduleAlarms && !reminderEnabled"
                        :aria-label="t('settings.reminder')"
                        color="primary"
                        @update:model-value="toggleReminder"
                    />
                </div>

                <!-- Alarm permission warning -->
                <button
                    v-if="isNativePlatform && !canScheduleAlarms"
                    type="button"
                    class="settings-row"
                    @click="openAlarmSettings"
                >
                    <span class="zk-tile zk-tile--orange">
                        <q-icon name="o_warning" size="20px" />
                    </span>
                    <span class="settings-row__body">
                        <span class="settings-row__title settings-row__title--warning">
                            {{ t('settings.alarmPermissionRequired') }}
                        </span>
                        <span class="settings-row__value">
                            {{ t('settings.openAlarmSettings') }}
                        </span>
                    </span>
                    <q-icon name="chevron_right" size="22px" class="settings-row__trail" />
                </button>
            </div>
        </section>

        <!-- Security & Data Section -->
        <section class="settings-section">
            <h2 class="section-title">{{ t('settings.securityData') }}</h2>
            <div class="settings-card">
                <!-- App lock -->
                <div class="settings-row">
                    <span class="zk-tile zk-tile--green">
                        <q-icon name="o_lock" size="20px" />
                    </span>
                    <span class="settings-row__body">
                        <span class="settings-row__title">{{ t('appLock.title') }}</span>
                        <span class="settings-row__value">{{ t('appLock.description') }}</span>
                    </span>
                    <q-toggle
                        :model-value="appLockEnabled"
                        :aria-label="t('appLock.title')"
                        color="primary"
                        @update:model-value="toggleAppLock"
                    />
                </div>

                <!-- Change PIN -->
                <button
                    v-if="appLockEnabled"
                    type="button"
                    class="settings-row"
                    @click="openChangePin"
                >
                    <span class="zk-tile">
                        <q-icon name="o_pin" size="20px" />
                    </span>
                    <span class="settings-row__body">
                        <span class="settings-row__title">{{ t('appLock.changePin') }}</span>
                    </span>
                    <q-icon name="chevron_right" size="22px" class="settings-row__trail" />
                </button>

                <!-- Export -->
                <button type="button" class="settings-row" @click="openExport">
                    <span class="zk-tile zk-tile--blue">
                        <q-icon name="o_file_download" size="20px" />
                    </span>
                    <span class="settings-row__body">
                        <span class="settings-row__title">{{ t('backup.export') }}</span>
                        <span class="settings-row__value">{{ t('backup.exportCaption') }}</span>
                    </span>
                    <q-icon name="chevron_right" size="22px" class="settings-row__trail" />
                </button>

                <!-- Import (replaces every current data) -->
                <button type="button" class="settings-row" @click="openImport">
                    <span class="zk-tile zk-tile--orange">
                        <q-icon name="o_file_upload" size="20px" />
                    </span>
                    <span class="settings-row__body">
                        <span class="settings-row__title">{{ t('backup.import') }}</span>
                        <span class="settings-row__value settings-row__value--warning">
                            {{ t('backup.importWarning') }}
                        </span>
                    </span>
                    <q-icon name="chevron_right" size="22px" class="settings-row__trail" />
                </button>
            </div>
        </section>

        <!-- About -->
        <div class="app-version">Zenkash v{{ appVersion }}</div>

        <!-- Dialogs -->
        <PinDialog v-model="showPinDialog" :mode="pinMode" />
        <BackupDialog v-model="showBackupDialog" :mode="backupMode" />
        <FirstNameDialog v-model="showFirstNameDialog" editing />
    </q-page>
</template>

<script setup lang="ts">
import { version } from '../../../../package.json';
import { CURRENCIES } from 'src/types/currency';
import { useSettingsStore } from 'src/stores/settings';
import { useExchangeRateStore } from 'src/stores/exchange-rate';
import { useReminder } from 'src/composables/useReminder';
import { useAppLock } from 'src/composables/useAppLock';
import PinDialog from 'src/components/app-lock/PinDialog.vue';
import BackupDialog from 'src/components/settings/BackupDialog.vue';
import FirstNameDialog from 'src/components/onboarding/FirstNameDialog.vue';

const { t } = useI18n();
const router = useRouter();
const appVersion = version;
usePage({ title: t('settings.title'), showHeader: true, showBack: true });

const settingsStore = useSettingsStore();
const exchangeRateStore = useExchangeRateStore();

// App lock
const { isEnabled: appLockEnabled, initialize: initializeAppLock } = useAppLock();
const showPinDialog = ref(false);
const pinMode = ref<'set' | 'change' | 'disable'>('set');

// Backup
const showBackupDialog = ref(false);
const showFirstNameDialog = ref(false);
const backupMode = ref<'export' | 'import'>('export');

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
    await initializeAppLock();
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

/**
 * Opens the PIN dialog to enable (set) or disable the app lock.
 * @param value - The requested toggle state
 */
function toggleAppLock(value: boolean): void {
    pinMode.value = value ? 'set' : 'disable';
    showPinDialog.value = true;
}

/**
 * Opens the PIN dialog to change the current PIN.
 */
function openChangePin(): void {
    pinMode.value = 'change';
    showPinDialog.value = true;
}

/**
 * Opens the backup dialog in export mode.
 */
function openExport(): void {
    backupMode.value = 'export';
    showBackupDialog.value = true;
}

/**
 * Opens the backup dialog in import mode.
 */
function openImport(): void {
    backupMode.value = 'import';
    showBackupDialog.value = true;
}
</script>

<style lang="scss" scoped>
.settings-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.section-title {
    margin: 0;
    padding: 0 4px;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.4;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: $text-secondary;
}

.settings-card {
    background: $bg-card;
    border-radius: $radius-card;
    padding: 2px 16px;
    display: flex;
    flex-direction: column;
}

.settings-row {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 64px;
    padding: 10px 0;
    border: 0;
    background: transparent;
    font-family: inherit;
    text-align: left;
    color: $text-primary;

    & + & {
        border-top: 1px solid $border-light;
    }

    &:is(button) {
        cursor: pointer;
    }

    &__body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    &__title {
        font-size: 14px;
        font-weight: 600;

        &--warning {
            color: $negative;
        }
    }

    &__value {
        font-size: 12px;
        line-height: 1.4;
        color: $text-secondary;

        &--warning {
            color: $negative;
        }
    }

    &__trail {
        flex-shrink: 0;
        color: $text-muted;
    }
}

.app-version {
    text-align: center;
    font-size: 12px;
    color: $text-muted;
    padding: 8px 0 16px;
}
</style>
