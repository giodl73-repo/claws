/**
 * L0: SARIF 2.1.0 formatter structure and level mapping tests.
 */

import { describe, it, expect } from 'vitest';
import { renderCheckSarif } from '../../src/format/sarif.js';
import type { RenderableViolation, CheckResult } from '../../src/output/format-default.js';

function makeViolation(overrides: Partial<RenderableViolation> = {}): RenderableViolation {
  return {
    ruleId: 'G-CLASS-01',
    level: 4,
    message: 'Tool exceeds risk threshold',
    target: 'C:\\workspace\\TOOLS.md',
    diagnosticCode: 'CLAWS-G-G-CLASS-01',
    ...overrides,
  };
}

const WORKSPACE_ROOT = 'C:\\workspace';

describe('renderCheckSarif', () => {
  it('produces valid SARIF 2.1.0 structure for fixture violations', () => {
    const result: CheckResult = {
      violations: [
        makeViolation({ level: 5, ruleId: 'G-CRIT-01', target: 'C:\\workspace\\SOUL.md' }),
        makeViolation({ level: 4, ruleId: 'G-CLASS-01', target: 'C:\\workspace\\TOOLS.md' }),
        makeViolation({ level: 3, ruleId: 'G-WARN-01', target: 'C:\\workspace\\CLAUDE.md' }),
        makeViolation({ level: 2, ruleId: 'G-LOW-01', target: 'C:\\workspace\\README.md' }),
      ],
      durationMs: 150,
    };

    const json = renderCheckSarif(result, WORKSPACE_ROOT);
    const sarif = JSON.parse(json);

    // Top-level structure
    expect(sarif.version).toBe('2.1.0');
    expect(sarif.$schema).toContain('sarif-2.1.0');
    expect(sarif.runs).toHaveLength(1);

    const run = sarif.runs[0];

    // Tool driver
    expect(run.tool.driver.name).toBe('claws');
    expect(run.tool.driver.rules).toHaveLength(4);

    // Results count
    expect(run.results).toHaveLength(4);

    // No backslashes in any URI field (R1 review PE-M01)
    const jsonString = JSON.stringify(sarif);
    const uriPattern = /"uri"\s*:\s*"([^"]*)"/g;
    let match;
    while ((match = uriPattern.exec(jsonString)) !== null) {
      expect(match[1]).not.toContain('\\');
    }
  });

  it('deduplicates rules when multiple violations share the same ruleId', () => {
    const result: CheckResult = {
      violations: [
        makeViolation({ ruleId: 'G-CLASS-01', target: 'C:\\workspace\\TOOLS.md' }),
        makeViolation({ ruleId: 'G-CLASS-01', target: 'C:\\workspace\\AGENTS.md' }),
        makeViolation({ ruleId: 'G-WARN-01', level: 3, target: 'C:\\workspace\\SOUL.md' }),
      ],
      durationMs: 50,
    };

    const json = renderCheckSarif(result, WORKSPACE_ROOT);
    const sarif = JSON.parse(json);

    // 3 results but only 2 unique rules
    expect(sarif.runs[0].results).toHaveLength(3);
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(2);
  });

  it('handles empty violations array', () => {
    const result: CheckResult = { violations: [], durationMs: 0 };
    const json = renderCheckSarif(result, WORKSPACE_ROOT);
    const sarif = JSON.parse(json);

    expect(sarif.runs[0].results).toHaveLength(0);
    expect(sarif.runs[0].tool.driver.rules).toHaveLength(0);
  });

  it('maps severity levels to correct SARIF levels', () => {
    const result: CheckResult = {
      violations: [
        makeViolation({ level: 5, ruleId: 'R-CRIT' }),
        makeViolation({ level: 4, ruleId: 'R-HIGH' }),
        makeViolation({ level: 3, ruleId: 'R-MED' }),
        makeViolation({ level: 2, ruleId: 'R-LOW' }),
        makeViolation({ level: 1, ruleId: 'R-INFO' }),
      ],
      durationMs: 50,
    };

    const json = renderCheckSarif(result, WORKSPACE_ROOT);
    const sarif = JSON.parse(json);
    const levels = sarif.runs[0].results.map((r: { level: string }) => r.level);

    expect(levels[0]).toBe('error');   // critical (5)
    expect(levels[1]).toBe('error');   // high (4)
    expect(levels[2]).toBe('warning'); // medium (3)
    expect(levels[3]).toBe('note');    // low (2)
    expect(levels[4]).toBe('note');    // info (1)
  });
});
