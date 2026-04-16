/**
 * L3 CLI acceptance test — full CP-3 gate validation.
 *
 * P32: maker lifecycle (scaffold, annotate, publish, badge, staleness)
 * and optimization pipeline (PRESS + DAG) via CLI commands.
 *
 * This is the final gate test for Checkpoint 3. It validates that the
 * complete surface area works together as a consumer would use it.
 */

import { describe, it, expect } from 'vitest';

import {
  // Maker pipeline
  evaluateEnterprisePolicy,
  generateBadgeMetadata,
  computeHandlerHash,
  sha256,
  checkStaleness,
  BadgeStore,
  reverifyBadge,
  applyReverification,
  validateGovernanceTier,
  disambiguateYamlNull,
} from '@bic/claws-sdk/maker';

import { eliminateDeadCode } from '@bic/claws-sdk/optimize/dead-code';
import { mergeRedundantChecks } from '@bic/claws-sdk/optimize/merge-checks';
import { press } from '@bic/claws-sdk/context/context-press';
import {
  buildDag,
  resolveAgent,
  computeStorageMetrics,
} from '@bic/claws-sdk/context/context-dag';
import type { GovernanceIR } from '@bic/claws-sdk/ir/governance-ir';

/**
 * Inline minimal GovernanceIR fixture for CLI tests.
 * Avoids cross-package relative imports.
 */
function minimalGovernanceIR(): GovernanceIR {
  return {
    capabilities: {
      tools: [
        { name: 'read_file', description: 'Read a file', riskLevel: 'low', oboFlag: false, classification: 'filesystem' },
        { name: 'write_file', description: 'Write a file', riskLevel: 'medium', oboFlag: false, classification: 'filesystem' },
        { name: 'execute_command', description: 'Execute shell', riskLevel: 'high', oboFlag: false, classification: 'execution' },
        { name: 'send_email', description: 'Send email', riskLevel: 'critical', oboFlag: true, classification: 'communication' },
        { name: 'delete_database', description: 'Drop table', riskLevel: 'critical', oboFlag: false, classification: 'data' },
      ],
      skills: [{ name: 'code-review', description: 'Review code', requiredTools: ['read_file'], governanceLevel: 1 }],
      agents: [
        { name: 'primary', description: 'Primary', delegations: [{ from: 'primary', to: 'reviewer', permissions: ['read_file'] }], maxAutonomousLevel: 3 },
        { name: 'reviewer', description: 'Reviewer', delegations: [], maxAutonomousLevel: 1 },
      ],
      workflows: [{ name: 'review-flow', description: 'Review', steps: ['checkout', 'review', 'report'], requiresApproval: false }],
    },
    analysis: {
      violations: [{ ruleId: 'SEC-001', level: 5, message: 'Critical tool without approval', target: 'delete_database', diagnosticCode: 'G-TOOL-01', fixSuggestions: [{ direction: 'tighten', description: 'Add approval gate', target: 'delete_database' }], toolFuzzyMatches: [] }],
      warnings: [{ ruleId: 'AUD-001', level: 2, message: 'Tool missing audit config', subRuleDiagnosticCode: 'G-AUDIT-01', category: 'G-AUDIT', subRuleIndex: 1 }],
      enforcementPlan: { blockedTools: ['delete_database'], requiredApprovals: ['execute_command'], auditOnlyRules: ['AUD-001'], channelRedactions: [], ruleSuppressions: [] },
      reclassificationTable: [],
      effectiveR5Count: { derived: 1, overridden: 0, total: 1 },
    },
    intents: [
      { id: 'intent-001', ruleId: 'SEC-001', level: 5, kind: 'deny', description: 'Block delete_database', target: 'delete_database', reason: 'Critical data destruction' },
      { id: 'intent-002', ruleId: 'OBO-001', level: 4, kind: 'elicit', description: 'OBO for send_email', target: 'send_email', prompt: 'Authorize email?' },
      { id: 'intent-003', ruleId: 'AUD-001', level: 2, kind: 'label', description: 'Audit label', key: 'read_file', value: 'audit-enabled' },
    ],
    delegationMap: [
      { ruleId: 'SEC-001', mechanism: 'hook', target: 'before_tool_call' },
      { ruleId: 'OBO-001', mechanism: 'hook', target: 'before_elicitation' },
      { ruleId: 'AUD-001', mechanism: 'audit-only', target: 'on_audit' },
    ],
    conflicts: { oboConflicts: [], multiConstraintConflicts: [], haltReason: null, hasOboWithoutElicit: false, totalConflicts: 0 },
    compiler: { compilerVersion: '0.1.0', compiledAt: '2026-04-15T00:00:00.000Z', schemaVersion: 1 },
  };
}

describe('CLI acceptance: full CP-3 gate validation', () => {
  it('validates maker lifecycle: badge + staleness + enterprise policy + re-verify', () => {
    const handlerV1 = 'export function handler() { return "v1"; }';
    const handlerV2 = 'export function handler() { return "v2 - modified"; }';
    const frontmatter = 'name: cp3-gate-skill\nrisk: 4\ntier: VERIFIED';
    const signingKey = 'cp3-gate-key';
    const store = new BadgeStore();

    // ── Step 1: Generate badge for published VERIFIED skill ────────────
    const badge = generateBadgeMetadata({
      tier: 'VERIFIED',
      risk: 4,
      obo: true,
      oboScope: 'send-email',
      dataLabels: ['CONFIDENTIAL'],
      signatureStatus: 'signed',
      staleness: 'current',
    });

    expect(badge.tier).toBe('VERIFIED');
    expect(badge.qualifier).toBe('verified');
    expect(badge.staleness).toBe('current');
    expect(badge.inconsistencies).toHaveLength(0);

    // Store badge for v1.0.0
    store.set({
      version: '1.0.0',
      tier: 'VERIFIED',
      handlerHash: computeHandlerHash(handlerV1),
      frontmatterHash: sha256(frontmatter),
      staleness: 'current',
      generatedAt: badge.generatedAt,
    });

    // ── Step 2: Enterprise policy validation ───────────────────────────
    const policyResult = evaluateEnterprisePolicy({
      tier: 'VERIFIED',
      risk: 4,
      dataLabels: ['CONFIDENTIAL'],
      fleetPolicy: {
        riskTierMinimums: [
          { minRisk: 4, minimumTier: 'TYPED' },
        ],
        requireSigning: false,
      },
    });

    expect(policyResult.passed).toBe(true);
    expect(policyResult.effectiveMinimumTier).toBe('TYPED');

    // ── Step 3: Detect staleness after handler modification ────────────
    // Simulate: user modifies handler.ts after publishing v1.0.0
    const mockManifest = {
      version: 1 as const,
      name: 'cp3-gate-skill',
      publishedVersion: '1.0.0',
      provenance: {
        sdkVersion: '0.6.0',
        compiledAt: '2026-04-15T00:00:00.000Z',
        tier: 'VERIFIED' as const,
        risk: 4 as const,
        obo: true,
        oboScope: 'send-email',
        policyHash: sha256('{}'),
      },
      contentHash: sha256(handlerV1),
      signature: 'mock-sig',
      signatureStatus: 'signed' as const,
    };

    const stalenessResult = checkStaleness({
      currentHandlerContent: handlerV2,
      currentFrontmatterContent: frontmatter,
      manifest: mockManifest,
      publishedHandlerHash: computeHandlerHash(handlerV1),
      publishedFrontmatterHash: sha256(frontmatter),
    });

    expect(stalenessResult.staleness).toBe('stale');
    expect(stalenessResult.handlerModified).toBe(true);
    expect(stalenessResult.downgraded).toBe(true);
    expect(stalenessResult.effectiveTier).toBe('TYPED');

    // ── Step 4: Re-verify restores VERIFIED ────────────────────────────
    const reverifyResult = reverifyBadge({
      version: '1.0.0',
      handlerContent: handlerV2,
      frontmatterContent: frontmatter,
      governanceChecksPassed: true,
    });

    expect(reverifyResult.verified).toBe(true);
    expect(reverifyResult.tier).toBe('VERIFIED');

    applyReverification(store, reverifyResult);

    expect(store.get('1.0.0')!.tier).toBe('VERIFIED');
    expect(store.get('1.0.0')!.staleness).toBe('current');

    // ── Step 5: YAML disambiguation + enum validation ──────────────────
    const tierField = disambiguateYamlNull(null, 'tier');
    expect(tierField.disambiguated).toBe(true);

    const tierError = validateGovernanceTier('VERIFID');
    expect(tierError).toContain('Did you mean');
    expect(tierError).toContain('VERIFIED');
  });

  it('validates optimization pipeline: PRESS + DAG + dead-code + merge', () => {
    const base = minimalGovernanceIR();

    // Build a small fleet for optimization
    const fleet = new Map<string, typeof base>();

    fleet.set('primary', {
      ...base,
      compiler: { ...base.compiler, compiledAt: '2026-04-15T10:00:00.000Z' },
    });

    fleet.set('reviewer', {
      ...base,
      intents: [
        ...base.intents,
        // Ghost tool intent
        {
          id: 'intent-ghost',
          ruleId: 'GHOST-X',
          level: 3 as const,
          kind: 'deny' as const,
          description: 'Block non-existent tool',
          target: 'non_existent_tool',
          reason: 'Tool not in manifest',
        },
      ],
      delegationMap: [
        ...base.delegationMap,
        { ruleId: 'GHOST-X', mechanism: 'hook' as const, target: 'before_tool_call' },
      ],
      compiler: { ...base.compiler, compiledAt: '2026-04-15T10:01:00.000Z' },
    });

    // ── DAG construction ───────────────────────────────────────────────
    const dag = buildDag(fleet);
    expect(dag.agents.size).toBe(2);

    const metrics = computeStorageMetrics(dag, fleet);
    expect(metrics.totalNodeCount).toBeGreaterThan(0);

    // ── Resolve and optimize reviewer agent ────────────────────────────
    const reviewer = resolveAgent(dag, 'reviewer');
    expect(reviewer.ir.intents.length).toBeGreaterThan(base.intents.length);

    // Dead-code: ghost tool removed
    const deadCode = eliminateDeadCode(reviewer.ir);
    expect(deadCode.removedAbsentToolIntents).toBe(1);
    expect(deadCode.ir.intents.find(i => i.ruleId === 'GHOST-X')).toBeUndefined();

    // Merge: no redundant checks in this fixture
    const merged = mergeRedundantChecks(deadCode.ir);
    expect(merged.ir.intents.length).toBeLessThanOrEqual(deadCode.ir.intents.length);

    // ── PRESS compression ──────────────────────────────────────────────
    const primary = resolveAgent(dag, 'primary');
    const pressResult = press(primary.ir, { level: 2 });

    expect(pressResult.profile).toBeDefined();
    expect(pressResult.optimizedIR).toBeDefined();
    expect(pressResult.outputTokens).toBeGreaterThan(0);
    expect(pressResult.stages.quality).toBeDefined();

    // ── Pipeline produces valid output ─────────────────────────────────
    expect(pressResult.optimizedIR.capabilities).toBeDefined();
    expect(pressResult.optimizedIR.analysis).toBeDefined();
    expect(pressResult.optimizedIR.intents).toBeDefined();
    expect(pressResult.optimizedIR.conflicts).toBeDefined();
    expect(pressResult.optimizedIR.compiler).toBeDefined();
  });
});
