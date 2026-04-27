import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nodePlugin from 'eslint-plugin-n';
import securityPlugin from 'eslint-plugin-security';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'public/**',
      'build/**',
      'JaMmusic/**',
      'vitest.config.ts',
      '**/*.json',
      '.claude/**',
      'scripts/**',
      'eslint.config.mjs',
    ],
  },
  js.configs.recommended,
  nodePlugin.configs['flat/recommended-module'],
  securityPlugin.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': ['error', { ignoreIIFE: true }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      'n/no-unsupported-features/es-syntax': 'off',
      'n/no-missing-import': 'off',
      'no-underscore-dangle': 'off',
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 1 }],
      'one-var': ['error', { var: 'never', let: 'always', const: 'never' }],
      'max-len': ['error', { code: 150 }],
    },
  },
);
