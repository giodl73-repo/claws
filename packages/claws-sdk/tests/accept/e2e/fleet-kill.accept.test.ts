/**
 * L3 acceptance test for fleet kill switch — reliability contract.
 *
 * Verifies the kill switch contract:
 * - Sentinel blocks next invocation
 * - Double-kill within TTL returns already-killed
 * - Stale sentinel re-activated
 * - Audit event has all required fields
 *
 * @module claws-sdk/tests/accept/e2e/fleet-kill.accept
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { activateKill, readSentinel, checkSentinelBlock } from '#src/fleet/kill.js';
import type { KillSentinel } from '#src/fleet/kill.js';
import { guardedKill } from '#src/fleet/double-kill.js';
import { readAuditChain } from '#src/compliance/audit-chain.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'kill-accept-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

function createWorkspace(name: string): string {
  const wsDir = join(tempDir, name);
  mkdirSync(join(wsDir, '.claws'), { recursive: true });
  writeFileSync(join(wsDir, 'CLAUDE.md'), '# Workspace');
  writeFileSync(join(wsDir, 'claws.json'), JSON.stringify({
    compilerVersion: '2.0.0',
    trustTier: 3,
  }));
  return wsDir;
}

describe('kill switch reliability contract', () => {
  it('sentinel blocks invocation, double-kill within TTL returns already-killed, stale re-activated, audit fields complete', async () => {
    // ── 1. Sentinel blocks next invocation ────────────────────────────

    const ws1 = createWorkspace('ws-block');

    // No sentinel initially — not blocked
    const preBlock = await checkSentinelBlock(ws1);
    expect(preBlock).toBeNull();

    // Activate kill
    await activateKill(ws1, 'security lockdown', 'accept-runner');

    // Now blocked
    const postBlock = await checkSentinelBlock(ws1);
    expect(postBlock).not.toBeNull();
    expect(postBlock!.reason).toBe('security lockdown');
    expect(postBlock!.actor).toBe('accept-runner');
    expect(postBlock!.killPath).toBe('sentinel');

    // ── 2. Double-kill within TTL returns already-killed ──────────────

    const ws2 = createWorkspace('ws-double-kill');

    // First kill
    const first = await guardedKill({
      workspacePath: ws2,
      reason: 'first incident',
      actor: 'team-lead',
      ttlMs: 60_000,
    });
    expect(first.activated).toBe(true);
    expect(first.alreadyKilled).toBe(false);
    expect(first.reactivated).toBe(false);

    // Second kill within TTL — should return already-killed
    const second = await guardedKill({
      workspacePath: ws2,
      reason: 'second incident',
      actor: 'team-lead',
      ttlMs: 60_000,
    });
    expect(second.activated).toBe(false);
    expect(second.alreadyKilled).toBe(true);
    expect(second.reactivated).toBe(false);
    expect(second.message).toContain('Already killed');
    // The sentinel should still have the original reason
    expect(second.sentinel!.reason).toBe('first incident');

    // ── 3. Stale sentinel re-activated ────────────────────────────────

    const ws3 = createWorkspace('ws-stale-kill');

    // Write a stale sentinel manually (3 hours ago)
    const staleTimestamp = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const staleSentinel: KillSentinel = {
      timestamp: staleTimestamp,
      reason: 'ancient incident',
      actor: 'old-admin',
      killPath: 'sentinel',
    };
    writeFileSync(
      join(ws3, '.claws', 'KILL'),
      JSON.stringify(staleSentinel, null, 2) + '\n',
    );

    // Re-activate with 1-hour TTL — sentinel is 3 hours old
    const reactivated = await guardedKill({
      workspacePath: ws3,
      reason: 'fresh lockdown',
      actor: 'new-admin',
      ttlMs: 60 * 60 * 1000,
    });
    expect(reactivated.activated).toBe(true);
    expect(reactivated.reactivated).toBe(true);
    expect(reactivated.alreadyKilled).toBe(false);

    // Verify fresh sentinel replaced stale one
    const freshSentinel = await readSentinel(ws3);
    expect(freshSentinel!.reason).toBe('fresh lockdown');
    expect(freshSentinel!.actor).toBe('new-admin');
    expect(new Date(freshSentinel!.timestamp).getTime()).toBeGreaterThan(
      new Date(staleTimestamp).getTime(),
    );

    // ── 4. Audit event has all required fields ────────────────────────

    // Use ws2 which has a guardedKill audit event from step 2
    const chain = await readAuditChain(ws2);
    expect(chain.length).toBeGreaterThanOrEqual(1);

    const killEvent = chain.find((e) => e.eventType === 'KILL_ACTIVATED');
    expect(killEvent).toBeDefined();

    // All required fields
    expect(killEvent!.seq).toBeDefined();
    expect(typeof killEvent!.seq).toBe('number');
    expect(killEvent!.timestamp).toBeDefined();
    expect(killEvent!.eventType).toBe('KILL_ACTIVATED');
    expect(killEvent!.actor).toBe('team-lead');
    expect(killEvent!.target).toBe(ws2);
    expect(killEvent!.action).toBe('kill:sentinel');
    expect(killEvent!.outcome).toBe('deny');
    expect(killEvent!.ruleId).toBe('FLEET-KILL');
    expect(killEvent!.severity).toBe(5);
    expect(killEvent!.policyVersion).toBe('2.0.0');
    expect(killEvent!.hmacSignature).toBeDefined();
    expect(typeof killEvent!.hmacSignature).toBe('string');
    expect(killEvent!.hmacSignature.length).toBeGreaterThan(0);
    expect(killEvent!.keyId).toBeDefined();
    expect(killEvent!.algorithm).toBeDefined();
  });
});
