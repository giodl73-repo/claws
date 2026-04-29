/**
 * Lint rule registry — central list of every rule the engine knows about.
 *
 * Adding a rule: implement it in `rules/<slug>.ts`, then register it here.
 * The engine itself doesn't import individual rule files; everything goes
 * through this list so rule discovery stays explicit.
 *
 * @module @bic/openclaw-workspace/lint/registry
 */

import type { LintRule } from './types.js';
import { duplicateKeyRule } from './rules/duplicate-key.js';
import { trailingWhitespaceRule } from './rules/trailing-whitespace.js';
import { mixedIndentRule } from './rules/mixed-indent.js';
import { trailingCommaRule } from './rules/trailing-comma.js';
import { redactedPlaceholderRule } from './rules/redacted-placeholder.js';
import { deadCommentRule } from './rules/dead-comment.js';
import { unknownFieldRule } from './rules/unknown-field.js';
import { deprecatedFieldRule } from './rules/deprecated-field.js';
import { legacyFieldRule } from './rules/legacy-field.js';
import { typeMismatchRule } from './rules/type-mismatch.js';
import { missingRequiredRule } from './rules/missing-required.js';
import { pluginIdCollisionRule } from './rules/plugin-id-collision.js';
import { secretRefAmbiguousRule } from './rules/secret-ref-ambiguous.js';

export const ALL_RULES: readonly LintRule[] = [
  // AST-only rules (fire without a LintSchema)
  duplicateKeyRule,
  trailingWhitespaceRule,
  mixedIndentRule,
  trailingCommaRule,
  redactedPlaceholderRule,
  // Schema-aware rules (skip silently when no schema injected)
  deadCommentRule,
  unknownFieldRule,
  deprecatedFieldRule,
  legacyFieldRule,
  typeMismatchRule,
  missingRequiredRule,
  pluginIdCollisionRule,
  secretRefAmbiguousRule,
];
