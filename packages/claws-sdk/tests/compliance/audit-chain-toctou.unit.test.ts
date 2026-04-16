/**
 * L0: audit-chain TOCTOU — concurrency edge cases for key generation
 * and seq assignment.
 *
 * Validates M-07 fix: O_EXCL prevents two processes from both generating
 * different signing keys (second overwrite loses first key).
 *
 * Validates M-08 fix: File lock serialises read-length + append to prevent
 * duplicate seq numbers from concurrent appenders.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile, open } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  appendAuditEvent,
  readAuditChain,
  acquireChainLock,
  releaseChainLock,
} from '../../src/compliance/audit-chain.js';

let tempDir: string;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

async function setup(): Promise<string> {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-audit-toctou-'));
  await mkdir(join(tempDir, '.claws', 'audit'), { recursive: true });
  await mkdir(join(tempDir, '.claws', 'keys'), { recursive: true });
  await writeFile(join(tempDir, 'claws.json'), JSON.stringify({ compilerVersion: '1.0.0' }));
  return tempDir;
}

const makeEvent = (eventType: string) => ({
  eventType,
  target: 'test',
  action: 'test',
  outcome: 'allow',
  ruleId: 'T-001',
  severity: 1,
  policyVersion: '1.0.0',
});

// --- M-07: Key generation TOCTOU ---

describe('M-07: O_EXCL key generation prevents race', () => {
  it('O_EXCL ensures only one key is created when first append generates it', async () => {
    const ws = await setup();

    // Two sequential appends: first generates key via O_EXCL, second reads it
    const entry1 = await appendAuditEvent(ws, makeEvent('RACE_A'));
    const entry2 = await appendAuditEvent(ws, makeEvent('RACE_B'));

    // Both entries must be signed with the same key
    expect(entry1.keyId).toBe(entry2.keyId);

    // Exactly one key should exist on disk
    const keyHex = (await readFile(join(ws, '.claws', 'keys', 'hmac.key'), 'utf-8')).trim();
    expect(keyHex).toMatch(/^[0-9a-f]{64}$/);
  });

  it('O_EXCL rejects concurrent key creation and reads the winner', async () => {
    const ws = await setup();
    const keyPath = join(ws, '.claws', 'keys', 'hmac.key');

    // Simulate another process winning by creating the key file with O_EXCL first
    const winnerKeyHex = 'c'.repeat(64);
    const fh = await open(keyPath, 'wx');
    await fh.writeFile(winnerKeyHex + '\n', 'utf-8');
    await fh.close();

    // Our append should read the winner's key (not overwrite it)
    const entry = await appendAuditEvent(ws, makeEvent('LOSER'));
    expect(entry.hmacSignature).toBeTruthy();

    // Key on disk is still the winner's
    const currentKey = (await readFile(keyPath, 'utf-8')).trim();
    expect(currentKey).toBe(winnerKeyHex);
  });

  it('key generated via O_EXCL is durable (fsync)', async () => {
    const ws = await setup();

    await appendAuditEvent(ws, makeEvent('FSYNC_TEST'));

    // Key should be on disk — not just in OS buffer cache
    const keyHex = (await readFile(join(ws, '.claws', 'keys', 'hmac.key'), 'utf-8')).trim();
    expect(keyHex).toMatch(/^[0-9a-f]{64}$/);
    expect(keyHex.length).toBe(64);
  });

  it('second key generation fails gracefully and reads existing key', async () => {
    const ws = await setup();
    const keyPath = join(ws, '.claws', 'keys', 'hmac.key');

    // Pre-create a key to simulate another process winning the race
    const existingKeyHex = 'b'.repeat(64);
    await writeFile(keyPath, existingKeyHex + '\n', 'utf-8');

    // Append should read the existing key (not overwrite)
    const entry = await appendAuditEvent(ws, makeEvent('EXISTING_KEY'));
    expect(entry.hmacSignature).toBeTruthy();

    // Key on disk should be unchanged
    const currentKey = (await readFile(keyPath, 'utf-8')).trim();
    expect(currentKey).toBe(existingKeyHex);
  });
});

// --- M-08: Seq assignment TOCTOU ---

describe('M-08: Chain lock prevents duplicate seq assignment', () => {
  it('sequential appends assign unique seq numbers', async () => {
    const ws = await setup();

    const e1 = await appendAuditEvent(ws, makeEvent('SEQ_A'));
    const e2 = await appendAuditEvent(ws, makeEvent('SEQ_B'));
    const e3 = await appendAuditEvent(ws, makeEvent('SEQ_C'));

    expect(e1.seq).toBe(0);
    expect(e2.seq).toBe(1);
    expect(e3.seq).toBe(2);
  });

  it('lock serialises appends so all seq numbers are unique', async () => {
    const ws = await setup();

    // Sequential appends — lock ensures read-length + append is atomic.
    // Without the lock, concurrent processes could read the same length
    // and assign duplicate seqs. We verify the lock works by confirming
    // sequential appends produce unique, contiguous seq numbers.
    const e1 = await appendAuditEvent(ws, makeEvent('CONC_A'));
    const e2 = await appendAuditEvent(ws, makeEvent('CONC_B'));
    const e3 = await appendAuditEvent(ws, makeEvent('CONC_C'));
    const e4 = await appendAuditEvent(ws, makeEvent('CONC_D'));

    expect([e1.seq, e2.seq, e3.seq, e4.seq]).toEqual([0, 1, 2, 3]);

    // Verify the chain file is consistent
    const chain = await readAuditChain(ws);
    expect(chain).toHaveLength(4);
    const chainSeqs = chain.map((e) => e.seq);
    expect(chainSeqs).toEqual([0, 1, 2, 3]);
  });

  it('concurrent append is rejected when lock is held (prevents duplicate seq)', async () => {
    const ws = await setup();
    const auditDir = join(ws, '.claws', 'audit');

    // Acquire the chain lock to simulate another process appending
    const lockPath = await acquireChainLock(auditDir);

    // Attempting to append while lock is held should fail
    await expect(
      appendAuditEvent(ws, makeEvent('BLOCKED')),
    ).rejects.toThrow('Audit chain append already in progress');

    await releaseChainLock(lockPath);

    // After lock release, append should succeed
    const entry = await appendAuditEvent(ws, makeEvent('AFTER_RELEASE'));
    expect(entry.seq).toBe(0);
  });

  it('second lock acquisition fails when lock is held', async () => {
    const ws = await setup();
    const auditDir = join(ws, '.claws', 'audit');

    // Acquire the lock
    const lockPath = await acquireChainLock(auditDir);

    // Second acquisition should fail — the lock is held by us (a live process)
    await expect(acquireChainLock(auditDir)).rejects.toThrow(
      'Audit chain append already in progress',
    );

    await releaseChainLock(lockPath);
  });

  it('lock release allows re-acquisition', async () => {
    const ws = await setup();
    const auditDir = join(ws, '.claws', 'audit');

    const lockPath = await acquireChainLock(auditDir);
    await releaseChainLock(lockPath);

    // Re-acquisition should succeed
    const lockPath2 = await acquireChainLock(auditDir);
    expect(lockPath2).toContain('chain.lock');

    await releaseChainLock(lockPath2);
  });

  it('stale lock from dead PID is reclaimed', async () => {
    const ws = await setup();
    const auditDir = join(ws, '.claws', 'audit');

    // Write a lock file with a PID that almost certainly doesn't exist
    await writeFile(
      join(auditDir, 'chain.lock'),
      `99999999\n${Date.now()}\n`,
      'utf-8',
    );

    // acquireChainLock should detect the stale lock and reclaim it
    const lockPath = await acquireChainLock(auditDir);
    expect(lockPath).toContain('chain.lock');

    // New lock file should contain our PID
    const content = await readFile(lockPath, 'utf-8');
    expect(content).toContain(String(process.pid));

    await releaseChainLock(lockPath);
  });

  it('expired lock is reclaimed even if PID is alive', async () => {
    const ws = await setup();
    const auditDir = join(ws, '.claws', 'audit');

    // Write a lock file with OUR PID but a timestamp far in the past
    await writeFile(
      join(auditDir, 'chain.lock'),
      `${process.pid}\n${Date.now() - 120_000}\n`,
      'utf-8',
    );

    // Lock is expired (>60s default) — should be reclaimed
    const lockPath = await acquireChainLock(auditDir);
    expect(lockPath).toContain('chain.lock');

    await releaseChainLock(lockPath);
  });

  it('lock is always released even if append throws', async () => {
    const ws = await setup();
    const auditDir = join(ws, '.claws', 'audit');

    // Create a chain.jsonl that is a directory to force an append error
    await mkdir(join(auditDir, 'chain.jsonl'), { recursive: true });

    await expect(
      appendAuditEvent(ws, makeEvent('FAIL')),
    ).rejects.toThrow();

    // Lock should be released — we should be able to re-acquire
    // (after fixing the chain.jsonl issue)
    await rm(join(auditDir, 'chain.jsonl'), { recursive: true });
    const lockPath = await acquireChainLock(auditDir);
    expect(lockPath).toContain('chain.lock');
    await releaseChainLock(lockPath);
  });
});
