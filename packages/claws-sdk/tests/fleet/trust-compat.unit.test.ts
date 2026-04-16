/**
 * L0 unit tests for trust-compat — monotonic trust tightening and
 * C-03 publish restrictions.
 *
 * The broadcast.unit.test.ts file covers basic trust-compat scenarios.
 * This file targets deeper branch coverage: publish restrictions,
 * snake_case policy keys, tool risk tiers, and edge cases.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { checkTrustCompat, checkFleetTrustCompat } from '#src/fleet/trust-compat.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'trust-compat-unit-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/** Create a workspace with a claws.json at the given trust tier. */
function createWorkspace(name: string, trustTier: number): string {
  const wsDir = join(tempDir, name);
  mkdirSync(wsDir, { recursive: true });
  writeFileSync(
    join(wsDir, 'claws.json'),
    JSON.stringify({ trustTier }),
  );
  return wsDir;
}

/** Create a policy YAML file with given content. */
function createPolicy(name: string, content: string): string {
  const filePath = join(tempDir, name);
  writeFileSync(filePath, content);
  return filePath;
}

// ── monotonic tightening (core) ────────────────────────────────────────

describe('checkTrustCompat — monotonic tightening', () => {
  it('blocks trust floor downgrade (T3 → T2)', async () => {
    const ws = createWorkspace('ws-t3', 3);
    const policy = createPolicy('lower.yaml', 'trustTier: 2\n');

    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(false);
    expect(result.currentTier).toBe(3);
    expect(result.policyTier).toBe(2);
    expect(result.reason).toContain('monotonic tightening violated');
  });

  it('allows trust floor upgrade (T2 → T4)', async () => {
    const ws = createWorkspace('ws-t2', 2);
    const policy = createPolicy('higher.yaml', 'trustTier: 4\n');

    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
    expect(result.reason).toContain('T2');
    expect(result.reason).toContain('T4');
  });

  it('allows same trust tier (T3 → T3)', async () => {
    const ws = createWorkspace('ws-same', 3);
    const policy = createPolicy('same.yaml', 'trustTier: 3\n');

    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
    expect(result.reason).toContain('maintained or raised');
  });

  it('allows when policy has no trust tier (policyTier=0)', async () => {
    const ws = createWorkspace('ws-notier', 3);
    const policy = createPolicy('notier.yaml', 'name: test\n');

    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
    expect(result.policyTier).toBe(0);
    expect(result.reason).toContain('no floor change');
  });

  it('allows when workspace has no readable trust tier (currentTier=0)', async () => {
    const wsDir = join(tempDir, 'ws-noconfig');
    mkdirSync(wsDir, { recursive: true });
    const policy = createPolicy('any.yaml', 'trustTier: 4\n');

    const result = await checkTrustCompat(wsDir, policy);
    expect(result.compatible).toBe(true);
    expect(result.currentTier).toBe(0);
    expect(result.reason).toContain('no readable trust tier');
  });

  it('returns currentTier=0 for invalid JSON in claws.json', async () => {
    const wsDir = join(tempDir, 'ws-badjson');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, 'claws.json'), 'not json');
    const policy = createPolicy('x.yaml', 'trustTier: 3\n');

    const result = await checkTrustCompat(wsDir, policy);
    expect(result.compatible).toBe(true);
    expect(result.currentTier).toBe(0);
  });

  it('returns currentTier=0 for out-of-range trustTier in claws.json', async () => {
    const wsDir = join(tempDir, 'ws-outrange');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, 'claws.json'), JSON.stringify({ trustTier: 99 }));
    const policy = createPolicy('x2.yaml', 'trustTier: 3\n');

    const result = await checkTrustCompat(wsDir, policy);
    expect(result.compatible).toBe(true);
    expect(result.currentTier).toBe(0);
  });
});

// ── snake_case policy keys ─────────────────────────────────────────────

describe('checkTrustCompat — snake_case policy fields', () => {
  it('reads trust_tier (snake_case) from policy', async () => {
    const ws = createWorkspace('ws-snake-t2', 2);
    const policy = createPolicy('snake.yaml', 'trust_tier: 4\n');

    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
    expect(result.policyTier).toBe(4);
  });

  it('reads publish_restrictions (snake_case) from policy', async () => {
    const ws = createWorkspace('ws-snake-pr', 2);
    const policy = createPolicy('snake-restrict.yaml', [
      'trust_tier: 3',
      'publish_restrictions:',
      '  - maxRiskTier: 3',
      '    maxTrustTier: 2',
    ].join('\n'));

    // ws T2 <= maxTrustTier 2, no tool risk tiers → conservative block
    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('Publish restriction violated');
  });

  it('reads tool_risk_tiers (snake_case) from policy', async () => {
    const ws = createWorkspace('ws-snake-trt', 2);
    const policy = createPolicy('snake-trt.yaml', [
      'trust_tier: 3',
      'publish_restrictions:',
      '  - maxRiskTier: 3',
      '    maxTrustTier: 2',
      'tool_risk_tiers:',
      '  - 2',
      '  - 3',
    ].join('\n'));

    // All tool tiers (max 3) are within cap (3) → no block
    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
  });
});

// ── C-03 publish restrictions ──────────────────────────────────────────

describe('checkTrustCompat — publish restrictions', () => {
  it('blocks when workspace tier is within restriction ceiling and no tool risk tiers declared', async () => {
    const ws = createWorkspace('ws-pr-notools', 2);
    const policy = createPolicy('restrict-notools.yaml', [
      'trustTier: 3',
      'publishRestrictions:',
      '  - maxRiskTier: 3',
      '    maxTrustTier: 3',
    ].join('\n'));

    // ws T2 <= maxTrustTier 3, no toolRiskTiers → conservative block
    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('Publish restriction violated');
    expect(result.reason).toContain('no tool risk tiers declared');
  });

  it('blocks when tool risk tier exceeds cap', async () => {
    const ws = createWorkspace('ws-pr-exceed', 2);
    const policy = createPolicy('restrict-exceed.yaml', [
      'trustTier: 3',
      'publishRestrictions:',
      '  - maxRiskTier: 3',
      '    maxTrustTier: 2',
      'toolRiskTiers:',
      '  - 2',
      '  - 5',
    ].join('\n'));

    // ws T2 <= maxTrustTier 2, max tool tier R5 > R3 cap → blocked
    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(false);
    expect(result.reason).toContain('R5 exceeds R3 cap');
  });

  it('allows when all tool risk tiers are within cap', async () => {
    const ws = createWorkspace('ws-pr-within', 2);
    const policy = createPolicy('restrict-within.yaml', [
      'trustTier: 3',
      'publishRestrictions:',
      '  - maxRiskTier: 4',
      '    maxTrustTier: 3',
      'toolRiskTiers:',
      '  - 1',
      '  - 3',
    ].join('\n'));

    // ws T2 <= maxTrustTier 3, max tool tier R3 <= R4 cap → allowed
    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
  });

  it('allows when workspace tier is above restriction ceiling', async () => {
    const ws = createWorkspace('ws-pr-above', 4);
    const policy = createPolicy('restrict-above.yaml', [
      'trustTier: 5',
      'publishRestrictions:',
      '  - maxRiskTier: 2',
      '    maxTrustTier: 3',
    ].join('\n'));

    // ws T4 > maxTrustTier 3 → restriction does not apply
    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
    expect(result.reason).toContain('maintained or raised');
  });

  it('does not check restrictions when workspace has no readable trust tier', async () => {
    const wsDir = join(tempDir, 'ws-pr-nows');
    mkdirSync(wsDir, { recursive: true });
    const policy = createPolicy('restrict-nows.yaml', [
      'trustTier: 3',
      'publishRestrictions:',
      '  - maxRiskTier: 2',
      '    maxTrustTier: 3',
    ].join('\n'));

    // currentTier=0 → early return "no readable trust tier"
    const result = await checkTrustCompat(wsDir, policy);
    expect(result.compatible).toBe(true);
    expect(result.currentTier).toBe(0);
  });

  it('checks restrictions even when policy has no trust tier', async () => {
    const ws = createWorkspace('ws-pr-notier', 2);
    const policy = createPolicy('restrict-notier.yaml', [
      'publishRestrictions:',
      '  - maxRiskTier: 2',
      '    maxTrustTier: 3',
    ].join('\n'));

    // policyTier=0 but restrictions exist → conservative block (no tool risk tiers)
    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(false);
    expect(result.policyTier).toBe(0);
    expect(result.reason).toContain('Publish restriction violated');
  });

  it('does not block on empty publishRestrictions array', async () => {
    const ws = createWorkspace('ws-pr-empty', 3);
    const policy = createPolicy('restrict-empty.yaml', [
      'trustTier: 4',
      'publishRestrictions: []',
    ].join('\n'));

    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
  });

  it('ignores malformed restriction entries', async () => {
    const ws = createWorkspace('ws-pr-malformed', 2);
    const policy = createPolicy('restrict-bad.yaml', [
      'trustTier: 3',
      'publishRestrictions:',
      '  - maxRiskTier: "high"',
      '    maxTrustTier: 2',
      '  - notARestriction: true',
    ].join('\n'));

    // Both entries are malformed → no valid restrictions → no block
    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
  });

  it('filters out invalid tool risk tiers (out of 1-5 range)', async () => {
    const ws = createWorkspace('ws-pr-badtiers', 2);
    const policy = createPolicy('restrict-badtiers.yaml', [
      'trustTier: 3',
      'publishRestrictions:',
      '  - maxRiskTier: 3',
      '    maxTrustTier: 3',
      'toolRiskTiers:',
      '  - 0',
      '  - 6',
      '  - 2',
    ].join('\n'));

    // Only tier 2 is valid; max tool R2 <= R3 cap → allowed
    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
  });

  it('ignores non-numeric tool risk tier entries', async () => {
    const ws = createWorkspace('ws-pr-nonnumtiers', 2);
    const policy = createPolicy('restrict-nonnumtiers.yaml', [
      'trustTier: 3',
      'publishRestrictions:',
      '  - maxRiskTier: 3',
      '    maxTrustTier: 3',
      'toolRiskTiers:',
      '  - "high"',
      '  - true',
      '  - 2',
    ].join('\n'));

    // Only tier 2 is valid; max tool R2 <= R3 → allowed
    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
  });
});

// ── readPolicyFields edge cases ────────────────────────────────────────

describe('checkTrustCompat — readPolicyFields edge cases', () => {
  it('returns policyTier=0 for non-existent policy file', async () => {
    const ws = createWorkspace('ws-nopol', 3);
    const result = await checkTrustCompat(ws, join(tempDir, 'no-such-file.yaml'));
    expect(result.compatible).toBe(true);
    expect(result.policyTier).toBe(0);
  });

  it('returns policyTier=0 for broken YAML', async () => {
    const ws = createWorkspace('ws-brokenyaml', 3);
    const policy = createPolicy('broken.yaml', '{ broken: [yaml: ???');

    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
    expect(result.policyTier).toBe(0);
  });

  it('returns policyTier=0 for non-numeric trustTier in policy', async () => {
    const ws = createWorkspace('ws-nonnumeric', 3);
    const policy = createPolicy('nonnumeric.yaml', 'trustTier: high\n');

    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
    expect(result.policyTier).toBe(0);
  });

  it('returns policyTier=0 for out-of-range trustTier in policy (0)', async () => {
    const ws = createWorkspace('ws-t0pol', 3);
    const policy = createPolicy('zero.yaml', 'trustTier: 0\n');

    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
    expect(result.policyTier).toBe(0);
  });

  it('returns policyTier=0 for out-of-range trustTier in policy (6)', async () => {
    const ws = createWorkspace('ws-t6pol', 3);
    const policy = createPolicy('six.yaml', 'trustTier: 6\n');

    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
    expect(result.policyTier).toBe(0);
  });

  it('returns policyTier=0 for null YAML content', async () => {
    const ws = createWorkspace('ws-nullyaml', 3);
    const policy = createPolicy('null.yaml', '~\n');

    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
    expect(result.policyTier).toBe(0);
  });

  it('returns policyTier=0 for empty YAML file', async () => {
    const ws = createWorkspace('ws-emptyyaml', 3);
    const policy = createPolicy('empty.yaml', '');

    const result = await checkTrustCompat(ws, policy);
    expect(result.compatible).toBe(true);
    expect(result.policyTier).toBe(0);
  });
});

// ── checkFleetTrustCompat ──────────────────────────────────────────────

describe('checkFleetTrustCompat', () => {
  it('returns allCompatible=true when all workspaces pass', async () => {
    const ws1 = createWorkspace('fleet-ws1', 2);
    const ws2 = createWorkspace('fleet-ws2', 3);
    const policy = createPolicy('fleet-up.yaml', 'trustTier: 4\n');

    const result = await checkFleetTrustCompat([ws1, ws2], policy);
    expect(result.allCompatible).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.results.every((r) => r.compatible)).toBe(true);
  });

  it('returns allCompatible=false when any workspace fails', async () => {
    const ws1 = createWorkspace('fleet-pass', 2);
    const ws2 = createWorkspace('fleet-fail', 5);
    const policy = createPolicy('fleet-down.yaml', 'trustTier: 3\n');

    const result = await checkFleetTrustCompat([ws1, ws2], policy);
    expect(result.allCompatible).toBe(false);
    expect(result.results.filter((r) => r.compatible)).toHaveLength(1);
    expect(result.results.filter((r) => !r.compatible)).toHaveLength(1);
  });

  it('returns allCompatible=true for empty workspace list', async () => {
    const policy = createPolicy('fleet-empty.yaml', 'trustTier: 3\n');

    const result = await checkFleetTrustCompat([], policy);
    expect(result.allCompatible).toBe(true);
    expect(result.results).toHaveLength(0);
  });

  it('propagates publish restriction blocks to fleet result', async () => {
    const ws1 = createWorkspace('fleet-pr1', 2);
    const ws2 = createWorkspace('fleet-pr2', 4);
    const policy = createPolicy('fleet-restrict.yaml', [
      'trustTier: 5',
      'publishRestrictions:',
      '  - maxRiskTier: 2',
      '    maxTrustTier: 3',
    ].join('\n'));

    // ws1 T2 <= maxTrustTier 3 → conservative block (no tool tiers)
    // ws2 T4 > maxTrustTier 3 → allowed
    const result = await checkFleetTrustCompat([ws1, ws2], policy);
    expect(result.allCompatible).toBe(false);
    expect(result.results[0]!.compatible).toBe(false);
    expect(result.results[1]!.compatible).toBe(true);
  });
});
