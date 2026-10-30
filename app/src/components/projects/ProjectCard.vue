<template>
    <button type="button" class="project-card" @click="$emit('click')">
        <span class="project-card__head">
            <span class="zk-tile zk-tile--lg zk-tile--violet">
                <q-icon name="o_rocket_launch" size="22px" />
            </span>
            <span class="project-card__body">
                <span class="project-card__name">{{ project.name }}</span>
                <span class="project-card__meta">
                    {{ t('projects.invested') }} {{ formattedInvested }}
                </span>
            </span>
            <span class="zk-pill" :class="pillClass">
                {{ t('projects.roi') }} {{ formattedRoi }}
            </span>
        </span>

        <span class="zk-progress">
            <span class="project-card__fill" :style="progressStyle" />
        </span>

        <span class="project-card__meta">
            {{ t('projects.dividendsReceived') }} {{ formattedDividends }} ·
            {{ recoveryLabel }}
        </span>
    </button>
</template>

<script setup lang="ts">
import { maskAmount } from 'src/composables/usePrivacy';
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

const pillClass = computed(() => {
    if (health.value === 'positive') return 'zk-pill--green';
    if (health.value === 'negative') return 'zk-pill--orange';
    return '';
});

/** Share of the invested amount already paid back by dividends (0-100). */
const recoveredPercent = computed(() => {
    if (props.project.totalInvested <= 0) return 0;
    return Math.min((props.project.totalDividends / props.project.totalInvested) * 100, 100);
});

const progressStyle = computed(() => ({
    width: `${recoveredPercent.value}%`,
    background: recoveredPercent.value >= 100 ? undefined : '#d97a2b',
}));

const recoveryLabel = computed(() =>
    recoveredPercent.value >= 100
        ? t('projects.paidBack')
        : t('projects.recovered', { percent: `${recoveredPercent.value.toFixed(0)}%` }),
);

// Formatting
const formattedInvested = computed(() => {
    return maskAmount(
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currencyCode.value,
            minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
            maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
        }).format(props.project.totalInvested),
    );
});

const formattedDividends = computed(() => {
    return maskAmount(
        new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currencyCode.value,
            minimumFractionDigits: currencyInfo.value?.decimals ?? 0,
            maximumFractionDigits: currencyInfo.value?.decimals ?? 0,
        }).format(props.project.totalDividends),
    );
});

const formattedRoi = computed(() => {
    const roi = props.project.roi;
    const prefix = roi > 0 ? '+' : roi < 0 ? '−' : '';
    return `${prefix}${Math.abs(roi).toFixed(1)}%`;
});
</script>

<style lang="scss" scoped>
.project-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    padding: 16px;
    border: 0;
    border-radius: 20px;
    background: $bg-card;
    color: $text-primary;
    font-family: inherit;
    text-align: left;
    cursor: pointer;

    &__head {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    &__body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    &__name {
        font-size: 15px;
        font-weight: 700;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    &__meta {
        font-size: 12px;
        color: $text-secondary;
    }

    .zk-progress {
        display: block;
    }

    &__fill {
        display: block;
        height: 100%;
        border-radius: 999px;
        background: $primary;
    }
}
</style>
