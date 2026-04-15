/**
 * L2 e2e test for fleet broadcast — scan → broadcast → verify.
 *
 * Full pipeline: create fixture workspaces, scan fleet, broadcast soc2.yaml
 * with --confirm --reason, verify policy landed only in GOVERNED workspaces,
 * UNGOVERNED/MISCONFIGURED skipped, broadcast manifest has reason + audit trail.
 *
 * @module claws-sdk/tests/fleet/broadcast.e2e
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { scanFleet } from '#src/fleet/scan.js';
import { broadcastPolicy } from '#src/fleet/broadcast.js';

const FIXTURES_DIR = join(__dirname, '..', 'fixtures', 'fleet');

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'broadcast-e2e-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('fleet broadcast e2e', () => {
  it('scan fleet → broadcast soc2.yaml --confirm --reason → verify policy + manifest', async () => {
    // 1. Set up fleet: copy fixture workspaces
    cpSync(join(FIXTURES_DIR, 'governed-workspace'), join(tempDir, 'governed'), { recursive: true });
    cpSync(join(FIXTURES_DIR, 'ungoverned-workspace'), join(tempDir, 'ungoverned'), { recursive: true });
    cpSync(join(FIXTURES_DIR, 'misconfigured-workspace'), join(tempDir, 'misconfigured'), { recursive: true });

    // 2. Create the policy file to broadcast
    const policyPath = join(tempDir, 'soc2-baseline.yaml');
    writeFileSync(policyPath, [
      'name: soc2-baseline',
      'version: 2',
      'rules:',
      '  - deny: shell_exec',
      '  - require: approval_for_deploy',
      '  - deny: unmonitored_api_call',
    ].join('\n'));

    // 3. Scan the fleet
    const scanResult = await scanFleet(tempDir, { maxDepth: 2 });
    expect(scanResult.workspaces.length).toBeGreaterThanOrEqual(3);

    // 4. Broadcast with --confirm and --reason
    const broadcastResult = await broadcastPolicy(policyPath, scanResult.workspaces, {
      confirm: true,
      reason: 'Q2 SOC2 compliance update',
    });

    // 5. Verify broadcast executed
    expect(broadcastResult.executed).toBe(true);
    expect(broadcastResult.manifest).toBeDefined();

    const manifest = broadcastResult.manifest!;

    // 6. Verify policy landed ONLY in governed workspaces
    const governedDir = join(tempDir, 'governed', '.claws', 'policies', 'soc2-baseline.yaml');
    expect(existsSync(governedDir)).toBe(true);

    const governedContent = readFileSync(governedDir, 'utf-8');
    expect(governedContent).toContain('soc2-baseline');
    expect(governedContent).toContain('deny: unmonitored_api_call');

    // 7. Verify UNGOVERNED workspace was skipped
    expect(existsSync(join(tempDir, 'ungoverned', '.claws', 'policies', 'soc2-baseline.yaml'))).toBe(false);

    // 8. Verify MISCONFIGURED workspace was skipped
    expect(existsSync(join(tempDir, 'misconfigured', '.claws', 'policies', 'soc2-baseline.yaml'))).toBe(false);

    // 9. Verify manifest has reason + audit trail
    expect(manifest.reason).toBe('Q2 SOC2 compliance update');
    expect(manifest.policyFile).toBe('soc2-baseline.yaml');
    expect(manifest.timestamp).toBeDefined();
    expect(manifest.succeeded).toBeGreaterThanOrEqual(1);
    expect(manifest.skippedCount).toBeGreaterThanOrEqual(2);

    // 10. Verify manifest is on disk in the governed workspace
    const manifestPath = join(tempDir, 'governed', '.claws', 'fleet', 'broadcast-manifest.json');
    expect(existsSync(manifestPath)).toBe(true);

    const diskManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(diskManifest.reason).toBe('Q2 SOC2 compliance update');
    expect(diskManifest.policyFile).toBe('soc2-baseline.yaml');
  });
});
