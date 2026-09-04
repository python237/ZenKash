<template>
    <q-card class="debt-card" flat bordered>
        <q-card-section class="q-pa-md">
            <!-- Header -->
            <div class="row items-center q-mb-sm">
                <q-avatar :color="avatarColor" text-color="white" size="40px" class="q-mr-md">
                    <q-icon :name="directionIcon" size="20px" />
                </q-avatar>
                <div class="col clickable" @click="$emit('click')">
                    <div class="text-subtitle1 text-weight-medium">{{ debt.counterparty }}</div>
                    <div v-if="!debt.walletExists" class="text-caption text-negative">
                        {{ t('debts.walletMissing') }}
                    </div>
                    <div v-else class="text-caption text-grey-6">
                        {{ t(`debts.directions.${debt.direction}`) }} ·
                        {{ formatCurrency(debt.principal, debt.currency) }}
                    </div>
                </div>
                <BtnIcon dense icon="delete" color="negative" @click="$emit('delete')" />
            </div>

            <!-- Repayment progress -->
            <div class="row items-center justify-between q-mb-xs">
                <span class="text-caption text-grey-6">{{ t('debts.repaid') }}</span>
                <span class="text-caption text-weight-medium" :class="`text-${progressColor}`">
                    {{ formatPercent(debt.percentRepaid) }}
                </span>
            </div>
            <q-linear-progress
                :value="debt.percentRepaid / 100"
                :color="progressColor"
                track-color="grey-3"
                rounded
                size="8px"
            />

            <!-- Footer -->
            <div class="row items-center justify-between q-mt-sm">
                <div class="text-caption text-grey-7">
                    <template v-if="debt.isSettled">{{ t('debts.settled') }} ✅</template>
                    <template v-else>
                        {{ t('debts.outstanding') }}:
                        {{ formatCurrency(debt.outstanding, debt.currency) }}
                    </template>
                </div>
                <BtnLink
                    v-if="!debt.isSettled"
                    :label="t('debts.addRepayment')"
                    @click="$emit('repay')"
                />
            </div>

            <div v-if="debt.dueDate" class="text-caption q-mt-xs" :class="dueClass">
                <q-icon name="event" size="14px" /> {{ formattedDueDate }}
                <span v-if="debt.isOverdue"> · {{ t('debts.overdue') }}</span>
                <span v-else-if="debt.daysLeft !== null && !debt.isSettled">
                    · {{ t('debts.daysLeft', { count: debt.daysLeft }) }}
                </span>
            </div>
        </q-card-section>
    </q-card>
</template>

<script setup lang="ts">
import type { DebtWithStats } from 'src/types/debt';
import BtnIcon from '../buttons/BtnIcon.vue';
import BtnLink from '../buttons/BtnLink.vue';

const props = defineProps<{
    debt: DebtWithStats;
}>();

defineEmits<{
    click: [];
    delete: [];
    repay: [];
}>();

const { t, locale } = useI18n();
const { formatCurrency, formatPercent } = useCurrency();

const avatarColor = computed(() => {
    if (props.debt.isSettled) return 'positive';
    return props.debt.direction === 'lent' ? 'teal-6' : 'deep-orange-6';
});

const directionIcon = computed(() =>
    props.debt.direction === 'lent' ? 'call_made' : 'call_received',
);

const progressColor = computed(() => {
    if (props.debt.isSettled) return 'positive';
    if (props.debt.isOverdue) return 'negative';
    return 'primary';
});

const dueClass = computed(() => (props.debt.isOverdue ? 'text-negative' : 'text-grey-6'));

const formattedDueDate = computed(() => {
    if (!props.debt.dueDate) return '';
    return new Intl.DateTimeFormat(locale.value, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(props.debt.dueDate);
});
</script>

<style lang="scss" scoped>
.debt-card {
    border-radius: 12px;
}
</style>
