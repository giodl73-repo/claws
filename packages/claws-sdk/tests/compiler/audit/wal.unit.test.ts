/**
 * Write-ahead log unit tests.
 *
 * L0: WAL buffers entries before flush, WAL recovers uncommitted entries,
 * plus coverage for recover on missing file, clear, empty flush.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { AuditWal } from '#src/compiler/audit/wal.js';
import { AuditChain } from '#src/compiler/audit/chain.js';
import { generateKeypair } from '#src/compiler/crypto/ed25519.js';

describe('AuditWal', () => {
  const keypair = generateKeypair();
  let tempDir: string;

  function setup(): { wal: AuditWal; walPath: string } {
    tempDir = mkdtempSync(join(tmpdir(), 'audit-wal-'));
    const walPath = join(tempDir, 'test.wal');
    return { wal: new AuditWal(walPath), walPath };
  }

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('buffers entries before flush', async () => {
    const { wal } = setup();
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);

    const e0 = chain.append({ action: 'compile', subject: 'a.oc', payload: {} });
    const e1 = chain.append({ action: 'sign', subject: 'a.oc', payload: {} });

    await wal.write(e0);
    await wal.write(e1);

    // Pending should have both entries
    expect(wal.pending).toHaveLength(2);
    expect(wal.pending[0]!.action).toBe('compile');
    expect(wal.pending[1]!.action).toBe('sign');

    // Flush returns all buffered entries and clears buffer
    const flushed = await wal.flush();
    expect(flushed).toHaveLength(2);
    expect(wal.pending).toHaveLength(0);
  });

  it('recovers uncommitted entries', async () => {
    const { walPath } = setup();
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);

    // Write 3 entries, flush first 2, leave 1 uncommitted
    const wal1 = new AuditWal(walPath);
    const e0 = chain.append({ action: 'compile', subject: 'a.oc', payload: {} });
    const e1 = chain.append({ action: 'sign', subject: 'a.oc', payload: {} });
    const e2 = chain.append({ action: 'deploy', subject: 'a.oc', payload: {} });

    await wal1.write(e0);
    await wal1.write(e1);
    await wal1.flush(); // Commits e0 and e1
    await wal1.write(e2); // Written to WAL but NOT flushed -- simulates crash

    // New WAL instance (simulating restart after crash)
    const wal2 = new AuditWal(walPath);
    const recovered = await wal2.recover();

    // Only e2 should be recovered (e0 and e1 were committed)
    expect(recovered).toHaveLength(1);
    expect(recovered[0]!.action).toBe('deploy');
    expect(recovered[0]!.index).toBe(2);
  });

  it('recover returns empty array when WAL file does not exist', async () => {
    const { wal } = setup();
    // No writes -- file doesn't exist yet
    const recovered = await wal.recover();
    expect(recovered).toHaveLength(0);
  });

  it('recover returns empty array when all entries are committed', async () => {
    const { walPath } = setup();
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);

    const wal = new AuditWal(walPath);
    const e0 = chain.append({ action: 'a', subject: 's', payload: {} });
    await wal.write(e0);
    await wal.flush();

    const wal2 = new AuditWal(walPath);
    const recovered = await wal2.recover();
    expect(recovered).toHaveLength(0);
  });

  it('clear removes WAL file contents', async () => {
    const { walPath } = setup();
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);

    const wal = new AuditWal(walPath);
    const e0 = chain.append({ action: 'a', subject: 's', payload: {} });
    await wal.write(e0);

    await wal.clear();

    const wal2 = new AuditWal(walPath);
    const recovered = await wal2.recover();
    expect(recovered).toHaveLength(0);
  });

  it('clear is safe on non-existent file', async () => {
    const { wal } = setup();
    // No writes -- clear should not throw
    await expect(wal.clear()).resolves.toBeUndefined();
  });

  it('flush with no pending entries does not write sentinel', async () => {
    const { wal, walPath } = setup();
    const flushed = await wal.flush();
    expect(flushed).toHaveLength(0);
    // WAL file should not be created for an empty flush
    expect(existsSync(walPath)).toBe(false);
  });

  it('recover returns empty array when WAL file contains only whitespace', async () => {
    const { walPath } = setup();
    const { writeFileSync } = await import('node:fs');
    writeFileSync(walPath, '   \n  \n  ', 'utf-8');

    const wal = new AuditWal(walPath);
    const recovered = await wal.recover();
    expect(recovered).toHaveLength(0);
  });

  it('recover handles multiple commit sentinels with uncommitted entries after each', async () => {
    const { walPath } = setup();
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);

    // Batch 1: write 2, flush
    const wal1 = new AuditWal(walPath);
    const e0 = chain.append({ action: 'a', subject: 's', payload: {} });
    const e1 = chain.append({ action: 'b', subject: 's', payload: {} });
    await wal1.write(e0);
    await wal1.write(e1);
    await wal1.flush();

    // Batch 2: write 1, flush
    const e2 = chain.append({ action: 'c', subject: 's', payload: {} });
    await wal1.write(e2);
    await wal1.flush();

    // Batch 3: write 1, NO flush (crash)
    const e3 = chain.append({ action: 'd', subject: 's', payload: {} });
    await wal1.write(e3);

    // Recover should only return the unflushed entry
    const wal2 = new AuditWal(walPath);
    const recovered = await wal2.recover();
    expect(recovered).toHaveLength(1);
    expect(recovered[0]!.action).toBe('d');
  });

  it('recover skips empty lines in WAL file', async () => {
    const { walPath } = setup();
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);

    // Write two entries
    const wal = new AuditWal(walPath);
    const e0 = chain.append({ action: 'a', subject: 's', payload: {} });
    const e1 = chain.append({ action: 'b', subject: 's', payload: {} });
    await wal.write(e0);
    await wal.write(e1);

    // Inject blank lines BETWEEN entries so they survive content.trim()
    const { readFileSync, writeFileSync } = await import('node:fs');
    const content = readFileSync(walPath, 'utf-8').trim();
    const lines = content.split('\n');
    // Put blank lines between the two entry lines
    const withBlanks = [lines[0], '', '  ', lines[1]].join('\n');
    writeFileSync(walPath, withBlanks, 'utf-8');

    const wal2 = new AuditWal(walPath);
    const recovered = await wal2.recover();
    expect(recovered).toHaveLength(2);
    expect(recovered[0]!.action).toBe('a');
    expect(recovered[1]!.action).toBe('b');
  });

  it('write creates parent directories if needed', async () => {
    const deepPath = join(tempDir || mkdtempSync(join(tmpdir(), 'audit-wal-')), 'nested', 'deep', 'test.wal');
    if (!tempDir) tempDir = dirname(dirname(dirname(deepPath)));
    const wal = new AuditWal(deepPath);
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);
    const e0 = chain.append({ action: 'a', subject: 's', payload: {} });
    await wal.write(e0);
    expect(existsSync(dirname(deepPath))).toBe(true);
  });
});
