/**
 * CodeActionProvider — 6 auto-fix code actions for governance diagnostics.
 *
 * Each code action generates a workspace edit that resolves the corresponding
 * diagnostic from the DiagnosticProvider (pulse 34). The 6 fix types:
 *   1. Add missing frontmatter
 *   2. Fix risk level
 *   3. Add elicitation gate
 *   4. Add OBO declaration
 *   5. Add data label
 *   6. Add deny intent
 *
 * @module claws-lsp/providers/code-action
 */

import type {
  CodeAction,
  Diagnostic,
  TextEdit,
  WorkspaceEdit,
} from 'vscode-languageserver';

import { CATEGORY_META, type DiagnosticCategory } from './diagnostic.js';

// ── Fix type definitions ─────────────────────────────────────────────

/**
 * The 6 code action fix types, each mapping to a diagnostic category.
 */
export type FixType =
  | 'add-frontmatter'
  | 'fix-risk-level'
  | 'add-elicitation'
  | 'add-obo-declaration'
  | 'add-data-label'
  | 'add-deny-intent';

/**
 * Maps diagnostic codes to fix types. Only diagnostics with a known
 * fix type get a code action.
 */
const CODE_TO_FIX: Readonly<Record<string, FixType>> = {
  'CLAWS-D001': 'fix-risk-level',       // tool-risk
  'CLAWS-D002': 'add-obo-declaration',  // obo-conflict
  'CLAWS-D003': 'add-deny-intent',      // deny-intent
  'CLAWS-D005': 'add-elicitation',      // approval-required
  'CLAWS-D006': 'add-frontmatter',      // fail-mode (missing frontmatter is the fix)
  'CLAWS-D009': 'add-data-label',       // label-missing
};

/**
 * Human-readable titles for each fix type.
 */
const FIX_TITLES: Readonly<Record<FixType, string>> = {
  'add-frontmatter':     'Add missing governance frontmatter',
  'fix-risk-level':      'Fix risk level declaration',
  'add-elicitation':     'Add elicitation gate',
  'add-obo-declaration': 'Add OBO (on-behalf-of) declaration',
  'add-data-label':      'Add data label',
  'add-deny-intent':     'Add deny intent',
};

// ── Edit generation ──────────────────────────────────────────────────

/**
 * Default frontmatter block for governance files.
 */
const DEFAULT_FRONTMATTER = `---
governance:
  version: "1.0"
  risk-level: 3
  fail-mode: halt
---
`;

/**
 * Generate a TextEdit for the given fix type and diagnostic.
 *
 * @param fixType - The fix to apply.
 * @param diag - The diagnostic being fixed.
 * @param content - The full file content.
 * @returns A TextEdit to apply, or undefined if no edit can be generated.
 */
export function generateEdit(
  fixType: FixType,
  diag: Diagnostic,
  content: string,
): TextEdit | undefined {
  switch (fixType) {
    case 'add-frontmatter': {
      // Insert frontmatter at the top of the file if not present
      if (content.startsWith('---')) return undefined;
      return {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        newText: DEFAULT_FRONTMATTER,
      };
    }

    case 'fix-risk-level': {
      // Insert a risk-level annotation after the diagnostic line
      const line = diag.range.start.line;
      const lines = content.split('\n');
      const targetLine = lines[line] ?? '';
      // Extract the tool name from the diagnostic message
      const toolMatch = diag.message.match(/Tool "([^"]+)"/);
      const toolName = toolMatch?.[1] ?? 'unknown';
      const newText = `${targetLine}\n<!-- claws:risk-level ${toolName} r3 -->`;
      return {
        range: { start: { line, character: 0 }, end: { line, character: targetLine.length } },
        newText,
      };
    }

    case 'add-elicitation': {
      // Insert an elicitation gate block after the diagnostic line
      const line = diag.range.start.line;
      const lines = content.split('\n');
      const targetLine = lines[line] ?? '';
      const approval = diag.message.replace(/^Approval required:\s*/, '');
      const newText = `${targetLine}\n<!-- claws:elicitation-gate ${approval} -->`;
      return {
        range: { start: { line, character: 0 }, end: { line, character: targetLine.length } },
        newText,
      };
    }

    case 'add-obo-declaration': {
      // Insert an OBO declaration block after the diagnostic line
      const line = diag.range.start.line;
      const lines = content.split('\n');
      const targetLine = lines[line] ?? '';
      // Extract tool name from the diagnostic message
      const oboMatch = diag.message.match(/tool "([^"]+)"/);
      const oboTool = oboMatch?.[1] ?? 'unknown';
      const newText = `${targetLine}\n<!-- claws:obo ${oboTool} principal=user -->`;
      return {
        range: { start: { line, character: 0 }, end: { line, character: targetLine.length } },
        newText,
      };
    }

    case 'add-data-label': {
      // Insert a data label annotation after the diagnostic line
      const line = diag.range.start.line;
      const lines = content.split('\n');
      const targetLine = lines[line] ?? '';
      // Extract key=value from the diagnostic message
      const labelMatch = diag.message.match(/Label required:\s*(\S+=\S+)/);
      const label = labelMatch?.[1] ?? 'key=value';
      const newText = `${targetLine}\n<!-- claws:data-label ${label} -->`;
      return {
        range: { start: { line, character: 0 }, end: { line, character: targetLine.length } },
        newText,
      };
    }

    case 'add-deny-intent': {
      // Insert a deny intent declaration after the diagnostic line
      const line = diag.range.start.line;
      const lines = content.split('\n');
      const targetLine = lines[line] ?? '';
      // Extract the target from the diagnostic message
      const denyMatch = diag.message.match(/Deny intent:\s*(.*)/);
      const reason = denyMatch?.[1] ?? 'policy violation';
      const newText = `${targetLine}\n<!-- claws:deny-intent reason="${reason}" -->`;
      return {
        range: { start: { line, character: 0 }, end: { line, character: targetLine.length } },
        newText,
      };
    }
  }
}

// ── Code action generation ───────────────────────────────────────────

/**
 * Determine the fix type for a diagnostic, or undefined if no fix exists.
 */
export function fixTypeForDiagnostic(diag: Diagnostic): FixType | undefined {
  const code = typeof diag.code === 'string' ? diag.code : String(diag.code ?? '');
  return CODE_TO_FIX[code];
}

/**
 * Generate code actions for a set of diagnostics on a given URI.
 *
 * @param uri - The document URI.
 * @param diagnostics - The diagnostics from the client.
 * @param content - The full document content.
 * @returns An array of CodeAction objects, one per fixable diagnostic.
 */
export function provideCodeActions(
  uri: string,
  diagnostics: readonly Diagnostic[],
  content: string,
): CodeAction[] {
  const actions: CodeAction[] = [];

  for (const diag of diagnostics) {
    const fixType = fixTypeForDiagnostic(diag);
    if (!fixType) continue;

    const edit = generateEdit(fixType, diag, content);
    if (!edit) continue;

    const workspaceEdit: WorkspaceEdit = {
      changes: { [uri]: [edit] },
    };

    actions.push({
      title: FIX_TITLES[fixType],
      kind: 'quickfix',
      diagnostics: [diag],
      isPreferred: true,
      edit: workspaceEdit,
    });
  }

  return actions;
}
