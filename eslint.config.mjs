import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-config-prettier';
import playwright from 'eslint-plugin-playwright';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/** Keep in sync with `printWidth` in .prettierrc.json. */
const MAX_LINE_LENGTH = 120;

export default defineConfig(
  { ignores: ['node_modules/', 'reports/', 'test-results/', 'playwright-report/', 'blob-report/', 'playwright/'] },

  js.configs.recommended,
  tseslint.configs.recommended,

  {
    files: ['tests/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      // Conditional skips (`test.skip(condition, reason)`) are intentional; unconditional ones are flagged.
      'playwright/no-skipped-test': ['warn', { allowConditional: true }],
      // Page-object helpers named expect* assert internally (e.g. cartPage.expectItemCount).
      'playwright/expect-expect': ['warn', { assertFunctionPatterns: ['^expect'] }],
    },
  },

  // Turns off formatting rules that Prettier owns; must come before the rules below.
  prettier,

  {
    plugins: { '@stylistic': stylistic },
    rules: {
      // Prettier wraps code at the same width; this also catches what it can't wrap,
      // such as long strings. Fix with `npm run format`, or split/shorten the string.
      '@stylistic/max-len': [
        'error',
        { code: MAX_LINE_LENGTH, tabWidth: 2, ignoreUrls: true, ignoreRegExpLiterals: true },
      ],
      // Playwright fixtures that use no other fixture are declared as `async ({}, use) => ...`.
      'no-empty-pattern': ['error', { allowObjectPatternsAsParameters: true }],
    },
  },
);
