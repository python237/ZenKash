<template>
    <q-layout view="hHh lpR fFf">
        <q-header v-if="showHeader" class="bg-white text-dark" bordered>
            <q-toolbar>
                <BtnIcon
                    v-if="showBackButton"
                    dense
                    icon="chevron_left"
                    color="dark"
                    @click="goBack"
                />

                <q-toolbar-title class="header-title">
                    {{ pageTitle }}
                </q-toolbar-title>
            </q-toolbar>
        </q-header>

        <q-page-container>
            <router-view />
        </q-page-container>

        <q-footer v-if="showBottomNav" class="bg-white" bordered>
            <q-tabs
                v-model="activeTab"
                class="text-grey-6"
                active-color="primary"
                indicator-color="transparent"
                narrow-indicator
                dense
            >
                <q-route-tab
                    name="dashboard"
                    icon="dashboard"
                    :label="$t('nav.report')"
                    to="/"
                    no-caps
                />
                <q-route-tab
                    name="transactions"
                    icon="receipt_long"
                    :label="$t('nav.transactions')"
                    to="/transactions"
                    no-caps
                />
                <q-route-tab
                    name="investments"
                    icon="trending_up"
                    :label="$t('nav.investments')"
                    to="/investments"
                    no-caps
                />
                <q-route-tab
                    name="projects"
                    icon="business_center"
                    :label="$t('nav.projects')"
                    to="/projects"
                    no-caps
                />
                <q-route-tab name="more" icon="menu" :label="$t('nav.more')" to="/more" no-caps />
            </q-tabs>
        </q-footer>
    </q-layout>
</template>

<script setup lang="ts">
import BtnIcon from 'src/components/buttons/BtnIcon.vue';
import { useSettingsStore } from 'src/stores/settings';
import { waitForDatabase } from 'src/services/database';
import { useRouter } from 'vue-router';

const activeTab = ref('dashboard');
const { pageTitle, showHeader, showBackButton, showBottomNav, goBack } = useNavigation();
const router = useRouter();

const settingsStore = useSettingsStore();

onMounted(async () => {
    // Wait for database to be ready before loading settings
    await waitForDatabase();
    await settingsStore.loadSettings();

    // If currency not set, redirect to welcome page
    if (!settingsStore.hasDefaultCurrency) {
        void router.replace('/welcome');
    }
});
</script>

<style lang="scss" scoped>
// Safe area padding for header
.q-header {
    padding-top: var(--safe-area-top);
}

.header-title {
    font-size: 18px;
    font-weight: 600;
}

// Safe area padding for footer
.q-footer {
    padding-bottom: var(--safe-area-bottom);
}

.q-tabs {
    :deep(.q-tab) {
        min-width: 0;
        padding: 8px 0;

        .q-tab__label {
            font-size: 10px;
            font-weight: 500;
        }

        .q-tab__icon {
            font-size: 22px;
        }
    }

    :deep(.q-tab--active) {
        .q-tab__icon,
        .q-tab__label {
            color: $primary;
        }
    }
}
</style>
