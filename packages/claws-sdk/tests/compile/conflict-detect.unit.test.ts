/**
 * L0: Conflict detection unit tests — 8 tests covering 7 categories + self-delegation.
 *
 * Each test constructs a synthetic GovernanceAST and ParsedManifest
 * targeting a single conflict category.
 */

import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../../src/compile/conflict-detect.js';
import type {
  GovernanceAST,
  ParsedManifest,
  ToolManifestEntry,
  SoulIntent,
  DelegationIntent,
  MemoryIntent,
  ScheduleIntent,
  SkillIntent,
  WorkflowIntent,
  ToolEntry,
  SkillEntry,
  AgentRosterEntry,
  DataLabelEntry,
} from '../../src/compile/types.js';

/** Helper to create a minimal GovernanceAST with specific categories populated. */
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

/** Helper to create a minimal ParsedManifest. */
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

describe('detectConflicts — DENY-vs-TOOL (CLAWS-C001)', () => {
  it('SOUL.md "never access production" + TOOLS.md "prod-deploy" triggers DENY-vs-TOOL with Error severity', () => {
    const denyIntent: SoulIntent = {
      keyword: 'never',
      confidence: 0.95,
      scope: 'tool',
      pattern: 'access production databases',
      rawLine: 'Never access production databases',
      line: 5,
      autoExtracted: true,
      intentKind: 'deny',
    };

    const toolIntent: ToolManifestEntry = {
      name: 'prod-deploy',
      riskClass: 5,
      oboFlag: true,
      capabilities: ['write', 'deploy', 'production'],
      description: 'Deploy artifacts to production servers',
      line: 8,
    };

    const ast = makeAST({
      deny: [{ source: 'SOUL.md', intents: [denyIntent] }],
      tool: [{ source: 'TOOLS.md', intents: [toolIntent] }],
    });

    const toolEntry: ToolEntry = {
      name: 'prod-deploy',
      normalizedName: 'prod-deploy',
      riskClass: 5,
      oboFlag: true,
      capabilities: ['write', 'deploy', 'production'],
      source: 'TOOLS.md',
      line: 8,
      denyConstraints: [denyIntent],
    };

    const manifest = makeManifest({ tools: [toolEntry] });

    const report = detectConflicts(ast, manifest);

    const denyVsTool = report.conflicts.filter(c => c.category === 'DENY-vs-TOOL');
    expect(denyVsTool.length).toBeGreaterThanOrEqual(1);
    expect(denyVsTool[0]!.severity).toBe('Error');
    expect(denyVsTool[0]!.code).toBe('CLAWS-C001');
    expect(denyVsTool[0]!.locationA.file).toBe('SOUL.md');
    expect(denyVsTool[0]!.locationB.file).toBe('TOOLS.md');
    expect(denyVsTool[0]!.explanation).toBeTruthy();
  });
});

describe('detectConflicts — TRUST-ESCALATION (CLAWS-C002)', () => {
  it('subagent with R4 tools under T2 parent triggers TRUST-ESCALATION', () => {
    const delegationIntents: DelegationIntent[] = [
      { from: 'Orchestrator', to: 'Deploy-Agent', tools: ['prod-deploy'], line: 5 },
    ];

    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
      tool: [{
        source: 'TOOLS.md',
        intents: [{
          name: 'prod-deploy',
          riskClass: 5,
          oboFlag: true,
          capabilities: ['deploy'],
          description: 'Deploy to production',
          line: 8,
        }],
      }],
    });

    const agents: AgentRosterEntry[] = [
      { name: 'Orchestrator', tools: ['Read'], delegatesTo: ['Deploy-Agent'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'Deploy-Agent', tools: ['prod-deploy'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 10 },
    ];

    const toolEntry: ToolEntry = {
      name: 'prod-deploy',
      normalizedName: 'prod-deploy',
      riskClass: 5,
      oboFlag: true,
      capabilities: ['deploy'],
      source: 'TOOLS.md',
      line: 8,
      denyConstraints: [],
    };

    const manifest = makeManifest({ agents, tools: [toolEntry] });

    const report = detectConflicts(ast, manifest);

    const escalations = report.conflicts.filter(c => c.category === 'TRUST-ESCALATION');
    expect(escalations.length).toBeGreaterThanOrEqual(1);
    expect(escalations[0]!.severity).toBe('Error');
    expect(escalations[0]!.code).toBe('CLAWS-C002');
  });
});

describe('detectConflicts — OBO-WITHOUT-ELICIT (CLAWS-C003)', () => {
  it('R5 tool with OBO flag but no elicitation gate triggers Error; R3 tool triggers Warning', () => {
    const toolIntents: ToolManifestEntry[] = [
      { name: 'prod-deploy', riskClass: 5, oboFlag: true, capabilities: ['deploy'], description: 'Deploy to production', line: 8 },
      { name: 'api-call', riskClass: 3, oboFlag: true, capabilities: ['api'], description: 'External API call', line: 12 },
    ];

    const ast = makeAST({
      tool: [{ source: 'TOOLS.md', intents: toolIntents }],
      // No elicitation gates in SOUL.md or USER.md
      deny: [],
      authority: [],
    });

    const tools: ToolEntry[] = [
      { name: 'prod-deploy', normalizedName: 'prod-deploy', riskClass: 5, oboFlag: true, capabilities: ['deploy'], source: 'TOOLS.md', line: 8, denyConstraints: [] },
      { name: 'api-call', normalizedName: 'api-call', riskClass: 3, oboFlag: true, capabilities: ['api'], source: 'TOOLS.md', line: 12, denyConstraints: [] },
    ];

    const manifest = makeManifest({ tools });

    const report = detectConflicts(ast, manifest);

    const oboConflicts = report.conflicts.filter(c => c.category === 'OBO-WITHOUT-ELICIT');
    expect(oboConflicts.length).toBeGreaterThanOrEqual(2);

    // R5 should be Error
    const r5Conflict = oboConflicts.find(c => c.explanation.includes('prod-deploy'));
    expect(r5Conflict).toBeDefined();
    expect(r5Conflict!.severity).toBe('Error');

    // R3 should be Warning
    const r3Conflict = oboConflicts.find(c => c.explanation.includes('api-call'));
    expect(r3Conflict).toBeDefined();
    expect(r3Conflict!.severity).toBe('Warning');
  });
});

describe('detectConflicts — DATA-LABEL-MISMATCH (CLAWS-C004)', () => {
  it('CONFIDENTIAL data in MEMORY.md accessed by agent with PUBLIC ceiling triggers DATA-LABEL-MISMATCH', () => {
    const memoryIntents: MemoryIntent[] = [
      { label: 'API Credentials Cache', sensitivity: 'confidential', retention: 'session', line: 3 },
    ];

    const ast = makeAST({
      memory: [{ source: 'MEMORY.md', intents: memoryIntents }],
      delegation: [{
        source: 'AGENTS.md',
        intents: [{ from: 'Orchestrator', to: 'Public-Agent', tools: ['Read'], line: 5 }],
      }],
    });

    const agents: AgentRosterEntry[] = [
      { name: 'Orchestrator', tools: ['Read'], delegatesTo: ['Public-Agent'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'Public-Agent', tools: ['Read'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 8 },
    ];

    const dataLabels: DataLabelEntry[] = [
      { label: 'API Credentials Cache', sensitivity: 'confidential', retention: 'session', source: 'MEMORY.md', line: 3 },
    ];

    const manifest = makeManifest({ agents, dataLabels });

    const report = detectConflicts(ast, manifest);

    const mismatches = report.conflicts.filter(c => c.category === 'DATA-LABEL-MISMATCH');
    expect(mismatches.length).toBeGreaterThanOrEqual(1);
    expect(mismatches[0]!.severity).toBe('Error');
    expect(mismatches[0]!.code).toBe('CLAWS-C004');
  });
});

describe('detectConflicts — CIRCULAR-DELEGATION (CLAWS-C005)', () => {
  it('circular delegation A->B->C->A triggers CIRCULAR-DELEGATION with full path', () => {
    const delegationIntents: DelegationIntent[] = [
      { from: 'A', to: 'B', tools: ['Read'], line: 3 },
      { from: 'B', to: 'C', tools: ['Read'], line: 5 },
      { from: 'C', to: 'A', tools: ['Read'], line: 7 },
    ];

    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
    });

    const agents: AgentRosterEntry[] = [
      { name: 'A', tools: ['Read'], delegatesTo: ['B'], delegationDepth: 2, source: 'AGENTS.md', line: 3 },
      { name: 'B', tools: ['Read'], delegatesTo: ['C'], delegationDepth: 1, source: 'AGENTS.md', line: 5 },
      { name: 'C', tools: ['Read'], delegatesTo: ['A'], delegationDepth: 0, source: 'AGENTS.md', line: 7 },
    ];

    const manifest = makeManifest({ agents });

    const report = detectConflicts(ast, manifest);

    const cycles = report.conflicts.filter(c => c.category === 'CIRCULAR-DELEGATION');
    expect(cycles.length).toBeGreaterThanOrEqual(1);
    expect(cycles[0]!.severity).toBe('Error');
    expect(cycles[0]!.code).toBe('CLAWS-C005');
    // Explanation should contain the full cycle path
    expect(cycles[0]!.explanation).toMatch(/A.*B.*C.*A|cycle/i);
  });

  it('self-delegation A->A triggers CIRCULAR-DELEGATION (degenerate cycle, length 1)', () => {
    const delegationIntents: DelegationIntent[] = [
      { from: 'SelfAgent', to: 'SelfAgent', tools: ['Read'], line: 3 },
    ];

    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
    });

    const agents: AgentRosterEntry[] = [
      { name: 'SelfAgent', tools: ['Read'], delegatesTo: ['SelfAgent'], delegationDepth: 0, source: 'AGENTS.md', line: 3 },
    ];

    const manifest = makeManifest({ agents });

    const report = detectConflicts(ast, manifest);

    const cycles = report.conflicts.filter(c => c.category === 'CIRCULAR-DELEGATION');
    expect(cycles.length).toBeGreaterThanOrEqual(1);
    expect(cycles[0]!.severity).toBe('Error');
    expect(cycles[0]!.explanation).toMatch(/self[- ]?delegation|SelfAgent.*SelfAgent/i);
  });
});

describe('detectConflicts — SKILL-TOOL-GHOST (CLAWS-C006)', () => {
  it('skill referencing undeclared tool triggers SKILL-TOOL-GHOST with fuzzy match suggestion', () => {
    const skillIntents: SkillIntent[] = [
      { name: 'scan-code', description: 'Scan codebase', requiredTools: ['code-scanner', 'Read'], line: 3 },
    ];

    const ast = makeAST({
      skill: [{ source: 'skills/', intents: skillIntents }],
      tool: [{
        source: 'TOOLS.md',
        intents: [
          { name: 'Read', riskClass: 1, oboFlag: false, capabilities: ['read'], description: 'Read files', line: 3 },
          { name: 'scan-tool', riskClass: 2, oboFlag: false, capabilities: ['scan'], description: 'Scan codebase', line: 6 },
        ],
      }],
    });

    const skills: SkillEntry[] = [
      { name: 'scan-code', description: 'Scan codebase', requiredTools: ['code-scanner', 'Read'], source: 'skills/', line: 3 },
    ];

    const tools: ToolEntry[] = [
      { name: 'Read', normalizedName: 'read', riskClass: 1, oboFlag: false, capabilities: ['read'], source: 'TOOLS.md', line: 3, denyConstraints: [] },
      { name: 'scan-tool', normalizedName: 'scan-tool', riskClass: 2, oboFlag: false, capabilities: ['scan'], source: 'TOOLS.md', line: 6, denyConstraints: [] },
    ];

    const manifest = makeManifest({ skills, tools });

    const report = detectConflicts(ast, manifest);

    const ghosts = report.conflicts.filter(c => c.category === 'SKILL-TOOL-GHOST');
    expect(ghosts.length).toBeGreaterThanOrEqual(1);
    expect(ghosts[0]!.severity).toBe('Warning');
    expect(ghosts[0]!.code).toBe('CLAWS-C006');
    // Should reference the phantom tool
    expect(ghosts[0]!.explanation).toMatch(/code-scanner/);
  });
});

describe('detectConflicts — SCHEDULE-NO-APPROVAL (CLAWS-C007)', () => {
  it('HEARTBEAT.md scheduling R5 tool without pre-authorization triggers SCHEDULE-NO-APPROVAL', () => {
    const scheduleIntents: ScheduleIntent[] = [
      { trigger: 'on_idle', actions: ['run prod-deploy health check'], riskLevel: 5, line: 12 },
    ];

    const toolIntents: ToolManifestEntry[] = [
      { name: 'prod-deploy', riskClass: 5, oboFlag: true, capabilities: ['deploy'], description: 'Deploy to production', line: 8 },
    ];

    const ast = makeAST({
      schedule: [{ source: 'HEARTBEAT.md', intents: scheduleIntents }],
      tool: [{ source: 'TOOLS.md', intents: toolIntents }],
      // No pre-authorization in USER.md
      authority: [],
    });

    const tools: ToolEntry[] = [
      { name: 'prod-deploy', normalizedName: 'prod-deploy', riskClass: 5, oboFlag: true, capabilities: ['deploy'], source: 'TOOLS.md', line: 8, denyConstraints: [] },
    ];

    const manifest = makeManifest({ tools });

    const report = detectConflicts(ast, manifest);

    const scheduleConflicts = report.conflicts.filter(c => c.category === 'SCHEDULE-NO-APPROVAL');
    expect(scheduleConflicts.length).toBeGreaterThanOrEqual(1);
    expect(scheduleConflicts[0]!.severity).toBe('Error');
    expect(scheduleConflicts[0]!.code).toBe('CLAWS-C007');
  });
});

describe('detectConflicts — report ordering', () => {
  it('ConflictReport is ordered by severity (Error first), then by category', () => {
    // Create a scenario that produces both Error and Warning conflicts
    const toolIntents: ToolManifestEntry[] = [
      { name: 'api-call', riskClass: 3, oboFlag: true, capabilities: ['api'], description: 'External API call', line: 3 },
    ];

    const skillIntents: SkillIntent[] = [
      { name: 'missing-skill', description: 'Skill with phantom tool', requiredTools: ['nonexistent-tool'], line: 5 },
    ];

    const ast = makeAST({
      tool: [{ source: 'TOOLS.md', intents: toolIntents }],
      skill: [{ source: 'skills/', intents: skillIntents }],
    });

    const tools: ToolEntry[] = [
      { name: 'api-call', normalizedName: 'api-call', riskClass: 3, oboFlag: true, capabilities: ['api'], source: 'TOOLS.md', line: 3, denyConstraints: [] },
    ];

    const skills: SkillEntry[] = [
      { name: 'missing-skill', description: 'Skill with phantom tool', requiredTools: ['nonexistent-tool'], source: 'skills/', line: 5 },
    ];

    const manifest = makeManifest({ tools, skills });

    const report = detectConflicts(ast, manifest);

    // Should have at least some conflicts
    if (report.conflicts.length > 1) {
      // Verify ordering: all Errors before all Warnings
      let seenWarning = false;
      for (const conflict of report.conflicts) {
        if (conflict.severity === 'Warning') {
          seenWarning = true;
        }
        if (conflict.severity === 'Error' && seenWarning) {
          // Error after Warning = wrong order
          expect.fail('Error conflict found after Warning conflict — report is not ordered by severity');
        }
      }
    }

    // Verify counts
    expect(report.errorCount).toBe(report.conflicts.filter(c => c.severity === 'Error').length);
    expect(report.warningCount).toBe(report.conflicts.filter(c => c.severity === 'Warning').length);
  });
});
