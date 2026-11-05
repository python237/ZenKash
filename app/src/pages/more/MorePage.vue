<template>
    <q-page class="zk-page">
        <section v-for="section in sections" :key="section.title" class="menu-section">
            <h2 class="section-title">{{ section.title }}</h2>
            <div class="menu-card">
                <router-link
                    v-for="item in section.items"
                    :key="item.to"
                    :to="item.to"
                    class="menu-item"
                >
                    <span class="zk-tile" :style="toneStyle(item.color)">
                        <q-icon :name="item.icon" size="20px" />
                    </span>
                    <span class="menu-item__label">{{ item.label }}</span>
                    <q-icon name="chevron_right" size="22px" class="menu-item__chevron" />
                </router-link>
            </div>
        </section>

        <!-- Version -->
        <div class="app-version">Zenkash v{{ appVersion }}</div>
    </q-page>
</template>

<script setup lang="ts">
import { version } from '../../../package.json';
import { toneStyle } from 'src/services/tone';

const { t } = useI18n();
const appVersion = version;

usePage({ title: t('nav.more'), showHeader: true });

// Menu entries grouped by section (asset sections are also reachable from the net worth tab)
const sections = computed(() => [
    {
        title: t('nav.netWorth'),
        items: [
            {
                to: '/investments',
                icon: 'trending_up',
                color: 'blue',
                label: t('nav.investments'),
            },
            {
                to: '/projects',
                icon: 'o_business_center',
                color: 'teal',
                label: t('nav.projects'),
            },
            { to: '/debts', icon: 'o_handshake', color: 'amber', label: t('debts.title') },
            { to: '/games', icon: 'o_casino', color: 'orange', label: t('games.title') },
            { to: '/assets', icon: 'o_chair', color: 'purple', label: t('assets.title') },
        ],
    },
    {
        title: t('more.management'),
        items: [
            { to: '/budgets', icon: 'o_savings', color: 'amber', label: t('more.budgets') },
            {
                to: '/wallets',
                icon: 'o_account_balance_wallet',
                color: 'blue',
                label: t('more.wallets'),
            },
        ],
    },
    {
        title: t('more.planning'),
        items: [
            { to: '/goals', icon: 'o_flag', color: 'pink', label: t('more.goals') },
            {
                to: '/forecast',
                icon: 'o_insights',
                color: 'cyan',
                label: t('more.forecast'),
            },
            { to: '/recurring', icon: 'autorenew', color: 'indigo', label: t('more.recurring') },
        ],
    },
    {
        title: t('more.analysis'),
        items: [{ to: '/analytics', icon: 'insights', color: 'teal', label: t('more.analytics') }],
    },
    {
        title: t('more.categorization'),
        items: [
            {
                to: '/master-categories',
                icon: 'o_category',
                color: 'purple',
                label: t('more.masterCategories'),
            },
            { to: '/categories', icon: 'o_label', color: 'green', label: t('more.categories') },
        ],
    },
    {
        title: t('more.application'),
        items: [{ to: '/settings', icon: 'o_settings', color: 'grey', label: t('settings.title') }],
    },
]);
</script>

<style lang="scss" scoped>
.menu-section {
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
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: $text-secondary;
}

.menu-card {
    background: $bg-card;
    border-radius: $radius-card;
    overflow: hidden;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 14px;
    min-height: 64px;
    padding: 10px 16px;
    color: $text-primary;
    text-decoration: none;

    & + & {
        border-top: 1px solid $border-light;
    }

    &__label {
        flex: 1;
        font-size: 15px;
        font-weight: 600;
    }

    &__chevron {
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
