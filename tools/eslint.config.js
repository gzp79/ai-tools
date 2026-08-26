import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
    js.configs.recommended,
    prettier,
    {
        ignores: ['node_modules/']
    },
    {
        // Node.js CLI scripts and the local server.
        files: ['**/*.mjs', '**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.node }
        },
        rules: {
            // Allow unused variables that start with _
            'no-unused-vars': [
                'error',
                {
                    args: 'all',
                    argsIgnorePattern: '^_',
                    caughtErrors: 'all',
                    caughtErrorsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    ignoreRestSiblings: true
                }
            ]
        }
    },
    {
        // Tampermonkey userscript runs in the browser with Greasemonkey globals.
        files: ['**/*.user.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: { ...globals.browser, ...globals.greasemonkey }
        }
    }
];
