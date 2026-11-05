<template>
    <ModalBase
        :model-value="modelValue"
        :title="t('wallets.closing.title', { name: wallet?.name ?? '' })"
        max-width="440px"
        @update:model-value="$emit('update:modelValue', $event)"
    >
        <div v-if="wallet" class="closing">
            <p class="closing__intro">{{ t('wallets.closing.intro') }}</p>

            <div v-if="hasRemainder" class="closing__box">
                <WalletRemainderPicker v-model="targetId" :wallet="wallet" />
            </div>

            <ul class="closing__effects">
                <li v-for="effect in effects" :key="effect">
                    <q-icon name="check" size="18px" class="closing__check" />
                    <span>{{ effect }}</span>
                </li>
            </ul>

            <div v-if="rules.length > 0" class="closing__warn">
                <q-icon name="o_warning" size="18px" />
                <span>
                    {{ t('wallets.closing.rulesOff', { names: rules.join(', ') }, rules.length) }}
                </span>
            </div>

            <div v-if="saveError" class="closing__error">{{ saveError }}</div>
        </div>

        <template #actions>
            <BtnLink :label="t('common.cancel')" @click="close" />
            <BtnPrimary
                :label="
                    hasRemainder
                        ? t('wallets.closing.transferAndClose')
                        : t('wallets.closing.confirm')
                "
                :loading="isSaving"
                :disable="!canClose"
                @click="confirm"
            />
        </template>
    </ModalBase>
</template>

<script setup lang="ts">
import type { Wallet } from 'src/types/wallet';
import ModalBase from '../modals/ModalBase.vue';
import BtnLink from '../buttons/BtnLink.vue';
import BtnPrimary from '../buttons/BtnPrimary.vue';
import WalletRemainderPicker from './WalletRemainderPicker.vue';
import { useWalletClosing } from 'src/composables/useWalletClosing';

const props = defineProps<{
    modelValue: boolean;
    wallet?: Wallet | null;
}>();

const emit = defineEmits<{
    'update:modelValue': [value: boolean];
    closed: [];
}>();

const { t } = useI18n();
const { activeRulesFor, transferAndClose } = useWalletClosing();

const targetId = ref('');
const isSaving = ref(false);
const saveError = ref('');

/** Whether money is left in the wallet (a negative balance blocks the closing). */
const hasRemainder = computed(() => !!props.wallet && props.wallet.balance !== 0);

/** Closable at zero, or with a positive remainder and somewhere to send it. */
const canClose = computed(() => {
    if (!props.wallet) return false;
    if (props.wallet.balance < 0) return false;
    return props.wallet.balance === 0 || !!targetId.value;
});

const rules = computed(() => (props.wallet ? activeRulesFor(props.wallet) : []));

const effects = computed(() => [
    t('wallets.closing.effectHistory'),
    t('wallets.closing.effectHidden'),
    t('wallets.closing.effectReopen'),
]);

watch(
    () => props.modelValue,
    (open: boolean) => {
        if (open) saveError.value = '';
    },
);

/**
 * Closes the dialog.
 */
function close(): void {
    emit('update:modelValue', false);
}

/**
 * Moves the remainder and closes the wallet.
 * @returns Promise resolving when done
 */
async function confirm(): Promise<void> {
    if (!props.wallet || !canClose.value) return;
    isSaving.value = true;
    saveError.value = '';
    try {
        await transferAndClose(props.wallet, targetId.value);
        emit('closed');
        close();
    } catch (error) {
        console.error('Failed to close wallet:', error);
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

    &__box {
        border: 1px solid $border-color;
        border-radius: 18px;
        padding: 14px;
    }

    &__effects {
        list-style: none;
        margin: 0;
        padding: 0 2px;
        display: flex;
        flex-direction: column;
        gap: 10px;

        li {
            display: flex;
            gap: 10px;
            font-size: 13px;
            color: $text-primary;
        }
    }

    &__check {
        flex-shrink: 0;
        color: $primary;
    }

    &__warn {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        background: $negative-soft;
        color: $negative;
        border-radius: 14px;
        padding: 10px 12px;
        font-size: 12px;
        line-height: 1.5;
    }

    &__error {
        font-size: 13px;
        color: $negative;
    }
}
</style>
