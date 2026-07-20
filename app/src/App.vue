<template>
    <router-view />
    <LockScreen v-if="isLocked" />
</template>

<script setup lang="ts">
import LockScreen from 'components/app-lock/LockScreen.vue';
import { useAppLock } from 'src/composables/useAppLock';

const { isLocked } = useAppLock();
</script>
