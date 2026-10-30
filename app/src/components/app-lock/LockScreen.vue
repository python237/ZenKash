<template>
    <div class="lock-screen column items-center">
        <span class="lock-screen__logo" aria-hidden="true">Z</span>
        <PinPad
            v-model="pin"
            dark
            :title="t('appLock.enterPin')"
            :subtitle="t('appLock.lockedSubtitle')"
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
    background: $hero-bg;
    color: #ffffff;
    gap: 28px;
    overflow-y: auto;
    padding: 24px 24px 40px;
    /* Respect device safe areas */
    padding-top: calc(max(24px, env(safe-area-inset-top)) + 72px);
    padding-bottom: calc(max(24px, env(safe-area-inset-bottom)) + 32px);

    &__logo {
        flex-shrink: 0;
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: $hero-accent;
        color: $hero-bg;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26px;
        font-weight: 800;
    }
}

/* Reduce top spacing on short screens so the keypad fits */
@media (max-height: 680px) {
    .lock-screen {
        gap: 16px;
        padding-top: calc(max(24px, env(safe-area-inset-top)) + 24px);
    }
}
</style>
