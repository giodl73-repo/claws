import { describe, it, expect } from 'vitest';

import { renderReport } from '../src/ops/render-report.js';
import type { ComplianceReport } from '../src/ops/types.js';

const SAMPLE_REPORT: ComplianceReport = {
  snapshotId: 'sha256-abc',
  rubric: { id: 'soc2', version: '1.0', framework: 'SOC 2' },
  generatedAt: '2026-04-18T00:00:00.000Z',
  evaluatedWindow: { from: '2026-03-01', to: '2026-04-01' },
  results: [
    {
      requirementId: 'CC6.1',
      title: 'Logical access',
      status: 'pass',
      evidence: [{ type: 'oc_uri', ref: 'oc://policy/governance/rule/R1' }],
    },
    {
      requirementId: 'CC8.1',
      title: 'Change control',
      status: 'fail',
      evidence: [],
      gaps: ['delete-db missing IRREVERSIBLE_EXTERNAL'],
    },
  ],
  summary: { total: 2, pass: 1, fail: 1, partial: 0, na: 0 },
  signature: { algo: 'hmac-sha256', key_id: 'k1', value: 'a'.repeat(64) },
};

describe('renderReport — format coverage', () => {
  it('markdown: renders compliance report with summary + per-requirement sections', () => {
    const md = renderReport({ kind: 'compliance', compliance: SAMPLE_REPORT }, 'markdown');
    expect(md).toContain('# Compliance Report — SOC 2');
    expect(md).toContain('**Summary** — 1/2 pass');
    expect(md).toContain('CC6.1 — Logical access');
    expect(md).toContain('delete-db missing IRREVERSIBLE_EXTERNAL');
  });

  it('html: escapes special characters and wraps body in html/body tags', () => {
    const html = renderReport({ kind: 'compliance', compliance: SAMPLE_REPORT }, 'html');
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<h1>');
    expect(html).toContain('<h3>');
    const tricky: ComplianceReport = { ...SAMPLE_REPORT, rubric: { ...SAMPLE_REPORT.rubric, framework: 'A&B<C>' } };
    const escaped = renderReport({ kind: 'compliance', compliance: tricky }, 'html');
    expect(escaped).toContain('A&amp;B&lt;C&gt;');
  });

  it('json: returns JSON containing the full payload', () => {
    const json = renderReport({ kind: 'compliance', compliance: SAMPLE_REPORT }, 'json');
    const parsed = JSON.parse(json) as { compliance: ComplianceReport };
    expect(parsed.compliance.snapshotId).toBe('sha256-abc');
    expect(parsed.compliance.results).toHaveLength(2);
  });

  it('pdf: returns a syntactically valid PDF-1.4 document with EOF marker', () => {
    const pdf = renderReport({ kind: 'compliance', compliance: SAMPLE_REPORT }, 'pdf');
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('%%EOF');
    expect(pdf).toContain('/Font');
  });

  it('audit: markdown shows OK or tamper-at details', () => {
    const ok = renderReport({ kind: 'audit', audit: { valid: true, length: 5 } }, 'markdown');
    expect(ok).toContain('**Status**: OK');
    const bad = renderReport(
      { kind: 'audit', audit: { valid: false, length: 3, brokenAt: 'event-id-xyz' } },
      'markdown',
    );
    expect(bad).toContain('TAMPERED');
    expect(bad).toContain('event-id-xyz');
  });

  it('diff: renders added/removed/modified lists', () => {
    const md = renderReport(
      {
        kind: 'diff',
        diff: { from: 'a', to: 'b', added: ['rule-1'], removed: [], modified: ['rule-2'] },
      },
      'markdown',
    );
    expect(md).toContain('**Added** (1): rule-1');
    expect(md).toContain('**Removed** (0): _none_');
    expect(md).toContain('**Modified** (1): rule-2');
  });

  it('markdown: missing payload for kind throws helpful error', () => {
    expect(() => renderReport({ kind: 'compliance' }, 'markdown')).toThrow(/missing payload/);
  });

  it('audit: html wraps markdown in <pre> block', () => {
    const html = renderReport({ kind: 'audit', audit: { valid: true, length: 1 } }, 'html');
    expect(html).toContain('<pre>');
    expect(html).toContain('Audit Chain Verification');
  });
});
