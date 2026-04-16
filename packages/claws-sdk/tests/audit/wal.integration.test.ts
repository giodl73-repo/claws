/**
 * L1: Audit WAL integration — full lifecycle: write → crash → recover → verify,
 * and WAL cleanup after successful approval.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { AuditWal } from '../../src/audit/wal.js';
import type { MonotonicClock, WalEntry } from '../../src/audit/wal.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wal-integ-'));
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

/**
 * Pin Date.now() so wall-clock elapsed >= desiredElapsedMs for ALL entries.
 * Uses the latest wallClockStart so even the newest entry sees enough elapsed time.
 */
function pinDateNow(
  entries: Array<{ wallClockStart: string }>,
  desiredElapsedMs: number,
): void {
  const latest = Math.max(...entries.map((e) => new Date(e.wallClockStart).getTime()));
  vi.spyOn(Date, 'now').mockReturnValue(latest + desiredElapsedMs);
}

describe('full WAL lifecycle: write → simulate crash → recover → verify remaining timeout', () => {
  it('recovers in-flight approvals with correct remaining timeouts after simulated crash', () => {
    const key = randomBytes(32);
    let clockNs = BigInt(0);
    const clock: MonotonicClock = () => clockNs;

    // --- Phase 1: Normal operation — start 3 approvals ---
    const wal1 = new AuditWal(tmpDir, key, clock);

    clockNs = BigInt(1_000_000_000); // t=1s
    const entry1 = wal1.startApproval({
      operationId: 'op-001',
      timeoutMs: 60_000,
      actor: 'agent-1',
      target: 'Bash',
      action: 'invoke',
    });

    clockNs = BigInt(2_000_000_000); // t=2s
    const entry2 = wal1.startApproval({
      operationId: 'op-002',
      timeoutMs: 30_000,
      actor: 'agent-2',
      target: 'FileWrite',
      action: 'create',
    });

    clockNs = BigInt(3_000_000_000); // t=3s
    const entry3 = wal1.startApproval({
      operationId: 'op-003',
      timeoutMs: 10_000,
      actor: 'agent-3',
      target: 'Network',
      action: 'connect',
    });

    // Verify WAL file has 3 append records
    const walPath = path.join(tmpDir, '.claws', 'audit', 'wal.jsonl');
    expect(fs.existsSync(walPath)).toBe(true);
    const lines = fs.readFileSync(walPath, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(3);

    // --- Phase 2: CRASH (process dies — wal1 is gone) ---

    // --- Phase 3: Recovery — 15 seconds after crash ---
    const wal2 = new AuditWal(tmpDir, key, clock);
    // Pin wall-clock so min(monotonic, wallClock) = 15_000 for all entries
    pinDateNow([entry1, entry2, entry3], 15_000);
    const result = wal2.recover(15_000);

    // op-001: 60s timeout, 15s elapsed → 45s remaining (active)
    // op-002: 30s timeout, 15s elapsed → 15s remaining (active)
    // op-003: 10s timeout, 15s elapsed → -5s remaining (expired)
    expect(result.active).toHaveLength(2);
    expect(result.expired).toHaveLength(1);
    expect(result.tampered).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);

    // Verify active approvals
    const activeOps = result.active.map((a) => ({
      id: a.entry.operationId,
      remaining: a.remainingMs,
    }));
    activeOps.sort((a, b) => a.id.localeCompare(b.id));
    expect(activeOps[0]).toEqual({ id: 'op-001', remaining: 45_000 });
    expect(activeOps[1]).toEqual({ id: 'op-002', remaining: 15_000 });

    // Verify expired approval
    expect(result.expired[0]!.entry.operationId).toBe('op-003');
    expect(result.expired[0]!.elapsedMs).toBe(15_000);

    // --- Phase 4: Verify HMAC integrity ---
    // Tamper with the WAL file directly — modify an entry's operationId
    vi.restoreAllMocks(); // clear Date.now mock before re-reading
    const rawContent = fs.readFileSync(walPath, 'utf8');
    const tamperedContent = rawContent.replace('op-002', 'op-XXX');
    fs.writeFileSync(walPath, tamperedContent, 'utf8');

    const wal3 = new AuditWal(tmpDir, key, clock);
    pinDateNow([entry1, entry3], 15_000);
    const tamperedResult = wal3.recover(15_000);

    // The tampered entry should be detected
    expect(tamperedResult.tampered).toHaveLength(1);
    expect(tamperedResult.tampered[0]!.reason).toContain('HMAC');
    // op-001 still active, op-003 still expired
    expect(tamperedResult.active).toHaveLength(1);
    expect(tamperedResult.expired).toHaveLength(1);
  });
});

describe('WAL cleanup after successful approval', () => {
  it('removes completed approvals from WAL via compact', () => {
    const key = randomBytes(32);
    let clockNs = BigInt(0);
    const clock: MonotonicClock = () => clockNs;

    const wal = new AuditWal(tmpDir, key, clock);

    // Start 3 approvals
    clockNs = BigInt(1_000_000_000);
    const entry1 = wal.startApproval({
      operationId: 'op-A',
      timeoutMs: 60_000,
      actor: 'agent-1',
      target: 'Bash',
      action: 'invoke',
    });

    clockNs = BigInt(2_000_000_000);
    const entry2 = wal.startApproval({
      operationId: 'op-B',
      timeoutMs: 60_000,
      actor: 'agent-2',
      target: 'FileWrite',
      action: 'create',
    });

    clockNs = BigInt(3_000_000_000);
    const entry3 = wal.startApproval({
      operationId: 'op-C',
      timeoutMs: 60_000,
      actor: 'agent-3',
      target: 'Network',
      action: 'connect',
    });

    // Complete op-A and op-C (approved/rejected)
    wal.completeApproval(entry1);
    wal.completeApproval(entry3);

    // WAL file should have 5 records: 3 appends + 2 completes
    const walPath = path.join(tmpDir, '.claws', 'audit', 'wal.jsonl');
    const beforeLines = fs.readFileSync(walPath, 'utf8').trim().split('\n');
    expect(beforeLines).toHaveLength(5);

    // Compact removes completed operations
    wal.compact();

    // After compact: only op-B remains (1 append record)
    const afterContent = fs.readFileSync(walPath, 'utf8').trim();
    const afterLines = afterContent.split('\n');
    expect(afterLines).toHaveLength(1);

    const remaining = JSON.parse(afterLines[0]!) as { type: string; entry: { operationId: string } };
    expect(remaining.type).toBe('append');
    expect(remaining.entry.operationId).toBe('op-B');

    // Recovery should only see op-B
    const recoveryWal = new AuditWal(tmpDir, key, clock);
    pinDateNow([entry2], 5_000);
    const result = recoveryWal.recover(5_000);
    expect(result.active).toHaveLength(1);
    expect(result.active[0]!.entry.operationId).toBe('op-B');
    expect(result.active[0]!.remainingMs).toBe(55_000);

    // Complete the last one and compact — WAL file should be removed
    vi.restoreAllMocks();
    wal.completeApproval(entry2);
    wal.compact();
    expect(fs.existsSync(walPath)).toBe(false);
  });
});
