/**
 * L0: format-json — JSON output mode for claws check --json.
 */

import { describe, it, expect } from 'vitest';
import { renderCheckJson } from '../../src/output/format-json.js';
import type { CheckResult, RenderableViolation } from '../../src/output/format-default.js';

function makeViolation(overrides: Partial<RenderableViolation> = {}): RenderableViolation {
  return {
    ruleId: 'G-CLASS-01',
    level: 4,
    message: 'Tool exceeds trust tier',
    target: 'file-write',
    diagnosticCode: 'CL-01',
    ...overrides,
  };
}

describe('renderCheckJson', () => {
  it('renders pass status when no violations', () => {
    const result: CheckResult = { violations: [], durationMs: 42 };
    const json = renderCheckJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.status).toBe('pass');
    expect(parsed.violations).toEqual([]);
    expect(parsed.summary.total).toBe(0);
    expect(parsed.summary.high).toBe(0);
    expect(parsed.summary.medium).toBe(0);
    expect(parsed.summary.low).toBe(0);
    expect(parsed.durationMs).toBe(42);
  });

  it('renders fail status with high severity violations (level >= 4)', () => {
    const result: CheckResult = {
      violations: [
        makeViolation({ level: 5, ruleId: 'G-CLASS-02', diagnosticCode: 'CL-02' }),
        makeViolation({ level: 4 }),
      ],
      durationMs: 100,
    };
    const json = renderCheckJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.status).toBe('fail');
    expect(parsed.summary.total).toBe(2);
    expect(parsed.summary.high).toBe(2);
    expect(parsed.summary.medium).toBe(0);
    expect(parsed.summary.low).toBe(0);
  });

  it('counts medium severity violations (level === 3)', () => {
    const result: CheckResult = {
      violations: [makeViolation({ level: 3 })],
      durationMs: 50,
    };
    const json = renderCheckJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.summary.medium).toBe(1);
    expect(parsed.summary.high).toBe(0);
    expect(parsed.summary.low).toBe(0);
  });

  it('counts low severity violations (level < 3)', () => {
    const result: CheckResult = {
      violations: [
        makeViolation({ level: 2 }),
        makeViolation({ level: 1 }),
      ],
      durationMs: 30,
    };
    const json = renderCheckJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.summary.low).toBe(2);
    expect(parsed.summary.high).toBe(0);
    expect(parsed.summary.medium).toBe(0);
  });

  it('counts mixed severity violations correctly', () => {
    const result: CheckResult = {
      violations: [
        makeViolation({ level: 5 }),
        makeViolation({ level: 4 }),
        makeViolation({ level: 3 }),
        makeViolation({ level: 2 }),
        makeViolation({ level: 1 }),
      ],
      durationMs: 200,
    };
    const json = renderCheckJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.summary.total).toBe(5);
    expect(parsed.summary.high).toBe(2);   // levels 5 and 4
    expect(parsed.summary.medium).toBe(1); // level 3
    expect(parsed.summary.low).toBe(2);    // levels 2 and 1
  });

  it('maps violation fields correctly in JSON output', () => {
    const result: CheckResult = {
      violations: [
        makeViolation({
          ruleId: 'G-PERM-03',
          level: 3,
          message: 'OBO tool without elicit gate',
          target: 'api-call',
          diagnosticCode: 'CL-PERM-03',
        }),
      ],
      durationMs: 75,
    };
    const json = renderCheckJson(result);
    const parsed = JSON.parse(json);

    const v = parsed.violations[0];
    expect(v.rule).toBe('G-PERM-03');
    expect(v.severity).toBe('medium');
    expect(v.level).toBe(3);
    expect(v.target).toBe('api-call');
    expect(v.message).toBe('OBO tool without elicit gate');
    expect(v.diagnosticCode).toBe('CL-PERM-03');
  });

  it('outputs valid pretty-printed JSON', () => {
    const result: CheckResult = { violations: [], durationMs: 10 };
    const json = renderCheckJson(result);

    // Should be indented (pretty-printed with 2 spaces)
    expect(json).toContain('\n');
    expect(json).toContain('  ');
    // Should parse without error
    expect(() => JSON.parse(json)).not.toThrow();
  });
});
