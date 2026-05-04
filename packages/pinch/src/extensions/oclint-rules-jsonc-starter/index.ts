/**
 * `oclint-rules-jsonc-starter` — starter rule pack for jsonc config files.
 *
 * Severity defaults are conservative (info for shape rules, warning for
 * security-adjacent ones). Operators can override per-rule severity via
 * host config.
 *
 * @module oclint-rules-jsonc-starter
 */

import type { LintRule } from '../../plugin-sdk/oc-lint/types.js';
import { configEmptyPluginsEntries } from './rules/config-empty-plugins-entries.js';
import { configMissingPlugins } from './rules/config-missing-plugins.js';
import { configMissingVersion } from './rules/config-missing-version.js';
import { configSecretAsLiteral } from './rules/config-secret-as-literal.js';

export const jsoncStarterRules: readonly LintRule[] = [
  configMissingPlugins,
  configEmptyPluginsEntries,
  configMissingVersion,
  configSecretAsLiteral,
];

export {
  configEmptyPluginsEntries,
  configMissingPlugins,
  configMissingVersion,
  configSecretAsLiteral,
};
