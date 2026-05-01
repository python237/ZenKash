<template>
    <q-page class="q-pa-md">
        <!-- Summary Cards -->
        <div class="summary-section q-mb-lg">
            <!-- ROI Card -->
            <q-card class="summary-card summary-card--value" flat>
                <q-card-section class="q-pa-md">
                    <div class="text-caption text-white-7">{{ t('projects.roi') }}</div>
                    <div class="summary-value text-white q-mt-xs">{{ formattedRoi }}</div>
                    <div class="summary-currency text-white-7">
                        {{ t('projects.returnOnInvestment') }}
                    </div>
                    <div class="summary-change" :class="roiHealthClass">
                        <q-icon :name="roiHealthIcon" size="14px" />
                        {{ formattedNetGain }}
                    </div>
                </q-card-section>
            </q-card>

            <!-- Total Invested Card -->
            <q-card class="summary-card" flat bordered>
                <q-card-section class="q-pa-md">
                    <div class="text-caption text-grey-6">{{ t('projects.totalInvested') }}</div>
                    <div class="summary-value q-mt-xs">{{ formattedTotalInvested }}</div>
                    <div class="summary-currency">{{ currencyLabel }}</div>
                    <div class="text-caption text-grey-6 q-mt-xs">
                        {{ projects.length }} {{ t('projects.projectCount') }}
                    </div>
                </q-card-section>
            </q-card>
        </div>

        <!-- Dividends Summary -->
        <q-card class="q-mb-lg" flat bordered>
            <q-card-section class="row items-center q-pa-md">
                <q-avatar color="positive-1" text-color="positive" size="48px" class="q-mr-md">
                    <q-icon name="payments" size="24px" />
                </q-avatar>
                <div class="col">
                    <div class="text-caption text-grey-6">
                        {{ t('projects.dividendsReceived') }}
                    </div>
                    <div class="text-h6 text-weight-bold text-positive">
                        {{ formattedTotalDividends }}
                    </div>
                </div>
            </q-card-section>
        </q-card>

        <!-- Projects List -->
        <div v-if="projects.length === 0" class="empty-state">
            <q-icon name="rocket_launch" size="64px" color="grey-4" />
            <div class="text-grey-6 q-mt-md">{{ t('projects.noProjects') }}</div>
        </div>

        <div v-else class="project-list">
            <ProjectCard
                v-for="project in projects"
                :key="project.id"
                :project="project"
                :currency="defaultCurrency"
                class="q-mb-sm"
                @click="goToDetail(project)"
            />
        </div>

        <!-- Add FAB -->
        <q-page-sticky position="bottom-right" :offset="[18, 18]">
            <BtnFab icon="add" @click="openCreate" />
        </q-page-sticky>

        <!-- Create/Edit Dialog -->
        <ProjectDialog v-model="showDialog" :project="selectedProject" @saved="onProjectSaved" />
    </q-page>
</template>

<script setup lang="ts">
import type { Project, ProjectWithStats } from 'src/types/project';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import ProjectCard from 'src/components/projects/ProjectCard.vue';
import ProjectDialog from 'src/components/projects/ProjectDialog.vue';
import BtnFab from 'src/components/buttons/BtnFab.vue';

const { t, locale } = useI18n();
const router = useRouter();
usePage({ title: t('projects.title'), showHeader: true });

const projectStore = useProjectStore();
const settingsStore = useSettingsStore();

// State
const showDialog = ref(false);
const selectedProject = ref<Project | null>(null);

// Load data
onMounted(async () => {
    await settingsStore.loadSettings();
    await projectStore.loadAll();
});

// Projects with stats
const projects = computed(() => projectStore.getProjectsWithStats);

// Summary calculations
const summary = computed(() => {
    let totalInvested = 0;
    let totalDividends = 0;

    for (const p of projects.value) {
        totalInvested += p.totalInvested;
        totalDividends += p.totalDividends;
    }

    const roi = totalInvested > 0 ? (totalDividends / totalInvested) * 100 : 0;
    const netGain = totalDividends - totalInvested;

    return {
        totalInvested,
        totalDividends,
        roi,
        netGain,
    };
});

// Default currency
const defaultCurrency = computed(() => settingsStore.defaultCurrency ?? CurrencyCode.XOF);

const currencyLabel = computed(() => {
    const currency = CURRENCIES[defaultCurrency.value];
    return currency?.symbol ?? defaultCurrency.value;
});

// Formatting
/**
 * Formats a numeric amount as a localized string without decimal places.
 * @param {number} amount - The amount to format
 * @returns {string} The formatted number string
 */
function formatAmount(amount: number): string {
    return new Intl.NumberFormat(locale.value, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

const formattedTotalInvested = computed(() => formatAmount(summary.value.totalInvested));
const formattedTotalDividends = computed(
    () => formatAmount(summary.value.totalDividends) + ' ' + currencyLabel.value,
);

const formattedRoi = computed(() => {
    const value = summary.value.roi;
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
});

const formattedNetGain = computed(() => {
    const value = summary.value.netGain;
    const prefix = value >= 0 ? '+' : '';
    return prefix + formatAmount(value) + ' ' + currencyLabel.value;
});

// ROI health indicators
const roiHealth = computed(() => {
    if (summary.value.roi > 0) return 'positive';
    if (summary.value.roi < 0) return 'negative';
    return 'neutral';
});

const roiHealthClass = computed(() => `summary-change--${roiHealth.value}`);

const roiHealthIcon = computed(() => {
    if (roiHealth.value === 'positive') return 'arrow_upward';
    if (roiHealth.value === 'negative') return 'arrow_downward';
    return 'equalizer';
});

// Navigation
/**
 * Navigates to the detail page for a specific project.
 * @param {ProjectWithStats} project - The project to view details for
 * @returns {void}
 */
function goToDetail(project: ProjectWithStats): void {
    void router.push({ name: 'project-detail', params: { id: project.id } });
}

// Open create dialog
/**
 * Opens the dialog to create a new project.
 * Clears any previously selected project before showing the dialog.
 * @returns {void}
 */
function openCreate(): void {
    selectedProject.value = null;
    showDialog.value = true;
}

/**
 * Callback handler when a project is saved.
 * The project list updates automatically via reactive store.
 * @returns {void}
 */
function onProjectSaved(): void {
    // Project saved, list will update automatically
}
</script>

<style lang="scss" scoped>
@use 'sass:color';

.summary-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.summary-card {
    border-radius: 12px;
    overflow: hidden;
    background: white;

    &--value {
        background: linear-gradient(
            135deg,
            $primary 0%,
            color.adjust($primary, $lightness: -15%) 100%
        );
    }
}

.summary-value {
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;
    word-break: break-word;
}

.summary-currency {
    font-size: 12px;
    color: var(--q-grey-6);
    margin-top: 2px;
}

.text-white-7 {
    color: rgba(255, 255, 255, 0.7);
}

.summary-change {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 4px;
    margin-top: 4px;

    &--positive {
        color: #22c55e;
        background: rgba(255, 255, 255, 0.2);
    }

    &--negative {
        color: #f87171;
        background: rgba(255, 255, 255, 0.2);
    }

    &--neutral {
        color: rgba(255, 255, 255, 0.7);
        background: rgba(255, 255, 255, 0.1);
    }
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
}

.project-list {
    display: flex;
    flex-direction: column;
}
</style>
