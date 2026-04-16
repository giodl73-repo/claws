/**
 * L3: SDK acceptance — consumer exercises amendment validation, merge pipeline
 * risk floor, and fleet broadcast trust-compat through public APIs and validates
 * trust model invariants.
 *
 * This test verifies that external consumers of claws-sdk can rely on the
 * trust model integrity guarantees through the published module boundary.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stringify as yamlStringify } from 'yaml';

// Import through public barrel exports — this is how SDK consumers access the API
import { validateAmendment } from '#src/amend/index.js';
import type { Amendment } from '#src/amend/index.js';
import { mergeIntents } from '#src/compile/llm/index.js';
import type { RegexIntent } from '#src/compile/llm/index.js';
import type { LLMIntent } from '#src/compile/llm/index.js';
import { checkTrustCompat } from '#src/fleet/index.js';
import { validatePackageForPublish, publishToRegistry, queryRegistry } from '#src/publish/index.js';
import type { GovernanceIR } from '#src/ir/governance-ir.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'trust-accept-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function buildMinimalIR(): GovernanceIR {
  return {
    capabilities: {
      tools: [],
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

describe('security-hardening-trust: SDK acceptance', () => {
  it('trust model invariants hold through public SDK APIs', async () => {
    const ir = buildMinimalIR();

    // ─── Invariant 1: Amendment validation enforces monotonic trust tier ─
    // Lower: T3 -> T1 — rejected
    const lowerResult = validateAmendment(
      { type: 'update-policy', target: 'trustTier', value: { trustTier: 1 } },
      ir,
      3,
    );
    expect(lowerResult.valid).toBe(false);
    expect(lowerResult.violations.some((v) => v.ruleId === 'AMEND-V006')).toBe(true);

    // Raise: T1 -> T5 — accepted
    const raiseResult = validateAmendment(
      { type: 'update-policy', target: 'trustTier', value: { trustTier: 5 } },
      ir,
      1,
    );
    expect(raiseResult.valid).toBe(true);

    // Same: T3 -> T3 — accepted (no false positive)
    const sameResult = validateAmendment(
      { type: 'update-policy', target: 'trustTier', value: { trustTier: 3 } },
      ir,
      3,
    );
    expect(sameResult.valid).toBe(true);

    // ─── Invariant 2: Merge pipeline enforces R2 floor for gap-fills ────
    const mergeResult = mergeIntents(
      'TOOLS.md',
      [] as RegexIntent[],
      [
        {
          kind: 'require' as const,
          target: 'gap-fill-tool',
          description: 'LLM-only discovery',
          confidence: 0.75,
          sourceText: 'gap fill',
          riskClass: 1 as const,
        },
      ],
    );
    expect(mergeResult.intents[0]!.riskClass).toBeGreaterThanOrEqual(2);
    expect(mergeResult.intents[0]!.extractionMethod).toBe('llm');

    // ─── Invariant 3: Fleet broadcast trust-compat checks restrictions ──
    const wsDir = join(tempDir, 'accept-ws');
    mkdirSync(join(wsDir, '.claws', 'policies'), { recursive: true });
    writeFileSync(join(wsDir, 'claws.json'), JSON.stringify({ trustTier: 2 }), 'utf-8');

    const policyPath = join(tempDir, 'accept-policy.yaml');
    writeFileSync(
      policyPath,
      yamlStringify({
        trustTier: 3,
        publishRestrictions: [{ maxRiskTier: 2, maxTrustTier: 2 }],
      }),
      'utf-8',
    );

    const trustResult = await checkTrustCompat(wsDir, policyPath);
    expect(trustResult.compatible).toBe(false);
    expect(trustResult.reason).toContain('Publish restriction');

    // ─── Invariant 4: Registry client is importable from SDK ────────────
    // Verify all three registry client functions are available
    expect(typeof validatePackageForPublish).toBe('function');
    expect(typeof publishToRegistry).toBe('function');
    expect(typeof queryRegistry).toBe('function');

    // Validate a well-formed package
    const pkgResult = validatePackageForPublish({
      name: '@openclaw/test-skill',
      version: '2.0.0',
      description: 'Test skill for acceptance',
      artifacts: [{ name: 'handler.ts', content: 'export default {}' }],
      contentHash: 'sha256-abc',
    });
    expect(pkgResult.valid).toBe(true);

    // Validate an invalid package (empty name)
    const badPkgResult = validatePackageForPublish({
      name: '',
      version: '',
      description: '',
      artifacts: [],
      contentHash: '',
    });
    expect(badPkgResult.valid).toBe(false);
    expect(badPkgResult.issues.length).toBeGreaterThan(0);
  });
});
