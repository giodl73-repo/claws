// @ts-check
'use strict';

const FORBIDDEN_PACKAGES = [
  '@craftworks/craftworks-sdk',
  '@craftworks/shared-cli',
  '@craftworks/craft-cli',
  '@craftworks/guard-cli',
  '@craftworks/fleet-cli',
  '@craftworks/forge-cli',
];

const forbiddenPaths = FORBIDDEN_PACKAGES.map((pkg) => ({
  name: pkg,
  message: `Importing from ${pkg} is forbidden. claws-sdk must not depend on craft ecosystem packages. Only @craftworks/compiler-sdk and @craftworks/agent-sdk are allowed.`,
}));

const forbiddenPatterns = FORBIDDEN_PACKAGES.map((pkg) => ({
  group: [`${pkg}/*`],
  message: `Importing from ${pkg} subpaths is forbidden. claws-sdk must not depend on craft ecosystem packages.`,
}));

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: forbiddenPaths,
          patterns: forbiddenPatterns,
        },
      ],
    },
  },
];
