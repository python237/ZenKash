<template>
    <div class="lock-screen column items-center justify-center">
        <q-icon name="lock" size="40px" color="primary" class="q-mb-md" />
        <PinPad
            v-model="pin"
            :title="t('appLock.enterPin')"
            :error="error"
            :length="PIN_LENGTH"
            @complete="onComplete"
        />
    </div>
</template>

<script setup lang="ts">
import PinPad from './PinPad.vue';
import { useAppLock, PIN_LENGTH } from 'src/composables/useAppLock';

const { t } = useI18n();
const { unlock } = useAppLock();

const pin = ref('');
const error = ref('');

/**
 * Attempts to unlock with the entered PIN.
 * @param value - The entered PIN
 * @returns Promise that resolves when the attempt completes
 */
async function onComplete(value: string): Promise<void> {
    const ok = await unlock(value);
    if (!ok) {
        error.value = t('appLock.wrongPin');
        pin.value = '';
    }
}

watch(pin, (value) => {
    if (value.length > 0) error.value = '';
});
</script>

<style lang="scss" scoped>
.lock-screen {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: $bg-page;
    padding: 24px;
    /* Respect device safe areas */
    padding-top: max(24px, env(safe-area-inset-top));
    padding-bottom: max(24px, env(safe-area-inset-bottom));
}
</style>
