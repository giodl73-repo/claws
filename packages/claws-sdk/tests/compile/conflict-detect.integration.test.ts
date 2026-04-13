/**
 * L1: Conflict detection integration tests — 3 tests covering multi-conflict
 * fixture, transitive data flow, and transitive schedule resolution.
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
  AuthorityIntent,
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

describe('multi-conflict fixture — all 7 conflict types', () => {
  it('produces ConflictReport with 7+ entries covering all categories', () => {
    // Build an AST that triggers all 7 conflict categories
    const denyIntents: SoulIntent[] = [
      { keyword: 'never', confidence: 0.95, scope: 'tool', pattern: 'access production databases', rawLine: 'Never access production databases', line: 5, autoExtracted: true, intentKind: 'deny' },
    ];

    const toolIntents: ToolManifestEntry[] = [
      { name: 'prod-deploy', riskClass: 5, oboFlag: true, capabilities: ['deploy', 'production'], description: 'Deploy artifacts to production servers', line: 8 },
      { name: 'db-query', riskClass: 4, oboFlag: false, capabilities: ['database', 'production', 'query'], description: 'Query production databases', line: 12 },
      { name: 'api-call', riskClass: 3, oboFlag: true, capabilities: ['api'], description: 'External API call', line: 16 },
      { name: 'Read', riskClass: 1, oboFlag: false, capabilities: ['read'], description: 'Read files', line: 3 },
      { name: 'scan-tool', riskClass: 2, oboFlag: false, capabilities: ['scan'], description: 'Scan codebase', line: 20 },
    ];

    const delegationIntents: DelegationIntent[] = [
      { from: 'Orchestrator', to: 'Deploy-Agent', tools: ['prod-deploy'], line: 5 },
      { from: 'Deploy-Agent', to: 'Orchestrator', tools: ['Read'], line: 10 },  // circular
      { from: 'Data-Agent', to: 'Data-Agent', tools: ['Read'], line: 15 },       // self-delegation
    ];

    const memoryIntents: MemoryIntent[] = [
      { label: 'API Credentials Cache', sensitivity: 'confidential', retention: 'session', line: 3 },
    ];

    const scheduleIntents: ScheduleIntent[] = [
      { trigger: 'on_idle', actions: ['run prod-deploy health check'], riskLevel: 5, line: 12 },
    ];

    const skillIntents: SkillIntent[] = [
      { name: 'scan-code', description: 'Scan codebase', requiredTools: ['code-scanner', 'Read'], line: 3 },
    ];

    const ast = makeAST({
      deny: [{ source: 'SOUL.md', intents: denyIntents }],
      tool: [{ source: 'TOOLS.md', intents: toolIntents }],
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
      memory: [{ source: 'MEMORY.md', intents: memoryIntents }],
      schedule: [{ source: 'HEARTBEAT.md', intents: scheduleIntents }],
      skill: [{ source: 'skills/', intents: skillIntents }],
      authority: [],
    });

    const tools: ToolEntry[] = [
      { name: 'prod-deploy', normalizedName: 'prod-deploy', riskClass: 5, oboFlag: true, capabilities: ['deploy', 'production'], source: 'TOOLS.md', line: 8, denyConstraints: [denyIntents[0]!] },
      { name: 'db-query', normalizedName: 'db-query', riskClass: 4, oboFlag: false, capabilities: ['database', 'production', 'query'], source: 'TOOLS.md', line: 12, denyConstraints: [] },
      { name: 'api-call', normalizedName: 'api-call', riskClass: 3, oboFlag: true, capabilities: ['api'], source: 'TOOLS.md', line: 16, denyConstraints: [] },
      { name: 'Read', normalizedName: 'read', riskClass: 1, oboFlag: false, capabilities: ['read'], source: 'TOOLS.md', line: 3, denyConstraints: [] },
      { name: 'scan-tool', normalizedName: 'scan-tool', riskClass: 2, oboFlag: false, capabilities: ['scan'], source: 'TOOLS.md', line: 20, denyConstraints: [] },
    ];

    const agents: AgentRosterEntry[] = [
      { name: 'Orchestrator', tools: ['Read'], delegatesTo: ['Deploy-Agent'], delegationDepth: 1, source: 'AGENTS.md', line: 3 },
      { name: 'Deploy-Agent', tools: ['prod-deploy'], delegatesTo: ['Orchestrator'], delegationDepth: 1, source: 'AGENTS.md', line: 8 },
      { name: 'Data-Agent', tools: ['Read'], delegatesTo: ['Data-Agent'], delegationDepth: 0, source: 'AGENTS.md', line: 13 },
    ];

    const skills: SkillEntry[] = [
      { name: 'scan-code', description: 'Scan codebase', requiredTools: ['code-scanner', 'Read'], source: 'skills/', line: 3 },
    ];

    const dataLabels: DataLabelEntry[] = [
      { label: 'API Credentials Cache', sensitivity: 'confidential', retention: 'session', source: 'MEMORY.md', line: 3 },
    ];

    const manifest = makeManifest({ tools, agents, skills, dataLabels });

    const report = detectConflicts(ast, manifest);

    // Should have at least 7 conflicts (one per category, some may have multiples)
    expect(report.conflicts.length).toBeGreaterThanOrEqual(7);

    // Verify all 7 categories are present
    const categories = new Set(report.conflicts.map(c => c.category));
    expect(categories.has('DENY-vs-TOOL')).toBe(true);
    expect(categories.has('TRUST-ESCALATION')).toBe(true);
    expect(categories.has('OBO-WITHOUT-ELICIT')).toBe(true);
    expect(categories.has('DATA-LABEL-MISMATCH')).toBe(true);
    expect(categories.has('CIRCULAR-DELEGATION')).toBe(true);
    expect(categories.has('SKILL-TOOL-GHOST')).toBe(true);
    expect(categories.has('SCHEDULE-NO-APPROVAL')).toBe(true);

    // Errors before Warnings
    let seenWarning = false;
    for (const conflict of report.conflicts) {
      if (conflict.severity === 'Warning') seenWarning = true;
      if (conflict.severity === 'Error' && seenWarning) {
        expect.fail('Error after Warning — report not sorted by severity');
      }
    }
  });
});

describe('transitive data flow through delegation graph', () => {
  it('A delegates to B delegates to C, C accesses CONFIDENTIAL, A has PUBLIC ceiling', () => {
    const delegationIntents: DelegationIntent[] = [
      { from: 'AgentA', to: 'AgentB', tools: ['Read'], line: 3 },
      { from: 'AgentB', to: 'AgentC', tools: ['Read'], line: 5 },
    ];

    const memoryIntents: MemoryIntent[] = [
      { label: 'Secret Keys', sensitivity: 'confidential', retention: 'permanent', line: 3 },
    ];

    const ast = makeAST({
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
      memory: [{ source: 'MEMORY.md', intents: memoryIntents }],
    });

    const agents: AgentRosterEntry[] = [
      { name: 'AgentA', tools: ['Read'], delegatesTo: ['AgentB'], delegationDepth: 2, source: 'AGENTS.md', line: 3 },
      { name: 'AgentB', tools: ['Read'], delegatesTo: ['AgentC'], delegationDepth: 1, source: 'AGENTS.md', line: 5 },
      { name: 'AgentC', tools: ['Read'], delegatesTo: [], delegationDepth: 0, source: 'AGENTS.md', line: 7 },
    ];

    const dataLabels: DataLabelEntry[] = [
      { label: 'Secret Keys', sensitivity: 'confidential', retention: 'permanent', source: 'MEMORY.md', line: 3 },
    ];

    const manifest = makeManifest({ agents, dataLabels });

    const report = detectConflicts(ast, manifest);

    // Should detect data label mismatch via transitive delegation
    const mismatches = report.conflicts.filter(c => c.category === 'DATA-LABEL-MISMATCH');
    expect(mismatches.length).toBeGreaterThanOrEqual(1);
  });
});

describe('transitive schedule resolution', () => {
  it('HEARTBEAT -> workflow -> tool -> R5, no pre-auth triggers SCHEDULE-NO-APPROVAL', () => {
    const scheduleIntents: ScheduleIntent[] = [
      { trigger: 'every_10m', actions: ['execute deploy-check workflow'], riskLevel: 3, line: 8 },
    ];

    const workflowIntents: WorkflowIntent[] = [{
      name: 'deploy-check',
      description: 'Verify deployment readiness',
      steps: [
        { name: 'scan', command: 'run security scan' },
        { name: 'deploy', command: 'execute prod-deploy' },
      ],
      dependencies: { deploy: ['scan'] },
    }];

    const toolIntents: ToolManifestEntry[] = [
      { name: 'prod-deploy', riskClass: 5, oboFlag: true, capabilities: ['deploy'], description: 'Deploy to production', line: 8 },
    ];

    const ast = makeAST({
      schedule: [{ source: 'HEARTBEAT.md', intents: scheduleIntents }],
      workflow: [{ source: 'lobster.yaml', intents: workflowIntents }],
      tool: [{ source: 'TOOLS.md', intents: toolIntents }],
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
  });
});
