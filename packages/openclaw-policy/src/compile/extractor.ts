/**
 * `PolicyExtractorSpec` — the policy generator's per-concept extractor
 * shape. Mirrors `OcPathFixerSpec` from oc-doctor, minus the fix step:
 *
 *   - `appliesTo` glob filter (same dispatcher as lint/doctor)
 *   - `extract(ctx)` walks the parsed `OcAst` and emits typed concepts
 *     (`Tool[]`, `DenyRule[]`, `Capability[]`, etc.) using
 *     `findOcPaths` / `resolveOcPath` from oc-paths-substrate
 *   - One `OcPath` pattern per concept IS the contract for what the
 *     policy generator considers a "tool" / "deny rule" / "capability"
 *
 * Strategic frame: policy is a CONSUMER of the oc-paths universal
 * verbs (parallel to lint and doctor), not a peer framework. The
 * extract phase becomes a list of `(concept, query, mapper)` specs;
 * everything that needed a hand-rolled `WorkspaceAst` walker becomes a
 * `findOcPaths` query.
 *
 * @module @bic/openclaw-policy/compile/extractor
 */

import type { OcAst } from '@bic/oc-paths-substrate';

/**
 * The shape every concept-extractor follows. `T` is the typed concept
 * the spec produces (e.g., `ToolSpec`, `DenyRule`).
 */
export interface PolicyExtractorSpec<T> {
  /** Stable id. Use `<concept>/<source>` form (e.g., `tools/from-tools-md`). */
  readonly id: string;
  readonly description: string;
  /**
   * Glob over filename. Same matcher as oc-lint / oc-doctor:
   * `'AGENTS.md'`, `'TOOLS.md'`, `'*.jsonc'`, `'{session,audit,events}*.jsonl'`.
   * `'*'` matches every file.
   */
  readonly appliesTo: string;
  /**
   * Extract typed concepts from the parsed AST. Pure function: no I/O,
   * no AST mutation. Output ordering is deterministic across calls.
   *
   * Implementations use `findOcPaths` / `resolveOcPath` from oc-paths-
   * substrate to locate concept-bearing nodes, then map each match
   * (carrying `match.line`, `match.kind`, etc.) to a typed `T`.
   */
  extract(input: PolicyExtractorContext): readonly T[];
}

/**
 * Context handed to every extractor's `extract()`. Carries the file
 * name (used for `appliesTo` matching upstream + for source-location
 * stamping inside the extractor), the universal `OcAst`, and the raw
 * bytes (extractors that need to read kind-specific token ranges
 * outside the AST — e.g., MD code-fence content — fall back to `raw`).
 *
 * The `path` field is the file's absolute filesystem path so
 * extractors can stamp `SourceLocation { path, line, column }` on the
 * concepts they produce.
 */
export interface PolicyExtractorContext {
  /** File basename (used for `appliesTo` matching). */
  readonly fileName: string;
  /** Absolute filesystem path; used in `SourceLocation` stamps. */
  readonly path: string;
  /** Workspace-relative path (forward slashes); used for `oc://` URIs. */
  readonly relPath: string;
  readonly ast: OcAst;
  readonly raw: string;
}
