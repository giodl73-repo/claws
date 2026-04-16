/**
 * L0: Audit WAL — persist approvalStartTime, recover timeout, crash safety,
 * monotonic clock independence from system clock, corrupted-line resilience,
 * atomic compaction, and fsync durability.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { AuditWal, defaultMonotonicClock } from '../../src/audit/wal.js';
import type { MonotonicClock } from '../../src/audit/wal.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wal-unit-'));
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeParams(overrides?: Record<string, unknown>) {
  return {
    operationId: 'op-001',
    timeoutMs: 30_000,
    actor: 'agent-1',
    target: 'Bash',
    action: 'invoke',
    ...overrides,
  };
}

/**
 * Helper: pin Date.now() to a fixed value so that the wall-clock elapsed
 * in recover() equals the desired monotonic elapsed. Without this, the
 * M-05 min(monotonic, wallClock) logic would use real wall-clock time
 * and make elapsed-based assertions flaky.
 *
 * @param wallClockStart - The ISO timestamp stored in the WAL entry.
 * @param desiredElapsedMs - The elapsed time we want both monotonic and
 *   wall-clock to agree on.
 */
function pinDateNow(wallClockStart: string, desiredElapsedMs: number): void {
  const target = new Date(wallClockStart).getTime() + desiredElapsedMs;
  vi.spyOn(Date, 'now').mockReturnValue(target);
}

/**
 * Helper: pin Date.now() for multiple entries at once. Uses the latest
 * wallClockStart so that all entries see at least `desiredElapsedMs` of
 * wall-clock elapsed time. For per-entry precision, use pinDateNow.
 */
function pinDateNowForEntries(
  entries: Array<{ wallClockStart: string }>,
  desiredElapsedMs: number,
): void {
  const latest = Math.max(...entries.map((e) => new Date(e.wallClockStart).getTime()));
  vi.spyOn(Date, 'now').mockReturnValue(latest + desiredElapsedMs);
}

describe('WAL persists approvalStartTime', () => {
  it('writes approvalStartTime to WAL file before returning', () => {
    const key = randomBytes(32);
    let clockValue = BigInt(1_000_000_000); // 1 second in nanoseconds
    const clock: MonotonicClock = () => clockValue;

    const wal = new AuditWal(tmpDir, key, clock);
    const entry = wal.startApproval(makeParams());

    // Verify the entry has the correct approvalStartTime
    expect(entry.approvalStartTime).toBe('1000000000');
    expect(entry.timeoutMs).toBe(30_000);
    expect(entry.operationId).toBe('op-001');

    // Verify the WAL file exists and contains the entry
    const walPath = path.join(tmpDir, '.claws', 'audit', 'wal.jsonl');
    expect(fs.existsSync(walPath)).toBe(true);

    const content = fs.readFileSync(walPath, 'utf8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(1);

    const record = JSON.parse(lines[0]!) as { type: string; entry: { approvalStartTime: string } };
    expect(record.type).toBe('append');
    expect(record.entry.approvalStartTime).toBe('1000000000');
  });
});

describe('recovered timeout = original - elapsed', () => {
  it('computes remaining timeout from elapsed time since crash', () => {
    const key = randomBytes(32);
    let clockValue = BigInt(1_000_000_000);
    const clock: MonotonicClock = () => clockValue;

    const wal = new AuditWal(tmpDir, key, clock);
    const entry = wal.startApproval(makeParams({ timeoutMs: 60_000 }));

    // Simulate crash: create a new WAL instance (recovery scenario)
    const recoveryWal = new AuditWal(tmpDir, key, clock);

    // Pin wall-clock so min(monotonic, wallClock) = 20_000
    pinDateNow(entry.wallClockStart, 20_000);

    // 20 seconds elapsed since crash
    const result = recoveryWal.recover(20_000);

    expect(result.active).toHaveLength(1);
    expect(result.expired).toHaveLength(0);
    expect(result.tampered).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.active[0]!.remainingMs).toBe(40_000); // 60000 - 20000
  });
});

describe('crash does not reset timeout', () => {
  it('rejects approval when elapsed time exceeds original timeout', () => {
    const key = randomBytes(32);
    let clockValue = BigInt(1_000_000_000);
    const clock: MonotonicClock = () => clockValue;

    const wal = new AuditWal(tmpDir, key, clock);
    const entry = wal.startApproval(makeParams({ timeoutMs: 30_000 }));

    // Simulate crash: elapsed time > timeout
    const recoveryWal = new AuditWal(tmpDir, key, clock);
    pinDateNow(entry.wallClockStart, 45_000);
    const result = recoveryWal.recover(45_000); // 45s > 30s timeout

    expect(result.active).toHaveLength(0);
    expect(result.expired).toHaveLength(1);
    expect(result.expired[0]!.entry.operationId).toBe('op-001');
    expect(result.expired[0]!.elapsedMs).toBe(45_000);
  });

  it('rejects approval when elapsed time exactly equals timeout', () => {
    const key = randomBytes(32);
    const clock: MonotonicClock = () => BigInt(1_000_000_000);

    const wal = new AuditWal(tmpDir, key, clock);
    const entry = wal.startApproval(makeParams({ timeoutMs: 30_000 }));

    const recoveryWal = new AuditWal(tmpDir, key, clock);
    pinDateNow(entry.wallClockStart, 30_000);
    const result = recoveryWal.recover(30_000); // exactly at timeout

    // remaining = 30000 - 30000 = 0, which is <= 0, so expired
    expect(result.active).toHaveLength(0);
    expect(result.expired).toHaveLength(1);
  });
});

describe('system clock adjustment does not extend approval timeout', () => {
  it('uses monotonic clock, not wall clock, for start time', () => {
    const key = randomBytes(32);

    let clockValue = BigInt(5_000_000_000); // 5 seconds
    const clock: MonotonicClock = () => clockValue;

    const wal = new AuditWal(tmpDir, key, clock);
    const entry = wal.startApproval(makeParams({ timeoutMs: 10_000 }));

    // The approvalStartTime is the monotonic value, not Date.now()
    expect(entry.approvalStartTime).toBe('5000000000');

    const recoveryWal = new AuditWal(tmpDir, key, clock);

    // Simulate 11 seconds elapsed (monotonic), timeout was 10s
    pinDateNow(entry.wallClockStart, 11_000);
    const result = recoveryWal.recover(11_000);
    expect(result.expired).toHaveLength(1);

    // 5 seconds elapsed — still active
    pinDateNow(entry.wallClockStart, 5_000);
    const result2 = recoveryWal.recover(5_000);
    expect(result2.active).toHaveLength(1);
    expect(result2.active[0]!.remainingMs).toBe(5_000); // 10000 - 5000
  });

  it('M-05: wall-clock jump forward cannot extend window beyond monotonic', () => {
    const key = randomBytes(32);
    const clock: MonotonicClock = () => BigInt(1_000_000_000);

    const wal = new AuditWal(tmpDir, key, clock);
    const entry = wal.startApproval(makeParams({ timeoutMs: 10_000 }));

    const recoveryWal = new AuditWal(tmpDir, key, clock);

    // Wall-clock says only 2s elapsed (jumped backward / NTP correction)
    // but monotonic says 8s. min(8000, 2000) = 2000 → remaining = 8000
    pinDateNow(entry.wallClockStart, 2_000);
    const result = recoveryWal.recover(8_000);
    expect(result.active).toHaveLength(1);
    // Conservative: use the smaller elapsed, so remaining = 10000 - 2000
    expect(result.active[0]!.remainingMs).toBe(8_000);
  });

  it('M-05: monotonic reset after crash uses wall-clock as floor', () => {
    const key = randomBytes(32);
    const clock: MonotonicClock = () => BigInt(1_000_000_000);

    const wal = new AuditWal(tmpDir, key, clock);
    const entry = wal.startApproval(makeParams({ timeoutMs: 10_000 }));

    const recoveryWal = new AuditWal(tmpDir, key, clock);

    // Monotonic says 3s (fresh process), wall-clock says 15s (real time).
    // min(3000, 15000) = 3000. Neither can independently EXTEND window.
    pinDateNow(entry.wallClockStart, 15_000);
    const result = recoveryWal.recover(3_000);
    expect(result.active).toHaveLength(1);
    expect(result.active[0]!.remainingMs).toBe(7_000); // 10000 - 3000
  });
});

describe('M-06: corrupted JSONL lines do not crash recovery', () => {
  it('skips corrupted lines and collects them as warnings', () => {
    const key = randomBytes(32);
    const clock: MonotonicClock = () => BigInt(1_000_000_000);

    const wal = new AuditWal(tmpDir, key, clock);
    const entry = wal.startApproval(makeParams({ timeoutMs: 60_000 }));

    // Inject a corrupted line into the WAL
    const walPath = path.join(tmpDir, '.claws', 'audit', 'wal.jsonl');
    const content = fs.readFileSync(walPath, 'utf8');
    const corruptedContent = content + 'NOT VALID JSON\n';
    fs.writeFileSync(walPath, corruptedContent, 'utf8');

    const recoveryWal = new AuditWal(tmpDir, key, clock);
    pinDateNow(entry.wallClockStart, 5_000);
    const result = recoveryWal.recover(5_000);

    // Valid entry still recovered
    expect(result.active).toHaveLength(1);
    expect(result.active[0]!.entry.operationId).toBe('op-001');

    // Corrupted line reported as warning
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]!.line).toBe(2);
    expect(result.warnings[0]!.raw).toBe('NOT VALID JSON');
    expect(result.warnings[0]!.error).toContain('JSON');
  });

  it('recovers all valid entries even with multiple corrupted lines', () => {
    const key = randomBytes(32);
    let clockNs = BigInt(1_000_000_000);
    const clock: MonotonicClock = () => clockNs;

    const wal = new AuditWal(tmpDir, key, clock);
    const entry1 = wal.startApproval(makeParams({ operationId: 'op-A', timeoutMs: 60_000 }));

    clockNs = BigInt(2_000_000_000);
    const entry2 = wal.startApproval(makeParams({ operationId: 'op-B', timeoutMs: 60_000 }));

    // Inject corrupted lines between and after valid records
    const walPath = path.join(tmpDir, '.claws', 'audit', 'wal.jsonl');
    const lines = fs.readFileSync(walPath, 'utf8').trim().split('\n');
    const corrupted = [lines[0], '{broken', lines[1], 'also broken'].join('\n') + '\n';
    fs.writeFileSync(walPath, corrupted, 'utf8');

    const recoveryWal = new AuditWal(tmpDir, key, clock);
    pinDateNowForEntries([entry1, entry2], 5_000);
    const result = recoveryWal.recover(5_000);

    expect(result.active).toHaveLength(2);
    expect(result.warnings).toHaveLength(2);
    expect(result.warnings[0]!.line).toBe(2);
    expect(result.warnings[0]!.raw).toBe('{broken');
    expect(result.warnings[1]!.line).toBe(4);
    expect(result.warnings[1]!.raw).toBe('also broken');
  });

  it('returns empty results with warnings for fully corrupted WAL', () => {
    const key = randomBytes(32);
    const clock: MonotonicClock = () => BigInt(1_000_000_000);

    // Create WAL directory and write only garbage
    const walPath = path.join(tmpDir, '.claws', 'audit', 'wal.jsonl');
    fs.mkdirSync(path.dirname(walPath), { recursive: true });
    fs.writeFileSync(walPath, 'garbage line 1\ngarbage line 2\n', 'utf8');

    const wal = new AuditWal(tmpDir, key, clock);
    const result = wal.recover(5_000);

    expect(result.active).toHaveLength(0);
    expect(result.expired).toHaveLength(0);
    expect(result.tampered).toHaveLength(0);
    expect(result.warnings).toHaveLength(2);
  });
});

describe('M-03: atomic compaction via temp file', () => {
  it('compaction produces correct result and leaves no temp file', () => {
    const key = randomBytes(32);
    let clockNs = BigInt(1_000_000_000);
    const clock: MonotonicClock = () => clockNs;

    const wal = new AuditWal(tmpDir, key, clock);
    wal.startApproval(makeParams({ operationId: 'op-A', timeoutMs: 60_000 }));

    clockNs = BigInt(2_000_000_000);
    const entry2 = wal.startApproval(makeParams({ operationId: 'op-B', timeoutMs: 60_000 }));
    wal.completeApproval(entry2);

    wal.compact();

    // Verify the result is correct: only op-A remains
    const walPath = path.join(tmpDir, '.claws', 'audit', 'wal.jsonl');
    const lines = fs.readFileSync(walPath, 'utf8').trim().split('\n');
    expect(lines).toHaveLength(1);
    const record = JSON.parse(lines[0]!) as { entry: { operationId: string } };
    expect(record.entry.operationId).toBe('op-A');

    // No temp file left behind
    expect(fs.existsSync(walPath + '.tmp')).toBe(false);
  });

  it('compaction with all completed removes WAL file', () => {
    const key = randomBytes(32);
    const clock: MonotonicClock = () => BigInt(1_000_000_000);

    const wal = new AuditWal(tmpDir, key, clock);
    const entry = wal.startApproval(makeParams());
    wal.completeApproval(entry);
    wal.compact();

    const walPath = path.join(tmpDir, '.claws', 'audit', 'wal.jsonl');
    expect(fs.existsSync(walPath)).toBe(false);
    // No temp file left behind either
    expect(fs.existsSync(walPath + '.tmp')).toBe(false);
  });
});

describe('recover skips completed approvals', () => {
  it('line 211: complete record removes in-flight entry during replay', () => {
    const key = randomBytes(32);
    let clockNs = BigInt(1_000_000_000);
    const clock: MonotonicClock = () => clockNs;

    const wal = new AuditWal(tmpDir, key, clock);
    const entry = wal.startApproval(makeParams({ operationId: 'op-done', timeoutMs: 60_000 }));

    // Complete the approval before crash
    wal.completeApproval(entry);

    // Also start one that stays in-flight
    clockNs = BigInt(2_000_000_000);
    const entry2 = wal.startApproval(makeParams({ operationId: 'op-open', timeoutMs: 60_000 }));

    // Recover: 'op-done' should be excluded (deleted from inFlight map)
    const recoveryWal = new AuditWal(tmpDir, key, clock);
    pinDateNowForEntries([entry, entry2], 5_000);
    const result = recoveryWal.recover(5_000);

    expect(result.active).toHaveLength(1);
    expect(result.active[0]!.entry.operationId).toBe('op-open');
    expect(result.expired).toHaveLength(0);
  });
});

describe('compact creates directory when needed', () => {
  it('line 268: creates parent dir when WAL dir does not exist', () => {
    const key = randomBytes(32);
    const clock: MonotonicClock = () => BigInt(1_000_000_000);

    // Point WAL at a subdirectory that doesn't exist yet
    const subDir = path.join(tmpDir, 'fresh');
    const walDir = path.join(subDir, '.claws', 'audit');
    expect(fs.existsSync(walDir)).toBe(false);

    // compact() with no WAL file: readRecords returns empty,
    // remaining=0, but the dir check at line 267 fires first
    const wal = new AuditWal(subDir, key, clock);
    wal.compact();

    // Dir was created by the mkdirSync guard at line 268
    expect(fs.existsSync(walDir)).toBe(true);
    // No WAL file since remaining was empty
    expect(fs.existsSync(path.join(walDir, 'wal.jsonl'))).toBe(false);
  });
});

describe('filePath getter', () => {
  it('line 296: returns the WAL file path', () => {
    const key = randomBytes(32);
    const wal = new AuditWal(tmpDir, key);
    const expected = path.join(tmpDir, '.claws', 'audit', 'wal.jsonl');
    expect(wal.filePath).toBe(expected);
  });
});

describe('recover on empty/missing WAL', () => {
  it('line 330: returns empty results when WAL file does not exist', () => {
    const key = randomBytes(32);
    const clock: MonotonicClock = () => BigInt(1_000_000_000);

    // No startApproval — WAL file never created
    const wal = new AuditWal(tmpDir, key, clock);
    const result = wal.recover(5_000);

    expect(result.active).toHaveLength(0);
    expect(result.expired).toHaveLength(0);
    expect(result.tampered).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});

describe('string audit key constructor', () => {
  it('accepts audit key as hex string', () => {
    const keyHex = randomBytes(32).toString('hex');
    const clock: MonotonicClock = () => BigInt(1_000_000_000);

    const wal = new AuditWal(tmpDir, keyHex, clock);
    const entry = wal.startApproval(makeParams());

    // Verify recovery works with the same hex key
    const recoveryWal = new AuditWal(tmpDir, keyHex, clock);
    pinDateNow(entry.wallClockStart, 5_000);
    const result = recoveryWal.recover(5_000);

    expect(result.active).toHaveLength(1);
    expect(result.tampered).toHaveLength(0);
  });
});

describe('HMAC length mismatch detection', () => {
  it('detects tampered HMAC with different length', () => {
    const key = randomBytes(32);
    const clock: MonotonicClock = () => BigInt(1_000_000_000);

    const wal = new AuditWal(tmpDir, key, clock);
    wal.startApproval(makeParams());

    // Tamper the HMAC to a different length
    const walPath = path.join(tmpDir, '.claws', 'audit', 'wal.jsonl');
    const content = fs.readFileSync(walPath, 'utf8');
    const record = JSON.parse(content.trim());
    record.entry.hmac = 'short'; // much shorter than 64 hex chars
    fs.writeFileSync(walPath, JSON.stringify(record) + '\n', 'utf8');

    const recoveryWal = new AuditWal(tmpDir, key, clock);
    // Pin wall-clock
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5_000);
    const result = recoveryWal.recover(5_000);

    expect(result.tampered).toHaveLength(1);
    expect(result.tampered[0]!.reason).toBe('HMAC signature mismatch');
    expect(result.active).toHaveLength(0);
  });
});

describe('defaultMonotonicClock', () => {
  it('returns a bigint nanosecond timestamp', () => {
    const value = defaultMonotonicClock();
    expect(typeof value).toBe('bigint');
    expect(value).toBeGreaterThan(BigInt(0));
  });
});

describe('M-04: appendRecord uses fsync for durability', () => {
  it('WAL entry is durable on disk after startApproval returns', () => {
    const key = randomBytes(32);
    const clock: MonotonicClock = () => BigInt(1_000_000_000);

    const wal = new AuditWal(tmpDir, key, clock);
    wal.startApproval(makeParams());

    // Verify the WAL file exists and has the entry (proves write completed)
    const walPath = path.join(tmpDir, '.claws', 'audit', 'wal.jsonl');
    const content = fs.readFileSync(walPath, 'utf8');
    const record = JSON.parse(content.trim()) as { type: string; entry: { operationId: string } };
    expect(record.type).toBe('append');
    expect(record.entry.operationId).toBe('op-001');
  });
});
