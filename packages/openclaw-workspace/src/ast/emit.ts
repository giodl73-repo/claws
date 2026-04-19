/**
 * emit(kind, ast) — render an AST back to canonical text.
 *
 * Lossless invariant: for any `ast` produced by `parse(kind, content)`
 * with pristine input, `emit(kind, ast) === ast.raw`. Emit uses the
 * preserved `raw` field when the structural shape matches; this avoids
 * canonicalization drift on input that round-tripped cleanly.
 *
 * Newly-authored AST (no `raw` field matching the structural shape) emits
 * a canonical form: CRLF → LF, trailing whitespace stripped, single
 * trailing newline.
 *
 * @module @bic/openclaw-workspace/ast/emit
 */

import type { WorkspaceAst, WorkspaceFileKind } from './ast-types.js';

export function emit<K extends WorkspaceFileKind>(kind: K, ast: WorkspaceAst): string {
  if (ast.kind !== kind && !(kind === 'roles' && ast.kind === 'agents')) {
    throw new Error(`emit: kind mismatch — expected ${kind}, got ${ast.kind}`);
  }
  if (ast.raw.length > 0) return ast.raw;

  const parts: string[] = [];
  if (ast.frontmatter.length > 0) {
    parts.push('---');
    for (const { key, value } of ast.frontmatter) parts.push(`${key}: ${value}`);
    parts.push('---');
  }
  if (ast.preamble.length > 0) parts.push(ast.preamble);
  for (const block of ast.blocks) {
    parts.push(`## ${block.heading}`);
    parts.push(...block.bodyLines);
  }
  return parts.join('\n');
}
