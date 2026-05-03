/**
 * `@openclaw/oc-lint` — public SDK surface.
 *
 * @module @openclaw/oc-lint
 */

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
export { LintRuleRegistrationError } from './api-extension.js';
