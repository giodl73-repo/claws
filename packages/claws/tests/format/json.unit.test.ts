/**
 * L0: JSON formatter with what/fix/docsUrl fields.
 */

import { describe, it, expect } from 'vitest';
import { renderFormattedJson } from '../../src/format/json.js';
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

describe('renderFormattedJson', () => {
  it('includes what, fix, and docsUrl for every violation', () => {
    const result: CheckResult = {
      violations: [
        makeViolation({ ruleId: 'G-CLASS-01', level: 4 }),
        makeViolation({ ruleId: 'G-PERM-03', level: 3 }),
      ],
      durationMs: 100,
    };

    const json = renderFormattedJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.violations).toHaveLength(2);
    for (const v of parsed.violations) {
      expect(v).toHaveProperty('what');
      expect(v).toHaveProperty('fix');
      expect(v).toHaveProperty('docsUrl');
      expect(typeof v.what).toBe('string');
      expect(typeof v.fix).toBe('string');
      expect(typeof v.docsUrl).toBe('string');
      expect(v.what.length).toBeGreaterThan(0);
      expect(v.fix.length).toBeGreaterThan(0);
      expect(v.docsUrl).toContain('https://claws.dev/rules/');
    }
  });

  it('produces correct array structure with status and summary', () => {
    const result: CheckResult = {
      violations: [
        makeViolation({ level: 5, ruleId: 'G-CRIT-01' }),
        makeViolation({ level: 3, ruleId: 'G-WARN-01' }),
        makeViolation({ level: 2, ruleId: 'G-LOW-01' }),
      ],
      durationMs: 200,
    };

    const json = renderFormattedJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.status).toBe('fail');
    expect(parsed.violations).toBeInstanceOf(Array);
    expect(parsed.summary.total).toBe(3);
    expect(parsed.summary.high).toBe(1);
    expect(parsed.summary.medium).toBe(1);
    expect(parsed.summary.low).toBe(1);
    expect(parsed.durationMs).toBe(200);

    // Pass case
    const passResult: CheckResult = { violations: [], durationMs: 10 };
    const passJson = renderFormattedJson(passResult);
    const passParsed = JSON.parse(passJson);
    expect(passParsed.status).toBe('pass');
    expect(passParsed.violations).toEqual([]);
  });

  it('falls back to diagnosticCode when ruleId is missing', () => {
    const result: CheckResult = {
      violations: [
        { level: 3, message: 'Missing rule', diagnosticCode: 'DIAG-01', target: 'X.md' } as RenderableViolation,
      ],
      durationMs: 5,
    };
    const parsed = JSON.parse(renderFormattedJson(result));
    expect(parsed.violations[0].ruleId).toBe('DIAG-01');
    expect(parsed.violations[0].docsUrl).toContain('diag-01');
  });

  it('falls back to empty/unknown when both ruleId and target are missing', () => {
    const result: CheckResult = {
      violations: [
        { level: 2, message: 'Bare violation' } as RenderableViolation,
      ],
      durationMs: 5,
    };
    const parsed = JSON.parse(renderFormattedJson(result));
    expect(parsed.violations[0].ruleId).toBe('unknown');
    expect(parsed.violations[0].target).toBe('');
    expect(parsed.violations[0].fix).toContain('workspace');
  });
});
