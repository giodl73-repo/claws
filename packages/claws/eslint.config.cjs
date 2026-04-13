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
  message: `Importing from ${pkg} is forbidden. claws-cli must not depend on craft ecosystem packages. Only @bic/claws-sdk is allowed.`,
}));

const forbiddenPatterns = FORBIDDEN_PACKAGES.map((pkg) => ({
  group: [`${pkg}/*`],
  message: `Importing from ${pkg} subpaths is forbidden. claws-cli must not depend on craft ecosystem packages.`,
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
