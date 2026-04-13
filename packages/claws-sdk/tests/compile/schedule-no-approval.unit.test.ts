/**
 * L0: SCHEDULE-NO-APPROVAL conflict detector unit tests.
 *
 * Covers:
 * 1. R5 tool in schedule without pre-auth → Error
 * 2. R4 tool in schedule without pre-auth → Error
 * 3. R3 tool in schedule → skipped (below R4 threshold)
 * 4. Pre-authorized tool via USER.md authority → no conflict
 * 5. Transitive resolution: schedule → workflow → tool
 * 6. Perpetual denial: R5 tool with deny constraint → special explanation
 * 7. Direct tool reference in schedule action
 * 8. Pre-auth via risk class range in USER.md
 * 9. Pre-auth via exact risk class in USER.md
 * 10. Deduplication of resolved tools
 */

import { describe, it, expect } from 'vitest';
import { detectScheduleNoApproval } from '../../src/compile/conflicts/schedule-no-approval.js';
import type {
  GovernanceAST,
  ParsedManifest,
  ToolEntry,
  ScheduleIntent,
  AuthorityIntent,
  WorkflowIntent,
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

describe('detectScheduleNoApproval()', () => {
  it('R5 tool in schedule without pre-auth triggers Error', () => {
    const schedule: ScheduleIntent = {
      trigger: 'on_idle',
      actions: ['run prod-deploy health check'],
      riskLevel: 5,
      line: 12,
    };

    const tool: ToolEntry = {
      name: 'prod-deploy',
      normalizedName: 'prod-deploy',
      riskClass: 5,
      oboFlag: true,
      capabilities: ['deploy'],
      source: 'TOOLS.md',
      line: 8,
      denyConstraints: [],
    };

    const ast = makeAST({
      schedule: [{ source: 'HEARTBEAT.md', intents: [schedule] }],
    });

    const entries = detectScheduleNoApproval(ast, makeManifest({ tools: [tool] }));

    expect(entries).toHaveLength(1);
    expect(entries[0]!.category).toBe('SCHEDULE-NO-APPROVAL');
    expect(entries[0]!.code).toBe('CLAWS-C007');
    expect(entries[0]!.severity).toBe('Error');
    expect(entries[0]!.explanation).toContain('prod-deploy');
    expect(entries[0]!.explanation).toContain('without pre-authorization');
  });

  it('R4 tool in schedule without pre-auth triggers Error', () => {
    const schedule: ScheduleIntent = {
      trigger: 'every_5m',
      actions: ['call db-write to sync'],
      riskLevel: 4,
      line: 5,
    };

    const tool: ToolEntry = {
      name: 'db-write',
      normalizedName: 'db-write',
      riskClass: 4,
      oboFlag: false,
      capabilities: ['write'],
      source: 'TOOLS.md',
      line: 10,
      denyConstraints: [],
    };

    const ast = makeAST({
      schedule: [{ source: 'HEARTBEAT.md', intents: [schedule] }],
    });

    const entries = detectScheduleNoApproval(ast, makeManifest({ tools: [tool] }));

    expect(entries).toHaveLength(1);
    expect(entries[0]!.severity).toBe('Error');
  });

  it('R3 tool in schedule is skipped (below R4 threshold)', () => {
    const schedule: ScheduleIntent = {
      trigger: 'on_idle',
      actions: ['run api-call check'],
      riskLevel: 3,
      line: 5,
    };

    const tool: ToolEntry = {
      name: 'api-call',
      normalizedName: 'api-call',
      riskClass: 3,
      oboFlag: false,
      capabilities: ['api'],
      source: 'TOOLS.md',
      line: 3,
      denyConstraints: [],
    };

    const ast = makeAST({
      schedule: [{ source: 'HEARTBEAT.md', intents: [schedule] }],
    });

    const entries = detectScheduleNoApproval(ast, makeManifest({ tools: [tool] }));
    expect(entries).toHaveLength(0);
  });

  it('pre-authorized tool via USER.md authority bounds → no conflict', () => {
    const schedule: ScheduleIntent = {
      trigger: 'on_idle',
      actions: ['run prod-deploy health check'],
      riskLevel: 5,
      line: 12,
    };

    const tool: ToolEntry = {
      name: 'prod-deploy',
      normalizedName: 'prod-deploy',
      riskClass: 5,
      oboFlag: true,
      capabilities: ['deploy'],
      source: 'TOOLS.md',
      line: 8,
      denyConstraints: [],
    };

    const authority: AuthorityIntent = {
      role: 'admin',
      bounds: ['Authorize prod-deploy for scheduled tasks'],
      line: 3,
    };

    const ast = makeAST({
      schedule: [{ source: 'HEARTBEAT.md', intents: [schedule] }],
      authority: [{ source: 'USER.md', intents: [authority] }],
    });

    const entries = detectScheduleNoApproval(ast, makeManifest({ tools: [tool] }));
    expect(entries).toHaveLength(0);
  });

  it('pre-auth via risk class range in USER.md', () => {
    const schedule: ScheduleIntent = {
      trigger: 'on_idle',
      actions: ['run db-write check'],
      riskLevel: 4,
      line: 5,
    };

    const tool: ToolEntry = {
      name: 'db-write',
      normalizedName: 'db-write',
      riskClass: 4,
      oboFlag: false,
      capabilities: ['write'],
      source: 'TOOLS.md',
      line: 10,
      denyConstraints: [],
    };

    const authority: AuthorityIntent = {
      role: 'admin',
      bounds: ['Approve R1-R5 tool usage'],
      line: 3,
    };

    const ast = makeAST({
      schedule: [{ source: 'HEARTBEAT.md', intents: [schedule] }],
      authority: [{ source: 'USER.md', intents: [authority] }],
    });

    const entries = detectScheduleNoApproval(ast, makeManifest({ tools: [tool] }));
    expect(entries).toHaveLength(0);
  });

  it('pre-auth via exact risk class in USER.md', () => {
    const schedule: ScheduleIntent = {
      trigger: 'on_idle',
      actions: ['run db-write check'],
      riskLevel: 4,
      line: 5,
    };

    const tool: ToolEntry = {
      name: 'db-write',
      normalizedName: 'db-write',
      riskClass: 4,
      oboFlag: false,
      capabilities: ['write'],
      source: 'TOOLS.md',
      line: 10,
      denyConstraints: [],
    };

    const authority: AuthorityIntent = {
      role: 'admin',
      bounds: ['Approve R4 tool usage'],
      line: 3,
    };

    const ast = makeAST({
      schedule: [{ source: 'HEARTBEAT.md', intents: [schedule] }],
      authority: [{ source: 'USER.md', intents: [authority] }],
    });

    const entries = detectScheduleNoApproval(ast, makeManifest({ tools: [tool] }));
    expect(entries).toHaveLength(0);
  });

  it('transitive resolution: schedule → workflow → tool', () => {
    const schedule: ScheduleIntent = {
      trigger: 'on_idle',
      actions: ['run deploy-flow'],
      riskLevel: 5,
      line: 5,
    };

    const tool: ToolEntry = {
      name: 'prod-deploy',
      normalizedName: 'prod-deploy',
      riskClass: 5,
      oboFlag: true,
      capabilities: ['deploy'],
      source: 'TOOLS.md',
      line: 8,
      denyConstraints: [],
    };

    const workflow: WorkflowIntent = {
      name: 'deploy-flow',
      description: 'Deploy workflow',
      steps: [
        { name: 'build', command: 'npm run build' },
        { name: 'deploy', command: 'prod-deploy --target staging' },
      ],
      dependencies: {},
    };

    const ast = makeAST({
      schedule: [{ source: 'HEARTBEAT.md', intents: [schedule] }],
      workflow: [{ source: 'lobster.yaml', intents: [workflow] }],
    });

    const entries = detectScheduleNoApproval(ast, makeManifest({ tools: [tool] }));

    expect(entries).toHaveLength(1);
    expect(entries[0]!.explanation).toContain('prod-deploy');
    expect(entries[0]!.explanation).toContain('without pre-authorization');
  });

  it('perpetual denial: R5 tool with deny constraint → special explanation', () => {
    const schedule: ScheduleIntent = {
      trigger: 'on_idle',
      actions: ['run prod-deploy check'],
      riskLevel: 5,
      line: 5,
    };

    const denyIntent = {
      keyword: 'never' as const,
      confidence: 0.95,
      scope: 'tool' as const,
      pattern: 'deploy to production',
      rawLine: 'Never deploy to production',
      line: 3,
      autoExtracted: true,
      intentKind: 'deny' as const,
    };

    const tool: ToolEntry = {
      name: 'prod-deploy',
      normalizedName: 'prod-deploy',
      riskClass: 5,
      oboFlag: true,
      capabilities: ['deploy'],
      source: 'TOOLS.md',
      line: 8,
      denyConstraints: [denyIntent],
    };

    const ast = makeAST({
      schedule: [{ source: 'HEARTBEAT.md', intents: [schedule] }],
    });

    const entries = detectScheduleNoApproval(ast, makeManifest({ tools: [tool] }));

    expect(entries).toHaveLength(1);
    expect(entries[0]!.explanation).toContain('perpetual denial');
  });

  it('no conflict when schedule has no R4+ tool references', () => {
    const schedule: ScheduleIntent = {
      trigger: 'on_start',
      actions: ['check status'],
      riskLevel: 1,
      line: 3,
    };

    const tool: ToolEntry = {
      name: 'Read',
      normalizedName: 'read',
      riskClass: 1,
      oboFlag: false,
      capabilities: ['read'],
      source: 'TOOLS.md',
      line: 3,
      denyConstraints: [],
    };

    const ast = makeAST({
      schedule: [{ source: 'HEARTBEAT.md', intents: [schedule] }],
    });

    const entries = detectScheduleNoApproval(ast, makeManifest({ tools: [tool] }));
    expect(entries).toHaveLength(0);
  });

  it('no conflict when schedule is empty', () => {
    const ast = makeAST({ schedule: [] });
    const entries = detectScheduleNoApproval(ast, makeManifest());
    expect(entries).toHaveLength(0);
  });

  it('deduplicates resolved tools from overlapping matches', () => {
    const schedule: ScheduleIntent = {
      trigger: 'on_idle',
      // tool name appears twice in action text
      actions: ['run prod-deploy then verify prod-deploy'],
      riskLevel: 5,
      line: 5,
    };

    const tool: ToolEntry = {
      name: 'prod-deploy',
      normalizedName: 'prod-deploy',
      riskClass: 5,
      oboFlag: true,
      capabilities: ['deploy'],
      source: 'TOOLS.md',
      line: 8,
      denyConstraints: [],
    };

    const ast = makeAST({
      schedule: [{ source: 'HEARTBEAT.md', intents: [schedule] }],
    });

    const entries = detectScheduleNoApproval(ast, makeManifest({ tools: [tool] }));

    // Should be deduplicated to 1 entry
    expect(entries).toHaveLength(1);
  });
});
