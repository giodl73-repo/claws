/**
 * L1: PROTECT fleet-drift — fleet scan -> drift detection -> broadcast pipeline.
 *
 * Integration test covering the THOTH-INTEGRATION-COVERAGE gap: verifies
 * that fleet scan discovers workspaces, drift detection identifies drifted
 * workspaces, and broadcast policy can target only non-drifted workspaces.
 *
 * Uses 3 fixture workspaces: 2 matching baseline, 1 drifted.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { scanFleet } from '../../src/fleet/scan.js';
import { detectDrift } from '../../src/fleet/drift.js';
import { establishBaseline } from '../../src/fleet/baseline.js';
import { broadcastPolicy } from '../../src/fleet/broadcast.js';

const BASE_CONFIG = {
  trustTier: 3,
  suppressions: [],
  format: 'terminal',
  policySet: 'default',
  auditLevel: 'full',
  failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
  fleet: { allowBypass: false },
};

/** Scaffold a governed workspace with specified config. */
async function createGoverned(
  basePath: string,
  config: Record<string, unknown>,
  policyContent = 'name: default\nversion: 1\nrules:\n  - deny: shell_exec\n',
): Promise<void> {
  await mkdir(join(basePath, '.claws', 'policies'), { recursive: true });
  await writeFile(join(basePath, 'CLAUDE.md'), '# Workspace');
  await writeFile(join(basePath, 'claws.json'), JSON.stringify(config, null, 2));
  await writeFile(join(basePath, '.claws', 'policies', 'default.yaml'), policyContent);
}

describe('fleet scan -> drift detection -> broadcast pipeline across 3 workspaces', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('discovers workspaces, detects drift on one, and broadcast targets only clean ones', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-fleet-drift-int-'));

    // Create 3 governed workspaces: 2 matching baseline, 1 drifted
    const ws1 = join(tempDir, 'ws-clean-1');
    const ws2 = join(tempDir, 'ws-clean-2');
    const ws3 = join(tempDir, 'ws-drifted');

    await createGoverned(ws1, BASE_CONFIG);
    await createGoverned(ws2, BASE_CONFIG);
    // ws3 has lowered trust tier — should be detected as drift
    await createGoverned(ws3, { ...BASE_CONFIG, trustTier: 1 });

    // Step 1: Fleet scan discovers all 3
    const scanResult = await scanFleet(tempDir, { maxDepth: 2 });
    expect(scanResult.workspaces.length).toBeGreaterThanOrEqual(3);

    // Step 2: Establish baseline from ws1
    const baseline = await establishBaseline(ws1, 'test', tempDir);
    expect(baseline).not.toBeNull();

    // Step 3: Drift detection
    const workspacePaths = scanResult.workspaces.map((ws) => ws.path);
    const driftResults = await detectDrift(workspacePaths, baseline);

    expect(driftResults.length).toBeGreaterThanOrEqual(3);

    // At least 2 workspaces are clean
    const cleanResults = driftResults.filter((r) => r.status === 'clean');
    expect(cleanResults.length).toBeGreaterThanOrEqual(2);

    // At least 1 workspace has drift
    const driftedResults = driftResults.filter((r) => r.status === 'drifted');
    expect(driftedResults.length).toBeGreaterThanOrEqual(1);

    // Step 4: Broadcast targets only clean workspaces (dry-run)
    // Create a new policy file to broadcast
    const newPolicy = join(tempDir, 'updated-policy.yaml');
    await writeFile(newPolicy, 'name: updated\nversion: 2\nrules:\n  - deny: shell_exec\n  - deny: file_write\n');

    // Filter to only non-drifted governed workspaces
    const cleanWorkspaces = scanResult.workspaces.filter((ws) =>
      cleanResults.some((dr) => dr.workspacePath === ws.path),
    );

    const broadcastResult = await broadcastPolicy(newPolicy, cleanWorkspaces, {
      confirm: false,
      reason: 'fleet-drift-test',
      actor: 'test',
    });

    // Dry-run preview should show governed workspaces as would_broadcast
    expect(broadcastResult.executed).toBe(false);
    expect(broadcastResult.preview).toBeDefined();
    const wouldBroadcast = broadcastResult.preview!.filter((p) => p.action === 'would_broadcast');
    expect(wouldBroadcast.length).toBeGreaterThanOrEqual(2);
  });
});
