/**
 * Parse phase — read a workspace file into a typed AST.
 *
 * Thin wrapper over `@bic/openclaw-workspace/ast`. The workspace package owns
 * the PEG grammars and AST shapes; policy consumes them here so Extract can
 * walk a structured AST instead of regexing raw markdown. Parser diagnostics
 * are mapped to policy's `Diagnostic` shape (which carries a `code`).
 */

import { parse as workspaceParse } from '@bic/openclaw-workspace/ast';
import type {
  WorkspaceAst,
  WorkspaceFileKind,
} from '@bic/openclaw-workspace/ast';

import type { Diagnostic } from '../types/index.js';

export type { WorkspaceAst, WorkspaceFileKind } from '@bic/openclaw-workspace/ast';

export interface ParsedFile {
  kind: WorkspaceFileKind;
  path: string;
  ast: WorkspaceAst;
  diagnostics: Diagnostic[];
}

export function parseWorkspaceFile(
  kind: WorkspaceFileKind,
  path: string,
  raw: string,
): ParsedFile {
  const result = workspaceParse(kind, raw);
  const diagnostics: Diagnostic[] = result.diagnostics.map((d) => ({
    code: 'OC-POLICY-W-PARSE',
    severity: d.severity,
    message: d.message,
    path,
    line: d.line,
  }));
  return { kind, path, ast: result.ast, diagnostics };
}
