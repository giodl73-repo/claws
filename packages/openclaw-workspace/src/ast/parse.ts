/**
 * parse(kind, content) — produce a typed AST + diagnostics.
 *
 * The parser is lossless on input it fully understands (SOUL, TOOLS,
 * AGENTS, MEMORY, SKILLS structural forms) and lossless-via-raw-
 * preservation on everything else. Emit uses the structured fields
 * when possible and falls back to `raw` otherwise, so callers always
 * get byte-identical round-trip for pristine input.
 *
 * Per-kind parsers live in `./parsers/{kind}.ts`. This file is just
 * the dispatch table.
 *
 * @module @bic/openclaw-workspace/ast/parse
 */

import type {
  Diagnostic,
  GenericAst,
  ParseResult,
  WorkspaceAst,
  WorkspaceFileKind,
} from './ast-types.js';
import { parseBase } from './parsers/base.js';
import { parseAgentsKind } from './parsers/agents.js';
import { parseMemoryKind } from './parsers/memory.js';
import { parseSkillsKind } from './parsers/skills.js';
import { parseSoulKind } from './parsers/soul.js';
import { parseToolsKind } from './parsers/tools.js';

/**
 * Kinds with their own structured parser. Listed for the exhaustiveness
 * check below so adding a new structured parser without updating the
 * dispatch table fails at compile time.
 */
type StructuredKind =
  | 'agents'
  | 'memory'
  | 'roles'
  | 'skills'
  | 'soul'
  | 'tools';

/** Kinds that fall through to `GenericAst` (base parse only). */
type GenericKind = Exclude<WorkspaceFileKind, StructuredKind>;

export function parse<K extends WorkspaceFileKind>(
  kind: K,
  content: string,
): ParseResult {
  const base = parseBase(content);
  const diagnostics: Diagnostic[] = [];

  let ast: WorkspaceAst;
  switch (kind) {
    case 'soul':
      ast = parseSoulKind(base, diagnostics);
      break;
    case 'memory':
      ast = parseMemoryKind(base, diagnostics);
      break;
    case 'skills':
      ast = parseSkillsKind(base, diagnostics);
      break;
    case 'tools':
      ast = parseToolsKind(base, diagnostics);
      break;
    case 'agents':
    case 'roles':
      ast = parseAgentsKind(base, diagnostics);
      break;
    default: {
      // Exhaustiveness: if a future WorkspaceFileKind is added that's
      // not in StructuredKind and not in GenericKind, this `satisfies`
      // fails at compile time.
      const generic: GenericKind = kind;
      ast = { ...base, kind: generic } satisfies GenericAst;
      break;
    }
  }
  return { ast, diagnostics };
}
