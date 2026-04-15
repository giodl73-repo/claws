/**
 * L0: audit-chain — append, read, and edge cases for the signed audit chain.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  appendAuditEvent,
  readAuditChain,
  resolveActor,
} from '../../src/compliance/audit-chain.js';
import { verifyAuditEntry } from '../../src/compliance/artifact-signer.js';

let tempDir: string;

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
  }
});

async function setup(): Promise<string> {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-audit-chain-unit-'));
  // Create minimal workspace with .claws/audit and .claws/keys
  await mkdir(join(tempDir, '.claws', 'audit'), { recursive: true });
  await mkdir(join(tempDir, '.claws', 'keys'), { recursive: true });
  // Create claws.json for policyVersion
  await writeFile(join(tempDir, 'claws.json'), JSON.stringify({ compilerVersion: '1.0.0' }));
  return tempDir;
}

describe('appendAuditEvent', () => {
  it('appends a signed event to chain.jsonl', async () => {
    const ws = await setup();

    const entry = await appendAuditEvent(ws, {
      eventType: 'TEST_EVENT',
      target: '/test/workspace',
      action: 'test',
      outcome: 'allow',
      ruleId: 'TEST-001',
      severity: 3,
      policyVersion: '1.0.0',
    });

    expect(entry.seq).toBe(0);
    expect(entry.eventType).toBe('TEST_EVENT');
    expect(entry.hmacSignature).toMatch(/^[0-9a-f]{64}$/);
    expect(entry.keyId).toBe('claws-default-v1');
    expect(entry.algorithm).toBe('sha256');
  });

  it('increments seq for each appended event', async () => {
    const ws = await setup();

    const first = await appendAuditEvent(ws, {
      eventType: 'FIRST',
      target: 'a',
      action: 'test',
      outcome: 'allow',
      ruleId: 'T-001',
      severity: 1,
      policyVersion: '1.0.0',
    });
    const second = await appendAuditEvent(ws, {
      eventType: 'SECOND',
      target: 'b',
      action: 'test',
      outcome: 'allow',
      ruleId: 'T-002',
      severity: 2,
      policyVersion: '1.0.0',
    });

    expect(first.seq).toBe(0);
    expect(second.seq).toBe(1);
  });

  it('generates signing key if not present', async () => {
    const ws = await setup();

    await appendAuditEvent(ws, {
      eventType: 'KEY_GEN',
      target: 'test',
      action: 'test',
      outcome: 'allow',
      ruleId: 'T-001',
      severity: 1,
      policyVersion: '1.0.0',
    });

    // Key file should exist
    const keyPath = join(ws, '.claws', 'keys', 'hmac.key');
    const keyHex = await readFile(keyPath, 'utf-8');
    expect(keyHex.trim()).toMatch(/^[0-9a-f]{64}$/);
  });

  it('uses provided actor when specified', async () => {
    const ws = await setup();

    const entry = await appendAuditEvent(ws, {
      eventType: 'ACTOR_TEST',
      target: 'test',
      action: 'test',
      outcome: 'allow',
      ruleId: 'T-001',
      severity: 1,
      policyVersion: '1.0.0',
      actor: 'custom-actor',
    });

    expect(entry.actor).toBe('custom-actor');
  });
});

describe('readAuditChain', () => {
  it('returns empty array when chain file does not exist', async () => {
    const ws = await setup();
    const chain = await readAuditChain(ws);
    expect(chain).toEqual([]);
  });

  it('reads all entries from chain file', async () => {
    const ws = await setup();

    await appendAuditEvent(ws, {
      eventType: 'E1',
      target: 'a',
      action: 'test',
      outcome: 'allow',
      ruleId: 'T-001',
      severity: 1,
      policyVersion: '1.0.0',
    });
    await appendAuditEvent(ws, {
      eventType: 'E2',
      target: 'b',
      action: 'test',
      outcome: 'deny',
      ruleId: 'T-002',
      severity: 2,
      policyVersion: '1.0.0',
    });

    const chain = await readAuditChain(ws);
    expect(chain).toHaveLength(2);
    expect(chain[0]!.eventType).toBe('E1');
    expect(chain[1]!.eventType).toBe('E2');
  });

  it('entries are verifiable with the signing key', async () => {
    const ws = await setup();

    await appendAuditEvent(ws, {
      eventType: 'VERIFY_TEST',
      target: 'test',
      action: 'test',
      outcome: 'allow',
      ruleId: 'T-001',
      severity: 1,
      policyVersion: '1.0.0',
    });

    const chain = await readAuditChain(ws);
    const keyHex = (await readFile(join(ws, '.claws', 'keys', 'hmac.key'), 'utf-8')).trim();
    const key = Buffer.from(keyHex, 'hex');

    expect(verifyAuditEntry(chain[0]!, key)).toBe(true);
  });
});

describe('resolveActor', () => {
  it('returns a non-empty string', () => {
    const actor = resolveActor();
    expect(actor).toBeTruthy();
    expect(typeof actor).toBe('string');
  });
});
