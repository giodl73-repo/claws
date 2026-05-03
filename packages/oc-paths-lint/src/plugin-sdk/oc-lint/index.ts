/**
 * `@openclaw/oc-lint` — public SDK surface.
 *
 * @module @openclaw/oc-lint
 */

/**
 * SDK version this build of `@openclaw/oc-lint` exposes. Plugins
 * declare the version they were authored against via `LintRule.requires.sdkVersion`;
 * the host warns on mismatch (semver-major bump = breaking change).
 *
 * Bumped on every breaking change to `LintRule` / `LintFinding` /
 * `LintRuleContext`. In-tree starter packs omit `requires` (they ship
 * with the SDK, no version-skew possible).
 */
export const SDK_VERSION = '0.1.0';

export type {
  Diagnostic,
  LintFinding,
  LintRule,
  LintRuleContext,
  LintSeverity,
  WorkspaceFileName,
} from './types.js';
export { WORKSPACE_FILE_NAMES } from './types.js';

export type { RegisterLintRule } from './api-extension.js';
export { LintRuleRegistrationError, checkSdkCompat } from './api-extension.js';
