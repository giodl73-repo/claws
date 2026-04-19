/**
 * Typed AST node shapes for OpenClaw workspace files.
 *
 * Each WorkspaceFileKind has a concrete AST type; `WorkspaceAst` is the
 * discriminated union. Parsers emit the full source as trailing `raw` on
 * the root node so emitters can round-trip byte-identical output for input
 * they can't structurally re-emit (preserves foreign content).
 *
 * @module @bic/openclaw-workspace/ast/ast-types
 */

import type { WorkspaceFileKind } from './grammars.generated.js';

export interface Diagnostic {
  readonly line: number;
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

export interface AstBlock {
  readonly heading: string;
  readonly bodyLines: readonly string[];
  /** 1-based line number where the heading starts. */
  readonly line: number;
}

export interface FrontmatterEntry {
  readonly key: string;
  readonly value: string;
}

export interface BaseAst {
  /** Byte-identical copy of the original source, for lossless round-trip. */
  readonly raw: string;
  /** Optional YAML frontmatter entries (empty if none). */
  readonly frontmatter: readonly FrontmatterEntry[];
  /** Preamble text before the first H2 heading (may be empty). */
  readonly preamble: string;
  /** H2-delimited block sections in document order. */
  readonly blocks: readonly AstBlock[];
}

// -- Per-kind AST discriminants ----------------------------------------

export interface SoulAst extends BaseAst {
  readonly kind: 'soul';
}

export interface ToolsAst extends BaseAst {
  readonly kind: 'tools';
  /** Rows from the "Tool Guidance" markdown table (name + guidance prose). */
  readonly tools: ReadonlyArray<{ readonly tool: string; readonly guidance: string }>;
}

export interface AgentsAst extends BaseAst {
  readonly kind: 'agents';
  /** Parsed agent sections (heading + key-value fields extracted from bullets). */
  readonly agents: ReadonlyArray<{
    readonly name: string;
    readonly fields: ReadonlyArray<{ readonly key: string; readonly value: string }>;
  }>;
}

export interface GenericAst extends BaseAst {
  readonly kind:
    | 'config'
    | 'entities'
    | 'governance'
    | 'memory'
    | 'roles'
    | 'skills'
    | 'tasks'
    | 'workflows';
}

export type WorkspaceAst = SoulAst | ToolsAst | AgentsAst | GenericAst;

export interface ParseResult<A extends WorkspaceAst = WorkspaceAst> {
  readonly ast: A;
  readonly diagnostics: readonly Diagnostic[];
}

export type { WorkspaceFileKind };
