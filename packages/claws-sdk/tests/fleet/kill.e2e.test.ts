/**
 * L2 e2e test for fleet kill switch — single workspace kill + fleet kill.
 *
 * End-to-end flow: kill single workspace → verify sentinel + audit.jsonl →
 * kill --fleet on 3 fixtures → verify all governed workspaces have sentinel
 * and audit chain is complete.
 *
 * @module claws-sdk/tests/fleet/kill.e2e
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { guardedKill } from '#src/fleet/double-kill.js';
import { killFleet } from '#src/fleet/kill-fleet.js';
import { readSentinel } from '#src/fleet/kill.js';
import { readAuditChain } from '#src/compliance/audit-chain.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'kill-e2e-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function createGovernedWorkspace(name: string): string {
  const wsDir = join(tempDir, name);
  mkdirSync(join(wsDir, '.claws', 'policies'), { recursive: true });
  writeFileSync(join(wsDir, 'CLAUDE.md'), '# Workspace');
  writeFileSync(join(wsDir, 'claws.json'), JSON.stringify({
    compilerVersion: '1.0.0',
    trustTier: 3,
  }));
  writeFileSync(join(wsDir, '.claws', 'policies', 'default.yaml'), 'name: default\nversion: 1');
  return wsDir;
}

describe('fleet kill e2e', () => {
  it('kill single workspace → verify sentinel + audit → kill fleet on 3 fixtures → verify all', async () => {
    // ── Phase 1: Single workspace kill ────────────────────────────────

    const singleWs = createGovernedWorkspace('single-target');

    const singleResult = await guardedKill({
      workspacePath: singleWs,
      reason: 'e2e single kill',
      actor: 'e2e-runner',
    });

    expect(singleResult.activated).toBe(true);
    expect(singleResult.alreadyKilled).toBe(false);

    // Verify .claws/KILL sentinel
    const sentinel = await readSentinel(singleWs);
    expect(sentinel).not.toBeNull();
    expect(sentinel!.reason).toBe('e2e single kill');
    expect(sentinel!.actor).toBe('e2e-runner');
    expect(sentinel!.killPath).toBe('sentinel');
    expect(sentinel!.timestamp).toBeDefined();

    // Verify audit chain entry
    const singleChain = await readAuditChain(singleWs);
    expect(singleChain.length).toBeGreaterThanOrEqual(1);
    const singleKillEvent = singleChain.find((e) => e.eventType === 'KILL_ACTIVATED');
    expect(singleKillEvent).toBeDefined();
    expect(singleKillEvent!.action).toBe('kill:sentinel');
    expect(singleKillEvent!.actor).toBe('e2e-runner');

    // ── Phase 2: Fleet kill on 3 fresh fixtures ──────────────────────

    // Create a separate fleet directory for isolation
    const fleetDir = join(tempDir, 'fleet');
    mkdirSync(fleetDir, { recursive: true });

    const ws1Dir = join(fleetDir, 'ws1');
    const ws2Dir = join(fleetDir, 'ws2');
    const ws3Dir = join(fleetDir, 'ws3');

    for (const [dir, name] of [[ws1Dir, 'ws1'], [ws2Dir, 'ws2'], [ws3Dir, 'ws3']] as const) {
      mkdirSync(join(dir, '.claws', 'policies'), { recursive: true });
      writeFileSync(join(dir, 'CLAUDE.md'), `# ${name}`);
      writeFileSync(join(dir, 'claws.json'), JSON.stringify({
        compilerVersion: '1.0.0',
        trustTier: 3,
      }));
      writeFileSync(join(dir, '.claws', 'policies', 'default.yaml'), 'name: default\nversion: 1');
    }

    const fleetResult = await killFleet({
      fleetDir,
      reason: 'e2e fleet emergency',
      actor: 'e2e-fleet-admin',
    });

    expect(fleetResult.totalDiscovered).toBe(3);
    expect(fleetResult.activated).toBe(3);
    expect(fleetResult.failed).toBe(0);

    // Verify all 3 workspaces have sentinel + audit chain
    for (const wsPath of [ws1Dir, ws2Dir, ws3Dir]) {
      // Sentinel present
      const fSentinel = await readSentinel(wsPath);
      expect(fSentinel).not.toBeNull();
      expect(fSentinel!.reason).toBe('e2e fleet emergency');
      expect(fSentinel!.actor).toBe('e2e-fleet-admin');
      expect(fSentinel!.killPath).toBe('sentinel');

      // Sentinel file on disk
      expect(existsSync(join(wsPath, '.claws', 'KILL'))).toBe(true);

      // Audit chain complete
      const chain = await readAuditChain(wsPath);
      const killEvents = chain.filter((e) => e.eventType === 'KILL_ACTIVATED');
      expect(killEvents).toHaveLength(1);
      expect(killEvents[0]!.action).toBe('kill:sentinel');
      expect(killEvents[0]!.actor).toBe('e2e-fleet-admin');
      expect(killEvents[0]!.target).toBe(wsPath);
      expect(killEvents[0]!.hmacSignature).toBeDefined();
    }
  });
});
