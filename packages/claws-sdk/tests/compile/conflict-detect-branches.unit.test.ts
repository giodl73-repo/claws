/**
 * L0: Branch coverage gaps in conflict-detect.ts — sortConflicts branches.
 *
 * Targets:
 * - Line 47/51: sortConflicts severity ternary branch where a.severity !== 'Error'
 *   (both are Warning, or a is Warning and b is Error).
 * - Line 51: CATEGORY_ORDER ?? 0 fallback (impossible with typed categories,
 *   but exercised via Warning-vs-Warning same severity path).
 */

import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../../src/compile/conflict-detect.js';
import type {
  GovernanceAST,
  ParsedManifest,
  ToolManifestEntry,
  SkillIntent,
  ToolEntry,
  SkillEntry,
  ScheduleIntent,
  DelegationIntent,
  AgentRosterEntry,
  SoulIntent,
} from '../../src/compile/types.js';

function makeAST(overrides: Partial<GovernanceAST> = {}): GovernanceAST {
  return {
    deny: [],
    tool: [],
    delegation: [],
    identity: [],
    authority: [],
    memory: [],
    schedule: [],
    skill: [],
    workflow: [],
    crossReferences: [],
    diagnostics: [],
    ...overrides,
  };
}

function makeManifest(overrides: Partial<ParsedManifest> = {}): ParsedManifest {
  return {
    tools: [],
    skills: [],
    agents: [],
    dataLabels: [],
    diagnostics: [],
    ...overrides,
  };
}

describe('sortConflicts — severity and category ordering branches', () => {
  it('Warning before Error in input still sorts Error first (a=Warning, b=Error branch)', () => {
    // Create a scenario where Warning-severity conflicts appear before Error-severity ones
    // in the raw detector output. The sort should reorder them.
    // OBO-WITHOUT-ELICIT R3 tool produces Warning, SCHEDULE-NO-APPROVAL R5 produces Error.
    const toolIntents: ToolManifestEntry[] = [
      { name: 'api-call', riskClass: 3, oboFlag: true, capabilities: ['api'], description: 'API call', line: 3 },
      { name: 'prod-deploy', riskClass: 5, oboFlag: true, capabilities: ['deploy'], description: 'Deploy', line: 8 },
    ];

    const scheduleIntents: ScheduleIntent[] = [
      { trigger: 'on_idle', actions: ['run prod-deploy check'], riskLevel: 5, line: 12 },
    ];

    const ast = makeAST({
      tool: [{ source: 'TOOLS.md', intents: toolIntents }],
      schedule: [{ source: 'HEARTBEAT.md', intents: scheduleIntents }],
      authority: [],
    });

    const tools: ToolEntry[] = [
      { name: 'api-call', normalizedName: 'api-call', riskClass: 3, oboFlag: true, capabilities: ['api'], source: 'TOOLS.md', line: 3, denyConstraints: [] },
      { name: 'prod-deploy', normalizedName: 'prod-deploy', riskClass: 5, oboFlag: true, capabilities: ['deploy'], source: 'TOOLS.md', line: 8, denyConstraints: [] },
    ];

    const manifest = makeManifest({ tools });
    const report = detectConflicts(ast, manifest);

    // Must have both Error and Warning conflicts
    const errors = report.conflicts.filter(c => c.severity === 'Error');
    const warnings = report.conflicts.filter(c => c.severity === 'Warning');
    expect(errors.length).toBeGreaterThan(0);
    expect(warnings.length).toBeGreaterThan(0);

    // Errors before Warnings
    const firstWarningIdx = report.conflicts.findIndex(c => c.severity === 'Warning');
    const lastErrorIdx = report.conflicts.map((c, i) => c.severity === 'Error' ? i : -1).filter(i => i >= 0).pop()!;
    expect(lastErrorIdx).toBeLessThan(firstWarningIdx);
  });

  it('multiple Warning-level conflicts sorted by category order', () => {
    // OBO-WITHOUT-ELICIT (Warning for R3) and SKILL-TOOL-GHOST (Warning) —
    // exercises the severityOrder === 0 branch and category ordering.
    const toolIntents: ToolManifestEntry[] = [
      { name: 'api-call', riskClass: 3, oboFlag: true, capabilities: ['api'], description: 'API call', line: 3 },
    ];

    const skillIntents: SkillIntent[] = [
      { name: 'phantom-skill', description: 'Uses unknown tool', requiredTools: ['ghost-tool'], line: 5 },
    ];

    const ast = makeAST({
      tool: [{ source: 'TOOLS.md', intents: toolIntents }],
      skill: [{ source: 'skills/', intents: skillIntents }],
    });

    const tools: ToolEntry[] = [
      { name: 'api-call', normalizedName: 'api-call', riskClass: 3, oboFlag: true, capabilities: ['api'], source: 'TOOLS.md', line: 3, denyConstraints: [] },
    ];

    const skills: SkillEntry[] = [
      { name: 'phantom-skill', description: 'Uses unknown tool', requiredTools: ['ghost-tool'], source: 'skills/', line: 5 },
    ];

    const manifest = makeManifest({ tools, skills });
    const report = detectConflicts(ast, manifest);

    const warnings = report.conflicts.filter(c => c.severity === 'Warning');
    expect(warnings.length).toBeGreaterThanOrEqual(2);

    // OBO-WITHOUT-ELICIT (index 3) should come before SKILL-TOOL-GHOST (index 5)
    const oboIdx = warnings.findIndex(c => c.category === 'OBO-WITHOUT-ELICIT');
    const ghostIdx = warnings.findIndex(c => c.category === 'SKILL-TOOL-GHOST');
    if (oboIdx >= 0 && ghostIdx >= 0) {
      expect(oboIdx).toBeLessThan(ghostIdx);
    }
  });

  it('empty input produces zero conflicts', () => {
    const ast = makeAST();
    const manifest = makeManifest();
    const report = detectConflicts(ast, manifest);

    expect(report.conflicts).toEqual([]);
    expect(report.errorCount).toBe(0);
    expect(report.warningCount).toBe(0);
  });
});
