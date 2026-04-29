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

/**
 * SOUL.md — frontmatter + persona body + optional `## Boundaries` section.
 * Per `openclaw-soul.peg`. Boundaries are bullet items inside the
 * Boundaries section; persona is freeform prose between frontmatter and
 * Boundaries (or end of file).
 */
export interface SoulAst extends BaseAst {
  readonly kind: 'soul';
  readonly boundaries: ReadonlyArray<{
    readonly text: string;
    /** 1-based line number where the boundary bullet starts. */
    readonly line: number;
  }>;
  /** Persona body text (prose between frontmatter and `## Boundaries`). */
  readonly personaText: string;
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
    /** 1-based line number of the agent's `## Heading`. */
    readonly line: number;
    readonly fields: ReadonlyArray<{
      readonly key: string;
      readonly value: string;
      /** 1-based line number of the field's bullet. */
      readonly line: number;
    }>;
  }>;
}

/**
 * MEMORY.md — frontmatter (optional `scope:`) + H2 entry sections.
 * Each entry: name (heading) + content (prose lines until next H2).
 * Per `openclaw-memory.peg`.
 */
export interface MemoryAst extends BaseAst {
  readonly kind: 'memory';
  /**
   * Optional file-level scope from the frontmatter, if present.
   * Allowed: 'project' | 'wave' | 'role' | 'task' | 'ephemeral' (per
   * grammar) plus any extensible value (the parser preserves whatever
   * the user wrote for forward compat).
   */
  readonly scope: string | null;
  readonly entries: ReadonlyArray<{
    readonly name: string;
    readonly content: string;
    /** 1-based line number of the entry's `## Heading`. */
    readonly line: number;
  }>;
}

/**
 * SKILL.md — required YAML frontmatter (name/description/tier/tools/...)
 * + markdown body. Per `openclaw-skills.peg`.
 *
 * Frontmatter keys are categorized: structured keys (name/description/
 * tier/tools/trigger_phrases/param_set/param_inline) get dedicated
 * fields; anything else lands in `opaque` so emit can round-trip.
 */
export interface SkillsAst extends BaseAst {
  readonly kind: 'skills';
  readonly skill: {
    readonly name: string | null;
    readonly description: string | null;
    readonly tier: 'T1' | 'T2' | 'T3' | null;
    readonly tools: readonly string[];
    readonly triggerPhrases: readonly string[];
    readonly paramSet: string | null;
    readonly paramInline: string | null;
    readonly opaque: ReadonlyArray<{ readonly key: string; readonly value: string }>;
    /**
     * Markdown body after the frontmatter, with leading/trailing blank
     * lines trimmed and CRLF normalized to LF. **NOT byte-faithful** —
     * use `ast.raw` for byte-identical round-trip; use `body` for
     * downstream consumers that just need the human-readable content.
     */
    readonly body: string;
  };
}

export interface GenericAst extends BaseAst {
  readonly kind:
    | 'bootstrap'
    | 'config'
    | 'dreams'
    | 'entities'
    | 'governance'
    | 'hook'
    | 'roles'
    | 'tasks'
    | 'workflows';
}

export type WorkspaceAst =
  | SoulAst
  | ToolsAst
  | AgentsAst
  | MemoryAst
  | SkillsAst
  | GenericAst;

export interface ParseResult<A extends WorkspaceAst = WorkspaceAst> {
  readonly ast: A;
  readonly diagnostics: readonly Diagnostic[];
}

export type { WorkspaceFileKind };
