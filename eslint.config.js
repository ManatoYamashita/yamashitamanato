import { fileURLToPath } from 'node:url';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import vueParser from 'vue-eslint-parser';

// `.gitignore` を lint 除外の単一の真実にする。ESLint の flat config は `.gitignore` を
// 自動参照しないため、生成物ディレクトリが増えるたびに両方へ書き足す二重管理になっていた。
// 実際 `.netlify/`（PR #70）と `.vite-ssg-temp/`（PR #72）で同じ穴を2度踏んでいる。
const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url));

export default [
  // Git が無視するものは lint も無視する。以後、生成物は `.gitignore` へ足すだけでよい。
  includeIgnoreFile(gitignorePath),

  // JavaScript recommended rules
  js.configs.recommended,

  // Vue 3 essential rules
  ...pluginVue.configs['flat/essential'],

  // JavaScript/Vue files
  {
    files: ['**/*.{js,mjs,cjs,vue}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      // Vue specific rules
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'warn',
      'vue/no-unused-components': 'warn',
      'vue/require-v-for-key': 'error',
      'vue/no-use-v-if-with-v-for': 'error',

      // JavaScript rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },

  // TypeScript files
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Vue specific rules
      'vue/multi-word-component-names': 'off',

      // Disable conflicting ESLint rules
      'no-unused-vars': 'off',
      'no-undef': 'off',

      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'warn',
    },
  },

  // Vue files with TypeScript
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsparser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // Vue specific rules
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'warn',
      'vue/no-unused-components': 'warn',
      'vue/require-v-for-key': 'error',
      'vue/no-use-v-if-with-v-for': 'error',

      // Disable conflicting rules
      'no-unused-vars': 'off',
      'no-undef': 'off',

      // TypeScript rules for Vue
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],

      // General rules
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'warn',
    },
  },

  // Node 側のビルド/CLI スクリプト。
  // 標準出力が本来の出力チャネルであり、console.log はデバッグの残置ではなく仕様。
  // ブラウザへ配信されるコードではないため no-console の対象から外す。
  {
    files: ['scripts/**/*.ts', 'vite.config.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // Ignore patterns
  {
    // ここには **Git が追跡しているのに lint 対象外にしたいもの** だけを書く。
    // 生成物（dist/ node_modules/ .netlify/ .vite-ssg-temp/ など）は
    // `.gitignore` 側で一元管理されるため、ここへ重複して書かないこと。
    ignores: ['.github/**', '*.config.js', 'public/**'],
  },
];
