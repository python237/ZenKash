<template>
    <ModalBase
        :model-value="modelValue"
        :title="t('goals.closing.title', { name: goal?.name ?? '' })"
        max-width="440px"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <div v-if="goal" class="closing">
            <p class="closing__intro">{{ t('goals.closing.intro') }}</p>

            <div class="closing__amount">
                <span class="zk-tile zk-tile--green">
                    <q-icon name="check" size="22px" />
                </span>
                <div class="closing__amount-body">
                    <span class="closing__amount-label">{{ t('goals.closing.kept') }}</span>
                    <span class="closing__amount-value">
                        {{ formatCurrency(goal.currentAmount, goal.currency) }}
                    </span>
                </div>
                <span class="closing__target">
                    {{
                        t('goals.closing.target', {
                            amount: formatCurrency(goal.targetAmount, goal.currency),
                        })
                    }}
                </span>
            </div>

            <div v-if="wallet" class="closing__box">
                <q-item tag="label" class="q-px-none q-py-none">
                    <q-item-section>
                        <q-item-label class="closing__toggle-label">
                            {{ t('goals.closing.alsoWallet') }}
                        </q-item-label>
                        <q-item-label caption>
                            {{ wallet.name }} ·
                            {{ formatCurrency(wallet.balance, wallet.currency) }}
                        </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                        <q-toggle v-model="alsoWallet" color="primary" />
                    </q-item-section>
                </q-item>

                <span v-if="!alsoWallet" class="closing__hint">
                    {{ t('goals.closing.keepWalletHint') }}
                </span>
                <template v-else-if="wallet.balance !== 0">
                    <WalletRemainderPicker v-model="targetId" :wallet="wallet" />
                    <span v-if="targetName" class="closing__notice">
                        {{ t('goals.closing.purchaseFrom', { name: targetName }) }}
                    </span>
                </template>
            </div>

            <div v-if="saveError" class="closing__error">{{ saveError }}</div>
        </div>

        <template #actions>
            <BtnLink :label="t('common.cancel')" @click="close" />
            <BtnPrimary
                :label="ctaLabel"
                :loading="isSaving"
                :disable="!canConfirm"
                @click="confirm"
            />
        </template>
    </ModalBase>
</template>

<script setup lang="ts">
import type { SavingsGoalWithStats } from 'src/types/savings-goal';
import { useSavingsGoalStore } from 'src/stores/savings-goal';
import ModalBase from '../modals/ModalBase.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import WalletRemainderPicker from '../wallets/WalletRemainderPicker.vue';
import { useWalletClosing } from 'src/composables/useWalletClosing';

const props = defineProps<{
    modelValue: boolean;
    goal?: SavingsGoalWithStats | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    closed: [];
}>();

const { t } = useI18n();
const { formatCurrency } = useCurrency();
const goalStore = useSavingsGoalStore();
const walletStore = useWalletStore();
const { transferAndClose } = useWalletClosing();

const alsoWallet = ref(false);
const targetId = ref('');
const isSaving = ref(false);
const saveError = ref('');

/** The goal's wallet, when it still exists and is open. */
const wallet = computed(() => {
    if (!props.goal) return undefined;
    const linked = walletStore.getWalletById(props.goal.walletId);
    return linked && !linked.closedAt ? linked : undefined;
});

const targetName = computed(() => walletStore.getWalletById(targetId.value)?.name ?? '');

/** Closing the wallet too needs a zero balance, or a positive one and a target. */
const canConfirm = computed(() => {
    if (!props.goal) return false;
    if (!alsoWallet.value || !wallet.value) return true;
    if (wallet.value.balance < 0) return false;
    return wallet.value.balance === 0 || !!targetId.value;
});

const ctaLabel = computed(() =>
    alsoWallet.value && wallet.value && wallet.value.balance > 0
        ? t('wallets.closing.transferAndClose')
        : t('goals.closing.confirm'),
);

watch(
    () => props.modelValue,
    (open: boolean) => {
        if (!open) return;
        saveError.value = '';
        // Off by default: the purchase is usually paid from this very wallet.
        // An empty wallet has nothing left to pay, so closing it too is the obvious next step.
        alsoWallet.value = wallet.value?.balance === 0;
    },
);

/**
 * Closes the dialog.
 */
function close(): void {
    emit('update:modelValue', false);
}

/**
 * Closes the goal, then the wallet when asked.
 * @returns Promise resolving when done
 */
async function confirm(): Promise<void> {
    if (!props.goal || !canConfirm.value) return;
    isSaving.value = true;
    saveError.value = '';
    try {
        await goalStore.close(props.goal.id);
        if (alsoWallet.value && wallet.value) {
            await transferAndClose(wallet.value, targetId.value);
        }
        emit('closed');
        close();
    } catch (error) {
        console.error('Failed to close goal:', error);
        saveError.value = t('messages.error');
    } finally {
        isSaving.value = false;
    }
}
</script>

<style lang="scss" scoped>
.closing {
    display: flex;
    flex-direction: column;
    gap: 16px;

    &__intro {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: $text-secondary;
    }

    &__amount {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px;
        border-radius: 18px;
        background: $primary-soft;
    }

    &__amount-body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    &__amount-label {
        font-size: 12px;
        font-weight: 600;
        color: $primary;
    }

    &__amount-value {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: $text-primary;
    }

    &__target {
        font-size: 12px;
        color: $text-secondary;
        white-space: nowrap;
    }

    &__box {
        border: 1px solid $border-color;
        border-radius: 18px;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    &__toggle-label {
        font-size: 14px;
        font-weight: 700;
    }

    &__hint {
        font-size: 12px;
        line-height: 1.5;
        color: $text-secondary;
    }

    &__notice {
        font-size: 12px;
        line-height: 1.5;
        color: $negative;
        background: $negative-soft;
        border-radius: 12px;
        padding: 8px 10px;
    }

    &__error {
        font-size: 13px;
        color: $negative;
    }
}
</style>
