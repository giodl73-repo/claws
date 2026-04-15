/**
 * CLI version constant — single source of truth for the claws CLI version.
 *
 * The version should be injected from package.json during build/publish time
 * (for example via `CLAWS_CLI_VERSION`) so packaged/bundled outputs do not
 * depend on a relative runtime path to package.json.
 *
 * @module claws-cli/version
 */

const resolvedCliVersion =
  process.env.CLAWS_CLI_VERSION ??
  process.env.npm_package_version ??
  '0.0.0';

/** claws CLI version resolved without reading package.json at runtime. */
export const CLI_VERSION: string = resolvedCliVersion;
