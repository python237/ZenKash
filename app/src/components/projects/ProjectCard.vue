<template>
    <q-card
        class="project-card"
        :class="{
            'project-card--positive': health === 'positive',
            'project-card--negative': health === 'negative',
        }"
        flat
        bordered
        @click="$emit('click')"
    >
        <q-card-section class="row items-center q-pa-md">
            <!-- Icon -->
            <div class="project-icon q-mr-md">
                <q-avatar color="primary-1" text-color="primary" size="48px">
                    <q-icon name="rocket_launch" size="24px" />
                </q-avatar>
            </div>

            <!-- Info -->
            <div class="col">
                <div class="text-subtitle1 text-weight-medium">{{ project.name }}</div>
                <div class="text-caption text-grey-6">
                    {{ t('projects.invested') }}: {{ formattedInvested }}
                </div>
            </div>

            <!-- Value & ROI -->
            <div class="text-right">
                <div class="text-subtitle1 text-weight-bold">{{ formattedDividends }}</div>
                <div class="health-indicator" :class="`health-indicator--${health}`">
                    <q-icon :name="healthIcon" size="14px" />
                    {{ formattedRoi }}
                </div>
            </div>

            <!-- Chevron -->
            <q-icon name="chevron_right" color="grey-5" size="24px" class="q-ml-sm" />
        </q-card-section>
    </q-card>
</template>

<script setup lang="ts">
import type { ProjectWithStats } from 'src/types/project';
import { CURRENCIES, CurrencyCode } from 'src/types/currency';

const props = defineProps<{
    project: ProjectWithStats;
    currency?: CurrencyCode;
}>();

defineEmits<{
    click: [];
}>();

const { t } = useI18n();
const settingsStore = useSettingsStore();

// Currency
const currencyCode = computed(
    () => props.currency ?? settingsStore.defaultCurrency ?? CurrencyCode.XOF,
);
const currencyInfo = computed(() => CURRENCIES[currencyCode.value]);

// Health based on ROI
const health = computed(() => {
    if (props.project.roi > 0) return 'positive';
    if (props.project.roi < 0) return 'negative';
    return 'neutral';
});

// Health icon
const healthIcon = computed(() => {
    if (health.value === 'positive') return 'arrow_upward';
    if (health.value === 'negative') return 'arrow_downward';
    return 'remove';
});

// Formatting
const formattedInvested = computed(() => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currencyCode.value,
        minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
        maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
    }).format(props.project.totalInvested);
});

const formattedDividends = computed(() => {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currencyCode.value,
        minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
        maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
    }).format(props.project.totalDividends);
});

const formattedRoi = computed(() => {
    const prefix = props.project.roi >= 0 ? '+' : '';
    return `${prefix}${props.project.roi.toFixed(1)}%`;
});
</script>

<style lang="scss" scoped>
.project-card {
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    &--positive {
        border-left: 3px solid $positive;
    }

    &--negative {
        border-left: 3px solid $negative;
    }
}

.project-icon {
    display: flex;
    align-items: center;
    justify-content: center;
}

.health-indicator {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    font-weight: 600;

    &--positive {
        color: $positive;
    }

    &--negative {
        color: $negative;
    }

    &--neutral {
        color: $grey-6;
    }
}
</style>
