<template>
    <div class="granularity-chips">
        <span class="text-caption text-grey-6 q-mr-sm">{{ t('analytics.granularity') }}</span>
        <q-chip
            v-for="granularity in GRANULARITIES"
            :key="granularity"
            clickable
            dense
            :selected="filters.granularity === granularity"
            :color="filters.granularity === granularity ? 'primary' : 'grey-2'"
            :text-color="filters.granularity === granularity ? 'white' : 'grey-8'"
            :label="t(`analytics.granularities.${granularity}`)"
            @click="setGranularity(granularity)"
        />
    </div>
</template>

<script setup lang="ts">
import { GRANULARITIES, useAnalyticsFilters } from 'src/composables/useAnalyticsFilters';

const { t } = useI18n();
const { filters, setGranularity } = useAnalyticsFilters();
</script>

<style lang="scss" scoped>
.granularity-chips {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;

    .q-chip {
        margin: 0;
        font-size: 12px;
        font-weight: 500;
    }
}
</style>
