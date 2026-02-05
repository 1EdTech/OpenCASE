// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default defineConfig([
  {
    ignores: ['dist/**', 'node_modules/**', '.eslintrc.cjs', 'eslint.config.mjs', 'jest.config.cjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      // Project prefers practical linting over strict TS style enforcement.
      '@typescript-eslint/strict-boolean-expressions': 'off',

      // Keep the existing code style working (this repo uses semicolons in many places).
      '@typescript-eslint/semi': 'off',
      semi: 'off',

      // Avoid large mechanical refactors / churn.
      '@typescript-eslint/consistent-type-imports': 'off',
      '@typescript-eslint/prefer-readonly': 'off',
      '@typescript-eslint/space-before-function-paren': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/unbound-method': 'off',

      // This codebase intentionally uses `any` in a few boundary layers; don't force broad refactors.
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/member-delimiter-style': 'off',

      // Keep signal without failing CI/dev on minor hygiene.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-trailing-spaces': 'warn',
      'spaced-comment': 'off',

      // This repo has some files with extra trailing newlines and mixed quoting in tests; don't fail lint for it.
      '@typescript-eslint/quotes': 'off',
      'no-multiple-empty-lines': 'off',

      // Additional "strictness" rules that cause lots of churn in an existing codebase.
      '@typescript-eslint/promise-function-async': 'off',
      'no-new': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/method-signature-style': 'off',
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/comma-dangle': 'off',
      'quote-props': 'off',
    },
  },
]);
