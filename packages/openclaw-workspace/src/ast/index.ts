/**
 * @bic/openclaw-workspace/ast — PEG grammars + typed AST + parse/emit
 *   for OpenClaw workspace files.
 *
 * `grammars` exports all 11 openclaw-*.peg grammar strings verbatim for
 * authority-of-record reference. `parse`/`emit` provide typed AST access
 * with lossless round-trip for pristine input.
 *
 * @module @bic/openclaw-workspace/ast
 */

export { parse } from './parse.js';
export { emit } from './emit.js';
export { classify } from './classify.js';
export { grammars, WORKSPACE_FILE_KINDS } from './grammars.generated.js';
export type { WorkspaceFileKind } from './grammars.generated.js';
export type {
  AgentsAst,
  AstBlock,
  BaseAst,
  Diagnostic,
  FrontmatterEntry,
  GenericAst,
  ParseResult,
  SoulAst,
  ToolsAst,
  WorkspaceAst,
} from './ast-types.js';
