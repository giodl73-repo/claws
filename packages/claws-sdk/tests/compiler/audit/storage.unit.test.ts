/**
 * Audit chain storage unit tests.
 *
 * L0: save/load round-trip, append entry, update meta, error handling,
 * file locking, path helpers.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  saveChain,
  loadChain,
  appendEntry,
  updateChainMeta,
  chainFilePath,
  walFilePath,
} from '#src/compiler/audit/storage.js';
import { AuditChain } from '#src/compiler/audit/chain.js';
import { generateKeypair } from '#src/compiler/crypto/ed25519.js';

describe('Audit storage', () => {
  const keypair = generateKeypair();
  let tempDir: string;

  function setup(): string {
    tempDir = mkdtempSync(join(tmpdir(), 'audit-storage-'));
    return tempDir;
  }

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('save and load round-trip preserves entries', async () => {
    const dir = setup();
    const chainPath = join(dir, 'chain.ndjson');

    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);
    chain.append({ action: 'compile', subject: 'a.oc', payload: { x: 1 } });
    chain.append({ action: 'sign', subject: 'a.oc', payload: { y: 2 } });

    await saveChain(chainPath, chain.meta, chain.allEntries);
    const loaded = await loadChain(chainPath);

    expect(loaded.meta.chainId).toBe(chain.meta.chainId);
    expect(loaded.meta.entryCount).toBe(2);
    expect(loaded.entries).toHaveLength(2);
    expect(loaded.entries[0]!.action).toBe('compile');
    expect(loaded.entries[1]!.action).toBe('sign');
  });

  it('appendEntry adds to existing file', async () => {
    const dir = setup();
    const chainPath = join(dir, 'chain.ndjson');

    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);
    chain.append({ action: 'a', subject: 's', payload: {} });
    await saveChain(chainPath, chain.meta, chain.allEntries);

    const e1 = chain.append({ action: 'b', subject: 's', payload: {} });
    await appendEntry(chainPath, e1);

    const loaded = await loadChain(chainPath);
    expect(loaded.entries).toHaveLength(2);
    expect(loaded.entries[1]!.action).toBe('b');
  });

  it('updateChainMeta replaces header', async () => {
    const dir = setup();
    const chainPath = join(dir, 'chain.ndjson');

    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);
    chain.append({ action: 'a', subject: 's', payload: {} });
    await saveChain(chainPath, chain.meta, chain.allEntries);

    // Add another entry and update meta
    chain.append({ action: 'b', subject: 's', payload: {} });
    await updateChainMeta(chainPath, chain.meta);

    const loaded = await loadChain(chainPath);
    expect(loaded.meta.entryCount).toBe(2);
  });

  it('loadChain throws on missing file', async () => {
    const dir = setup();
    const chainPath = join(dir, 'nonexistent.ndjson');
    await expect(loadChain(chainPath)).rejects.toThrow('not found');
  });

  it('loadChain throws on empty file', async () => {
    const dir = setup();
    const chainPath = join(dir, 'empty.ndjson');
    writeFileSync(chainPath, '', 'utf-8');
    await expect(loadChain(chainPath)).rejects.toThrow('empty');
  });

  it('loadChain throws on invalid header', async () => {
    const dir = setup();
    const chainPath = join(dir, 'bad.ndjson');
    writeFileSync(chainPath, JSON.stringify({ type: 'wrong', version: 99 }) + '\n', 'utf-8');
    await expect(loadChain(chainPath)).rejects.toThrow('audit-chain');
  });

  it('saveChain acquires and releases lock', async () => {
    const dir = setup();
    const chainPath = join(dir, 'chain.ndjson');
    const lockPath = chainPath + '.lock';

    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);
    chain.append({ action: 'a', subject: 's', payload: {} });
    await saveChain(chainPath, chain.meta, chain.allEntries);

    // Lock should be released after save
    expect(existsSync(lockPath)).toBe(false);
  });

  it('saveChain throws when lock is held', async () => {
    const dir = setup();
    const chainPath = join(dir, 'chain.ndjson');
    const lockPath = chainPath + '.lock';

    // Manually create a lock file
    writeFileSync(lockPath, '12345', { flag: 'wx' });

    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);
    chain.append({ action: 'a', subject: 's', payload: {} });

    await expect(saveChain(chainPath, chain.meta, chain.allEntries)).rejects.toThrow('locked');

    // Clean up lock
    rmSync(lockPath);
  });

  it('chainFilePath returns expected path', () => {
    const result = chainFilePath('/workspace');
    expect(result).toContain('.claws');
    expect(result).toContain('audit-chain.ndjson');
  });

  it('walFilePath returns expected path', () => {
    const result = walFilePath('/workspace');
    expect(result).toContain('.claws');
    expect(result).toContain('audit-chain.wal');
  });

  it('saveChain creates parent directories', async () => {
    const dir = setup();
    const chainPath = join(dir, 'nested', 'deep', 'chain.ndjson');

    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);
    chain.append({ action: 'a', subject: 's', payload: {} });
    await saveChain(chainPath, chain.meta, chain.allEntries);

    expect(existsSync(chainPath)).toBe(true);
  });

  it('loadChain skips empty lines in file', async () => {
    const dir = setup();
    const chainPath = join(dir, 'chain.ndjson');

    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);
    chain.append({ action: 'a', subject: 's', payload: {} });
    await saveChain(chainPath, chain.meta, chain.allEntries);

    // Inject blank lines between entries to exercise the `line === ''` continue branch
    const content = readFileSync(chainPath, 'utf-8');
    const lines = content.split('\n');
    // Insert blank line between header and first entry
    const withBlanks = [lines[0], '', '  ', lines[1], ''].join('\n');
    writeFileSync(chainPath, withBlanks, 'utf-8');

    const loaded = await loadChain(chainPath);
    expect(loaded.entries).toHaveLength(1);
    expect(loaded.entries[0]!.action).toBe('a');
  });

  it('loadChain validates entry shape', async () => {
    const dir = setup();
    const chainPath = join(dir, 'bad-entry.ndjson');

    const header = JSON.stringify({ type: 'audit-chain', version: 1, meta: { chainId: 'x', createdAt: 'x', lastEntryHash: null, entryCount: 0, publicKeyFingerprint: 'x' } });
    const badEntry = JSON.stringify({ index: 'not-a-number', hash: 'h' });
    writeFileSync(chainPath, header + '\n' + badEntry + '\n', 'utf-8');

    await expect(loadChain(chainPath)).rejects.toThrow('Invalid audit entry');
  });

  it('appendEntry throws when lock is held', async () => {
    const dir = setup();
    const chainPath = join(dir, 'chain.ndjson');
    const lockPath = chainPath + '.lock';

    // Create the chain file first
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);
    const entry = chain.append({ action: 'a', subject: 's', payload: {} });
    await saveChain(chainPath, chain.meta, chain.allEntries);

    // Manually hold the lock
    writeFileSync(lockPath, '12345', { flag: 'wx' });

    await expect(appendEntry(chainPath, entry)).rejects.toThrow('locked');

    // Clean up lock
    rmSync(lockPath);
  });

  it('updateChainMeta throws when lock is held', async () => {
    const dir = setup();
    const chainPath = join(dir, 'chain.ndjson');
    const lockPath = chainPath + '.lock';

    // Create the chain file first
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);
    chain.append({ action: 'a', subject: 's', payload: {} });
    await saveChain(chainPath, chain.meta, chain.allEntries);

    // Manually hold the lock
    writeFileSync(lockPath, '12345', { flag: 'wx' });

    await expect(updateChainMeta(chainPath, chain.meta)).rejects.toThrow('locked');

    // Clean up lock
    rmSync(lockPath);
  });

  it('loadChain handles whitespace-only file', async () => {
    const dir = setup();
    const chainPath = join(dir, 'ws.ndjson');
    writeFileSync(chainPath, '   \n  \n  ', 'utf-8');
    await expect(loadChain(chainPath)).rejects.toThrow('empty');
  });
});
