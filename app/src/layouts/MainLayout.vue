<template>
    <q-layout view="hHh lpR fFf">
        <q-header
            v-if="showHeader"
            class="app-header"
            :class="{ 'app-header--sub': showBackButton }"
        >
            <div class="app-header__bar">
                <button
                    v-if="showBackButton"
                    type="button"
                    class="app-header__back"
                    :aria-label="$t('common.back')"
                    @click="goBack"
                >
                    <q-icon name="chevron_left" size="26px" />
                </button>

                <h1 class="app-header__title">{{ pageTitle }}</h1>

                <button
                    v-for="action in headerActions"
                    :key="action.label"
                    type="button"
                    class="app-header__action"
                    :class="`app-header__action--${action.variant ?? 'primary'}`"
                    :aria-label="action.label"
                    @click="action.onClick"
                >
                    <q-icon :name="action.icon" size="22px" />
                </button>
            </div>
        </q-header>

        <q-page-container>
            <router-view />
        </q-page-container>

        <q-footer v-if="showBottomNav" class="tab-footer">
            <nav class="tab-bar" :aria-label="$t('nav.main')">
                <router-link
                    v-for="tab in leftTabs"
                    :key="tab.name"
                    :to="tab.to"
                    class="tab-bar__item"
                    :class="{ 'tab-bar__item--active': activeTab === tab.name }"
                >
                    <q-icon :name="tab.icon" size="24px" />
                    <span>{{ tab.label }}</span>
                </router-link>

                <div class="tab-bar__center">
                    <button
                        type="button"
                        class="tab-bar__add"
                        :aria-label="$t('transactions.addTransaction')"
                        @click="openQuickAdd()"
                    >
                        <q-icon name="add" size="28px" />
                    </button>
                </div>

                <router-link
                    v-for="tab in rightTabs"
                    :key="tab.name"
                    :to="tab.to"
                    class="tab-bar__item"
                    :class="{ 'tab-bar__item--active': activeTab === tab.name }"
                >
                    <q-icon :name="tab.icon" size="24px" />
                    <span>{{ tab.label }}</span>
                </router-link>
            </nav>
        </q-footer>

        <!-- Safe area fallback when bottom nav is hidden -->
        <q-footer v-else class="safe-area-footer" />

        <!-- Global "add transaction" sheet (central tab bar button) -->
        <TransactionDialog v-model="quickAddOpen" :initial-type="quickAddType" />

        <!-- Onboarding last step: ask the first name once the currency is set -->
        <FirstNameDialog v-model="askFirstName" />
    </q-layout>
</template>

<script setup lang="ts">
import { App } from '@capacitor/app';
import { Capacitor, type PluginListenerHandle } from '@capacitor/core';
import TransactionDialog from 'src/components/transactions/TransactionDialog.vue';
import FirstNameDialog from 'src/components/onboarding/FirstNameDialog.vue';
import { useSettingsStore } from 'src/stores/settings';
import { useNotificationStore } from 'src/stores/notification';
import { waitForDatabase } from 'src/services/database';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const {
    pageTitle,
    headerActions,
    showHeader,
    showBackButton,
    showBottomNav,
    goBack,
    quickAddOpen,
    quickAddType,
    openQuickAdd,
} = useNavigation();
const route = useRoute();
const router = useRouter();

const settingsStore = useSettingsStore();
const notificationStore = useNotificationStore();

// Shown until a first name is saved (only after the default currency exists)
const askFirstName = computed({
    get: () =>
        settingsStore.isInitialized && settingsStore.hasDefaultCurrency && !settingsStore.firstName,
    set: () => {
        // Closing is driven by saving the first name
    },
});

let resumeListener: PluginListenerHandle | null = null;

/**
 * Imports the evening reminders fired while the app was in background or closed.
 */
async function syncReminders(): Promise<void> {
    try {
        await notificationStore.syncFiredReminders();
        await notificationStore.loadAll();
    } catch (error) {
        console.error('[Notifications] Failed to sync reminders:', error);
    }
}

const leftTabs = computed(() => [
    { name: 'dashboard', to: '/', icon: 'o_home', label: t('nav.home') },
    {
        name: 'transactions',
        to: '/transactions',
        icon: 'o_receipt_long',
        label: t('nav.transactions'),
    },
]);

const rightTabs = computed(() => [
    { name: 'net-worth', to: '/net-worth', icon: 'o_account_balance', label: t('nav.netWorth') },
    { name: 'more', to: '/more', icon: 'more_horiz', label: t('nav.more') },
]);

const activeTab = computed(() => String(route.name ?? ''));

onMounted(async () => {
    // Wait for database to be ready before loading settings
    await waitForDatabase();
    await settingsStore.loadSettings();

    // If currency not set, redirect to welcome page
    if (!settingsStore.hasDefaultCurrency) {
        void router.replace('/welcome');
    }

    await syncReminders();
    if (Capacitor.isNativePlatform()) {
        resumeListener = await App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) void syncReminders();
        });
    }
});

onUnmounted(() => {
    void resumeListener?.remove();
});
</script>

<style lang="scss" scoped>
.app-header {
    padding-top: var(--safe-area-top);
    background: $bg-page;
    color: $text-primary;

    &__bar {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 72px;
        padding: 12px 20px 8px;
    }

    &__title {
        flex: 1;
        min-width: 0;
        margin: 0;
        font-size: 26px;
        font-weight: 800;
        line-height: 1.2;
        letter-spacing: -0.03em;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &--sub &__title {
        font-size: 22px;
    }

    &__back,
    &__action {
        width: 44px;
        height: 44px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: $radius-control;
        cursor: pointer;
        padding: 0;
    }

    &__back,
    &__action--outline {
        background: $bg-card;
        border: 1px solid $border-color;
        color: $text-primary;
    }

    &__action--primary {
        background: $primary;
        border: 0;
        color: #ffffff;
    }
}

// Floating tab bar
.tab-footer {
    background: transparent;
    padding: 0 12px calc(12px + var(--safe-area-bottom));
    pointer-events: none;
}

.tab-bar {
    pointer-events: auto;
    height: 68px;
    background: $bg-card;
    border-radius: 24px;
    box-shadow: 0 8px 24px rgba(18, 26, 23, 0.12);
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    align-items: center;

    &__item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        text-decoration: none;
        color: $text-secondary;
        font-size: 11px;
        font-weight: 600;
        min-height: 48px;
        justify-content: center;
        min-width: 0;

        span {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        &--active {
            color: $primary;
            font-weight: 700;
        }
    }

    &__center {
        display: flex;
        justify-content: center;
    }

    &__add {
        width: 54px;
        height: 54px;
        border-radius: $radius-tile;
        border: 0;
        background: $primary;
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 6px 16px rgba(11, 110, 95, 0.35);
        cursor: pointer;
    }
}

// Transparent safe area footer when bottom nav is hidden
.safe-area-footer {
    background: transparent;
    border: none;
    box-shadow: none;
    min-height: 0;
    height: var(--safe-area-bottom);
    padding: 0;
}
</style>
