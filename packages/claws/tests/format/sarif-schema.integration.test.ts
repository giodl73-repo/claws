/**
 * L1: SARIF output validates against official SARIF 2.1.0 JSON schema.
 *
 * Instead of pulling the full JSON schema validator, we structurally
 * verify the output against the SARIF 2.1.0 required fields and shapes.
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

describe('SARIF 2.1.0 schema compliance', () => {
  it('contains all required top-level SARIF 2.1.0 fields', () => {
    const result: CheckResult = {
      violations: [
        makeViolation({ level: 4, ruleId: 'G-CLASS-01', target: 'C:\\workspace\\TOOLS.md' }),
        makeViolation({ level: 3, ruleId: 'G-PERM-03', target: 'C:\\workspace\\SOUL.md' }),
      ],
      durationMs: 120,
    };

    const json = renderCheckSarif(result, WORKSPACE_ROOT);
    const sarif = JSON.parse(json);

    // SARIF 2.1.0 required: version, $schema, runs
    expect(sarif).toHaveProperty('version', '2.1.0');
    expect(sarif).toHaveProperty('$schema');
    expect(sarif.$schema).toContain('sarif-2.1.0');
    expect(sarif).toHaveProperty('runs');
    expect(Array.isArray(sarif.runs)).toBe(true);
    expect(sarif.runs.length).toBeGreaterThanOrEqual(1);

    const run = sarif.runs[0];

    // Run must have tool and results
    expect(run).toHaveProperty('tool');
    expect(run).toHaveProperty('results');

    // Tool must have driver with name, rules
    expect(run.tool).toHaveProperty('driver');
    expect(run.tool.driver).toHaveProperty('name');
    expect(run.tool.driver).toHaveProperty('rules');
    expect(Array.isArray(run.tool.driver.rules)).toBe(true);

    // Each rule must have id, shortDescription
    for (const rule of run.tool.driver.rules) {
      expect(rule).toHaveProperty('id');
      expect(rule).toHaveProperty('shortDescription');
      expect(rule.shortDescription).toHaveProperty('text');
    }

    // Each result must have ruleId, level, message, locations
    for (const r of run.results) {
      expect(r).toHaveProperty('ruleId');
      expect(r).toHaveProperty('level');
      expect(['error', 'warning', 'note', 'none']).toContain(r.level);
      expect(r).toHaveProperty('message');
      expect(r.message).toHaveProperty('text');
      expect(r).toHaveProperty('locations');
      expect(Array.isArray(r.locations)).toBe(true);
      expect(r.locations.length).toBeGreaterThanOrEqual(1);

      // Location must have physicalLocation with artifactLocation
      const loc = r.locations[0];
      expect(loc).toHaveProperty('physicalLocation');
      expect(loc.physicalLocation).toHaveProperty('artifactLocation');
      expect(loc.physicalLocation.artifactLocation).toHaveProperty('uri');
    }
  });

  it('deduplicates rules when multiple violations share the same ruleId', () => {
    const result: CheckResult = {
      violations: [
        makeViolation({ level: 4, ruleId: 'G-CLASS-01', target: 'C:\\workspace\\TOOLS.md' }),
        makeViolation({ level: 4, ruleId: 'G-CLASS-01', target: 'C:\\workspace\\SOUL.md' }),
        makeViolation({ level: 3, ruleId: 'G-PERM-03', target: 'C:\\workspace\\CLAUDE.md' }),
      ],
      durationMs: 80,
    };

    const json = renderCheckSarif(result, WORKSPACE_ROOT);
    const sarif = JSON.parse(json);
    const run = sarif.runs[0];

    // 3 results but only 2 unique rules
    expect(run.results).toHaveLength(3);
    expect(run.tool.driver.rules).toHaveLength(2);

    const ruleIds = run.tool.driver.rules.map((r: { id: string }) => r.id);
    expect(ruleIds).toContain('G-CLASS-01');
    expect(ruleIds).toContain('G-PERM-03');
  });
});
