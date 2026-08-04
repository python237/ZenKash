<template>
    <div class="period-chips">
        <q-chip
            v-for="preset in PERIOD_PRESETS"
            :key="preset"
            clickable
            :selected="filters.preset === preset"
            :color="filters.preset === preset ? 'primary' : 'grey-2'"
            :text-color="filters.preset === preset ? 'white' : 'grey-8'"
            :label="t(`analytics.presets.${preset}`)"
            @click="setPreset(preset)"
        />

        <q-chip
            clickable
            icon="date_range"
            :selected="filters.preset === 'custom'"
            :color="filters.preset === 'custom' ? 'primary' : 'grey-2'"
            :text-color="filters.preset === 'custom' ? 'white' : 'grey-8'"
            :label="t('analytics.presets.custom')"
            @click="openCustomPicker"
        />

        <!-- Custom range picker -->
        <q-dialog v-model="showPicker">
            <q-card class="picker-card">
                <q-date v-model="pickerRange" range minimal mask="YYYY-MM-DD" />
                <q-card-actions align="right">
                    <BtnLink :label="t('common.cancel')" @click="showPicker = false" />
                    <BtnPrimary
                        :label="t('common.apply')"
                        :disable="!pickerRange"
                        @click="applyCustomRange"
                    />
                </q-card-actions>
            </q-card>
        </q-dialog>
    </div>
</template>

<script setup lang="ts">
import BtnLink from 'src/components/buttons/BtnLink.vue';
import BtnPrimary from 'src/components/buttons/BtnPrimary.vue';
import { PERIOD_PRESETS, useAnalyticsFilters } from 'src/composables/useAnalyticsFilters';

/** Range value produced by the Quasar range date picker. */
interface PickerRange {
    /** First selected day, `YYYY-MM-DD` */
    from: string;
    /** Last selected day, `YYYY-MM-DD` */
    to: string;
}

const { t } = useI18n();
const { filters, setPreset, setCustomRange } = useAnalyticsFilters();

// The Quasar range picker emits a plain day string while only one day is selected,
// and a { from, to } object once the range is complete.
const showPicker = ref(false);
const pickerRange = ref<PickerRange | string | null>(null);

/** Opens the custom range picker, pre-filled with the current custom range. */
function openCustomPicker(): void {
    const current = filters.value.customRange;
    pickerRange.value = current
        ? {
              from: toDayString(current.start),
              to: toDayString(current.end),
          }
        : null;
    showPicker.value = true;
}

/**
 * Formats a date as the `YYYY-MM-DD` string the picker expects.
 * @param date - The date to format
 * @returns The day string in local time
 */
function toDayString(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Parses a `YYYY-MM-DD` string into a local date.
 * @param value - The day string
 * @returns The parsed date at midnight local time
 */
function fromDayString(value: string): Date {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}

/** Applies the picked range and closes the dialog. */
function applyCustomRange(): void {
    const picked = pickerRange.value;
    if (!picked) return;

    // A single tap selects one day, which the picker reports as a bare string.
    const from = typeof picked === 'string' ? picked : picked.from;
    const to = typeof picked === 'string' ? picked : picked.to;

    setCustomRange({ start: fromDayString(from), end: fromDayString(to) });
    showPicker.value = false;
}
</script>

<style lang="scss" scoped>
.period-chips {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 4px;
    scrollbar-width: none;

    &::-webkit-scrollbar {
        display: none;
    }

    .q-chip {
        flex-shrink: 0;
        margin: 0;
        font-size: 13px;
        font-weight: 500;
    }
}

.picker-card {
    border-radius: 16px;
}
</style>
