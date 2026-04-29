/**
 * Structured parser for AGENTS.md / ROLES.md per `openclaw-agents.peg`
 * (and `openclaw-roles.peg`, which shares the same shape).
 *
 * Top-level: H2 agent sections, each followed by `- key: value` bullet
 * fields. The `kind` discriminant is set by the caller (parse.ts
 * dispatch) to either 'agents' or 'roles' — this parser produces an
 * AgentsAst shape regardless, since the structure is identical.
 *
 * Soft-error policy: never throws. Malformed bullet lines are skipped
 * silently (no diagnostic) — the grammar's `GenericField` fallback is
 * intentionally tolerant of prose, comments, and partial fields.
 *
 * @module @bic/openclaw-workspace/ast/parsers/agents
 */

import type { AgentsAst, BaseAst, Diagnostic } from '../ast-types.js';

export function parseAgentsKind(
  base: BaseAst,
  // Accepts a diagnostics array for symmetry with the other parsers,
  // even though the agents parser currently emits none. Future field
  // validation (missing description / model) belongs in lint rules,
  // not the parser.
  _diagnostics: Diagnostic[],
): AgentsAst {
  const agents: Array<{
    name: string;
    line: number;
    fields: Array<{ key: string; value: string; line: number }>;
  }> = [];
  for (const block of base.blocks) {
    const fields: Array<{ key: string; value: string; line: number }> = [];
    for (let i = 0; i < block.bodyLines.length; i++) {
      const raw = block.bodyLines[i]!;
      const trimmed = raw.replace(/^[\s]*[-*]\s+/, '');
      if (trimmed === raw) continue;
      const colon = trimmed.indexOf(':');
      if (colon <= 0) continue;
      const key = trimmed.slice(0, colon).trim();
      const value = trimmed.slice(colon + 1).trim();
      // block.line is the 1-based heading line; +1 = first body line;
      // i = 0-based offset within bodyLines.
      const fieldLine = block.line + 1 + i;
      fields.push({ key, value, line: fieldLine });
    }
    agents.push({ name: block.heading, line: block.line, fields });
  }
  return { ...base, kind: 'agents', agents };
}
