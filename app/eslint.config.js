import js from '@eslint/js';
import globals from 'globals';
import pluginVue from 'eslint-plugin-vue';
import pluginQuasar from '@quasar/app-vite/eslint';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import prettierSkipFormatting from '@vue/eslint-config-prettier/skip-formatting';
import pluginJsdoc from 'eslint-plugin-jsdoc';
import autoImportGlobals from './.eslintrc-auto-import.json' with { type: 'json' };

export default defineConfigWithVueTs(
    pluginQuasar.configs.recommended(),
    js.configs.recommended,
    pluginVue.configs['flat/essential'],
    pluginJsdoc.configs['flat/recommended-typescript-flavor'],

    {
        files: ['**/*.ts', '**/*.vue'],
        rules: {
            '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
        },
    },

    vueTsConfigs.recommendedTypeChecked,

    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...autoImportGlobals.globals,
                process: 'readonly',
                Capacitor: 'readonly',
            },
        },
        rules: {
            'prefer-promise-reject-errors': 'off',
            'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
            // JSDoc rules for better documentation
            'jsdoc/require-jsdoc': [
                'error',
                {
                    require: {
                        FunctionDeclaration: true,
                        MethodDefinition: true,
                        ClassDeclaration: true,
                        ArrowFunctionExpression: false,
                        FunctionExpression: false,
                    },
                    contexts: ['TSInterfaceDeclaration', 'TSTypeAliasDeclaration'],
                },
            ],
            'jsdoc/require-param-description': 'error',
            'jsdoc/require-returns-description': 'error',
            // Disable type rules since TypeScript provides types
            'jsdoc/require-param-type': 'off',
            'jsdoc/require-returns-type': 'off',
            'jsdoc/require-throws-type': 'off',
            'jsdoc/escape-inline-tags': 'off',
            'jsdoc/check-tag-names': ['error', { definedTags: ['slot'] }],
        },
    },

    prettierSkipFormatting,
);
