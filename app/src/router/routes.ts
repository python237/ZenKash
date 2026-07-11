import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
    // Welcome page (no layout, shown on first launch)
    {
        path: '/welcome',
        name: 'welcome',
        component: () => import('pages/onboarding/WelcomePage.vue'),
    },

    {
        path: '/',
        component: () => import('layouts/MainLayout.vue'),
        children: [
            // Main navigation (bottom bar)
            {
                path: '',
                name: 'dashboard',
                component: () => import('pages/dashboard/DashboardPage.vue'),
            },
            {
                path: 'report/master-category/:id',
                name: 'master-category-report',
                component: () => import('pages/dashboard/MasterCategoryDetailPage.vue'),
            },
            {
                path: 'transactions',
                name: 'transactions',
                component: () => import('pages/transactions/TransactionsPage.vue'),
            },
            {
                path: 'investments',
                name: 'investments',
                component: () => import('pages/investments/InvestmentsPage.vue'),
            },
            {
                path: 'investments/:id',
                name: 'investment-detail',
                component: () => import('pages/investments/InvestmentDetailPage.vue'),
            },
            {
                path: 'projects',
                name: 'projects',
                component: () => import('pages/projects/ProjectsPage.vue'),
            },
            {
                path: 'projects/:id',
                name: 'project-detail',
                component: () => import('pages/projects/ProjectDetailPage.vue'),
            },
            {
                path: 'games',
                name: 'games',
                component: () => import('pages/games/GamesPage.vue'),
            },
            {
                path: 'games/:id',
                name: 'game-detail',
                component: () => import('pages/games/GameDetailPage.vue'),
            },
            { path: 'more', name: 'more', component: () => import('pages/more/MorePage.vue') },
            // More menu pages
            {
                path: 'budgets',
                name: 'budgets',
                component: () => import('pages/more/budgets/BudgetsPage.vue'),
            },
            {
                path: 'master-categories',
                name: 'master-categories',
                component: () => import('pages/more/master-categories/MasterCategoriesPage.vue'),
            },
            {
                path: 'categories',
                name: 'categories',
                component: () => import('pages/more/categories/CategoriesPage.vue'),
            },
            {
                path: 'wallets',
                name: 'wallets',
                component: () => import('pages/more/wallets/WalletsPage.vue'),
            },
            {
                path: 'wallets/:id',
                name: 'wallet-detail',
                component: () => import('pages/more/wallets/WalletDetailPage.vue'),
            },
            {
                path: 'settings',
                name: 'settings',
                component: () => import('pages/more/settings/SettingsPage.vue'),
            },
            {
                path: 'exchange-rates',
                name: 'exchange-rates',
                component: () => import('pages/more/settings/exchange-rates/ExchangeRatesPage.vue'),
            },
        ],
    },

    // Always leave this as last one
    {
        path: '/:catchAll(.*)*',
        component: () => import('pages/ErrorNotFound.vue'),
    },
];

export default routes;
