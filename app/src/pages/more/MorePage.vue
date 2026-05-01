<template>
    <q-page class="page-more">
        <!-- Section Gestion -->
        <div class="section-title">{{ $t('more.management') }}</div>
        <q-card flat class="menu-card">
            <q-list>
                <q-item clickable v-ripple to="/budgets" class="menu-item">
                    <q-item-section avatar>
                        <q-avatar color="amber-1" text-color="amber-9" icon="savings" />
                    </q-item-section>
                    <q-item-section>
                        <q-item-label>{{ $t('more.budgets') }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <q-icon name="chevron_right" color="grey-5" />
                    </q-item-section>
                </q-item>

                <q-separator inset="item" />

                <q-item clickable v-ripple to="/wallets" class="menu-item">
                    <q-item-section avatar>
                        <q-avatar
                            color="blue-1"
                            text-color="blue-9"
                            icon="account_balance_wallet"
                        />
                    </q-item-section>
                    <q-item-section>
                        <q-item-label>{{ $t('more.wallets') }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <q-icon name="chevron_right" color="grey-5" />
                    </q-item-section>
                </q-item>
            </q-list>
        </q-card>

        <!-- Section Catégories -->
        <div class="section-title">{{ $t('more.categorization') }}</div>
        <q-card flat class="menu-card">
            <q-list>
                <q-item clickable v-ripple to="/master-categories" class="menu-item">
                    <q-item-section avatar>
                        <q-avatar color="purple-1" text-color="purple-9" icon="category" />
                    </q-item-section>
                    <q-item-section>
                        <q-item-label>{{ $t('more.masterCategories') }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <q-icon name="chevron_right" color="grey-5" />
                    </q-item-section>
                </q-item>

                <q-separator inset="item" />

                <q-item clickable v-ripple to="/categories" class="menu-item">
                    <q-item-section avatar>
                        <q-avatar color="teal-1" text-color="teal-9" icon="label" />
                    </q-item-section>
                    <q-item-section>
                        <q-item-label>{{ $t('more.categories') }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <q-icon name="chevron_right" color="grey-5" />
                    </q-item-section>
                </q-item>
            </q-list>
        </q-card>

        <!-- Section App -->
        <div class="section-title">{{ $t('more.application') }}</div>
        <q-card flat class="menu-card">
            <q-list>
                <q-item clickable v-ripple to="/settings" class="menu-item">
                    <q-item-section avatar>
                        <q-avatar color="grey-2" text-color="grey-8" icon="settings" />
                    </q-item-section>
                    <q-item-section>
                        <q-item-label>{{ $t('settings.title') }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <q-icon name="chevron_right" color="grey-5" />
                    </q-item-section>
                </q-item>
            </q-list>
        </q-card>

        <!-- Version -->
        <div class="app-version">Zenkash v{{ appVersion }}</div>
    </q-page>
</template>

<script setup lang="ts">
import { version } from '../../../package.json';

const { t } = useI18n();
const appVersion = version;
usePage({ title: t('nav.more'), showHeader: true });
</script>

<style lang="scss" scoped>
.page-more {
    padding: 16px;
    background-color: $bg-page;
}

.section-title {
    font-size: 13px;
    font-weight: 600;
    color: $text-secondary;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    margin-top: 16px;
    padding-left: 4px;

    &:first-child {
        margin-top: 0;
    }
}

.menu-card {
    border-radius: 12px;
    overflow: hidden;
}

.menu-item {
    padding: 12px 16px;

    .q-avatar {
        width: 44px;
        height: 44px;

        :deep(.q-icon) {
            font-size: 24px;
        }
    }

    .q-item__label {
        font-size: 15px;
        font-weight: 500;
    }
}

.app-version {
    text-align: center;
    color: $text-muted;
    font-size: 12px;
    margin-top: 32px;
}
</style>
