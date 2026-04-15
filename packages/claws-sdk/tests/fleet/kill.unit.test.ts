/**
 * L0 unit tests for fleet kill switch — sentinel write, block check,
 * double-kill prevention, audit event, sentinel JSON format.
 *
 * @module claws-sdk/tests/fleet/kill.unit
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { activateKill, readSentinel, checkSentinelBlock } from '#src/fleet/kill.js';
import type { KillSentinel } from '#src/fleet/kill.js';
import { guardedKill, isSentinelStale } from '#src/fleet/double-kill.js';
import { recordKillAuditEvent } from '#src/fleet/kill-audit.js';
import { readAuditChain } from '#src/compliance/audit-chain.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'kill-unit-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/**
 * Helper: create a workspace with .claws directory and claws.json.
 */
function createWorkspace(name: string): string {
  const wsDir = join(tempDir, name);
  mkdirSync(join(wsDir, '.claws'), { recursive: true });
  writeFileSync(join(wsDir, 'CLAUDE.md'), '# Workspace');
  writeFileSync(join(wsDir, 'claws.json'), JSON.stringify({
    compilerVersion: '1.0.0',
    trustTier: 3,
  }));
  return wsDir;
}

// ── sentinel write ──────────────────────────────────────────────────────

describe('sentinel write creates .claws/KILL with correct JSON', () => {
  it('writes sentinel with structured JSON content', async () => {
    const wsDir = createWorkspace('ws-write');

    const result = await activateKill(wsDir, 'emergency shutdown', 'test-actor');

    expect(result.activated).toBe(true);
    expect(result.killPath).toBe('sentinel');

    // Verify file exists
    const sentinelPath = join(wsDir, '.claws', 'KILL');
    expect(existsSync(sentinelPath)).toBe(true);

    // Verify JSON content
    const content = JSON.parse(readFileSync(sentinelPath, 'utf-8')) as KillSentinel;
    expect(content.reason).toBe('emergency shutdown');
    expect(content.actor).toBe('test-actor');
    expect(content.killPath).toBe('sentinel');
    expect(content.timestamp).toBeDefined();
    // ISO 8601 format
    expect(new Date(content.timestamp).toISOString()).toBe(content.timestamp);
  });
});

// ── sentinel blocks invocation ──────────────────────────────────────────

describe('sentinel blocks next claws invocation', () => {
  it('checkSentinelBlock returns sentinel when KILL file exists', async () => {
    const wsDir = createWorkspace('ws-block');

    // Activate kill
    await activateKill(wsDir, 'security incident', 'admin');

    // Check block
    const blocked = await checkSentinelBlock(wsDir);
    expect(blocked).not.toBeNull();
    expect(blocked!.reason).toBe('security incident');
    expect(blocked!.actor).toBe('admin');
  });

  it('checkSentinelBlock returns null when no sentinel exists', async () => {
    const wsDir = createWorkspace('ws-no-block');

    const blocked = await checkSentinelBlock(wsDir);
    expect(blocked).toBeNull();
  });
});

// ── double-kill prevention: recent sentinel ────────────────────────────

describe('double-kill prevention skips recent sentinel', () => {
  it('returns alreadyKilled when sentinel is within TTL', async () => {
    const wsDir = createWorkspace('ws-double');

    // First kill
    const first = await guardedKill({
      workspacePath: wsDir,
      reason: 'first kill',
      actor: 'actor-1',
      ttlMs: 60_000, // 1 minute TTL
    });
    expect(first.activated).toBe(true);
    expect(first.alreadyKilled).toBe(false);

    // Second kill — should be skipped
    const second = await guardedKill({
      workspacePath: wsDir,
      reason: 'second kill',
      actor: 'actor-2',
      ttlMs: 60_000,
    });
    expect(second.activated).toBe(false);
    expect(second.alreadyKilled).toBe(true);
    expect(second.reactivated).toBe(false);
    expect(second.message).toContain('Already killed');
  });
});

// ── double-kill: stale sentinel re-activated ───────────────────────────

describe('double-kill re-activates stale sentinel', () => {
  it('re-activates when sentinel is beyond TTL', async () => {
    const wsDir = createWorkspace('ws-stale');

    // Write a stale sentinel (2 hours ago)
    const staleTimestamp = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const staleSentinel: KillSentinel = {
      timestamp: staleTimestamp,
      reason: 'old reason',
      actor: 'old-actor',
      killPath: 'sentinel',
    };
    mkdirSync(join(wsDir, '.claws'), { recursive: true });
    writeFileSync(
      join(wsDir, '.claws', 'KILL'),
      JSON.stringify(staleSentinel, null, 2) + '\n',
    );

    // Re-activate with 1 hour TTL — sentinel is 2 hours old, so stale
    const result = await guardedKill({
      workspacePath: wsDir,
      reason: 'fresh reason',
      actor: 'new-actor',
      ttlMs: 60 * 60 * 1000, // 1 hour
    });

    expect(result.activated).toBe(true);
    expect(result.reactivated).toBe(true);
    expect(result.alreadyKilled).toBe(false);

    // Verify sentinel was updated
    const sentinel = await readSentinel(wsDir);
    expect(sentinel!.reason).toBe('fresh reason');
    expect(sentinel!.actor).toBe('new-actor');
  });
});

// ── audit event recorded ─────────────────────────────────────────────

describe('audit event recorded with all required fields', () => {
  it('records KILL_ACTIVATED event in audit chain', async () => {
    const wsDir = createWorkspace('ws-audit');

    await recordKillAuditEvent(wsDir, 'sentinel', 'compliance violation', 'security-team');

    const chain = await readAuditChain(wsDir);
    expect(chain).toHaveLength(1);
    expect(chain[0]!.eventType).toBe('KILL_ACTIVATED');
    expect(chain[0]!.target).toBe(wsDir);
    expect(chain[0]!.action).toBe('kill:sentinel');
    expect(chain[0]!.outcome).toBe('deny');
    expect(chain[0]!.ruleId).toBe('FLEET-KILL');
    expect(chain[0]!.severity).toBe(5);
    expect(chain[0]!.actor).toBe('security-team');
    expect(chain[0]!.policyVersion).toBe('1.0.0');
    expect(chain[0]!.timestamp).toBeDefined();
    expect(chain[0]!.hmacSignature).toBeDefined();
    expect(chain[0]!.keyId).toBeDefined();
  });
});

// ── sentinel JSON contains all required fields ─────────────────────────

describe('sentinel JSON contains all required fields', () => {
  it('sentinel has timestamp, reason, actor, killPath', async () => {
    const wsDir = createWorkspace('ws-fields');

    await activateKill(wsDir, 'test reason', 'test-user');

    const sentinel = await readSentinel(wsDir);
    expect(sentinel).not.toBeNull();

    // All required fields present
    expect(sentinel).toHaveProperty('timestamp');
    expect(sentinel).toHaveProperty('reason');
    expect(sentinel).toHaveProperty('actor');
    expect(sentinel).toHaveProperty('killPath');

    // Types and values
    expect(typeof sentinel!.timestamp).toBe('string');
    expect(typeof sentinel!.reason).toBe('string');
    expect(typeof sentinel!.actor).toBe('string');
    expect(sentinel!.killPath).toBe('sentinel');
    expect(sentinel!.reason).toBe('test reason');
    expect(sentinel!.actor).toBe('test-user');
  });

  it('isSentinelStale returns true for old sentinel', () => {
    const old: KillSentinel = {
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      reason: 'old',
      actor: 'user',
      killPath: 'sentinel',
    };
    expect(isSentinelStale(old, 60 * 60 * 1000)).toBe(true);
  });

  it('isSentinelStale returns false for fresh sentinel', () => {
    const fresh: KillSentinel = {
      timestamp: new Date().toISOString(),
      reason: 'new',
      actor: 'user',
      killPath: 'sentinel',
    };
    expect(isSentinelStale(fresh, 60 * 60 * 1000)).toBe(false);
  });

  it('readSentinel returns null for invalid JSON', async () => {
    const wsDir = createWorkspace('ws-invalid-json');
    writeFileSync(join(wsDir, '.claws', 'KILL'), 'not json');
    const sentinel = await readSentinel(wsDir);
    expect(sentinel).toBeNull();
  });

  it('readSentinel returns null when no .claws dir', async () => {
    const wsDir = join(tempDir, 'ws-no-claws');
    mkdirSync(wsDir, { recursive: true });
    const sentinel = await readSentinel(wsDir);
    expect(sentinel).toBeNull();
  });

  it('activateKill creates .claws directory if missing', async () => {
    const wsDir = join(tempDir, 'ws-no-claws-dir');
    mkdirSync(wsDir, { recursive: true });
    // No .claws directory yet

    const result = await activateKill(wsDir, 'test', 'user');
    expect(result.activated).toBe(true);
    expect(existsSync(join(wsDir, '.claws', 'KILL'))).toBe(true);
  });

  it('activateKill uses OS user when actor not provided', async () => {
    const wsDir = createWorkspace('ws-default-actor');
    const result = await activateKill(wsDir, 'test');
    expect(result.activated).toBe(true);
    expect(result.sentinel!.actor).toBeDefined();
    expect(result.sentinel!.actor.length).toBeGreaterThan(0);
  });

  it('activateKill returns failure when write fails with Error', async () => {
    // Create a path where .claws is a file (not a directory) to cause write failure
    const wsDir = join(tempDir, 'ws-write-fail');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, '.claws'), 'I am a file blocking mkdir');

    const result = await activateKill(wsDir, 'should fail', 'test');
    expect(result.activated).toBe(false);
    expect(result.killPath).toBe('sentinel');
    expect(result.message).toContain('Failed to activate kill sentinel');
    expect(result.sentinel).toBeUndefined();
  });
});

// ── guardedKill edge cases ──────────────────────────────────────────────

describe('guardedKill edge cases', () => {
  it('handles stale sentinel with failed re-activation gracefully', async () => {
    const wsDir = join(tempDir, 'ws-stale-fail');
    mkdirSync(wsDir, { recursive: true });

    // Write a stale sentinel
    const staleTimestamp = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    mkdirSync(join(wsDir, '.claws'), { recursive: true });
    writeFileSync(join(wsDir, '.claws', 'KILL'), JSON.stringify({
      timestamp: staleTimestamp,
      reason: 'old',
      actor: 'old-actor',
      killPath: 'sentinel',
    }, null, 2) + '\n');

    // Now make .claws a location where writes fail by replacing KILL with something unwritable
    // Actually, activateKill creates .claws dir - we need to make it fail differently
    // Replace the .claws directory with a file at .claws to break mkdir
    rmSync(join(wsDir, '.claws'), { recursive: true, force: true });
    writeFileSync(join(wsDir, '.claws'), 'file-blocking-dir');

    // readSentinel will fail (path is now a file, not dir), so guardedKill should do fresh activation
    // Fresh activation will also fail because .claws is a file
    const result = await guardedKill({
      workspacePath: wsDir,
      reason: 'should fail',
      actor: 'test',
      ttlMs: 60 * 60 * 1000,
    });

    // activateKill catches the error and returns activated=false
    expect(result.activated).toBe(false);
    expect(result.alreadyKilled).toBe(false);
  });
});

// ── killFleet edge cases ────────────────────────────────────────────────

import { killFleet } from '#src/fleet/kill-fleet.js';

describe('killFleet edge cases', () => {
  it('works without actor and ttlMs (uses defaults)', async () => {
    const fleetDir = join(tempDir, 'fleet-default-dir');
    mkdirSync(fleetDir, { recursive: true });
    const wsDir = join(fleetDir, 'ws1');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, 'CLAUDE.md'), '# Workspace');

    const result = await killFleet({
      fleetDir,
      reason: 'default params test',
    });

    expect(result.totalDiscovered).toBe(1);
    expect(result.activated).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('reports failed count when activation fails', async () => {
    const fleetDir = join(tempDir, 'fleet-fail-dir');
    mkdirSync(fleetDir, { recursive: true });
    const wsDir = join(fleetDir, 'ws-fail');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, 'CLAUDE.md'), '# Workspace');
    // Block .claws creation by making it a file
    writeFileSync(join(wsDir, '.claws'), 'blocking file');

    const result = await killFleet({
      fleetDir,
      reason: 'fail test',
      actor: 'test',
    });

    expect(result.failed).toBe(1);
    expect(result.activated).toBe(0);
    const failedResults = result.results.filter((r) => !r.activated && !r.alreadyKilled);
    expect(failedResults).toHaveLength(1);
  });

  it('passes ttlMs when provided without actor', async () => {
    const fleetDir = join(tempDir, 'fleet-ttl-dir');
    mkdirSync(fleetDir, { recursive: true });
    const wsDir = join(fleetDir, 'ws1');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, 'CLAUDE.md'), '# Workspace');

    const result = await killFleet({
      fleetDir,
      reason: 'ttl test',
      ttlMs: 120_000,
    });

    expect(result.totalDiscovered).toBe(1);
    expect(result.activated).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('passes both actor and ttlMs', async () => {
    const fleetDir = join(tempDir, 'fleet-both-dir');
    mkdirSync(fleetDir, { recursive: true });
    const wsDir = join(fleetDir, 'ws1');
    mkdirSync(wsDir, { recursive: true });
    writeFileSync(join(wsDir, 'CLAUDE.md'), '# Workspace');

    const result = await killFleet({
      fleetDir,
      reason: 'both params test',
      actor: 'admin',
      ttlMs: 60_000,
    });

    expect(result.totalDiscovered).toBe(1);
    expect(result.activated).toBe(1);
  });

  it('handles empty fleet directory', async () => {
    const emptyDir = join(tempDir, 'empty-fleet');
    mkdirSync(emptyDir, { recursive: true });

    const result = await killFleet({
      fleetDir: emptyDir,
      reason: 'empty test',
    });

    expect(result.totalDiscovered).toBe(0);
    expect(result.activated).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it('passes scanConfig to fleet scanner', async () => {
    const fleetDir = join(tempDir, 'fleet-config-dir');
    mkdirSync(fleetDir, { recursive: true });
    // Workspace deeply nested — maxDepth=0 should not find it
    const deepWs = join(fleetDir, 'deep', 'ws');
    mkdirSync(deepWs, { recursive: true });
    writeFileSync(join(deepWs, 'CLAUDE.md'), '# Deep');

    const result = await killFleet({
      fleetDir,
      reason: 'depth test',
      scanConfig: { maxDepth: 0 },
    });

    // maxDepth=0 only scans the root, which has no markers
    expect(result.totalDiscovered).toBe(0);
  });
});
