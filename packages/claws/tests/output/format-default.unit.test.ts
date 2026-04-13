/**
 * L0: Human-readable colored output formatting.
 */

import { describe, it, expect } from 'vitest';
import { createPalette } from '../../src/output/color.js';
import {
  formatViolation,
  formatSummary,
  countBySeverity,
  renderCheckOutput,
} from '../../src/output/format-default.js';
import type { RenderableViolation, CheckResult } from '../../src/output/format-default.js';

const palette = createPalette(false); // no-color for predictable assertions

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

describe('format-default output', () => {
  describe('formatViolation', () => {
    it('includes severity label, diagnostic code, target, and message', () => {
      const v = makeViolation();
      const result = formatViolation(v, palette);
      expect(result).toContain('HIGH');
      expect(result).toContain('CLAWS-G-G-CLASS-01');
      expect(result).toContain('TOOLS.md');
      expect(result).toContain('Tool exceeds risk threshold');
    });

    it('renders medium as MEDIUM', () => {
      const v = makeViolation({ level: 3 });
      const result = formatViolation(v, palette);
      expect(result).toContain('MEDIUM');
    });

    it('renders low as LOW', () => {
      const v = makeViolation({ level: 2 });
      const result = formatViolation(v, palette);
      expect(result).toContain('LOW');
    });
  });

  describe('countBySeverity', () => {
    it('counts violations by severity bucket', () => {
      const violations = [
        makeViolation({ level: 5 }),
        makeViolation({ level: 4 }),
        makeViolation({ level: 3 }),
        makeViolation({ level: 2 }),
        makeViolation({ level: 1 }),
      ];
      const counts = countBySeverity(violations);
      expect(counts.high).toBe(2);    // 5+4
      expect(counts.medium).toBe(1);  // 3
      expect(counts.low).toBe(2);     // 2+1
    });

    it('returns zeros for empty list', () => {
      const counts = countBySeverity([]);
      expect(counts).toEqual({ high: 0, medium: 0, low: 0 });
    });
  });

  describe('formatSummary', () => {
    it('shows PASS for clean workspace', () => {
      const result: CheckResult = { violations: [], durationMs: 300 };
      const summary = formatSummary(result, palette);
      expect(summary).toContain('PASS');
      expect(summary).toContain('No violations');
      expect(summary).toContain('0.3s');
    });

    it('shows FAIL with breakdown for violations', () => {
      const result: CheckResult = {
        violations: [
          makeViolation({ level: 4 }),
          makeViolation({ level: 3 }),
          makeViolation({ level: 2 }),
        ],
        durationMs: 500,
      };
      const summary = formatSummary(result, palette);
      expect(summary).toContain('FAIL');
      expect(summary).toContain('3 violation(s)');
      expect(summary).toContain('1 high');
      expect(summary).toContain('1 medium');
      expect(summary).toContain('1 low');
      expect(summary).toContain('0.5s');
    });
  });

  describe('renderCheckOutput', () => {
    it('renders violations followed by summary', () => {
      const result: CheckResult = {
        violations: [makeViolation({ level: 4 }), makeViolation({ level: 3 })],
        durationMs: 250,
      };
      const output = renderCheckOutput(result, palette);
      expect(output).toContain('HIGH');
      expect(output).toContain('MEDIUM');
      expect(output).toContain('FAIL');
      expect(output).toContain('2 violation(s)');
    });

    it('renders summary only for clean workspace', () => {
      const result: CheckResult = { violations: [], durationMs: 100 };
      const output = renderCheckOutput(result, palette);
      expect(output).toContain('PASS');
      expect(output).not.toContain('FAIL');
    });
  });
});
