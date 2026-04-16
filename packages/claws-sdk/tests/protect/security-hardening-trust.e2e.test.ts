/**
 * L2: Full trust model integrity pipeline end-to-end.
 *
 * Exercises all four security hardening findings (D-01, C-01, C-03, A-01)
 * in a single pipeline walkthrough:
 * - Monotonic trust tier enforcement via amendment validation
 * - LLM gap-fill R2 risk floor in merge pipeline
 * - Broadcast publish restriction checks
 * - Registry client SDK placement (import verification)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stringify as yamlStringify } from 'yaml';

import { validateAmendment } from '#src/amend/validate.js';
import type { Amendment } from '#src/amend/validate.js';
import { mergeIntents } from '#src/compile/llm/merger.js';
import type { RegexIntent } from '#src/compile/llm/merger.js';
import type { LLMIntent } from '#src/compile/llm/types.js';
import { checkTrustCompat } from '#src/fleet/trust-compat.js';
import { validatePackageForPublish } from '#src/publish/registry-client.js';
import type { GovernanceIR } from '#src/ir/governance-ir.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'trust-e2e-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function buildTestIR(): GovernanceIR {
  return {
    capabilities: {
      tools: [
        {
          name: 'send-email',
          description: 'Send email on behalf of user',
          riskLevel: 'high',
          oboFlag: true,
          classification: 'communication',
        },
      ],
      skills: [],
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      totalCount: 0,
      maxSeverity: 'low',
    },
    compiler: {
      compilerVersion: '0.36.0',
      compiledAt: '2026-04-14T00:00:00.000Z',
      schemaVersion: 1,
    },
  };
}

describe('security-hardening-trust: full trust model integrity pipeline', () => {
  it('enforces all trust model invariants end-to-end', async () => {
    // ─── D-01: Monotonic trust tier enforcement ──────────────────
    const ir = buildTestIR();

    // Attempt to lower trust tier from T4 to T2 — must be rejected
    const lowerAmendment: Amendment = {
      type: 'update-policy',
      target: 'trustTier',
      value: { trustTier: 2 },
    };
    const lowerResult = validateAmendment(lowerAmendment, ir, 4);
    expect(lowerResult.valid).toBe(false);
    expect(lowerResult.violations[0]!.ruleId).toBe('AMEND-V006');

    // Raise trust tier from T2 to T4 — must succeed
    const raiseAmendment: Amendment = {
      type: 'update-policy',
      target: 'trustTier',
      value: { trustTier: 4 },
    };
    const raiseResult = validateAmendment(raiseAmendment, ir, 2);
    expect(raiseResult.valid).toBe(true);

    // ─── C-01: LLM gap-fill R2 risk floor ────────────────────────
    const regexIntents: RegexIntent[] = [];
    const llmIntents: LLMIntent[] = [
      {
        kind: 'require',
        target: 'unknown-api',
        description: 'LLM found API call',
        confidence: 0.80,
        sourceText: 'calls unknown-api',
        riskClass: 1, // LLM says R1
      },
    ];

    const mergeResult = mergeIntents('TOOLS.md', regexIntents, llmIntents);
    expect(mergeResult.intents).toHaveLength(1);
    expect(mergeResult.intents[0]!.riskClass).toBe(2); // R2 floor enforced

    // ─── C-03: Broadcast publish restriction checks ──────────────
    const wsDir = join(tempDir, 'low-trust-ws');
    mkdirSync(join(wsDir, '.claws', 'policies'), { recursive: true });
    writeFileSync(join(wsDir, 'claws.json'), JSON.stringify({ trustTier: 2 }), 'utf-8');

    const policyPath = join(tempDir, 'restricted-policy.yaml');
    writeFileSync(
      policyPath,
      yamlStringify({
        trustTier: 3,
        publishRestrictions: [{ maxRiskTier: 3, maxTrustTier: 2 }],
      }),
      'utf-8',
    );

    const trustResult = await checkTrustCompat(wsDir, policyPath);
    expect(trustResult.compatible).toBe(false);
    expect(trustResult.reason).toContain('Publish restriction violated');

    // ─── A-01: Registry client SDK placement ─────────────────────
    // Verify the registry client is importable from the SDK
    const validationResult = validatePackageForPublish({
      name: '@openclaw/audit-chain',
      version: '1.0.0',
      description: 'Audit chain package',
      artifacts: [{ name: 'skill.yaml', content: 'name: audit-chain' }],
      contentHash: 'abc123',
    });
    expect(validationResult.valid).toBe(true);
    expect(validationResult.issues).toHaveLength(0);
  });
});
