import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Common React pattern: a context module exports both the Provider component
      // and a corresponding hook. This is fine; HMR still works for the component.
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true, allowExportNames: ['useLocale', 'useTeam'] },
      ],
      // This rule (new in eslint-plugin-react-hooks v7) flags initializing state from
      // an external store inside an effect. Our usage is intentional (syncing
      // localStorage-backed auth/locale into React state across route changes), so
      // we surface it as a warning instead of a hard error.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  {
    // Vite config runs in Node, so it needs Node globals (process, __dirname, etc.).
    files: ['vite.config.js', '*.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
])
