/**
 * @bic/openclaw-workspace — unified package for OpenClaw workspace utilities.
 *
 * Subpaths:
 *   /path           — oc:// URI scheme + workspace file registry + chunk types
 *   /ast            — PEG grammars + typed AST + parse/emit
 *   /canonicalize   — RFC 8785 JCS canonicalization (data)
 *   /staging        — staging-dir + snapshot helpers
 *   /path-canonical — filesystem-path canonicalizer for `modify.redirectPath`
 *                     (P-03 defence; distinct from /canonicalize)
 *
 * Import from the subpath you need (`@bic/openclaw-workspace/path`, etc.)
 * so consumers tree-shake what they don't use.
 *
 * @module @bic/openclaw-workspace
 */

export * as path from './path/index.js';
export * as ast from './ast/index.js';
export * as canonicalize from './canonicalize/index.js';
export * as staging from './staging/index.js';
export * as pathCanonical from './path-canonical/index.js';
