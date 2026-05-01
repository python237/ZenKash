<template>
    <q-layout>
        <q-page-container>
            <q-page class="welcome-page">
                <!-- Background with primary color -->
                <div class="welcome-background">
                    <!-- Logo centered -->
                    <div class="logo-container">
                        <img src="~assets/logo-full.svg" alt="Zenkash" class="logo" />
                    </div>

                    <!-- Bottom section with white background -->
                    <div class="bottom-section">
                        <div class="welcome-text">
                            <h1 class="title">{{ t('onboarding.welcomeTitle') }}</h1>
                            <p class="subtitle">{{ t('onboarding.welcomeSubtitle') }}</p>
                        </div>

                        <BtnPrimary
                            class="start-button"
                            :label="t('onboarding.getStarted')"
                            size="lg"
                            @click="handleStart"
                        />
                    </div>
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
import BtnPrimary from 'src/components/buttons/BtnPrimary.vue';
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
    min-height: 100vh;
    padding: 0;
}

.welcome-background {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    background: linear-gradient(180deg, $primary 0%, $primary-dark 100%);
}

.logo-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px;

    .logo {
        width: 200px;
        height: auto;
        filter: brightness(0) invert(1); // Make logo white
    }
}

.bottom-section {
    background: white;
    border-radius: 32px 32px 0 0;
    padding: 32px 24px;
    padding-bottom: calc(32px + var(--safe-area-bottom));

    .welcome-text {
        text-align: center;
        margin-bottom: 32px;

        .title {
            font-size: 28px;
            font-weight: 700;
            color: $dark;
            margin: 0 0 12px 0;
        }

        .subtitle {
            font-size: 16px;
            color: $grey-7;
            margin: 0;
            line-height: 1.5;
        }
    }

    .start-button {
        width: 100%;
    }
}
</style>
