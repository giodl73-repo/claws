/**
 * L0: audit-chain — branch coverage for resolveActor fallbacks,
 * readPolicyVersion config shapes, existing signing key reuse,
 * acquireChainLock error branches, and getSigningKey EEXIST race.
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile, unlink, open } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  appendAuditEvent,
  readAuditChain,
  readPolicyVersion,
  resolveActor,
  acquireChainLock,
  releaseChainLock,
} from '../../src/compliance/audit-chain.js';

let tempDir: string;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

async function setup(): Promise<string> {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-audit-br-'));
  await mkdir(join(tempDir, '.claws', 'audit'), { recursive: true });
  await mkdir(join(tempDir, '.claws', 'keys'), { recursive: true });
  return tempDir;
}

describe('resolveActor — branch coverage', () => {
  it('falls back to USERNAME env when USER is unset', () => {
    const origUser = process.env.USER;
    const origUsername = process.env.USERNAME;
    try {
      delete process.env.USER;
      process.env.USERNAME = 'test-user';
      const actor = resolveActor();
      expect(actor).toBe('test-user');
    } finally {
      if (origUser !== undefined) process.env.USER = origUser;
      else delete process.env.USER;
      if (origUsername !== undefined) process.env.USERNAME = origUsername;
      else delete process.env.USERNAME;
    }
  });
});

describe('readPolicyVersion — branch coverage', () => {
  it('reads compilerVersion from claws.json', async () => {
    const ws = await setup();
    await writeFile(
      join(ws, 'claws.json'),
      JSON.stringify({ compilerVersion: '2.0.0' }),
    );
    const version = await readPolicyVersion(ws);
    expect(version).toBe('2.0.0');
  });

  it('falls back to version field when compilerVersion is absent', async () => {
    const ws = await setup();
    await writeFile(
      join(ws, 'claws.json'),
      JSON.stringify({ version: '1.5.0' }),
    );
    const version = await readPolicyVersion(ws);
    expect(version).toBe('1.5.0');
  });

  it('returns "unknown" when claws.json is absent', async () => {
    const ws = await setup();
    // No claws.json
    const version = await readPolicyVersion(ws);
    expect(version).toBe('unknown');
  });

  it('returns "unknown" when claws.json has neither version field', async () => {
    const ws = await setup();
    await writeFile(join(ws, 'claws.json'), JSON.stringify({ name: 'test' }));
    const version = await readPolicyVersion(ws);
    expect(version).toBe('unknown');
  });
});

describe('appendAuditEvent — branch coverage', () => {
  it('reuses existing HMAC signing key', async () => {
    const ws = await setup();
    // Pre-create a signing key
    const keyHex = 'a'.repeat(64);
    await writeFile(join(ws, '.claws', 'keys', 'hmac.key'), keyHex + '\n', 'utf-8');

    const entry = await appendAuditEvent(ws, {
      eventType: 'KEY_REUSE',
      target: 'test',
      action: 'test',
      outcome: 'allow',
      ruleId: 'T-001',
      severity: 1,
      policyVersion: '1.0.0',
    });

    // Entry should be signed with the existing key
    expect(entry.hmacSignature).toBeTruthy();
    // Key file should still have the same content
    const currentKey = (await readFile(join(ws, '.claws', 'keys', 'hmac.key'), 'utf-8')).trim();
    expect(currentKey).toBe(keyHex);
  });

  it('uses resolveActor default when no actor provided', async () => {
    const ws = await setup();
    await writeFile(join(ws, 'claws.json'), JSON.stringify({ compilerVersion: '1.0.0' }));

    const entry = await appendAuditEvent(ws, {
      eventType: 'DEFAULT_ACTOR',
      target: 'test',
      action: 'test',
      outcome: 'allow',
      ruleId: 'T-001',
      severity: 1,
      policyVersion: '1.0.0',
    });

    // Actor should be resolved from environment
    expect(entry.actor).toBeTruthy();
    expect(typeof entry.actor).toBe('string');
  });
});

describe('readAuditChain — branch coverage', () => {
  it('returns empty array when audit directory does not exist', async () => {
    const ws = await mkdtemp(join(tmpdir(), 'claws-audit-nodir-'));
    tempDir = ws;
    // No .claws directory at all
    const chain = await readAuditChain(ws);
    expect(chain).toEqual([]);
  });
});

describe('acquireChainLock — error branches', () => {
  it('throws when stale lock cannot be read (inner catch fallthrough)', async () => {
    const ws = await setup();
    const auditDir = join(ws, '.claws', 'audit');
    const lockPath = join(auditDir, 'chain.lock');

    // Create a lock "file" as a directory — open('wx') gets EEXIST
    // because the path exists, then readFile fails because it's a directory,
    // which triggers the inner catch fallthrough to the final throw.
    await mkdir(lockPath, { recursive: true });

    await expect(acquireChainLock(auditDir)).rejects.toThrow(
      'Audit chain append already in progress',
    );

    // Clean up
    await rm(lockPath, { recursive: true, force: true });
  });
});
