<template>
    <div class="pin-pad column items-center" :class="{ 'pin-pad--dark': dark }">
        <div class="pin-title">{{ title }}</div>
        <div v-if="subtitle" class="pin-subtitle q-mt-xs text-center">
            {{ subtitle }}
        </div>

        <!-- Dots -->
        <div
            class="pin-dots"
            role="img"
            :aria-label="t('appLock.digitsEntered', { count: modelValue.length, total: length })"
        >
            <span
                v-for="i in length"
                :key="i"
                class="pin-dot"
                :class="{ 'pin-dot--filled': i <= modelValue.length, 'pin-dot--error': !!error }"
            />
        </div>

        <div class="pin-error text-caption" :class="{ 'pin-error--visible': !!error }" role="alert">
            {{ error }}
        </div>

        <!-- Keypad -->
        <div class="pin-keys">
            <button
                v-for="key in keys"
                :key="key.value || 'empty'"
                v-ripple
                type="button"
                class="pin-key"
                :class="{ 'pin-key--empty': key.value === '', 'pin-key--del': key.value === 'del' }"
                :disabled="key.value === ''"
                :aria-hidden="key.value === '' ? 'true' : undefined"
                :aria-label="key.value === 'del' ? t('appLock.deleteDigit') : undefined"
                @click="press(key.value)"
            >
                <q-icon v-if="key.icon" :name="key.icon" :size="dark ? '26px' : '24px'" />
                <span v-else>{{ key.digit }}</span>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        modelValue: string;
        title: string;
        subtitle?: string | undefined;
        error?: string | undefined;
        length?: number;
        /** Renders the pad for a dark background (lock screen). */
        dark?: boolean;
    }>(),
    {
        length: 4,
        dark: false,
    },
);

const { t } = useI18n();

const emit = defineEmits<{
    'update:modelValue': [value: string];
    complete: [pin: string];
}>();

const keys = [
    { value: '1', digit: '1', icon: '' },
    { value: '2', digit: '2', icon: '' },
    { value: '3', digit: '3', icon: '' },
    { value: '4', digit: '4', icon: '' },
    { value: '5', digit: '5', icon: '' },
    { value: '6', digit: '6', icon: '' },
    { value: '7', digit: '7', icon: '' },
    { value: '8', digit: '8', icon: '' },
    { value: '9', digit: '9', icon: '' },
    { value: '', digit: '', icon: '' },
    { value: '0', digit: '0', icon: '' },
    { value: 'del', digit: '', icon: 'o_backspace' },
];

/**
 * Handles a keypad press: appends a digit, deletes, and emits completion.
 * @param value - The pressed key value ('0'-'9', 'del', or '')
 */
function press(value: string): void {
    if (value === '') return;

    if (value === 'del') {
        emit('update:modelValue', props.modelValue.slice(0, -1));
        return;
    }

    if (props.modelValue.length >= props.length) return;

    const next = props.modelValue + value;
    emit('update:modelValue', next);
    if (next.length === props.length) {
        emit('complete', next);
    }
}
</script>

<style lang="scss" scoped>
// Error tone readable on the dark hero background
$negative-on-dark: #f0a283;

.pin-title {
    font-size: 16px;
    font-weight: 700;
    color: $text-primary;
}

.pin-subtitle {
    font-size: 13px;
    color: $text-secondary;
}

.pin-dots {
    display: flex;
    gap: 16px;
    margin: 16px 0;
}

.pin-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid $border-color;
    transition: all 0.15s ease;

    &--filled {
        background-color: $primary;
        border-color: $primary;
    }

    &--error {
        border-color: $negative;
        background-color: $negative;
    }
}

.pin-error {
    min-height: 18px;
    opacity: 0;
    color: $negative;

    &--visible {
        opacity: 1;
    }
}

.pin-keys {
    display: grid;
    grid-template-columns: repeat(3, 72px);
    gap: 12px;
    justify-content: center;
    margin-top: 8px;
}

.pin-key {
    height: 64px;
    width: 72px;
    border: none;
    border-radius: 50%;
    background: $bg-subtle;
    color: $text-primary;
    font-family: inherit;
    font-size: 24px;
    font-weight: 600;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;

    &:active {
        background: $primary-soft;
    }

    &:focus-visible {
        outline: 2px solid $primary;
        outline-offset: 2px;
    }

    &--empty {
        visibility: hidden;
        background: transparent;
    }
}

// Dark variant (lock screen)
.pin-pad--dark {
    flex: 1;
    width: 100%;

    .pin-title {
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: #ffffff;
    }

    .pin-subtitle {
        color: $hero-muted;
    }

    .pin-dots {
        gap: 18px;
        margin: 28px 0 12px;
    }

    .pin-dot {
        border-color: #3a4a44;

        &--filled {
            background-color: $hero-accent;
            border-color: $hero-accent;
        }

        &--error {
            background-color: $negative-on-dark;
            border-color: $negative-on-dark;
        }
    }

    .pin-error {
        color: $negative-on-dark;
    }

    .pin-keys {
        grid-template-columns: repeat(3, 76px);
        gap: 18px 28px;
        // Pushes the keypad to the bottom of the screen
        margin-top: auto;
        padding-top: 24px;
    }

    .pin-key {
        width: 76px;
        height: 76px;
        background: #1e2925;
        color: #ffffff;
        font-size: 26px;

        &:active {
            background: #2c3a35;
        }

        &:focus-visible {
            outline-color: $hero-accent;
        }

        &--del {
            background: transparent;
            color: $hero-muted;
        }

        &--empty {
            background: transparent;
        }
    }
}
</style>
