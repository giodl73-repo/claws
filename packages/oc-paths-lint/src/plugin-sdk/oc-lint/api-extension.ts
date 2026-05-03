/**
 * The `api.registerLintRule` SDK verb signature. In the upstream
 * landing this gets added to `src/plugin-sdk/api.ts`'s `PluginApi`
 * interface; here in the prototype we expose it as a standalone
 * type so consumers can mock the API surface.
 *
 * @module @openclaw/oc-lint/api-extension
 */

import type { LintRule } from './types.js';

/**
 * The verb plugins call to opt a rule into the lint runner.
 *
 *   api.registerLintRule({
 *     id: 'my-pack/foo/bar',
 *     severity: 'info',
 *     description: 'Detect foo bar conditions in AGENTS.md',
 *     appliesTo: 'AGENTS.md',
 *     check(ctx) { ... },
 *   });
 *
 * Calling `registerLintRule` with the same `id` twice is a registration
 * error (caller's bug — rule packs should declare each rule exactly
 * once). The host's API implementation rejects duplicates.
 */
export interface RegisterLintRule {
  (rule: LintRule): void;
}

/**
 * Error thrown when a duplicate rule id is registered. Stable `code`
 * for downstream matching.
 */
export class LintRuleRegistrationError extends Error {
  readonly code = 'OC_LINT_DUPLICATE_RULE';
  readonly ruleId: string;

  constructor(ruleId: string) {
    super(`lint rule already registered: ${ruleId}`);
    this.name = 'LintRuleRegistrationError';
    this.ruleId = ruleId;
  }
}
