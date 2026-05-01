<template>
    <div class="fullscreen bg-blue text-white text-center q-pa-md flex flex-center">
        <div>
            <div style="font-size: 30vh">404</div>

            <div class="text-h2" style="opacity: 0.4">Oops. Nothing here...</div>

            <BtnSecondary class="q-mt-xl" to="/" label="Go Home" />
        </div>
    </div>
</template>

<script setup lang="ts">
import BtnSecondary from 'src/components/buttons/BtnSecondary.vue';
</script>
