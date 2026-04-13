/**
 * L1: SecurityScanner integration — full scan on fixture handlers.
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { scan, getAllRules } from '../../src/security/scanner.js';

const FIXTURES_DIR = join(__dirname, '..', 'fixtures');

describe('SecurityScanner integration', () => {
  it('scan() on clean skill fixture produces ZERO findings', async () => {
    const content = await readFile(join(FIXTURES_DIR, 'clean-skill', 'handler.ts'), 'utf-8');
    const rules = getAllRules();
    const result = scan([{ filePath: 'clean-skill/handler.ts', content }], rules);

    expect(result.findings).toHaveLength(0);
    expect(result.filesScanned).toBe(1);
    expect(result.rulesApplied).toBe(16);
  });

  it('scan() on vulnerable skill fixture produces findings across all 4 categories', async () => {
    const content = await readFile(join(FIXTURES_DIR, 'vulnerable-skill', 'handler.ts'), 'utf-8');
    const rules = getAllRules();
    const result = scan([{ filePath: 'vulnerable-skill/handler.ts', content }], rules);

    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.filesScanned).toBe(1);
    expect(result.rulesApplied).toBe(16);

    // Verify findings span all 4 categories
    const categories = new Set(result.findings.map(f => {
      const rule = rules.find(r => r.id === f.rule);
      return rule?.category;
    }));
    expect(categories.has('injection')).toBe(true);
    expect(categories.has('secrets')).toBe(true);
    expect(categories.has('input')).toBe(true);
    expect(categories.has('output')).toBe(true);

    // Verify correct severities are present
    const severities = new Set(result.findings.map(f => f.severity));
    expect(severities.has('critical')).toBe(true);  // eval, Function
    expect(severities.has('high')).toBe(true);       // API keys, tokens, etc.
    expect(severities.has('medium')).toBe(true);     // credentials, env leaks

    // Every finding has remediation
    for (const finding of result.findings) {
      expect(finding.remediation.length).toBeGreaterThan(0);
      expect(finding.file).toBe('vulnerable-skill/handler.ts');
      expect(finding.line).toBeGreaterThan(0);
    }
  });
});
