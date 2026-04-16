/**
 * L1: Multi-file workspace compile with cross-file conflict detection.
 *
 * Exercises the compile area integration gap (73% -> 90%) from
 * THOTH-INTEGRATION-COVERAGE analysis.
 *
 * Creates a multi-file workspace with intentional cross-file conflicts
 * and verifies the full detect pipeline catches them all.
 */

import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../../src/compile/conflict-detect.js';
import { extract } from '../../src/compile/extract.js';
import type {
  GovernanceAST,
  ParsedManifest,
  ToolManifestEntry,
  SoulIntent,
  DelegationIntent,
  MemoryIntent,
  ScheduleIntent,
  SkillIntent,
  ToolEntry,
  SkillEntry,
  AgentRosterEntry,
  DataLabelEntry,
} from '../../src/compile/types.js';

// ── Helpers ────────────────────────────────────────────────────────────

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

// ── Tests ──────────────────────────────────────────────────────────────

describe('multi-file workspace compile — cross-file conflict detection', () => {
  it('detects DENY-vs-TOOL + TRUST-ESCALATION + OBO-WITHOUT-ELICIT in a multi-file workspace', () => {
    // SOUL.md: deny production database access
    const denyIntents: SoulIntent[] = [
      {
        keyword: 'never',
        confidence: 0.95,
        scope: 'tool',
        pattern: 'production database',
        rawLine: 'Never access production databases',
        line: 5,
        autoExtracted: true,
        intentKind: 'deny',
      },
    ];

    // TOOLS.md: declares prod-deploy (R5, OBO) and db-query (R4)
    const toolIntents: ToolManifestEntry[] = [
      {
        name: 'prod-deploy',
        riskClass: 5,
        oboFlag: true,
        capabilities: ['deploy', 'production'],
        description: 'Deploy to production servers',
        line: 3,
      },
      {
        name: 'db-query',
        riskClass: 4,
        oboFlag: false,
        capabilities: ['database', 'production', 'query'],
        description: 'Query production databases',
        line: 7,
      },
      {
        name: 'Read',
        riskClass: 1,
        oboFlag: false,
        capabilities: ['read'],
        description: 'Read files',
        line: 11,
      },
    ];

    // AGENTS.md: Orchestrator (T2) delegates to Deploy-Agent with R5 tool
    const delegationIntents: DelegationIntent[] = [
      { from: 'Orchestrator', to: 'Deploy-Agent', tools: ['prod-deploy'], line: 3 },
    ];

    const ast = makeAST({
      deny: [{ source: 'SOUL.md', intents: denyIntents }],
      tool: [{ source: 'TOOLS.md', intents: toolIntents }],
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
      authority: [],
    });

    const tools: ToolEntry[] = [
      {
        name: 'prod-deploy',
        normalizedName: 'prod-deploy',
        riskClass: 5,
        oboFlag: true,
        capabilities: ['deploy', 'production'],
        source: 'TOOLS.md',
        line: 3,
        denyConstraints: [],
      },
      {
        name: 'db-query',
        normalizedName: 'db-query',
        riskClass: 4,
        oboFlag: false,
        capabilities: ['database', 'production', 'query'],
        source: 'TOOLS.md',
        line: 7,
        denyConstraints: [denyIntents[0]!],
      },
      {
        name: 'Read',
        normalizedName: 'read',
        riskClass: 1,
        oboFlag: false,
        capabilities: ['read'],
        source: 'TOOLS.md',
        line: 11,
        denyConstraints: [],
      },
    ];

    const agents: AgentRosterEntry[] = [
      {
        name: 'Orchestrator',
        tools: ['Read'],
        delegatesTo: ['Deploy-Agent'],
        delegationDepth: 1,
        source: 'AGENTS.md',
        line: 3,
      },
      {
        name: 'Deploy-Agent',
        tools: ['prod-deploy'],
        delegatesTo: [],
        delegationDepth: 0,
        source: 'AGENTS.md',
        line: 3,
      },
    ];

    const manifest = makeManifest({ tools, agents });

    const report = detectConflicts(ast, manifest);

    // Should detect at least:
    // 1. DENY-vs-TOOL: db-query denied by SOUL.md
    // 2. TRUST-ESCALATION: Deploy-Agent holds R5 under Orchestrator
    // 3. OBO-WITHOUT-ELICIT: prod-deploy is OBO without elicitation gate
    expect(report.conflicts.length).toBeGreaterThanOrEqual(3);

    const categories = new Set(report.conflicts.map(c => c.category));
    expect(categories.has('DENY-vs-TOOL')).toBe(true);
    expect(categories.has('TRUST-ESCALATION')).toBe(true);
    expect(categories.has('OBO-WITHOUT-ELICIT')).toBe(true);
  });

  it('detect pipeline runs extract() + detectConflicts() end-to-end', () => {
    // Build a GovernanceAST that exercises the extract() -> manifest -> detectConflicts() path
    const denyIntents: SoulIntent[] = [
      {
        keyword: 'never',
        confidence: 0.95,
        scope: 'tool',
        pattern: 'email sending',
        rawLine: 'Never send emails without approval',
        line: 2,
        autoExtracted: true,
        intentKind: 'deny',
      },
    ];

    const toolIntents: ToolManifestEntry[] = [
      {
        name: 'send-email',
        riskClass: 4,
        oboFlag: true,
        capabilities: ['email', 'send'],
        description: 'Send email on behalf of user',
        line: 3,
      },
      {
        name: 'Read',
        riskClass: 1,
        oboFlag: false,
        capabilities: ['read'],
        description: 'Read files',
        line: 7,
      },
    ];

    const delegationIntents: DelegationIntent[] = [
      { from: 'Manager', to: 'Email-Agent', tools: ['send-email'], line: 3 },
    ];

    const skillIntents: SkillIntent[] = [
      {
        name: 'draft-email',
        description: 'Draft and send emails',
        requiredTools: ['send-email', 'template-engine'],
        line: 2,
      },
    ];

    const ast = makeAST({
      deny: [{ source: 'SOUL.md', intents: denyIntents }],
      tool: [{ source: 'TOOLS.md', intents: toolIntents }],
      delegation: [{ source: 'AGENTS.md', intents: delegationIntents }],
      skill: [{ source: 'skills/', intents: skillIntents }],
    });

    // Use extract() to build the manifest
    const manifest = extract(ast);

    // manifest should contain tools, agents, skills
    expect(manifest.tools).toHaveLength(2);
    expect(manifest.agents).toHaveLength(2);
    expect(manifest.skills).toHaveLength(1);

    // Run conflict detection on the extracted manifest
    const report = detectConflicts(ast, manifest);

    // Should detect:
    // - DENY-vs-TOOL: send-email vs deny constraint
    // - OBO-WITHOUT-ELICIT: send-email is OBO
    // - TRUST-ESCALATION: Email-Agent with R4 under Manager
    // - SKILL-TOOL-GHOST: template-engine is undeclared
    expect(report.conflicts.length).toBeGreaterThanOrEqual(3);

    const categories = new Set(report.conflicts.map(c => c.category));
    expect(categories.has('SKILL-TOOL-GHOST')).toBe(true);
    expect(categories.has('OBO-WITHOUT-ELICIT')).toBe(true);
  });
});
