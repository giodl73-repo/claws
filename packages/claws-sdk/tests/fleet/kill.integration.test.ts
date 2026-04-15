/**
 * L1 integration tests for fleet kill switch — multi-module interactions.
 *
 * Tests the full kill pipeline: sentinel write + audit chain recording,
 * and fleet-wide kill across multiple discovered workspaces.
 *
 * @module claws-sdk/tests/fleet/kill.integration
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
  tempDir = mkdtempSync(join(tmpdir(), 'kill-integ-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/**
 * Helper: create a governed workspace with OC markers.
 */
function createGovernedWorkspace(name: string): string {
  const wsDir = join(tempDir, name);
  mkdirSync(join(wsDir, '.claws', 'policies'), { recursive: true });
  writeFileSync(join(wsDir, 'CLAUDE.md'), '# Workspace');
  writeFileSync(join(wsDir, 'claws.json'), JSON.stringify({
    compilerVersion: '1.0.0',
    trustTier: 3,
    failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
  }));
  writeFileSync(join(wsDir, '.claws', 'policies', 'default.yaml'), 'name: default\nversion: 1');
  return wsDir;
}

/**
 * Helper: create an ungoverned workspace (markers but no .claws).
 */
function createUngovernedWorkspace(name: string): string {
  const wsDir = join(tempDir, name);
  mkdirSync(wsDir, { recursive: true });
  writeFileSync(join(wsDir, 'CLAUDE.md'), '# Ungoverned Workspace');
  return wsDir;
}

describe('kill on fixture workspace creates sentinel + audit event', () => {
  it('sentinel path creates KILL file and audit event via guardedKill', async () => {
    const wsDir = createGovernedWorkspace('governed-ws');

    const result = await guardedKill({
      workspacePath: wsDir,
      reason: 'security incident alpha',
      actor: 'integration-test',
    });

    // Kill activated
    expect(result.activated).toBe(true);
    expect(result.alreadyKilled).toBe(false);
    expect(result.reactivated).toBe(false);

    // Sentinel file exists with correct content
    const sentinel = await readSentinel(wsDir);
    expect(sentinel).not.toBeNull();
    expect(sentinel!.reason).toBe('security incident alpha');
    expect(sentinel!.actor).toBe('integration-test');
    expect(sentinel!.killPath).toBe('sentinel');

    // Audit event recorded
    const chain = await readAuditChain(wsDir);
    expect(chain.length).toBeGreaterThanOrEqual(1);
    const killEvent = chain.find((e) => e.eventType === 'KILL_ACTIVATED');
    expect(killEvent).toBeDefined();
    expect(killEvent!.action).toBe('kill:sentinel');
    expect(killEvent!.actor).toBe('integration-test');
    expect(killEvent!.target).toBe(wsDir);
    expect(killEvent!.severity).toBe(5);
  });
});

describe('fleet-wide kill activates across all discovered workspaces', () => {
  it('kills all workspaces including governed and ungoverned', async () => {
    const gov1 = createGovernedWorkspace('fleet-gov-1');
    const gov2 = createGovernedWorkspace('fleet-gov-2');
    const ungov = createUngovernedWorkspace('fleet-ungov');

    const result = await killFleet({
      fleetDir: tempDir,
      reason: 'fleet emergency shutdown',
      actor: 'fleet-admin',
    });

    // All 3 workspaces discovered and killed
    expect(result.totalDiscovered).toBe(3);
    expect(result.activated).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.alreadyKilled).toBe(0);

    // Verify sentinel on each workspace
    for (const wsPath of [gov1, gov2, ungov]) {
      const sentinel = await readSentinel(wsPath);
      expect(sentinel).not.toBeNull();
      expect(sentinel!.reason).toBe('fleet emergency shutdown');
      expect(sentinel!.actor).toBe('fleet-admin');
    }

    // Verify audit events on governed workspaces (they have claws.json)
    for (const wsPath of [gov1, gov2]) {
      const chain = await readAuditChain(wsPath);
      const killEvents = chain.filter((e) => e.eventType === 'KILL_ACTIVATED');
      expect(killEvents).toHaveLength(1);
    }

    // Ungoverned workspace also gets audit event
    const ungovChain = await readAuditChain(ungov);
    const killEvents = ungovChain.filter((e) => e.eventType === 'KILL_ACTIVATED');
    expect(killEvents).toHaveLength(1);
  });
});
