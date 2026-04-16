/**
 * L0: PRESS compression adapter unit tests.
 *
 * 1. PRESS compression produces output within profile budget
 * 2. Quality check rejects below-threshold output
 */

import { describe, it, expect } from 'vitest';
import { press } from '../../src/context/context-press.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { DenyIntent, ElicitIntent } from '../../src/ir/mechanical-intent.js';

// ── Helpers ────────────────────────────────────────────────────────────

function makeGovernanceIR(overrides: Partial<GovernanceIR> = {}): GovernanceIR {
  return {
    capabilities: {
      tools: [
        { name: 'read_file', description: 'Read a file', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
        { name: 'write_file', description: 'Write a file', riskLevel: 'medium', oboFlag: false, classification: 'filesystem' },
        { name: 'execute_command', description: 'Execute a shell command', riskLevel: 'high', oboFlag: false, classification: 'execution' },
        { name: 'send_email', description: 'Send email on behalf of user', riskLevel: 'critical', oboFlag: true, classification: 'communication' },
      ],
      skills: [],
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: ['execute_command'],
        requiredApprovals: ['send_email'],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 1, overridden: 0, total: 1 },
    },
    intents: [
      {
        id: 'intent-001',
        ruleId: 'SEC-001',
        level: 5,
        kind: 'deny',
        description: 'Block execute_command at R5',
        target: 'execute_command',
        reason: 'Shell execution is blocked by governance',
      } satisfies DenyIntent,
      {
        id: 'intent-002',
        ruleId: 'OBO-001',
        level: 4,
        kind: 'elicit',
        description: 'Require OBO approval for send_email',
        target: 'send_email',
        prompt: 'Authorize email sending on your behalf?',
      } satisfies ElicitIntent,
      {
        id: 'intent-003',
        ruleId: 'AUD-001',
        level: 2,
        kind: 'label',
        description: 'Audit label for read_file',
        key: 'read_file',
        value: 'audit-enabled',
      },
    ],
    delegationMap: [
      { ruleId: 'SEC-001', mechanism: 'hook', target: 'before_tool_call' },
      { ruleId: 'OBO-001', mechanism: 'approval', target: 'send_email' },
      { ruleId: 'AUD-001', mechanism: 'audit-only', target: 'on_audit' },
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
    ...overrides,
  };
}

describe('PRESS compression adapter', () => {
  it('PRESS compression produces output within profile budget', () => {
    const ir = makeGovernanceIR();

    // Run at G2 (strict) — 1100-token budget
    const result = press(ir, { level: 2 });

    // Profile is G2 strict
    expect(result.profile.name).toBe('strict');
    expect(result.profile.level).toBe(2);
    expect(result.profile.tokenBudget).toBe(1100);

    // Output tokens are within budget
    expect(result.withinBudget).toBe(true);
    expect(result.outputTokens).toBeLessThanOrEqual(1100);
    expect(result.outputTokens).toBeGreaterThan(0);

    // All 6 pipeline stages were executed
    expect(result.stages.costEstimate.ruleCount).toBe(3);
    expect(result.stages.deadCode.totalRemoved).toBe(0); // no dead code in this fixture
    expect(result.stages.mergeChecks.mergeCount).toBe(0); // no redundant checks
    expect(result.stages.ordering.orderedRuleIds.length).toBe(3);
    expect(result.stages.quality).toBeDefined();

    // Compressed output preserves governance semantics
    expect(result.compressed.rules.length).toBe(3);
    expect(result.compressed.riskLevel).toBe('R5');

    // Original governance snapshot captured
    expect(result.original.rules.length).toBe(3);

    // Profile selection via profileName
    const byName = press(ir, { profileName: 'minimal' });
    expect(byName.profile.name).toBe('minimal');
    expect(byName.profile.level).toBe(0);
    expect(byName.profile.tokenBudget).toBe(400);

    // profileName takes precedence over level
    const nameOverLevel = press(ir, { profileName: 'paranoid', level: 0 });
    expect(nameOverLevel.profile.name).toBe('paranoid');

    // Default profile (no config) is G2 strict
    const defaultResult = press(ir);
    expect(defaultResult.profile.name).toBe('strict');
    expect(defaultResult.profile.level).toBe(2);

    // skipDeadCode skips dead-code elimination
    const skipDead = press(ir, { level: 2, skipDeadCode: true });
    expect(skipDead.stages.deadCode.totalRemoved).toBe(0);

    // skipMerge skips redundant check merging
    const skipMerge = press(ir, { level: 2, skipMerge: true });
    expect(skipMerge.stages.mergeChecks.mergeCount).toBe(0);

    // skipDeadCode + skipMerge together
    const skipBoth = press(ir, { level: 2, skipDeadCode: true, skipMerge: true });
    expect(skipBoth.stages.deadCode.totalRemoved).toBe(0);
    expect(skipBoth.stages.mergeChecks.mergeCount).toBe(0);

    // Profile G0 (minimal) — tighter budget
    const g0 = press(ir, { level: 0 });
    expect(g0.profile.tokenBudget).toBe(400);

    // Profile G1 (standard)
    const g1 = press(ir, { level: 1 });
    expect(g1.profile.name).toBe('standard');

    // Profile G3 (paranoid) — includes all content
    const g3 = press(ir, { level: 3 });
    expect(g3.profile.name).toBe('paranoid');

    // G0 does not include tensions (minimal profile)
    const g0Profile = press(ir, { level: 0 });
    expect(g0Profile.compressed.tensions).toHaveLength(0); // no tensions in fixture anyway

    // G2 includes OBO chain
    expect(result.compressed.oboChain.length).toBeGreaterThan(0);

    // G2 includes remediations
    expect(result.compressed.remediations.length).toBeGreaterThan(0);

    // G0 does not include remediations
    expect(g0.compressed.remediations).toHaveLength(0);
  });

  it('quality check rejects below-threshold output', () => {
    // Create an IR where compressed output will lose content (empty
    // intents → rules will be scored 0 on rule coverage vs original)
    const baseIR = makeGovernanceIR();

    // Construct an IR with many intents so the original is rich,
    // but add dead-code targets that will be eliminated, skewing quality
    const ir: GovernanceIR = {
      ...baseIR,
      intents: [
        ...baseIR.intents,
        // Ghost tool intents — will be eliminated by dead-code pass
        {
          id: 'intent-ghost-1',
          ruleId: 'GHOST-001',
          level: 3,
          kind: 'deny',
          description: 'Block deploy_production',
          target: 'deploy_production',
          reason: 'Not allowed',
        } satisfies DenyIntent,
        {
          id: 'intent-ghost-2',
          ruleId: 'GHOST-002',
          level: 3,
          kind: 'deny',
          description: 'Block reset_database',
          target: 'reset_database',
          reason: 'Not allowed',
        } satisfies DenyIntent,
        {
          id: 'intent-ghost-3',
          ruleId: 'GHOST-003',
          level: 3,
          kind: 'deny',
          description: 'Block nuke_server',
          target: 'nuke_server',
          reason: 'Not allowed',
        } satisfies DenyIntent,
      ],
    };

    // At G3 (paranoid) with 0.95 threshold — quality should fail
    // because dead-code elimination removes 3/6 rules (50% coverage < 0.95)
    const result = press(ir, { level: 3 });

    // Dead-code elimination removed ghost intents
    expect(result.stages.deadCode.removedAbsentToolIntents).toBe(3);

    // Quality validation fails because compressed has fewer rules than original
    expect(result.qualityPassed).toBe(false);
    expect(result.stages.quality.violations.length).toBeGreaterThan(0);

    // Verify the violations include ruleCoverage
    const ruleCoverageViolation = result.stages.quality.violations.find(
      (v) => v.dimension === 'ruleCoverage',
    );
    expect(ruleCoverageViolation).toBeDefined();
    expect(ruleCoverageViolation!.score).toBeLessThan(ruleCoverageViolation!.threshold);
  });

  it('exercises all profile inclusion branches with rich governance data', () => {
    // Create IR with multiConstraintConflicts to exercise tension branch
    const ir: GovernanceIR = {
      ...makeGovernanceIR(),
      conflicts: {
        oboConflicts: [],
        multiConstraintConflicts: [
          { ruleIds: ['SEC-001', 'OBO-001'], reason: 'Deny vs elicit conflict' } as unknown as string,
          'Simple string conflict',
        ] as unknown as GovernanceIR['conflicts']['multiConstraintConflicts'],
        haltReason: null,
        hasOboWithoutElicit: false,
        totalConflicts: 2,
      },
    };

    // G2 (strict) includes tensions
    const g2Result = press(ir, { level: 2 });
    expect(g2Result.compressed.tensions.length).toBeGreaterThan(0);

    // G3 (paranoid) includes tensions + all content
    const g3Result = press(ir, { level: 3 });
    expect(g3Result.compressed.tensions.length).toBeGreaterThan(0);
    expect(g3Result.compressed.oboChain.length).toBeGreaterThan(0);
    expect(g3Result.compressed.remediations.length).toBeGreaterThan(0);

    // G0 (minimal) excludes tensions, remediations, but includes OBO
    const g0Result = press(ir, { level: 0 });
    expect(g0Result.compressed.tensions).toHaveLength(0);
    expect(g0Result.compressed.remediations).toHaveLength(0);
    expect(g0Result.compressed.oboChain.length).toBeGreaterThan(0); // G0 includeObo=true

    // G1 (standard) includes OBO and remediation, excludes tensions
    const g1Result = press(ir, { level: 1 });
    expect(g1Result.compressed.tensions).toHaveLength(0);
    expect(g1Result.compressed.remediations.length).toBeGreaterThan(0);
  });

  it('handles string rule levels, unknown levels, and zero effectiveR5Count', () => {
    // Test with string levels (e.g., 'error', 'warning') and no R5
    const ir: GovernanceIR = {
      ...makeGovernanceIR(),
      analysis: {
        ...makeGovernanceIR().analysis,
        effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
      },
      intents: [
        {
          id: 'intent-str-1',
          ruleId: 'STR-001',
          level: 'error' as unknown as number,
          kind: 'deny',
          description: 'Block something with string level',
          target: 'execute_command',
          reason: 'Blocked',
        } as unknown as DenyIntent,
        {
          id: 'intent-str-2',
          ruleId: 'STR-002',
          level: 'warning' as unknown as number,
          kind: 'elicit',
          description: 'Elicit for something with string level',
          target: 'send_email',
          prompt: 'Approve?',
        } as unknown as ElicitIntent,
        {
          id: 'intent-str-3',
          ruleId: 'STR-003',
          level: 'info' as unknown as number,
          kind: 'label',
          description: 'Label with string level',
          key: 'audit_log',
          value: 'enabled',
        } as unknown as GovernanceIR['intents'][number],
        // Unknown string level — triggers ?? 3 fallback
        {
          id: 'intent-str-4',
          ruleId: 'STR-004',
          level: 'unknown-level' as unknown as number,
          kind: 'label',
          description: 'Label with unknown level',
          key: 'unknown',
          value: 'test',
        } as unknown as GovernanceIR['intents'][number],
      ],
      delegationMap: [
        { ruleId: 'STR-001', mechanism: 'hook', target: 'before_tool_call' },
        { ruleId: 'STR-002', mechanism: 'approval', target: 'send_email' },
      ],
    };

    const result = press(ir, { level: 2 });

    // Pipeline completes without error
    expect(result.profile.name).toBe('strict');
    expect(result.stages.costEstimate.ruleCount).toBe(4);
    expect(result.stages.ordering.orderedRules.length).toBe(4);

    // Risk level is 'standard' when no R5
    expect(result.compressed.riskLevel).toBe('standard');
    expect(result.original.riskLevel).toBe('standard');
  });
});
