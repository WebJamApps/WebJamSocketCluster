import Module from 'node:module';
import { createRequire } from 'node:module';

// TypeScript 7 Go compiler does not provide the JS programmatic AST API.
// Forward typescript-eslint, sonarjs, and other ESLint plugins to @typescript/typescript6.
const origResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, ...args) {
  if (typeof request === 'string' && request.startsWith('typescript/')) {
    return origResolveFilename.call(this, request.replace(/^typescript\//, '@typescript/typescript6/'), ...args);
  }
  return origResolveFilename.call(this, request, ...args);
};

const require = createRequire(import.meta.url);
try {
  const tsPath = require.resolve('typescript');
  const ts6 = require('@typescript/typescript6');
  require.cache[tsPath] = {
    id: tsPath,
    filename: tsPath,
    loaded: true,
    exports: ts6,
  };
} catch (error) {
  console.warn('Warning: Failed to load @typescript/typescript6 bridge in eslint.config.mjs:', error);
}

const js = (await import('@eslint/js')).default;
const tseslint = (await import('typescript-eslint')).default;
const nodePlugin = (await import('eslint-plugin-n')).default;
const securityPlugin = (await import('eslint-plugin-security')).default;
const sonarjs = (await import('eslint-plugin-sonarjs')).default;
const unicorn = (await import('eslint-plugin-unicorn')).default;
const promise = (await import('eslint-plugin-promise')).default;
const globals = (await import('globals')).default;

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
  sonarjs.configs.recommended,
  promise.configs['flat/recommended'],
  {
    plugins: {
      unicorn,
    },
    rules: {
      'unicorn/prefer-node-protocol': 'warn',
      'unicorn/no-unreadable-array-destructuring': 'warn',
      'unicorn/no-useless-promise-resolve-reject': 'off',
      'unicorn/prefer-array-find': 'warn',
      'unicorn/prefer-array-flat-map': 'warn',
      'unicorn/prefer-includes': 'warn',
      'unicorn/prefer-string-starts-ends-with': 'warn',
      'unicorn/prefer-date-now': 'warn',
      'unicorn/no-typeof-undefined': 'warn',
      'unicorn/no-invalid-remove-event-listener': 'warn',
      'promise/no-return-wrap': 'off',
    },
  },
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
      '@typescript-eslint/no-explicit-any': 'error',
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
  {
    // Test-only override: deeply-nested arrow chains are the clearest way to
    // build mock factories (e.g. socketcluster's receiver/consumer/next chain),
    // and refactoring them into named helpers reduces readability rather than
    // improving it. Keep the rule active for src/.
    files: ['test/**/*.ts'],
    rules: {
      'sonarjs/no-nested-functions': 'off',
      'promise/always-return': 'off',
      'promise/catch-or-return': 'off',
    },
  },
);
