/**
 * Lint module public types.
 *
 * The lint engine is schema-agnostic: AST-only rules fire whenever a
 * `JsoncDocument` is passed in. Schema-aware rules fire only if the
 * caller injects a `LintSchema`. Both kinds of rule produce the same
 * `LintFinding` shape so downstream renderers don't branch on rule type.
 *
 * Severity tiers (matching plan `claws-workspace-lint`):
 *   - 'error' — data corruption / startup-blocking
 *   - 'warn'  — semantic risk; should be addressed
 *   - 'note'  — cosmetic / low-priority
 *
 * Each lint code carries an `evidenceIssues` field listing real
 * `openclaw/openclaw` issue numbers that motivated the rule. The numbers
 * are also encoded in per-rule TSDoc so a `grep '@evidence'` over the
 * rules dir returns the same list.
 *
 * @module @bic/openclaw-workspace/lint/types
 */

import type { JsoncDocument, JsoncRange, JsoncValue } from '../ast/jsonc/ast-types.js';

export type LintSeverity = 'error' | 'warn' | 'note';

export type LintCode =
  // -- JSONC config rules (single-file, AST-only or schema-aware) -------
  | 'OC_CFG_DUPLICATE_KEY'
  | 'OC_CFG_TRAILING_WHITESPACE'
  | 'OC_CFG_MIXED_INDENT'
  | 'OC_CFG_TRAILING_COMMA_INCONSISTENT'
  | 'OC_CFG_REDACTED_PLACEHOLDER'
  | 'OC_CFG_DEAD_COMMENT'
  | 'OC_CFG_UNKNOWN_FIELD'
  | 'OC_CFG_DEPRECATED_FIELD'
  | 'OC_CFG_LEGACY_FIELD'
  | 'OC_CFG_TYPE_MISMATCH'
  | 'OC_CFG_MISSING_REQUIRED_FIELD'
  | 'OC_CFG_PLUGIN_ID_COLLISION'
  | 'OC_CFG_SECRET_REF_AMBIGUOUS'
  // -- Workspace cross-file / per-kind rules -----------------------------
  | 'OC_MEMORY_HOOK_TOO_LONG'
  | 'OC_MEMORY_INDEX_OVER_LIMIT'
  | 'OC_MEMORY_DEAD_LINK'
  | 'OC_MEMORY_RAW_CANDIDATE_LEAK'
  | 'OC_SKILL_NAME_MISMATCH'
  | 'OC_SKILL_TOO_LONG'
  | 'OC_SKILL_DEAD_PATH'
  | 'OC_AGENTS_MODEL_NOT_APPROVED';

export interface LintFinding {
  readonly code: LintCode;
  readonly severity: LintSeverity;
  readonly message: string;
  /** Byte range + 1-based line/column for renderer/editor. line/column are populated by the engine from the offset; rules return only `{start, end}` (see `LintFindingDraft`). */
  readonly location: {
    readonly start: number;
    readonly end: number;
    readonly line: number;
    readonly column: number;
  };
  /**
   * Did-you-mean / replacement suggestion, if applicable. Renderers may
   * surface this as a quick-fix candidate in editors that support it.
   */
  readonly suggestion?: string;
  /**
   * Path into the config object (e.g. ['plugins', 'entries', 'foo', 'config']).
   * Empty for whole-file findings.
   */
  readonly path: readonly (string | number)[];
  /**
   * `oc://config/...` URI form of `path`. Always populated by the engine
   * (rules don't compute it themselves). For file-level findings with
   * empty path, this is `oc://config`. Renderers can deep-link this URI
   * directly in editors that support OSC-8 / VS Code diagnostic data.
   */
  readonly ocUri: string;
}

/**
 * Schema descriptor for schema-aware rules. The interface is intentionally
 * small so the lint engine doesn't depend on a particular schema library —
 * callers project their Zod / JSON Schema / hand-authored schema into this
 * shape.
 *
 * - `kindOf(path)` returns the expected primitive kind for a leaf path,
 *   or `'object'` / `'array'` / `'unknown'`.
 * - `knownChildKeys(path)` returns the set of expected child keys at an
 *   object path, used by `OC_CFG_UNKNOWN_FIELD` for did-you-mean.
 * - `requiredChildKeys(path)` returns child keys that MUST be present.
 * - `deprecatedKeys(path)` returns deprecated key → optional replacement.
 * - `legacyKeys(path)` returns legacy keys with auto-migration available
 *   (split from deprecated so renderers can show "this auto-migrates").
 * - `pluginIdSources(doc)` returns string paths whose values participate
 *   in plugin-id uniqueness (used by `OC_CFG_PLUGIN_ID_COLLISION`).
 */
export interface LintSchema {
  readonly kindOf: (path: readonly (string | number)[]) => SchemaKind;
  readonly knownChildKeys: (path: readonly (string | number)[]) => readonly string[];
  readonly requiredChildKeys: (path: readonly (string | number)[]) => readonly string[];
  readonly deprecatedKeys: (
    path: readonly (string | number)[],
  ) => ReadonlyMap<string, string | null>;
  readonly legacyKeys: (
    path: readonly (string | number)[],
  ) => ReadonlyMap<string, string | null>;
  readonly pluginIdSources: (doc: JsoncDocument) => ReadonlyArray<{
    readonly path: readonly (string | number)[];
    readonly id: string;
  }>;
  /**
   * Optional approved-model allow-list for `OC_AGENTS_MODEL_NOT_APPROVED`.
   * Returns `null` to indicate "no policy" (rule silently no-ops). When
   * non-null, agent `model:` fields must match one of the listed values
   * exactly (case-sensitive — case mismatch is itself the bug per
   * #73715). Comparison happens after normalizing the optional
   * `provider/` prefix on the agent side; schemas can list either bare
   * model names or `provider/model` qualified names.
   */
  readonly approvedAgentModels?: () => readonly string[] | null;
}

export type SchemaKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'object'
  | 'array'
  | 'unknown';

export interface LintOptions {
  /** Schema descriptor for schema-aware rules. AST-only rules fire even without it. */
  readonly schema?: LintSchema;
  /** Limit which lint codes run. Default: all. */
  readonly enabledCodes?: ReadonlySet<LintCode>;
}

/**
 * What rules return — `LintFinding` minus engine-computed fields. Rules
 * supply only byte offsets in `location`; the engine post-processes
 * drafts to:
 *   - resolve `line` / `column` from `location.start` (single sweep when
 *     the doc has many findings; otherwise per-finding O(n))
 *   - stamp `ocUri` from `path`
 *   - weave the URI into `message` for plain-log surfaces
 *
 * This split keeps the parser hot loop free of line/column tracking
 * (≈30% parse-time savings on large inputs) and lets rules stay terse.
 */
export type LintFindingDraft = Omit<LintFinding, 'ocUri' | 'location'> & {
  readonly location: {
    readonly start: number;
    readonly end: number;
  };
};

export interface LintRule {
  readonly code: LintCode;
  readonly severity: LintSeverity;
  /** True if the rule needs a `LintSchema`; false for pure-AST rules. */
  readonly needsSchema: boolean;
  /** List of openclaw issue numbers motivating this rule. */
  readonly evidenceIssues: readonly number[];
  readonly run: (
    doc: JsoncDocument,
    schema: LintSchema | undefined,
  ) => readonly LintFindingDraft[];
}

export type { JsoncDocument, JsoncRange, JsoncValue };
