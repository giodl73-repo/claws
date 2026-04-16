/**
 * L0: audit-chain — mock-based branch coverage for EEXIST race in
 * getSigningKey and non-EEXIST errors in acquireChainLock / getSigningKey.
 *
 * These branches can only be reached via timing-dependent races or
 * permission errors that are hard to produce on the real filesystem.
 * vi.mock intercepts node:fs/promises to simulate them deterministically.
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/* ------------------------------------------------------------------ */
/*  Mock setup — intercept open() and unlink() from node:fs/promises  */
/* ------------------------------------------------------------------ */

// Hold the real module so tests can call real fs operations.
const realFs = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');

// Hoisted mock fns — vi.mock references them.
const { mockOpen, mockUnlink } = vi.hoisted(() => ({
  mockOpen: vi.fn(),
  mockUnlink: vi.fn(),
}));

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  // Default: passthrough to real. Tests swap per-case.
  mockOpen.mockImplementation(actual.open);
  mockUnlink.mockImplementation(actual.unlink);
  return { ...actual, open: mockOpen, unlink: mockUnlink };
});

// SUT — imported after vi.mock so the module picks up our mocks.
import {
  appendAuditEvent,
  acquireChainLock,
  releaseChainLock,
} from '../../src/compliance/audit-chain.js';

/* ------------------------------------------------------------------ */

let tempDir: string;

async function setup(): Promise<string> {
  tempDir = await realFs.mkdtemp(join(tmpdir(), 'claws-audit-mock-'));
  await realFs.mkdir(join(tempDir, '.claws', 'audit'), { recursive: true });
  await realFs.mkdir(join(tempDir, '.claws', 'keys'), { recursive: true });
  await realFs.writeFile(
    join(tempDir, 'claws.json'),
    JSON.stringify({ compilerVersion: '1.0.0' }),
  );
  return tempDir;
}

beforeEach(() => {
  mockOpen.mockImplementation(realFs.open);
  mockUnlink.mockImplementation(realFs.unlink);
});

afterEach(async () => {
  if (tempDir) {
    await realFs.rm(tempDir, { recursive: true, force: true });
  }
});

const makeEvent = (eventType: string) => ({
  eventType,
  target: 'test',
  action: 'test',
  outcome: 'allow',
  ruleId: 'T-001',
  severity: 1,
  policyVersion: '1.0.0',
});

/* ------------------------------------------------------------------ */
/*  getSigningKey — EEXIST race (lines 182-188)                       */
/* ------------------------------------------------------------------ */

describe('getSigningKey — EEXIST race fallback', () => {
  it('reads winner key when O_EXCL fails with EEXIST', async () => {
    const ws = await setup();
    const keyPath = join(ws, '.claws', 'keys', 'hmac.key');

    // No key file exists → readFile at line 167 fails → enters catch.
    // Intercept open('wx') on hmac.key: write a winner key, then throw EEXIST.
    const winnerKey = 'f'.repeat(64);
    let intercepted = false;

    mockOpen.mockImplementation(async (path: any, flags?: any) => {
      if (String(path).endsWith('hmac.key') && flags === 'wx' && !intercepted) {
        intercepted = true;
        await realFs.writeFile(keyPath, winnerKey + '\n', 'utf-8');
        const err = new Error('EEXIST: file already exists') as NodeJS.ErrnoException;
        err.code = 'EEXIST';
        throw err;
      }
      return realFs.open(path, flags);
    });

    const entry = await appendAuditEvent(ws, makeEvent('EEXIST_RACE'));

    expect(intercepted).toBe(true);
    expect(entry.hmacSignature).toBeTruthy();
    const currentKey = (await realFs.readFile(keyPath, 'utf-8')).trim();
    expect(currentKey).toBe(winnerKey);
  });

  it('re-throws non-EEXIST error from inner open in getSigningKey', async () => {
    const ws = await setup();

    mockOpen.mockImplementation(async (path: any, flags?: any) => {
      if (String(path).endsWith('hmac.key') && flags === 'wx') {
        const err = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
        err.code = 'EACCES';
        throw err;
      }
      return realFs.open(path, flags);
    });

    await expect(appendAuditEvent(ws, makeEvent('EACCES_KEY'))).rejects.toThrow('EACCES');
  });
});

/* ------------------------------------------------------------------ */
/*  acquireChainLock — error branches                                 */
/* ------------------------------------------------------------------ */

describe('acquireChainLock — mock-based error branches', () => {
  it('re-throws non-EEXIST error from open in acquireChainLock', async () => {
    const ws = await setup();
    const auditDir = join(ws, '.claws', 'audit');

    mockOpen.mockImplementation(async (path: any, flags?: any) => {
      if (String(path).endsWith('chain.lock') && flags === 'wx') {
        const err = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
        err.code = 'EACCES';
        throw err;
      }
      return realFs.open(path, flags);
    });

    await expect(acquireChainLock(auditDir)).rejects.toThrow('EACCES');
  });

  it('falls through when stale lock reclaim fails (unlink throws)', async () => {
    const ws = await setup();
    const auditDir = join(ws, '.claws', 'audit');
    const lockPath = join(auditDir, 'chain.lock');

    // Write a lock with a dead PID → stale check passes → tries unlink+retry.
    await realFs.writeFile(lockPath, `99999999\n${Date.now()}\n`, 'utf-8');

    // Make unlink on chain.lock throw so the retry path fails,
    // landing in the inner catch (line 121) and falling through to the throw.
    mockUnlink.mockImplementation(async (path: any) => {
      if (String(path).endsWith('chain.lock')) {
        const err = new Error('EPERM: operation not permitted') as NodeJS.ErrnoException;
        err.code = 'EPERM';
        throw err;
      }
      return realFs.unlink(path);
    });

    await expect(acquireChainLock(auditDir)).rejects.toThrow(
      'Audit chain append already in progress',
    );

    // Clean up with real unlink.
    await realFs.unlink(lockPath).catch(() => {});
  });
});
