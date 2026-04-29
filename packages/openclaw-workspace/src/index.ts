/**
 * @bic/openclaw-workspace — unified package for OpenClaw workspace utilities.
 *
 * Subpaths:
 *   /path           — oc:// URI scheme (workspace + config) + workspace file
 *                     registry + chunk types
 *   /ast            — PEG grammars + typed AST + parse/emit (markdown-flavored
 *                     workspace files: SOUL, TOOLS, AGENTS, …)
 *   /ast/jsonc      — JSON-with-comments parser/emitter substrate; supports
 *                     comments, trailing commas, BOM, soft error recovery
 *   /lint           — 13-code JSONC config lint surface; schema-DI'd; every
 *                     finding carries an `oc://config/<path>` URI
 *   /canonicalize   — RFC 8785 JCS canonicalization (data)
 *   /staging        — staging-dir + snapshot helpers
 *   /path-canonical — filesystem-path canonicalizer for `modify.redirectPath`
 *                     (P-03 defense; distinct from /canonicalize)
 *
 * Import from the subpath you need (`@bic/openclaw-workspace/path`,
 * `@bic/openclaw-workspace/lint`, etc.) so consumers tree-shake what they
 * don't use.
 *
 * @module @bic/openclaw-workspace
 */

export * as path from './path/index.js';
export * as ast from './ast/index.js';
export * as jsonc from './ast/jsonc/index.js';
export * as lint from './lint/index.js';
export * as canonicalize from './canonicalize/index.js';
export * as staging from './staging/index.js';
export * as pathCanonical from './path-canonical/index.js';
