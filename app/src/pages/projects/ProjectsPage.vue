<template>
    <q-page class="zk-page">
        <!-- Summary -->
        <section class="zk-hero">
            <div class="hero-main">
                <span class="zk-hero__label">{{ t('projects.returnOnInvestment') }}</span>
                <span class="zk-amount zk-amount--xl" :class="`hero-roi--${roiHealth}`">
                    {{ formattedRoi }}
                </span>
                <span class="zk-hero__label">
                    {{ t('projects.netGain') }} {{ formattedNetGain }}
                </span>
            </div>
            <div class="hero-stats">
                <div class="hero-stat">
                    <span>{{ t('projects.invested') }}</span>
                    <strong>{{ formattedTotalInvested }}</strong>
                </div>
                <div class="hero-stat">
                    <span>{{ t('projects.dividends') }}</span>
                    <strong class="hero-stat--accent">{{ formattedTotalDividends }}</strong>
                </div>
                <div class="hero-stat">
                    <span>{{ t('projects.title') }}</span>
                    <strong>{{ projects.length }}</strong>
                </div>
            </div>
        </section>

        <!-- Projects List -->
        <div v-if="projects.length === 0" class="zk-empty">
            <span class="zk-empty__icon">
                <q-icon name="o_rocket_launch" size="30px" />
            </span>
            <span class="zk-empty__title">{{ t('projects.noProjects') }}</span>
        </div>

        <div v-else class="project-list">
            <ProjectCard
                v-for="project in projects"
                :key="project.id"
                :project="project"
                :currency="defaultCurrency"
                @click="goToDetail(project)"
            />
        </div>

        <!-- Create/Edit Dialog -->
        <ProjectDialog v-model="showDialog" :project="selectedProject" @saved="onProjectSaved" />
    </q-page>
</template>

<script setup lang="ts">
import { displayAmount } from 'src/composables/usePrivacy';
import type { Project, ProjectWithStats } from 'src/types/project';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';
import ProjectCard from 'src/components/projects/ProjectCard.vue';
import ProjectDialog from 'src/components/projects/ProjectDialog.vue';

const { t, locale } = useI18n();
const router = useRouter();
usePage({
    title: t('projects.title'),
    showHeader: true,
    showBack: true,
    actions: [{ icon: 'add', label: t('common.add'), onClick: () => openCreate() }],
});

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
    return displayAmount(
        new Intl.NumberFormat(locale.value, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount),
    );
}

const formattedTotalInvested = computed(() => formatAmount(summary.value.totalInvested));
const formattedTotalDividends = computed(() => formatAmount(summary.value.totalDividends));

const formattedRoi = computed(() => {
    const value = summary.value.roi;
    const prefix = value > 0 ? '+' : value < 0 ? '−' : '';
    return `${prefix}${Math.abs(value).toFixed(1)}%`;
});

const formattedNetGain = computed(() => {
    const value = summary.value.netGain;
    const prefix = value > 0 ? '+' : value < 0 ? '−' : '';
    return prefix + formatAmount(Math.abs(value)) + ' ' + currencyLabel.value;
});

// ROI health indicators
const roiHealth = computed(() => {
    if (summary.value.roi > 0) return 'positive';
    if (summary.value.roi < 0) return 'negative';
    return 'neutral';
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
.hero-main {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.hero-roi--positive {
    color: $hero-accent;
}

.hero-roi--negative {
    color: #ffd6b8;
}

.hero-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
}

.hero-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    font-size: 12px;
    color: $hero-muted;

    strong {
        font-size: 14px;
        font-weight: 700;
        color: #ffffff;
        overflow-wrap: anywhere;
    }

    &--accent {
        color: $hero-accent !important;
    }
}

.project-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}
</style>
