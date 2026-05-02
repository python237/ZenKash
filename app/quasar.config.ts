// Zenkash - Quasar Configuration
// https://v2.quasar.dev/quasar-cli-vite/quasar-config-file

import { defineConfig } from '#q-app/wrappers';
import { fileURLToPath } from 'node:url';

export default defineConfig((ctx) => {
    return {
        // Boot files (plugins initialization)
        boot: ['database', 'i18n', 'safe-area', 'back-button', 'menu-backdrop', 'reminder'],

        // Global CSS
        css: ['app.scss'],

        // Quasar extras (icons, fonts)
        extras: ['material-icons'],

        // Build configuration
        build: {
            target: {
                browser: 'baseline-widely-available',
                node: 'node22',
            },

            typescript: {
                strict: true,
                vueShim: true,
            },

            vueRouterMode: 'hash',

            vitePlugins: [
                [
                    'unplugin-auto-import/vite',
                    {
                        imports: ['vue', 'vue-router', 'vue-i18n', 'pinia'],
                        dirs: ['src/composables/**', 'src/stores/**'],
                        dts: 'src/auto-imports.d.ts',
                        vueTemplate: true,
                        eslintrc: {
                            enabled: true,
                            filepath: '.eslintrc-auto-import.json',
                        },
                    },
                ],
                [
                    '@intlify/unplugin-vue-i18n/vite',
                    {
                        ssr: ctx.modeName === 'ssr',
                        include: [fileURLToPath(new URL('./src/i18n', import.meta.url))],
                    },
                ],
                [
                    'vite-plugin-checker',
                    {
                        vueTsc: {
                            tsconfigPath: 'tsconfig.json',
                        },
                        eslint: {
                            lintCommand:
                                'eslint -c ./eslint.config.js "./src*/**/*.{ts,js,mjs,cjs,vue}"',
                            useFlatConfig: true,
                        },
                    },
                    { server: false },
                ],
            ],
        },

        // Dev server
        devServer: {
            open: false,
        },

        // Quasar framework options
        framework: {
            config: {},
            plugins: [],
        },

        // Animations (all enabled)
        animations: 'all',

        // Capacitor (Android/iOS)
        capacitor: {
            hideSplashscreen: true,
        },
    };
});
