/**
 * L1: Broadcast trust-compat checks publish restrictions.
 *
 * C-03: The fleet broadcast trust-compatibility check must verify both
 * trust tier monotonic tightening AND publish restrictions from the policy.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stringify as yamlStringify } from 'yaml';

import { checkTrustCompat, checkFleetTrustCompat } from '#src/fleet/trust-compat.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'broadcast-trust-integ-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/**
 * Helper: create a workspace with a given trust tier.
 */
function createWorkspace(name: string, trustTier: number): string {
  const wsDir = join(tempDir, name);
  mkdirSync(join(wsDir, '.claws', 'policies'), { recursive: true });
  writeFileSync(
    join(wsDir, 'claws.json'),
    JSON.stringify({ trustTier }),
    'utf-8',
  );
  return wsDir;
}

/**
 * Helper: create a policy YAML file with trust tier and publish restrictions.
 */
function createPolicy(
  name: string,
  opts: {
    trustTier?: number;
    publishRestrictions?: Array<{ maxRiskTier: number; maxTrustTier: number }>;
    toolRiskTiers?: number[];
  },
): string {
  const policyPath = join(tempDir, `${name}.yaml`);
  const policyData: Record<string, unknown> = {};

  if (opts.trustTier !== undefined) {
    policyData['trustTier'] = opts.trustTier;
  }
  if (opts.publishRestrictions !== undefined) {
    policyData['publishRestrictions'] = opts.publishRestrictions;
  }
  if (opts.toolRiskTiers !== undefined) {
    policyData['toolRiskTiers'] = opts.toolRiskTiers;
  }

  writeFileSync(policyPath, yamlStringify(policyData), 'utf-8');
  return policyPath;
}

describe('broadcast trust-compat: publish restrictions (C-03)', () => {
  it('blocks R5 tool broadcast to T2 workspace via publish restriction', async () => {
    // T2 workspace
    const wsDir = createWorkspace('low-trust-ws', 2);

    // Policy with restriction: workspaces at or below T2 cannot receive tools above R3
    // Policy carries R5 tools which exceed the R3 cap
    const policyPath = createPolicy('restrictive-policy', {
      trustTier: 3,
      publishRestrictions: [
        { maxRiskTier: 3, maxTrustTier: 2 },
      ],
      toolRiskTiers: [1, 3, 5],
    });

    const result = await checkTrustCompat(wsDir, policyPath);

    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('Publish restriction violated');
    expect(result.reason).toContain('T2');
    expect(result.currentTier).toBe(2);
  });

  it('rejects when policy publishRestrictions disallow target workspace', async () => {
    // T3 workspace — the restriction targets workspaces at or below T3
    const wsDir = createWorkspace('mid-trust-ws', 3);

    // Policy: workspaces at or below T3 cannot receive tools above R2
    // Policy carries R4 tools which exceed the R2 cap
    const policyPath = createPolicy('strict-policy', {
      trustTier: 4,
      publishRestrictions: [
        { maxRiskTier: 2, maxTrustTier: 3 },
      ],
      toolRiskTiers: [1, 2, 4],
    });

    const result = await checkTrustCompat(wsDir, policyPath);

    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('Publish restriction violated');
    expect(result.reason).toContain('T3');
    expect(result.currentTier).toBe(3);
    expect(result.policyTier).toBe(4);
  });

  it('allows broadcast when tool risk tiers are all within restriction cap', async () => {
    // T2 workspace — below the restriction ceiling
    const wsDir = createWorkspace('low-trust-safe', 2);

    // Restriction: max R3 for workspaces at or below T2
    // But policy only carries R1 and R2 tools — within the cap
    const policyPath = createPolicy('safe-tools-policy', {
      trustTier: 3,
      publishRestrictions: [
        { maxRiskTier: 3, maxTrustTier: 2 },
      ],
      toolRiskTiers: [1, 2],
    });

    const result = await checkTrustCompat(wsDir, policyPath);

    expect(result.compatible).toBe(true);
    expect(result.reason).toContain('Trust floor');
  });

  it('allows broadcast when workspace trust tier exceeds restriction ceiling', async () => {
    // T4 workspace — above the restriction ceiling of T3
    const wsDir = createWorkspace('high-trust-ws', 4);

    // Policy: restriction only applies to workspaces at or below T3
    const policyPath = createPolicy('partial-restriction', {
      trustTier: 4,
      publishRestrictions: [
        { maxRiskTier: 2, maxTrustTier: 3 },
      ],
    });

    const result = await checkTrustCompat(wsDir, policyPath);

    expect(result.compatible).toBe(true);
    expect(result.reason).toContain('Trust floor maintained');
  });

  it('allows broadcast when no publish restrictions are declared', async () => {
    const wsDir = createWorkspace('any-trust-ws', 2);
    const policyPath = createPolicy('no-restrictions', {
      trustTier: 3,
    });

    const result = await checkTrustCompat(wsDir, policyPath);

    expect(result.compatible).toBe(true);
    expect(result.reason).toContain('Trust floor maintained or raised');
  });

  it('conservative-blocks when restriction applies but no tool risk tiers declared', async () => {
    const wsDir = createWorkspace('conserv-block-ws', 2);

    // Restriction targets T2, but policy has NO toolRiskTiers — conservative block
    const policyPath = createPolicy('conserv-policy', {
      trustTier: 3,
      publishRestrictions: [
        { maxRiskTier: 3, maxTrustTier: 2 },
      ],
      // no toolRiskTiers — should trigger conservative block
    });

    const result = await checkTrustCompat(wsDir, policyPath);

    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('no tool risk tiers declared');
  });
});

describe('broadcast trust-compat: snake_case policy fields', () => {
  it('reads trust_tier from snake_case policy field', async () => {
    const wsDir = createWorkspace('snake-tier-ws', 2);

    // Write YAML with snake_case field
    const policyPath = join(tempDir, 'snake-tier.yaml');
    writeFileSync(policyPath, yamlStringify({ trust_tier: 4 }), 'utf-8');

    const result = await checkTrustCompat(wsDir, policyPath);

    expect(result.compatible).toBe(true);
    expect(result.policyTier).toBe(4);
    expect(result.reason).toContain('T2');
  });

  it('reads publish_restrictions and tool_risk_tiers from snake_case', async () => {
    const wsDir = createWorkspace('snake-restrict-ws', 2);

    const policyPath = join(tempDir, 'snake-restrict.yaml');
    writeFileSync(policyPath, yamlStringify({
      trust_tier: 3,
      publish_restrictions: [
        { maxRiskTier: 3, maxTrustTier: 2 },
      ],
      tool_risk_tiers: [1, 5],
    }), 'utf-8');

    const result = await checkTrustCompat(wsDir, policyPath);

    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('Publish restriction violated');
    expect(result.reason).toContain('R5');
  });
});

describe('broadcast trust-compat: edge cases', () => {
  it('handles policy with null/empty YAML content', async () => {
    const wsDir = createWorkspace('null-yaml-ws', 3);

    const policyPath = join(tempDir, 'empty.yaml');
    writeFileSync(policyPath, '', 'utf-8');

    const result = await checkTrustCompat(wsDir, policyPath);

    expect(result.compatible).toBe(true);
    expect(result.policyTier).toBe(0);
    expect(result.reason).toContain('no floor change');
  });

  it('handles policy with scalar YAML content (not object)', async () => {
    const wsDir = createWorkspace('scalar-yaml-ws', 3);

    const policyPath = join(tempDir, 'scalar.yaml');
    writeFileSync(policyPath, 'just a string', 'utf-8');

    const result = await checkTrustCompat(wsDir, policyPath);

    expect(result.compatible).toBe(true);
    expect(result.policyTier).toBe(0);
  });

  it('skips invalid entries in publishRestrictions array', async () => {
    const wsDir = createWorkspace('bad-restrict-ws', 2);

    const policyPath = join(tempDir, 'bad-restrict.yaml');
    writeFileSync(policyPath, yamlStringify({
      trustTier: 3,
      publishRestrictions: [
        null,
        'not-an-object',
        { maxRiskTier: 'nan', maxTrustTier: 2 },
        { maxRiskTier: 3, maxTrustTier: 2 },
      ],
      toolRiskTiers: [1, 2],
    }), 'utf-8');

    const result = await checkTrustCompat(wsDir, policyPath);

    // Only the last valid restriction is parsed; tools R1,R2 are within R3 cap
    expect(result.compatible).toBe(true);
  });

  it('filters out-of-range tool risk tiers', async () => {
    const wsDir = createWorkspace('oor-risk-ws', 2);

    const policyPath = join(tempDir, 'oor-risk.yaml');
    writeFileSync(policyPath, yamlStringify({
      trustTier: 3,
      publishRestrictions: [
        { maxRiskTier: 3, maxTrustTier: 2 },
      ],
      toolRiskTiers: [0, 6, 'notanumber', 2],
    }), 'utf-8');

    const result = await checkTrustCompat(wsDir, policyPath);

    // Only tier 2 is valid, which is within the R3 cap
    expect(result.compatible).toBe(true);
  });

  it('blocks when policy has no trust tier but has blocking publish restrictions', async () => {
    const wsDir = createWorkspace('no-tier-restrict-ws', 2);

    // No trustTier, but restriction blocks T2 workspaces without tool risk tiers
    const policyPath = join(tempDir, 'no-tier-restrict.yaml');
    writeFileSync(policyPath, yamlStringify({
      publishRestrictions: [
        { maxRiskTier: 3, maxTrustTier: 2 },
      ],
    }), 'utf-8');

    const result = await checkTrustCompat(wsDir, policyPath);

    expect(result.compatible).toBe(false);
    expect(result.policyTier).toBe(0);
    expect(result.reason).toContain('Publish restriction violated');
    expect(result.reason).toContain('no tool risk tiers declared');
  });
});

describe('checkFleetTrustCompat', () => {
  it('returns allCompatible=true for empty workspace list', async () => {
    const policyPath = createPolicy('empty-fleet', { trustTier: 3 });
    const result = await checkFleetTrustCompat([], policyPath);

    expect(result.allCompatible).toBe(true);
    expect(result.results).toHaveLength(0);
  });

  it('returns allCompatible=false when one workspace has restriction violation', async () => {
    const ws1 = createWorkspace('fleet-ok', 4);
    const ws2 = createWorkspace('fleet-blocked', 2);

    const policyPath = createPolicy('fleet-restrict', {
      trustTier: 4,
      publishRestrictions: [
        { maxRiskTier: 2, maxTrustTier: 2 },
      ],
      toolRiskTiers: [1, 4],
    });

    const result = await checkFleetTrustCompat([ws1, ws2], policyPath);

    expect(result.allCompatible).toBe(false);
    expect(result.results).toHaveLength(2);
    expect(result.results[0]!.compatible).toBe(true);
    expect(result.results[1]!.compatible).toBe(false);
  });
});
