/**
 * L0: Terminal formatter with colored severity indicators.
 */

import { describe, it, expect } from 'vitest';
import { createPalette } from '../../src/output/color.js';
import { renderTerminalOutput } from '../../src/format/default.js';
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

describe('renderTerminalOutput', () => {
  it('includes severity prefix labels in output', () => {
    const noColorPalette = createPalette(false);
    const result: CheckResult = {
      violations: [
        makeViolation({ level: 5 }),
        makeViolation({ level: 4 }),
        makeViolation({ level: 3 }),
        makeViolation({ level: 2 }),
      ],
      durationMs: 100,
    };

    const output = renderTerminalOutput(result, noColorPalette);

    expect(output).toContain('CRITICAL');
    expect(output).toContain('HIGH');
    expect(output).toContain('MEDIUM');
    expect(output).toContain('LOW');
    expect(output).toContain('FAIL');
  });

  it('includes ANSI color codes when color is enabled', () => {
    const colorPalette = createPalette(true);
    const result: CheckResult = {
      violations: [
        makeViolation({ level: 4 }),
      ],
      durationMs: 50,
    };

    const output = renderTerminalOutput(result, colorPalette);

    // ANSI escape codes should be present
    expect(output).toContain('\x1b[');
  });

  it('renders PASS summary when there are no violations', () => {
    const noColorPalette = createPalette(false);
    const result: CheckResult = {
      violations: [],
      durationMs: 250,
    };

    const output = renderTerminalOutput(result, noColorPalette);
    expect(output).toContain('PASS');
    expect(output).toContain('No violations');
    expect(output).toContain('0.3s');
    expect(output).not.toContain('FAIL');
  });

  it('renders violation with empty target (no target suffix)', () => {
    const noColorPalette = createPalette(false);
    const result: CheckResult = {
      violations: [
        makeViolation({ level: 3, target: '' }),
      ],
      durationMs: 75,
    };

    const output = renderTerminalOutput(result, noColorPalette);
    expect(output).toContain('MEDIUM');
    expect(output).toContain('FAIL');
    // Should not have double spaces from empty target
    expect(output).not.toContain('  TOOLS.md');
  });

  it('renders without palette argument (uses default palette)', () => {
    const result: CheckResult = {
      violations: [makeViolation({ level: 3 })],
      durationMs: 100,
    };

    // Call without palette — exercises default parameter branch
    const output = renderTerminalOutput(result);
    expect(output).toContain('MEDIUM');
    expect(output).toContain('FAIL');
  });
});
