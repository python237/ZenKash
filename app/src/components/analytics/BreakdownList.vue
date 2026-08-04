<template>
    <div class="breakdown-list">
        <div
            v-for="row in rows"
            :key="row.key"
            class="breakdown-row clickable"
            @click="$emit('select', row)"
        >
            <div class="row items-center no-wrap q-mb-xs">
                <span class="color-marker" :style="{ backgroundColor: row.color }" />
                <span class="row-name text-body2">{{ row.name }}</span>
                <span class="text-body2 text-weight-medium q-ml-sm">
                    {{ formatCurrency(row.amount) }}
                </span>
                <q-icon
                    :name="row.drillable ? 'chevron_right' : 'unfold_more'"
                    color="grey-5"
                    size="18px"
                    class="q-ml-xs"
                />
            </div>

            <q-linear-progress
                :value="row.percent / 100"
                :style="{ color: row.color }"
                track-color="grey-3"
                rounded
                size="6px"
            />

            <div class="text-caption text-grey-6 q-mt-xs">
                {{ formatPercent(row.percent) }} ·
                {{ t('analytics.flowCount', { count: row.count }) }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import type { BreakdownRow } from 'src/types/analytics';
import { useCurrency } from 'src/composables/useCurrency';

defineProps<{
    /** Rows to render, largest first */
    rows: BreakdownRow[];
}>();

defineEmits<{
    /** Emitted when a row is tapped: drill one level deeper, or list its flows */
    select: [row: BreakdownRow];
}>();

const { t } = useI18n();
const { formatCurrency, formatPercent } = useCurrency();
</script>

<style lang="scss" scoped>
.breakdown-row {
    padding: 8px 0;

    &.clickable {
        cursor: pointer;
        border-radius: 8px;
        padding: 8px;
        margin: 0 -8px;

        &:active {
            background-color: $bg-subtle;
        }
    }
}

.color-marker {
    width: 10px;
    height: 10px;
    border-radius: 3px;
    flex-shrink: 0;
    margin-right: 8px;
}

.row-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
