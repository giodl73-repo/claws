/**
 * L0: CSV formatter for fleet reports.
 */

import { describe, it, expect } from 'vitest';
import { renderCheckCsv } from '../../src/format/csv.js';
import type { RenderableViolation, CheckResult } from '../../src/output/format-default.js';

function makeViolation(overrides: Partial<RenderableViolation> = {}): RenderableViolation {
  return {
    ruleId: 'G-CLASS-01',
    level: 4,
    message: 'Tool exceeds risk threshold',
    target: 'TOOLS.md',
    diagnosticCode: 'CLAWS-G-G-CLASS-01',
    ...overrides,
  };
}

describe('renderCheckCsv', () => {
  it('produces a header row with correct columns', () => {
    const result: CheckResult = { violations: [], durationMs: 50 };
    const csv = renderCheckCsv(result);
    const lines = csv.split('\n');

    expect(lines[0]).toBe('file,line,severity,ruleId,message');
  });

  it('produces data rows that match violations', () => {
    const result: CheckResult = {
      violations: [
        makeViolation({ ruleId: 'G-CLASS-01', level: 4, target: 'TOOLS.md', message: 'Tool exceeds risk threshold' }),
        makeViolation({ ruleId: 'G-PERM-03', level: 3, target: 'SOUL.md', message: 'Missing elicit gate' }),
        makeViolation({ ruleId: 'G-LOW-01', level: 2, target: 'README.md', message: 'Minor style issue' }),
      ],
      durationMs: 100,
    };

    const csv = renderCheckCsv(result);
    const lines = csv.split('\n');

    // Header + 3 data rows
    expect(lines).toHaveLength(4);

    // First data row
    expect(lines[1]).toContain('TOOLS.md');
    expect(lines[1]).toContain('high');
    expect(lines[1]).toContain('G-CLASS-01');
    expect(lines[1]).toContain('Tool exceeds risk threshold');

    // Second data row
    expect(lines[2]).toContain('SOUL.md');
    expect(lines[2]).toContain('medium');
    expect(lines[2]).toContain('G-PERM-03');

    // Third data row
    expect(lines[3]).toContain('README.md');
    expect(lines[3]).toContain('low');
    expect(lines[3]).toContain('G-LOW-01');
  });

  it('handles violations with missing target and ruleId', () => {
    const result: CheckResult = {
      violations: [
        { level: 3, message: 'No target', diagnosticCode: 'DIAG-01' } as RenderableViolation,
        { level: 2, message: 'No ruleId or diag', target: 'FILE.md' } as RenderableViolation,
      ],
      durationMs: 10,
    };
    const csv = renderCheckCsv(result);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    // First row: empty target, falls back to diagnosticCode
    expect(lines[1]).toContain('DIAG-01');
    // Second row: has target, no ruleId/diagnosticCode
    expect(lines[2]).toContain('FILE.md');
  });

  it('escapes fields containing newlines', () => {
    const result: CheckResult = {
      violations: [
        makeViolation({ message: 'Line1\nLine2' }),
      ],
      durationMs: 5,
    };
    const csv = renderCheckCsv(result);
    expect(csv).toContain('"Line1\nLine2"');
  });

  it('escapes CSV fields containing commas and quotes', () => {
    const result: CheckResult = {
      violations: [
        makeViolation({
          message: 'Value contains, a comma',
          target: 'path/with "quotes".md',
          ruleId: 'G-SPECIAL',
        }),
      ],
      durationMs: 10,
    };

    const csv = renderCheckCsv(result);
    // Find the data portion (after header line)
    const dataSection = csv.substring(csv.indexOf('\n') + 1);
    expect(dataSection).toContain('"Value contains, a comma"');
    expect(dataSection).toContain('"path/with ""quotes"".md"');
  });
});
