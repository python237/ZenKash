<template>
    <div class="pin-pad column items-center">
        <div class="text-subtitle1 text-weight-medium">{{ title }}</div>
        <div v-if="subtitle" class="text-caption text-grey-6 q-mt-xs text-center">{{ subtitle }}</div>

        <!-- Dots -->
        <div class="pin-dots q-my-md">
            <span
                v-for="i in length"
                :key="i"
                class="pin-dot"
                :class="{ 'pin-dot--filled': i <= modelValue.length, 'pin-dot--error': !!error }"
            />
        </div>

        <div class="pin-error text-caption text-negative" :class="{ 'pin-error--visible': !!error }">
            {{ error }}
        </div>

        <!-- Keypad -->
        <div class="pin-keys q-mt-sm">
            <button
                v-for="key in keys"
                :key="key.value || 'empty'"
                v-ripple
                type="button"
                class="pin-key"
                :class="{ 'pin-key--empty': key.value === '' }"
                :disabled="key.value === ''"
                @click="press(key.value)"
            >
                <q-icon v-if="key.icon" :name="key.icon" size="24px" />
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
    }>(),
    {
        length: 4,
    },
);

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
    { value: 'del', digit: '', icon: 'backspace' },
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
.pin-dots {
    display: flex;
    gap: 16px;
}

.pin-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid $grey-5;
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

    &--visible {
        opacity: 1;
    }
}

.pin-keys {
    display: grid;
    grid-template-columns: repeat(3, 72px);
    gap: 12px;
    justify-content: center;
}

.pin-key {
    height: 64px;
    width: 72px;
    border: none;
    border-radius: 50%;
    background: rgba($primary, 0.06);
    color: $text-primary;
    font-size: 24px;
    font-weight: 500;
    cursor: pointer;
    position: relative;
    overflow: hidden;

    &:active {
        background: rgba($primary, 0.16);
    }

    &--empty {
        visibility: hidden;
        background: transparent;
    }
}
</style>
