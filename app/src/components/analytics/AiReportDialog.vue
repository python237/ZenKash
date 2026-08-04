<template>
    <ModalBase v-model="isOpen" :title="t('aiReport.title')" max-width="520px">
        <!-- What leaves the device, stated before anything else -->
        <q-banner dense class="privacy-banner q-mb-md">
            <template #avatar>
                <q-icon name="privacy_tip" color="warning" />
            </template>
            <div class="text-caption">{{ t('aiReport.disclaimer') }}</div>
        </q-banner>

        <!-- Window -->
        <div class="field-label">{{ t('aiReport.window') }}</div>
        <div class="chips q-mb-md">
            <q-chip
                v-for="option in WINDOWS"
                :key="option"
                clickable
                :selected="options.window === option"
                :color="options.window === option ? 'primary' : 'grey-2'"
                :text-color="options.window === option ? 'white' : 'grey-8'"
                :label="t('aiReport.months', { count: option })"
                @click="options.window = option"
            />
        </div>

        <!-- Privacy options -->
        <q-toggle
            v-model="options.includeAmounts"
            dense
            :label="t('aiReport.includeAmounts')"
            class="q-mb-sm"
        />
        <div class="text-caption text-grey-6 q-mb-md">{{ t('aiReport.includeAmountsHint') }}</div>

        <q-toggle
            v-model="options.anonymizeLabels"
            dense
            :label="t('aiReport.anonymizeLabels')"
            class="q-mb-sm"
        />
        <div class="text-caption text-grey-6 q-mb-md">{{ t('aiReport.anonymizeLabelsHint') }}</div>

        <!-- Threshold above which an expense is listed one by one -->
        <InputNumber
            v-model="options.largeExpenseThreshold"
            :label="t('aiReport.largeExpenseThreshold')"
            :min="0"
            :hint="t('aiReport.largeExpenseThresholdHint')"
            class="q-mb-md"
        />

        <!-- The exact text, editable before it goes anywhere -->
        <div class="field-label">{{ t('aiReport.preview') }}</div>
        <InputMultiline v-model="text" :rows="12" class="q-mb-xs" />
        <div class="text-caption text-grey-6">
            {{ t('aiReport.characters', { count: text.length }) }}
        </div>

        <template #actions>
            <BtnLink :label="t('aiReport.copy')" icon="content_copy" @click="copy" />
            <BtnPrimary :label="t('aiReport.send')" icon="ios_share" @click="send" />
        </template>
    </ModalBase>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import type { AiReportOptions, ReportWindow } from 'src/types/ai-report';
import BtnLink from 'src/components/buttons/BtnLink.vue';
import BtnPrimary from 'src/components/buttons/BtnPrimary.vue';
import InputMultiline from 'src/components/inputs/InputMultiline.vue';
import InputNumber from 'src/components/inputs/InputNumber.vue';
import ModalBase from 'src/components/modals/ModalBase.vue';
import { useAiReport } from 'src/composables/useAiReport';

/** History windows offered, in months. */
const WINDOWS: ReportWindow[] = [3, 6, 12];

/** Default amount above which an expense is listed individually. */
const DEFAULT_LARGE_EXPENSE_THRESHOLD = 50000;

const props = defineProps<{
    /** Whether the dialog is open */
    modelValue: boolean;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
}>();

const { t, locale } = useI18n();
const $q = useQuasar();
const { generate, share, copyToClipboard, loadAll } = useAiReport();

const isOpen = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
});

const options = ref<AiReportOptions>({
    window: 3,
    includeAmounts: true,
    anonymizeLabels: false,
    language: locale.value.startsWith('fr') ? 'fr' : 'en',
    largeExpenseThreshold: DEFAULT_LARGE_EXPENSE_THRESHOLD,
});

// The user edits the generated text, so it is kept as its own state and only
// regenerated when the options change.
const text = ref('');

/** Regenerates the report from the current options, discarding manual edits. */
function regenerate(): void {
    options.value.language = locale.value.startsWith('fr') ? 'fr' : 'en';
    text.value = generate(options.value);
}

watch(
    () => [
        options.value.window,
        options.value.includeAmounts,
        options.value.anonymizeLabels,
        options.value.largeExpenseThreshold,
    ],
    () => regenerate(),
);

watch(isOpen, async (open) => {
    if (!open) return;
    await loadAll();
    regenerate();
});

/** Copies the report and confirms. */
async function copy(): Promise<void> {
    const copied = await copyToClipboard(text.value);
    $q.notify({
        type: copied ? 'positive' : 'negative',
        message: copied ? t('aiReport.copied') : t('aiReport.failed'),
        position: 'bottom',
    });
}

/** Hands the report to the share sheet and reports the outcome. */
async function send(): Promise<void> {
    const result = await share(text.value);

    if (result === 'cancelled') return;

    if (result === 'failed') {
        $q.notify({ type: 'negative', message: t('aiReport.failed'), position: 'bottom' });
        return;
    }

    $q.notify({
        type: 'positive',
        message: result === 'copied' ? t('aiReport.copiedAndOpened') : t('aiReport.sent'),
        position: 'bottom',
    });
    isOpen.value = false;
}
</script>

<style lang="scss" scoped>
.privacy-banner {
    background-color: rgba(249, 115, 22, 0.08);
    border-radius: 10px;
    padding: 8px 12px;
}

.field-label {
    font-size: 13px;
    font-weight: 600;
    color: $text-secondary;
    margin-bottom: 6px;
}

.chips {
    display: flex;
    gap: 6px;

    .q-chip {
        margin: 0;
        font-size: 13px;
        font-weight: 500;
    }
}
</style>
