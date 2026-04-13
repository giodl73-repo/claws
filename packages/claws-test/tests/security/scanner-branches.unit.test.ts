/**
 * L0: SecurityScanner — exercises uncovered branches in scan(), getLineNumber(), getCodeSnippet().
 */

import { describe, it, expect } from 'vitest';
import { scan, getLineNumber, getCodeSnippet } from '../../src/security/scanner.js';
import ts from 'typescript';

function makeSourceFile(code: string, fileName = 'test.ts') {
  return ts.createSourceFile(fileName, code, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
}

describe('scan()', () => {
  it('returns empty findings when sources array is empty', () => {
    const rule = { id: 'test-rule', category: 'test', check: () => [] };
    const result = scan([], [rule]);
    expect(result.findings).toHaveLength(0);
    expect(result.filesScanned).toBe(0);
    expect(result.rulesApplied).toBe(1);
  });

  it('returns empty findings when rules array is empty', () => {
    const result = scan([{ filePath: 'test.ts', content: 'const x = 1;' }], []);
    expect(result.findings).toHaveLength(0);
    expect(result.filesScanned).toBe(1);
    expect(result.rulesApplied).toBe(0);
  });

  it('aggregates findings from multiple files', () => {
    const rule = {
      id: 'always-find',
      category: 'test',
      check: (_sf: ts.SourceFile, filePath: string) => [
        { rule: 'always-find', severity: 'low' as const, file: filePath, line: 1, code: '', remediation: '' },
      ],
    };
    const result = scan(
      [
        { filePath: 'a.ts', content: 'const a = 1;' },
        { filePath: 'b.ts', content: 'const b = 2;' },
      ],
      [rule],
    );
    expect(result.findings).toHaveLength(2);
    expect(result.filesScanned).toBe(2);
    expect(result.findings[0]!.file).toBe('a.ts');
    expect(result.findings[1]!.file).toBe('b.ts');
  });

  it('aggregates findings from multiple rules on same file', () => {
    const rule1 = {
      id: 'rule-1',
      category: 'test',
      check: (_sf: ts.SourceFile, filePath: string) => [
        { rule: 'rule-1', severity: 'low' as const, file: filePath, line: 1, code: '', remediation: '' },
      ],
    };
    const rule2 = {
      id: 'rule-2',
      category: 'test',
      check: (_sf: ts.SourceFile, filePath: string) => [
        { rule: 'rule-2', severity: 'high' as const, file: filePath, line: 1, code: '', remediation: '' },
      ],
    };
    const result = scan([{ filePath: 'x.ts', content: 'const x = 1;' }], [rule1, rule2]);
    expect(result.findings).toHaveLength(2);
    expect(result.rulesApplied).toBe(2);
  });
});

describe('getLineNumber()', () => {
  it('returns 1-based line number for first line', () => {
    const sf = makeSourceFile('const x = 1;');
    const firstChild = sf.statements[0]!;
    expect(getLineNumber(sf, firstChild)).toBe(1);
  });

  it('returns correct line number for multi-line code', () => {
    const sf = makeSourceFile('const x = 1;\nconst y = 2;\nconst z = 3;');
    const thirdStatement = sf.statements[2]!;
    expect(getLineNumber(sf, thirdStatement)).toBe(3);
  });
});

describe('getCodeSnippet()', () => {
  it('returns full text when under maxLen', () => {
    const sf = makeSourceFile('const x = 1;');
    const node = sf.statements[0]!;
    expect(getCodeSnippet(sf, node)).toBe('const x = 1;');
  });

  it('truncates text when over maxLen', () => {
    const longCode = `const veryLongVariableName = "${'x'.repeat(100)}";`;
    const sf = makeSourceFile(longCode);
    const node = sf.statements[0]!;
    const snippet = getCodeSnippet(sf, node, 40);
    expect(snippet.length).toBe(43); // 40 + '...'
    expect(snippet).toMatch(/\.\.\.$/);
  });

  it('does not truncate when exactly at maxLen', () => {
    const code = 'x'.repeat(80);
    const sf = makeSourceFile(code);
    const node = sf.statements[0]!;
    const snippet = getCodeSnippet(sf, node, 80);
    expect(snippet).not.toContain('...');
  });
});
