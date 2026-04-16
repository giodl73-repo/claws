/**
 * L0 unit tests for CodeActionProvider.
 *
 * 2 tests:
 *   1. Fix action generation from diagnostic
 *   2. Edit application correct
 */

import { describe, it, expect } from 'vitest';
import {
  provideCodeActions,
  generateEdit,
  fixTypeForDiagnostic,
  type FixType,
} from '../../src/providers/code-action.js';
import type { Diagnostic } from 'vscode-languageserver';

/** Build a diagnostic with the given code and line. */
function makeDiag(code: string, message: string, line: number): Diagnostic {
  return {
    range: {
      start: { line, character: 0 },
      end: { line, character: 20 },
    },
    severity: 1,
    code,
    source: 'claws',
    message,
  };
}

describe('CodeActionProvider', () => {
  it('generates fix actions from diagnostics for all 6 fix types', () => {
    const content = '# Config\nshell-exec: deny\napproval: manager-sign-off\nsend-email: obo\npii: field\nDeny intent: shell access';

    const diagnostics: Diagnostic[] = [
      makeDiag('CLAWS-D006', 'R5 rule must fail-closed', 0),       // add-frontmatter
      makeDiag('CLAWS-D001', 'Tool "shell-exec" has critical risk level', 1), // fix-risk-level
      makeDiag('CLAWS-D005', 'Approval required: manager-sign-off', 2),       // add-elicitation
      makeDiag('CLAWS-D002', 'OBO conflict on tool "send-email": OBO-01 vs SEC-05', 3), // add-obo-declaration
      makeDiag('CLAWS-D009', 'Label required: pii=true', 4),       // add-data-label
      makeDiag('CLAWS-D003', 'Deny intent: shell access blocked', 5), // add-deny-intent
    ];

    const actions = provideCodeActions('file:///ws/TOOLS.md', diagnostics, content);

    // Should produce exactly 6 code actions, one per fixable diagnostic
    expect(actions).toHaveLength(6);

    // Verify each action has the correct structure
    for (const action of actions) {
      expect(action.kind).toBe('quickfix');
      expect(action.isPreferred).toBe(true);
      expect(action.diagnostics).toHaveLength(1);
      expect(action.edit).toBeDefined();
      expect(action.edit!.changes).toBeDefined();
      expect(action.edit!.changes!['file:///ws/TOOLS.md']).toHaveLength(1);
    }

    // Verify specific titles
    expect(actions[0]!.title).toBe('Add missing governance frontmatter');
    expect(actions[1]!.title).toBe('Fix risk level declaration');
    expect(actions[2]!.title).toBe('Add elicitation gate');
    expect(actions[3]!.title).toBe('Add OBO (on-behalf-of) declaration');
    expect(actions[4]!.title).toBe('Add data label');
    expect(actions[5]!.title).toBe('Add deny intent');
  });

  it('generates correct edits for each fix type', () => {
    const content = '# Config\nshell-exec: deny\napproval: manager-sign-off\nsend-email: obo\npii: field\nDeny intent: shell access';

    // 1. add-frontmatter: inserts at top when no frontmatter exists
    const frontmatterEdit = generateEdit(
      'add-frontmatter',
      makeDiag('CLAWS-D006', 'R5 rule must fail-closed', 0),
      content,
    );
    expect(frontmatterEdit).toBeDefined();
    expect(frontmatterEdit!.range.start.line).toBe(0);
    expect(frontmatterEdit!.newText).toContain('---');
    expect(frontmatterEdit!.newText).toContain('governance:');
    expect(frontmatterEdit!.newText).toContain('risk-level: 3');

    // add-frontmatter returns undefined when frontmatter already exists
    const existingFm = generateEdit(
      'add-frontmatter',
      makeDiag('CLAWS-D006', 'test', 0),
      '---\ngovernance:\n---\n# Content',
    );
    expect(existingFm).toBeUndefined();

    // 2. fix-risk-level: inserts annotation after the tool line
    const riskEdit = generateEdit(
      'fix-risk-level',
      makeDiag('CLAWS-D001', 'Tool "shell-exec" has critical risk level', 1),
      content,
    );
    expect(riskEdit).toBeDefined();
    expect(riskEdit!.range.start.line).toBe(1);
    expect(riskEdit!.newText).toContain('claws:risk-level');
    expect(riskEdit!.newText).toContain('shell-exec');
    expect(riskEdit!.newText).toContain('r3');

    // 3. add-elicitation: inserts gate annotation
    const elicitEdit = generateEdit(
      'add-elicitation',
      makeDiag('CLAWS-D005', 'Approval required: manager-sign-off', 2),
      content,
    );
    expect(elicitEdit).toBeDefined();
    expect(elicitEdit!.newText).toContain('claws:elicitation-gate');
    expect(elicitEdit!.newText).toContain('manager-sign-off');

    // 4. add-obo-declaration: inserts OBO annotation
    const oboEdit = generateEdit(
      'add-obo-declaration',
      makeDiag('CLAWS-D002', 'OBO conflict on tool "send-email": OBO-01 vs SEC-05', 3),
      content,
    );
    expect(oboEdit).toBeDefined();
    expect(oboEdit!.newText).toContain('claws:obo');
    expect(oboEdit!.newText).toContain('send-email');
    expect(oboEdit!.newText).toContain('principal=user');

    // 5. add-data-label: inserts label annotation
    const labelEdit = generateEdit(
      'add-data-label',
      makeDiag('CLAWS-D009', 'Label required: pii=true', 4),
      content,
    );
    expect(labelEdit).toBeDefined();
    expect(labelEdit!.newText).toContain('claws:data-label');
    expect(labelEdit!.newText).toContain('pii=true');

    // 6. add-deny-intent: inserts deny intent annotation
    const denyEdit = generateEdit(
      'add-deny-intent',
      makeDiag('CLAWS-D003', 'Deny intent: shell access blocked', 5),
      content,
    );
    expect(denyEdit).toBeDefined();
    expect(denyEdit!.newText).toContain('claws:deny-intent');
    expect(denyEdit!.newText).toContain('shell access blocked');
  });

  it('returns empty array for diagnostics without known fix types', () => {
    const diag = makeDiag('CLAWS-D004', 'Delegation rule DEL-01', 0);
    const actions = provideCodeActions('file:///ws/TOOLS.md', [diag], '# Content');
    expect(actions).toHaveLength(0);
  });

  it('fixTypeForDiagnostic maps all 6 codes correctly', () => {
    const mappings: [string, FixType][] = [
      ['CLAWS-D001', 'fix-risk-level'],
      ['CLAWS-D002', 'add-obo-declaration'],
      ['CLAWS-D003', 'add-deny-intent'],
      ['CLAWS-D005', 'add-elicitation'],
      ['CLAWS-D006', 'add-frontmatter'],
      ['CLAWS-D009', 'add-data-label'],
    ];

    for (const [code, expectedFix] of mappings) {
      const diag = makeDiag(code, 'test', 0);
      expect(fixTypeForDiagnostic(diag)).toBe(expectedFix);
    }

    // Unmapped codes return undefined
    expect(fixTypeForDiagnostic(makeDiag('CLAWS-D004', 'test', 0))).toBeUndefined();
    expect(fixTypeForDiagnostic(makeDiag('CLAWS-D007', 'test', 0))).toBeUndefined();
    expect(fixTypeForDiagnostic(makeDiag('CLAWS-D008', 'test', 0))).toBeUndefined();
    expect(fixTypeForDiagnostic(makeDiag('CLAWS-D010', 'test', 0))).toBeUndefined();
  });

  it('fixTypeForDiagnostic handles numeric code gracefully', () => {
    const diag: Diagnostic = {
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
      severity: 1,
      code: 42,
      source: 'claws',
      message: 'test',
    };
    expect(fixTypeForDiagnostic(diag)).toBeUndefined();
  });

  it('fixTypeForDiagnostic handles undefined code', () => {
    const diag: Diagnostic = {
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
      severity: 1,
      source: 'claws',
      message: 'test',
    };
    expect(fixTypeForDiagnostic(diag)).toBeUndefined();
  });

  it('provideCodeActions skips diagnostics with undefined edits', () => {
    // add-frontmatter returns undefined when content starts with ---
    const content = '---\ngovernance:\n---\n# Content';
    const diag = makeDiag('CLAWS-D006', 'test', 0);
    const actions = provideCodeActions('file:///ws/TOOLS.md', [diag], content);
    expect(actions).toHaveLength(0);
  });

  it('fix-risk-level handles missing tool name in message', () => {
    const edit = generateEdit(
      'fix-risk-level',
      makeDiag('CLAWS-D001', 'No tool name here', 0),
      '# Config\nfirst line',
    );
    expect(edit).toBeDefined();
    expect(edit!.newText).toContain('unknown');
  });

  it('add-obo-declaration handles missing tool name in message', () => {
    const edit = generateEdit(
      'add-obo-declaration',
      makeDiag('CLAWS-D002', 'No tool ref', 0),
      '# Config\nfirst line',
    );
    expect(edit).toBeDefined();
    expect(edit!.newText).toContain('unknown');
  });

  it('add-data-label handles missing label in message', () => {
    const edit = generateEdit(
      'add-data-label',
      makeDiag('CLAWS-D009', 'No label info', 0),
      '# Config\nfirst line',
    );
    expect(edit).toBeDefined();
    expect(edit!.newText).toContain('key=value');
  });

  it('add-deny-intent handles missing reason in message', () => {
    const edit = generateEdit(
      'add-deny-intent',
      makeDiag('CLAWS-D003', 'No deny info', 0),
      '# Config\nfirst line',
    );
    expect(edit).toBeDefined();
    expect(edit!.newText).toContain('policy violation');
  });

  it('fix-risk-level handles out-of-range line index gracefully', () => {
    const edit = generateEdit(
      'fix-risk-level',
      makeDiag('CLAWS-D001', 'Tool "test-tool" has high risk level', 99),
      'single line',
    );
    expect(edit).toBeDefined();
    expect(edit!.range.start.line).toBe(99);
    // targetLine falls back to '' since line 99 doesn't exist
    expect(edit!.newText).toContain('claws:risk-level');
  });

  it('add-elicitation handles out-of-range line index gracefully', () => {
    const edit = generateEdit(
      'add-elicitation',
      makeDiag('CLAWS-D005', 'Approval required: sec-review', 99),
      'single line',
    );
    expect(edit).toBeDefined();
    expect(edit!.newText).toContain('claws:elicitation-gate');
  });

  it('add-obo-declaration handles out-of-range line index gracefully', () => {
    const edit = generateEdit(
      'add-obo-declaration',
      makeDiag('CLAWS-D002', 'OBO conflict on tool "api": G-01 vs D-01', 99),
      'single line',
    );
    expect(edit).toBeDefined();
    expect(edit!.newText).toContain('claws:obo');
  });

  it('add-data-label handles out-of-range line index gracefully', () => {
    const edit = generateEdit(
      'add-data-label',
      makeDiag('CLAWS-D009', 'Label required: retention=90d', 99),
      'single line',
    );
    expect(edit).toBeDefined();
    expect(edit!.newText).toContain('claws:data-label');
  });

  it('add-deny-intent handles out-of-range line index gracefully', () => {
    const edit = generateEdit(
      'add-deny-intent',
      makeDiag('CLAWS-D003', 'Deny intent: blocked access', 99),
      'single line',
    );
    expect(edit).toBeDefined();
    expect(edit!.newText).toContain('claws:deny-intent');
  });

  it('add-elicitation strips "Approval required:" prefix', () => {
    const edit = generateEdit(
      'add-elicitation',
      makeDiag('CLAWS-D005', 'Approval required: manager-review', 0),
      'first line\nsecond line',
    );
    expect(edit).toBeDefined();
    expect(edit!.newText).toContain('manager-review');
    // Approval text should not have the prefix
    expect(edit!.newText).not.toContain('Approval required:');
  });

  it('add-elicitation keeps message when no prefix match', () => {
    const edit = generateEdit(
      'add-elicitation',
      makeDiag('CLAWS-D005', 'Custom approval message', 0),
      'first line\nsecond line',
    );
    expect(edit).toBeDefined();
    expect(edit!.newText).toContain('Custom approval message');
  });
});
