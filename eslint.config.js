// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

// ADR-0005 / rule 16: domain/ is plain TypeScript. These lists are what keeps
// it that way mechanically, instead of by review alone.
const domainForbiddenImports = [
  {
    group: ['@angular/*', '@angular/**'],
    message: 'domain/ is plain TypeScript: no Angular (ADR-0005, rule 16).',
  },
  {
    group: ['mermaid', 'mermaid/*'],
    message: 'domain/ produces Mermaid text; only the renderer adapter imports the library (ADR-0005, ADR-0007).',
  },
  {
    group: ['**/app/**', '**/infrastructure/**', '**/ui/**'],
    message: 'domain/ imports nothing from the outer layers (ADR-0005).',
  },
];

const domainForbiddenGlobals = [
  'window',
  'document',
  'navigator',
  'location',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
].map((name) => ({
  name,
  message: 'domain/ uses no DOM, storage or network APIs (rule 16).',
}));

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'sdc', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'sdc', style: 'kebab-case' },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      eqeqeq: ['error', 'always'],
      'no-console': 'error',
    },
  },
  {
    // ADR-0007: only the Mermaid adapter loads the library. A type import is erased at build time, so it is allowed.
    files: ['src/**/*.ts'],
    ignores: ['src/infrastructure/mermaid/**'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^mermaid(/.*)?$',
              allowTypeImports: true,
              message: 'Only the Mermaid adapter in src/infrastructure/mermaid imports the library (ADR-0007).',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "ImportExpression[source.value='mermaid']",
          message: 'Only the Mermaid adapter in src/infrastructure/mermaid loads the library (ADR-0007).',
        },
      ],
    },
  },
  {
    files: ['src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: domainForbiddenImports }],
      'no-restricted-globals': ['error', ...domainForbiddenGlobals],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
  },
]);
