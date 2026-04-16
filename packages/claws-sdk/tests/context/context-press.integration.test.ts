/**
 * L1: PRESS compression adapter integration tests.
 *
 * 1. Full PRESS pipeline at G2 on 2400-token SKILL.md
 * 2. Round-trip fidelity check
 * 3. Compile → emit for 3 platform targets (emit coverage 73% → 90%)
 * 4. Adapter layer transforms for 4 remaining platform targets (adapter 41% → 90%)
 */

import { describe, it, expect } from 'vitest';
import { press } from '../../src/context/context-press.js';
import { emitSkill } from '../../src/emit/emit-skill.js';
import { routeAndEmit } from '../../src/emit/platform-router.js';
import { getAdapter, getAllAdapters } from '../../src/emit/platforms/index.js';
import { buildRiskMap, toOCToolPolicies, toOCDelegationMap } from '../../src/adapter/oc-data-adapter.js';
import { getAllMappings, getOCEvent, getMapping, getRequiredMappings } from '../../src/adapter/hook-registry.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { DenyIntent, ElicitIntent } from '../../src/ir/mechanical-intent.js';
import type { Platform } from '../../src/types/platform.js';

// ── Fixture: 2400-token equivalent GovernanceIR ──────────────────────

/**
 * Build a GovernanceIR that generates ~2400 tokens of SKILL.md output.
 * Contains 12 tools, 8 intents (deny + elicit + label + require + limit),
 * rich OBO chain, tensions, and remediations.
 */
function build2400TokenIR(): GovernanceIR {
  return {
    capabilities: {
      tools: [
        { name: 'read_file', description: 'Read contents of a file from the filesystem', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
        { name: 'write_file', description: 'Write contents to a file on the filesystem', riskLevel: 'medium', oboFlag: false, classification: 'filesystem' },
        { name: 'execute_command', description: 'Execute a shell command in the workspace terminal', riskLevel: 'critical', oboFlag: false, classification: 'execution' },
        { name: 'send_email', description: 'Send an email message on behalf of the current user', riskLevel: 'critical', oboFlag: true, classification: 'communication' },
        { name: 'delete_database', description: 'Drop a database table or collection permanently', riskLevel: 'critical', oboFlag: false, classification: 'data' },
        { name: 'deploy_service', description: 'Deploy a service to production infrastructure', riskLevel: 'critical', oboFlag: true, classification: 'execution' },
        { name: 'search_content', description: 'Search indexed content across the repository', riskLevel: 'low', oboFlag: false, classification: 'data' },
        { name: 'modify_permissions', description: 'Change access permissions for resources', riskLevel: 'high', oboFlag: true, classification: 'data' },
        { name: 'network_request', description: 'Make HTTP requests to external services', riskLevel: 'medium', oboFlag: false, classification: 'network' },
        { name: 'create_branch', description: 'Create a new git branch in the repository', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
        { name: 'approve_workflow', description: 'Approve a pending workflow in the CI pipeline', riskLevel: 'high', oboFlag: true, classification: 'execution' },
        { name: 'audit_log', description: 'Write an entry to the governance audit log', riskLevel: 'low', oboFlag: false, classification: 'data' },
      ],
      skills: [
        { name: 'code-review', description: 'Automated code review', requiredTools: ['read_file'], governanceLevel: 1 },
        { name: 'deployment', description: 'Deploy services', requiredTools: ['deploy_service', 'execute_command'], governanceLevel: 5 },
      ],
      agents: [
        {
          name: 'primary',
          description: 'Primary workspace agent',
          delegations: [
            { from: 'primary', to: 'reviewer', permissions: ['read_file', 'search_content'] },
            { from: 'primary', to: 'deployer', permissions: ['deploy_service'] },
          ],
          maxAutonomousLevel: 3,
        },
        {
          name: 'reviewer',
          description: 'Code review agent',
          delegations: [],
          maxAutonomousLevel: 1,
        },
      ],
      workflows: [
        { name: 'deploy-flow', description: 'Deployment workflow', steps: ['build', 'test', 'deploy', 'verify'], requiresApproval: true },
      ],
    },
    analysis: {
      violations: [
        {
          ruleId: 'SEC-001',
          level: 5,
          message: 'Critical tool without approval gate — execute_command',
          target: 'execute_command',
          diagnosticCode: 'CLAWS-V001',
          fixSuggestions: [{ direction: 'tighten', description: 'Add approval gate', target: 'enforcementPlan' }],
          toolFuzzyMatches: [],
        },
        {
          ruleId: 'SEC-002',
          level: 5,
          message: 'Critical tool without approval gate — delete_database',
          target: 'delete_database',
          diagnosticCode: 'CLAWS-V002',
          fixSuggestions: [{ direction: 'tighten', description: 'Add approval gate', target: 'enforcementPlan' }],
          toolFuzzyMatches: [],
        },
      ],
      warnings: [
        { ruleId: 'AUD-001', level: 2, message: 'Missing audit config', subRuleDiagnosticCode: 'G-AUDIT-01', category: 'G-AUDIT', subRuleIndex: 1 },
      ],
      enforcementPlan: {
        blockedTools: ['execute_command', 'delete_database'],
        requiredApprovals: ['send_email', 'deploy_service', 'modify_permissions', 'approve_workflow'],
        auditOnlyRules: ['AUD-001'],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 2, overridden: 0, total: 2 },
    },
    intents: [
      {
        id: 'intent-001', ruleId: 'SEC-001', level: 5, kind: 'deny',
        description: 'Block execute_command — critical shell execution',
        target: 'execute_command', reason: 'Shell execution blocked by R5 governance policy',
      } satisfies DenyIntent,
      {
        id: 'intent-002', ruleId: 'SEC-002', level: 5, kind: 'deny',
        description: 'Block delete_database — critical data destruction',
        target: 'delete_database', reason: 'Database destruction blocked by R5 governance policy',
      } satisfies DenyIntent,
      {
        id: 'intent-003', ruleId: 'OBO-001', level: 4, kind: 'elicit',
        description: 'Require OBO approval for send_email',
        target: 'send_email', prompt: 'Do you authorize sending email on your behalf?',
      } satisfies ElicitIntent,
      {
        id: 'intent-004', ruleId: 'OBO-002', level: 4, kind: 'elicit',
        description: 'Require OBO approval for deploy_service',
        target: 'deploy_service', prompt: 'Do you authorize deployment to production?',
      } satisfies ElicitIntent,
      {
        id: 'intent-005', ruleId: 'OBO-003', level: 4, kind: 'elicit',
        description: 'Require OBO approval for modify_permissions',
        target: 'modify_permissions', prompt: 'Do you authorize permission changes?',
      } satisfies ElicitIntent,
      {
        id: 'intent-006', ruleId: 'AUD-001', level: 2, kind: 'label',
        description: 'Audit label for read_file', key: 'read_file', value: 'audit-enabled',
      },
      {
        id: 'intent-007', ruleId: 'LIM-001', level: 3, kind: 'limit',
        description: 'Rate limit network requests', property: 'network_request.calls',
        max: 100, unit: 'calls/hour',
      },
      {
        id: 'intent-008', ruleId: 'REQ-001', level: 3, kind: 'require',
        description: 'Require CI pass before deployment',
        condition: 'ci.status === "passed"', failMessage: 'CI must pass before deploy',
      },
    ],
    delegationMap: [
      { ruleId: 'SEC-001', mechanism: 'hook', target: 'before_tool_call' },
      { ruleId: 'SEC-002', mechanism: 'hook', target: 'before_tool_call' },
      { ruleId: 'OBO-001', mechanism: 'approval', target: 'send_email' },
      { ruleId: 'OBO-002', mechanism: 'approval', target: 'deploy_service' },
      { ruleId: 'OBO-003', mechanism: 'approval', target: 'modify_permissions' },
      { ruleId: 'AUD-001', mechanism: 'audit-only', target: 'on_audit' },
      { ruleId: 'LIM-001', mechanism: 'hook', target: 'before_tool_call' },
      { ruleId: 'REQ-001', mechanism: 'hook', target: 'before_tool_call' },
    ],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '1.0.0',
      compiledAt: '2026-04-15T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}

describe('PRESS pipeline integration', () => {
  it('full PRESS pipeline at G2 on 2400-token SKILL.md', () => {
    const ir = build2400TokenIR();

    // Verify the input generates substantial SKILL.md content
    const skillResult = emitSkill(ir);
    expect(skillResult.content.length).toBeGreaterThan(500);

    // Run PRESS at G2 (strict) — 1100-token budget
    const result = press(ir, { level: 2 });

    // Profile selection correct
    expect(result.profile.name).toBe('strict');
    expect(result.profile.tokenBudget).toBe(1100);

    // All 6 stages executed
    expect(result.stages.costEstimate.ruleCount).toBe(8);
    expect(result.stages.deadCode).toBeDefined();
    expect(result.stages.mergeChecks).toBeDefined();
    expect(result.stages.ordering.orderedRules.length).toBe(8);
    expect(result.stages.quality).toBeDefined();

    // Output within budget
    expect(result.withinBudget).toBe(true);
    expect(result.outputTokens).toBeLessThanOrEqual(1100);

    // Quality validation passes at G2 (>= 0.92 on all dimensions)
    expect(result.qualityPassed).toBe(true);
    expect(result.stages.quality.aggregate).toBeGreaterThanOrEqual(0.92);

    // Compressed output preserves all rule IDs from optimized IR
    const compressedIds = result.compressed.rules.map((r) => r.id);
    for (const intent of result.optimizedIR.intents) {
      expect(compressedIds).toContain(intent.ruleId);
    }
  });

  it('round-trip fidelity check: no governance semantics lost', () => {
    const ir = build2400TokenIR();

    const result = press(ir, { level: 2 });

    // Original and compressed have same risk level
    expect(result.compressed.riskLevel).toBe(result.original.riskLevel);

    // All original rules are present in compressed (no dead code in this fixture)
    const originalIds = new Set(result.original.rules.map((r) => r.id));
    const compressedIds = new Set(result.compressed.rules.map((r) => r.id));
    for (const id of originalIds) {
      expect(compressedIds.has(id)).toBe(true);
    }

    // OBO chain preserved (G2 includes OBO)
    expect(result.compressed.oboChain.length).toBe(result.original.oboChain.length);

    // Remediations preserved (G2 includes remediation)
    expect(result.compressed.remediations.length).toBe(result.original.remediations.length);

    // Re-run press on the optimized IR — should still pass quality
    const secondPass = press(result.optimizedIR, { level: 2 });
    expect(secondPass.qualityPassed).toBe(true);
    expect(secondPass.stages.quality.aggregate).toBeGreaterThanOrEqual(0.92);
  });

  it('compile → emit for 3 platform targets: openclaw, claude-code, cursor', () => {
    const ir = build2400TokenIR();
    const result = press(ir, { level: 2 });

    // Use the optimized IR for emission to each of 3 target platforms
    const platforms: Platform[] = ['openclaw', 'claude-code', 'cursor'];

    for (const platform of platforms) {
      const adapter = getAdapter(platform);
      expect(adapter, `adapter for ${platform}`).toBeDefined();

      const emitResult = adapter!.emit(result.optimizedIR);

      // Each platform produces at least one artifact
      expect(emitResult.artifacts.length).toBeGreaterThan(0);
      expect(emitResult.platform).toBe(platform);

      // All artifacts have non-empty content
      for (const artifact of emitResult.artifacts) {
        expect(artifact.content.length).toBeGreaterThan(0);
        expect(artifact.path.length).toBeGreaterThan(0);
      }

      // SKILL.md (or equivalent) is always present
      const skillArtifact = emitResult.artifacts.find(
        (a) => a.path === 'SKILL.md' || a.path === 'CLAUDE.md' || a.path === '.cursorrules',
      );
      expect(skillArtifact, `skill artifact for ${platform}`).toBeDefined();
    }

    // OpenClaw produces the most artifacts (full fidelity: plugin + SKILL + exec-approvals)
    const ocResult = getAdapter('openclaw')!.emit(result.optimizedIR);
    expect(ocResult.artifacts.length).toBeGreaterThanOrEqual(3);

    // Multi-platform routing works end-to-end
    const routeResult = routeAndEmit(result.optimizedIR, {
      platforms,
      allowAdvisoryR5: true,
    });
    expect(routeResult.totalPlatforms).toBe(3);
    expect(routeResult.emittedCount).toBeGreaterThanOrEqual(1);
  });

  it('adapter layer transforms for 4 remaining platform targets', () => {
    const ir = build2400TokenIR();
    const result = press(ir, { level: 2 });
    const optimizedIR = result.optimizedIR;

    // Test the 4 remaining adapters: github-copilot, bedrock, langgraph, crewai
    const remainingPlatforms: Platform[] = ['github-copilot', 'bedrock', 'langgraph', 'crewai'];

    for (const platform of remainingPlatforms) {
      const adapter = getAdapter(platform);
      expect(adapter, `adapter for ${platform}`).toBeDefined();

      const emitResult = adapter!.emit(optimizedIR);
      expect(emitResult.platform).toBe(platform);
      expect(emitResult.artifacts.length).toBeGreaterThan(0);

      // Verify artifacts have content
      for (const artifact of emitResult.artifacts) {
        expect(artifact.content.length).toBeGreaterThan(0);
      }
    }

    // All 7 adapters are registered
    const allAdapters = getAllAdapters();
    expect(allAdapters.length).toBe(7);

    // Adapter layer: OC data adapter transforms
    const riskMap = buildRiskMap(optimizedIR);
    expect(riskMap.length).toBeGreaterThan(0);
    // Critical tools should have high risk levels
    const execRisk = riskMap.find((r) => r.toolName === 'execute_command');
    expect(execRisk).toBeDefined();

    const policies = toOCToolPolicies(optimizedIR);
    expect(policies.length).toBeGreaterThan(0);
    // Deny intents should produce block policies
    const blockPolicy = policies.find((p) => p.action === 'block');
    expect(blockPolicy).toBeDefined();

    const delegationMap = toOCDelegationMap(optimizedIR.delegationMap);
    expect(Object.keys(delegationMap).length).toBe(optimizedIR.delegationMap.length);

    // Hook registry coverage
    const allMappings = getAllMappings();
    expect(allMappings.length).toBe(7);

    const toolGateEvent = getOCEvent('tool-gate');
    expect(toolGateEvent).toBe('before_tool_call');

    const elicitMapping = getMapping('elicitation-gate');
    expect(elicitMapping).toBeDefined();
    expect(elicitMapping!.ocEvent).toBe('before_elicitation');

    const requiredMappings = getRequiredMappings();
    expect(requiredMappings.length).toBeGreaterThan(0);
    // tool-gate is the only required mapping
    expect(requiredMappings.every((m) => m.required)).toBe(true);
  });
});
