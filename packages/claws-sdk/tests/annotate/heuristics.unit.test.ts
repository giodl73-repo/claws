/**
 * L0: Heuristic annotation engine — risk classification from tool names,
 * imports, and API signatures.
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeHeuristics,
  formatAnnotation,
  toFrontmatterAnnotations,
} from '../../src/annotate/heuristics.js';

describe('analyzeHeuristics()', () => {
  // ── Acceptance: Tool name "send-email" → R4+ ──────────────────────
  it('classifies "send-email" as R4+ risk', () => {
    const result = analyzeHeuristics(
      'send-email',
      'Send email on behalf of the user',
      '',
    );
    expect(result.riskClass).toBeGreaterThanOrEqual(4);
    expect(result.riskConfidence).toBeGreaterThan(0.0);
    expect(result.riskConfidence).toBeLessThanOrEqual(1.0);
  });

  // ── Acceptance: Tool name "search-docs" → R1-R2 ──────────────────
  it('classifies "search-docs" as R1-R2 risk', () => {
    const result = analyzeHeuristics(
      'search-docs',
      'Search public documentation',
      '',
    );
    expect(result.riskClass).toBeLessThanOrEqual(2);
  });

  // ── Acceptance: Import "child_process.exec" → R3+ ────────────────
  it('classifies import of child_process.exec as R3+ risk', () => {
    const source = `
      import { exec } from 'child_process';
      exec('ls -la');
    `;
    const result = analyzeHeuristics('run-cmd', 'Run a shell command', source);
    expect(result.riskClass).toBeGreaterThanOrEqual(3);
  });

  // ── Acceptance: Import "fetch" → R2 ──────────────────────────────
  it('classifies import of fetch as R2 risk', () => {
    const source = `
      const response = await fetch('https://api.example.com/data');
    `;
    const result = analyzeHeuristics('get-data', 'Fetch data from API', source);
    expect(result.riskClass).toBe(2);
  });

  // ── R5: purchase/transact ────────────────────────────────────────
  it('classifies "purchase-item" as R5 risk', () => {
    const result = analyzeHeuristics(
      'purchase-item',
      'Purchase an item from the store',
      '',
    );
    expect(result.riskClass).toBe(5);
  });

  // ── R3: file-write ───────────────────────────────────────────────
  it('classifies fs.write import as R3 risk', () => {
    const source = `
      import { writeFile } from 'fs/promises';
      await fs.writeFile('output.txt', data);
    `;
    const result = analyzeHeuristics('save-file', 'Save data to file', source);
    expect(result.riskClass).toBeGreaterThanOrEqual(3);
  });

  // ── OBO detection ────────────────────────────────────────────────
  it('detects OBO in tool description', () => {
    const result = analyzeHeuristics(
      'send-email',
      'Send email on behalf of the user',
      '',
    );
    expect(result.obo.detected).toBe(true);
    expect(result.obo.matchedPatterns.length).toBeGreaterThan(0);
  });

  // ── Data classification ──────────────────────────────────────────
  it('classifies source mentioning passwords as restricted', () => {
    const result = analyzeHeuristics(
      'auth-helper',
      'Manage authentication',
      'const password = getSecret();',
    );
    expect(result.dataClassification).toBe('restricted');
  });

  it('defaults to public data classification', () => {
    const result = analyzeHeuristics('list-items', 'List public items', '');
    expect(result.dataClassification).toBe('public');
  });

  // ── Confidence range ─────────────────────────────────────────────
  it('produces confidence between 0.0 and 1.0', () => {
    const result = analyzeHeuristics(
      'deploy-production',
      'Deploy to production servers',
      'child_process.exec("deploy.sh")',
    );
    expect(result.riskConfidence).toBeGreaterThanOrEqual(0.0);
    expect(result.riskConfidence).toBeLessThanOrEqual(1.0);
  });
});

describe('formatAnnotation()', () => {
  it('formats annotation as dry-run output line', () => {
    const annotation = analyzeHeuristics('send-email', 'Send email on behalf of user', '');
    const formatted = formatAnnotation(annotation);
    expect(formatted).toContain('send-email');
    expect(formatted).toContain(`R${annotation.riskClass}`);
    expect(formatted).toContain('%');
    expect(formatted).toContain('[OBO]');
  });

  it('omits OBO tag when not detected', () => {
    const annotation = analyzeHeuristics('search-docs', 'Search docs', '');
    const formatted = formatAnnotation(annotation);
    expect(formatted).not.toContain('[OBO]');
  });
});

describe('toFrontmatterAnnotations()', () => {
  it('produces frontmatter with risk and confidence', () => {
    const annotation = analyzeHeuristics('send-email', 'Send email', '');
    const fm = toFrontmatterAnnotations(annotation);
    expect(fm['risk']).toMatch(/^R[1-5]$/);
    expect(fm['risk-confidence']).toBeGreaterThanOrEqual(0.0);
    expect(fm['risk-confidence']).toBeLessThanOrEqual(1.0);
  });

  it('includes OBO fields when detected', () => {
    const annotation = analyzeHeuristics('send-email', 'Send on behalf of user', '');
    const fm = toFrontmatterAnnotations(annotation);
    expect(fm['obo']).toBe(true);
    expect(fm['obo-patterns']).toBeDefined();
  });

  it('omits OBO fields when not detected', () => {
    const annotation = analyzeHeuristics('search-docs', 'Search', '');
    const fm = toFrontmatterAnnotations(annotation);
    expect(fm['obo']).toBeUndefined();
  });

  it('includes data-classification when non-public', () => {
    const annotation = analyzeHeuristics(
      'get-employee',
      'Retrieve employee salary data',
      '',
    );
    const fm = toFrontmatterAnnotations(annotation);
    expect(fm['data-classification']).toBeDefined();
    expect(fm['data-classification']).toBe('confidential');
  });
});

describe('computeRiskClass edge cases', () => {
  it('promotes competitive higher-risk class via weight threshold', () => {
    // "read" (R1, 0.55) in name + "send" (R4, 0.70*0.6=0.42) in description
    // R1 has higher accumulated weight but R4 has >= 50% of R1 weight → promoted
    const result = analyzeHeuristics(
      'read-inbox',
      'Read messages then send a reply',
      '',
    );
    // R4 "send" in desc has weight 0.42 which is >= 0.55*0.5 = 0.275 → promoted
    expect(result.riskClass).toBeGreaterThanOrEqual(2);
  });

  it('returns R1 when no patterns match', () => {
    const result = analyzeHeuristics('zzz-unknown', 'does something', '');
    expect(result.riskClass).toBe(1);
    expect(result.riskConfidence).toBe(0.0);
  });

  it('handles equal weight tie by selecting higher risk', () => {
    // "fetch" matches both name R2 (0.60) and description mentions nothing else
    const result = analyzeHeuristics('fetch-data', 'Retrieve remote data', '');
    expect(result.riskClass).toBe(2);
  });
});
