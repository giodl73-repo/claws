/**
 * Audit chain unit tests.
 *
 * L0: append increments, hash linking, first entry null previous,
 * verify valid, verify tampered, verify broken link,
 * plus coverage for getEntry, getEntries, lastHash, meta, load,
 * computeEntryHash, and signature verification.
 */

import { describe, it, expect } from 'vitest';
import { AuditChain, AuditChainCorruptionError, computeEntryHash } from '#src/compiler/audit/chain.js';
import { verifyChain } from '#src/compiler/audit/verify.js';
import { generateKeypair, ed25519Verify } from '#src/compiler/crypto/ed25519.js';
import type { AuditEntry } from '#src/compiler/audit/types.js';

describe('AuditChain', () => {
  const keypair = generateKeypair();

  function makeChain(): AuditChain {
    return new AuditChain(keypair.privateKey, keypair.publicKey);
  }

  it('append entry increments length', () => {
    const chain = makeChain();
    expect(chain.length).toBe(0);
    expect(chain.lastHash).toBeNull();

    chain.append({ action: 'compile', subject: 'workspace.oc', payload: { files: 3 } });
    expect(chain.length).toBe(1);
    expect(chain.lastHash).not.toBeNull();

    chain.append({ action: 'sign', subject: 'workspace.oc', payload: { algo: 'ed25519' } });
    expect(chain.length).toBe(2);
  });

  it('entries link via previousHash', () => {
    const chain = makeChain();
    const e0 = chain.append({ action: 'a', subject: 's', payload: {} });
    const e1 = chain.append({ action: 'b', subject: 's', payload: {} });
    const e2 = chain.append({ action: 'c', subject: 's', payload: {} });

    expect(e1.previousHash).toBe(e0.hash);
    expect(e2.previousHash).toBe(e1.hash);
  });

  it('first entry has null previousHash', () => {
    const chain = makeChain();
    const e0 = chain.append({ action: 'genesis', subject: 'test', payload: {} });

    expect(e0.previousHash).toBeNull();
    expect(e0.index).toBe(0);
  });

  it('verify passes on valid chain', () => {
    const chain = makeChain();
    chain.append({ action: 'compile', subject: 'a.oc', payload: { size: 100 } });
    chain.append({ action: 'sign', subject: 'a.oc', payload: { key: 'ed25519' } });
    chain.append({ action: 'deploy', subject: 'a.oc', payload: { target: 'local' } });

    const result = verifyChain(chain.allEntries, keypair.publicKey);
    expect(result.valid).toBe(true);
    expect(result.brokenAt).toBeUndefined();
    expect(result.reason).toBeUndefined();
  });

  it('verify detects tampered entry', () => {
    const chain = makeChain();
    chain.append({ action: 'compile', subject: 'a.oc', payload: {} });
    chain.append({ action: 'sign', subject: 'a.oc', payload: { original: true } });
    chain.append({ action: 'deploy', subject: 'a.oc', payload: {} });

    // Tamper with entry 1's payload
    const entries = [...chain.allEntries] as AuditEntry[];
    entries[1] = { ...entries[1]!, payload: { original: false } };

    const result = verifyChain(entries, keypair.publicKey);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(1);
    expect(result.reason).toContain('hash mismatch');
  });

  it('verify detects broken hash link', () => {
    const chain = makeChain();
    chain.append({ action: 'a', subject: 's', payload: {} });
    chain.append({ action: 'b', subject: 's', payload: {} });
    chain.append({ action: 'c', subject: 's', payload: {} });

    // Break the chain link by replacing entry 1's previousHash
    const entries = [...chain.allEntries] as AuditEntry[];
    entries[1] = { ...entries[1]!, previousHash: 'deadbeef' };

    const result = verifyChain(entries, keypair.publicKey);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(1);
    expect(result.reason).toContain('previousHash mismatch');
  });

  it('getEntry returns entry by index and undefined for out of range', () => {
    const chain = makeChain();
    chain.append({ action: 'a', subject: 's', payload: {} });

    expect(chain.getEntry(0)).toBeDefined();
    expect(chain.getEntry(0)!.action).toBe('a');
    expect(chain.getEntry(1)).toBeUndefined();
    expect(chain.getEntry(-1)).toBeUndefined();
  });

  it('getEntries returns slice of entries', () => {
    const chain = makeChain();
    chain.append({ action: 'a', subject: 's', payload: {} });
    chain.append({ action: 'b', subject: 's', payload: {} });
    chain.append({ action: 'c', subject: 's', payload: {} });

    const slice = chain.getEntries(1, 3);
    expect(slice).toHaveLength(2);
    expect(slice[0]!.action).toBe('b');
    expect(slice[1]!.action).toBe('c');

    // Without end parameter
    const fromStart = chain.getEntries(0);
    expect(fromStart).toHaveLength(3);
  });

  it('meta returns chain metadata with fingerprint', () => {
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey, 'test-id', '2026-01-01T00:00:00.000Z');
    chain.append({ action: 'a', subject: 's', payload: {} });

    const meta = chain.meta;
    expect(meta.chainId).toBe('test-id');
    expect(meta.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(meta.entryCount).toBe(1);
    expect(meta.lastEntryHash).not.toBeNull();
    expect(meta.publicKeyFingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it('load restores entries into an empty chain', () => {
    const source = makeChain();
    source.append({ action: 'a', subject: 's', payload: {} });
    source.append({ action: 'b', subject: 's', payload: {} });

    const target = makeChain();
    target.load(source.allEntries);
    expect(target.length).toBe(2);
    expect(target.getEntry(0)!.action).toBe('a');
    expect(target.getEntry(1)!.action).toBe('b');
  });

  it('load throws if chain is not empty', () => {
    const chain = makeChain();
    chain.append({ action: 'a', subject: 's', payload: {} });

    expect(() => chain.load([chain.getEntry(0)!])).toThrow('Cannot load into a non-empty chain');
  });

  it('load detects broken hash chain linkage', () => {
    const source = makeChain();
    source.append({ action: 'a', subject: 's', payload: {} });
    source.append({ action: 'b', subject: 's', payload: {} });

    // Break the chain by modifying previousHash of entry 1
    const entries = [...source.allEntries] as AuditEntry[];
    entries[1] = { ...entries[1]!, previousHash: 'deadbeef' };

    const target = makeChain();
    expect(() => target.load(entries)).toThrow(AuditChainCorruptionError);
  });

  it('load detects tampered content hash', () => {
    const source = makeChain();
    source.append({ action: 'a', subject: 's', payload: {} });
    source.append({ action: 'b', subject: 's', payload: {} });

    // Tamper with payload but keep the hash the same
    const entries = [...source.allEntries] as AuditEntry[];
    entries[1] = { ...entries[1]!, payload: { tampered: true } };

    const target = makeChain();
    expect(() => target.load(entries)).toThrow(AuditChainCorruptionError);
  });

  it('computeEntryHash is deterministic', () => {
    const h1 = computeEntryHash(0, '2026-01-01T00:00:00Z', 'a', 's', { k: 'v' }, null);
    const h2 = computeEntryHash(0, '2026-01-01T00:00:00Z', 'a', 's', { k: 'v' }, null);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verify detects invalid Ed25519 signature', () => {
    const chain = makeChain();
    chain.append({ action: 'a', subject: 's', payload: {} });

    // Forge a valid hash but wrong signature
    const entries = [...chain.allEntries] as AuditEntry[];
    const wrongKeypair = generateKeypair();
    const result = verifyChain(entries, wrongKeypair.publicKey);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(0);
    expect(result.reason).toContain('signature');
  });

  it('verify on empty chain returns valid', () => {
    const result = verifyChain([], keypair.publicKey);
    expect(result.valid).toBe(true);
  });

  it('allEntries returns an immutable snapshot', () => {
    const chain = makeChain();
    chain.append({ action: 'a', subject: 's', payload: {} });
    const snap1 = chain.allEntries;
    chain.append({ action: 'b', subject: 's', payload: {} });
    const snap2 = chain.allEntries;
    expect(snap1).toHaveLength(1);
    expect(snap2).toHaveLength(2);
  });
});
