/**
 * L3 acceptance test for fleet broadcast — atomicity + monotonic tightening contract.
 *
 * Verifies the broadcast contract:
 * - Atomic write via staging directory
 * - Trust floor cannot be lowered (monotonic tightening)
 * - Partial failure on one workspace doesn't block others
 *
 * @module claws-sdk/tests/accept/e2e/fleet-broadcast.accept
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { broadcastPolicy, recoverOrphanedStaging } from '#src/fleet/broadcast.js';
import type { WorkspaceInfo } from '#src/fleet/types.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'broadcast-accept-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/**
 * Helper: create a governed workspace.
 */
function createGovernedWorkspace(name: string, trustTier = 3): string {
  const wsDir = join(tempDir, name);
  mkdirSync(join(wsDir, '.claws', 'policies'), { recursive: true });
  writeFileSync(join(wsDir, 'CLAUDE.md'), '# Workspace');
  writeFileSync(join(wsDir, 'claws.json'), JSON.stringify({
    trustTier,
    failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
    fleet: { allowBypass: false },
  }));
  writeFileSync(join(wsDir, '.claws', 'policies', 'default.yaml'), 'name: default\nversion: 1');
  return wsDir;
}

/**
 * Helper: create a policy YAML file.
 */
function createPolicyFile(name: string, trustTier?: number): string {
  const filePath = join(tempDir, name);
  const content = [
    'name: acceptance-policy',
    'version: 1',
    ...(trustTier !== undefined ? [`trustTier: ${trustTier}`] : []),
    'rules:',
    '  - deny: shell_exec',
  ].join('\n');
  writeFileSync(filePath, content);
  return filePath;
}

describe('fleet broadcast acceptance contract', () => {
  it('atomic staging write + monotonic tightening + partial failure isolation', async () => {
    // ── Setup ──────────────────────────────────────────────────────────

    // Workspace 1: trust tier 2 — broadcast with tier 3 should succeed (tightening)
    const ws1 = createGovernedWorkspace('ws-tier2', 2);

    // Workspace 2: trust tier 4 — broadcast with tier 3 should be BLOCKED (loosening)
    const ws2 = createGovernedWorkspace('ws-tier4', 4);

    // Workspace 3: trust tier 3 — broadcast with tier 3 should succeed (same tier)
    const ws3 = createGovernedWorkspace('ws-tier3', 3);

    // Policy that declares trust tier 3
    const policyPath = createPolicyFile('tighten.yaml', 3);

    const workspaces: WorkspaceInfo[] = [
      { path: ws1, markers: ['CLAUDE.md'], classification: 'GOVERNED', rationale: 'Valid' },
      { path: ws2, markers: ['CLAUDE.md'], classification: 'GOVERNED', rationale: 'Valid' },
      { path: ws3, markers: ['CLAUDE.md'], classification: 'GOVERNED', rationale: 'Valid' },
    ];

    // ── Execute ────────────────────────────────────────────────────────

    const result = await broadcastPolicy(policyPath, workspaces, {
      confirm: true,
      reason: 'Monotonic tightening test',
    });

    // ── Verify: broadcast executed ─────────────────────────────────────

    expect(result.executed).toBe(true);
    const manifest = result.manifest!;

    // ── Verify: atomicity — files are in policies/, staging cleaned up ─

    // ws1 (T2→T3): policy should be in policies/
    const ws1Policy = join(ws1, '.claws', 'policies', 'tighten.yaml');
    expect(existsSync(ws1Policy)).toBe(true);
    expect(readFileSync(ws1Policy, 'utf-8')).toContain('acceptance-policy');

    // ws1: staging dir should be cleaned up
    expect(existsSync(join(ws1, '.claws', 'broadcast-staging'))).toBe(false);

    // ws3 (T3→T3): policy should be in policies/
    const ws3Policy = join(ws3, '.claws', 'policies', 'tighten.yaml');
    expect(existsSync(ws3Policy)).toBe(true);

    // ws3: staging dir should be cleaned up
    expect(existsSync(join(ws3, '.claws', 'broadcast-staging'))).toBe(false);

    // ── Verify: monotonic tightening — ws2 blocked ─────────────────────

    // ws2 (T4→T3): policy should NOT be written (trust floor lowered)
    expect(existsSync(join(ws2, '.claws', 'policies', 'tighten.yaml'))).toBe(false);

    // ws2 result should indicate trust compat blocked
    const ws2Result = manifest.results.find((r) => r.path === ws2);
    expect(ws2Result).toBeDefined();
    expect(ws2Result!.success).toBe(false);
    expect(ws2Result!.skipped).toBe(true);
    expect(ws2Result!.message).toContain('Trust compat blocked');

    // ── Verify: partial failure isolation ───────────────────────────────

    // ws2 failure did NOT block ws1 or ws3
    expect(manifest.succeeded).toBe(2);
    expect(manifest.skippedCount).toBe(1);
    expect(manifest.failed).toBe(0);

    // ── Verify: orphaned staging recovery ──────────────────────────────

    // Simulate an orphaned staging file
    const orphanDir = join(ws1, '.claws', 'broadcast-staging');
    mkdirSync(orphanDir, { recursive: true });
    writeFileSync(join(orphanDir, 'orphan.yaml'), 'name: orphan\nversion: 1');

    const recovered = await recoverOrphanedStaging(ws1);
    expect(recovered).toContain('orphan.yaml');
    expect(existsSync(join(ws1, '.claws', 'policies', 'orphan.yaml'))).toBe(true);
    expect(existsSync(orphanDir)).toBe(false);
  });
});
