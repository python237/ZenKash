<template>
    <q-layout>
        <q-page-container>
            <q-page class="welcome-page">
                <!-- Decorative balance curve -->
                <svg
                    class="welcome-curve"
                    viewBox="0 0 390 420"
                    preserveAspectRatio="none"
                    fill="none"
                    aria-hidden="true"
                >
                    <path
                        d="M-10 330 C 60 320, 90 260, 150 270 S 250 200, 300 170 S 370 90, 400 70"
                        stroke="#8FE3CF"
                        stroke-width="3"
                        stroke-linecap="round"
                    />
                    <path
                        d="M-10 360 C 60 352, 100 310, 160 312 S 260 260, 310 240 S 370 190, 400 175"
                        stroke="#2C4A42"
                        stroke-width="2"
                        stroke-linecap="round"
                    />
                    <circle cx="300" cy="170" r="7" fill="#8FE3CF" />
                    <circle cx="300" cy="170" r="16" fill="#8FE3CF" opacity="0.18" />
                </svg>

                <!-- Brand -->
                <div class="welcome-brand">
                    <span class="welcome-brand__tile" aria-hidden="true">Z</span>
                    <span class="welcome-brand__name">Zenkash</span>
                </div>

                <!-- Bottom content -->
                <div class="welcome-content">
                    <h1 class="welcome-title">{{ t('onboarding.welcomeTitle') }}</h1>
                    <p class="welcome-subtitle">{{ t('onboarding.welcomeSubtitle') }}</p>

                    <q-btn
                        class="welcome-cta"
                        unelevated
                        no-caps
                        :label="t('onboarding.getStarted')"
                        @click="handleStart"
                    />

                    <p class="welcome-privacy">{{ t('onboarding.welcomePrivacy') }}</p>
                </div>

                <!-- Currency selection dialog -->
                <CurrencyOnboardingDialog
                    v-model="showCurrencyDialog"
                    @confirmed="onCurrencyConfirmed"
                />
            </q-page>
        </q-page-container>
    </q-layout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import CurrencyOnboardingDialog from 'src/components/onboarding/CurrencyOnboardingDialog.vue';

const { t } = useI18n();
const router = useRouter();

const showCurrencyDialog = ref(false);

/**
 * Handles the 'Get Started' button click by showing the currency selection dialog.
 * @returns {void}
 */
function handleStart(): void {
    showCurrencyDialog.value = true;
}

/**
 * Callback handler when the user confirms their currency selection.
 * Redirects to the main dashboard after the currency is set.
 * @returns {void}
 */
function onCurrencyConfirmed(): void {
    // Redirect to dashboard after currency is set
    void router.replace('/');
}
</script>

<style lang="scss" scoped>
.welcome-page {
    position: relative;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    overflow: hidden;
    background: $hero-bg;
    color: #ffffff;
    padding: calc(56px + var(--safe-area-top)) 28px calc(44px + var(--safe-area-bottom));
}

.welcome-curve {
    position: absolute;
    top: calc(120px + var(--safe-area-top));
    left: 0;
    width: 100%;
    height: 420px;
    pointer-events: none;
}

.welcome-brand {
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;

    &__tile {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: $hero-accent;
        color: $hero-bg;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: 800;
    }

    &__name {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.02em;
    }
}

.welcome-content {
    position: relative;
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.welcome-title {
    margin: 0;
    font-size: 36px;
    font-weight: 800;
    letter-spacing: -0.03em;
    line-height: 1.1;
    white-space: pre-line;
}

.welcome-subtitle {
    margin: 0;
    font-size: 15px;
    line-height: 1.6;
    color: $hero-muted;
}

.welcome-cta {
    margin-top: 12px;
    min-height: 58px;
    border-radius: $radius-tile;
    background: $hero-accent;
    color: $hero-bg;
    font-size: 16px;
    font-weight: 800;
}

.welcome-privacy {
    margin: 0;
    text-align: center;
    font-size: 12px;
    color: #7f8f88;
}
</style>
