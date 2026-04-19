/**
 * @bic/openclaw-workspace — unified package for OpenClaw workspace utilities.
 *
 * Three subpaths:
 *   /path          — oc:// URI scheme + workspace file registry + chunk types
 *   /ast           — PEG grammars + typed AST + parse/emit
 *   /canonicalize  — RFC 8785 JCS canonicalization
 *
 * Import from the subpath you need (`@bic/openclaw-workspace/path`, etc.)
 * so consumers tree-shake what they don't use.
 *
 * @module @bic/openclaw-workspace
 */

export * as path from './path/index.js';
export * as ast from './ast/index.js';
export * as canonicalize from './canonicalize/index.js';
