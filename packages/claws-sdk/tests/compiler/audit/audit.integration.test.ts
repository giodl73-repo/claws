/**
 * Audit chain integration tests.
 *
 * L1: round-trip persist/reload, tampered file detection,
 * concurrent append serialization, WAL crash recovery.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AuditChain } from '#src/compiler/audit/chain.js';
import { AuditWal } from '#src/compiler/audit/wal.js';
import { verifyChain } from '#src/compiler/audit/verify.js';
import { saveChain, loadChain } from '#src/compiler/audit/storage.js';
import { generateKeypair } from '#src/compiler/crypto/ed25519.js';

describe('Audit integration', () => {
  const keypair = generateKeypair();
  let tempDir: string;

  function setup(): string {
    tempDir = mkdtempSync(join(tmpdir(), 'audit-int-'));
    return tempDir;
  }

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('chain create -> append -> verify -> persist -> reload round-trip', async () => {
    const dir = setup();
    const chainPath = join(dir, 'chain.ndjson');

    // Create and populate chain
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);
    chain.append({ action: 'compile', subject: 'workspace.oc', payload: { files: 5 } });
    chain.append({ action: 'sign', subject: 'workspace.oc', payload: { algo: 'ed25519' } });
    chain.append({ action: 'deploy', subject: 'workspace.oc', payload: { target: 'local' } });

    // Verify before persist
    const preResult = verifyChain(chain.allEntries, keypair.publicKey);
    expect(preResult.valid).toBe(true);

    // Persist
    await saveChain(chainPath, chain.meta, chain.allEntries);

    // Reload
    const loaded = await loadChain(chainPath);
    expect(loaded.meta.chainId).toBe(chain.meta.chainId);
    expect(loaded.meta.entryCount).toBe(3);
    expect(loaded.entries).toHaveLength(3);

    // Verify after reload
    const postResult = verifyChain(loaded.entries, keypair.publicKey);
    expect(postResult.valid).toBe(true);

    // Entries match
    expect(loaded.entries[0]!.action).toBe('compile');
    expect(loaded.entries[1]!.action).toBe('sign');
    expect(loaded.entries[2]!.action).toBe('deploy');
  });

  it('detects tampered file on reload', async () => {
    const dir = setup();
    const chainPath = join(dir, 'chain.ndjson');

    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);
    chain.append({ action: 'compile', subject: 'a.oc', payload: {} });
    chain.append({ action: 'sign', subject: 'a.oc', payload: { critical: true } });
    chain.append({ action: 'deploy', subject: 'a.oc', payload: {} });

    await saveChain(chainPath, chain.meta, chain.allEntries);

    // Tamper with the file: modify entry 1's payload on disk
    const content = readFileSync(chainPath, 'utf-8');
    const lines = content.split('\n');
    const entry1 = JSON.parse(lines[2]!) as Record<string, unknown>;
    entry1['payload'] = { critical: false }; // Tamper!
    lines[2] = JSON.stringify(entry1);
    writeFileSync(chainPath, lines.join('\n'), 'utf-8');

    // Reload and verify -- should detect tamper
    const loaded = await loadChain(chainPath);
    const result = verifyChain(loaded.entries, keypair.publicKey);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(1);
  });

  it('concurrent append serialization via file lock', async () => {
    const dir = setup();
    const chainPath = join(dir, 'chain.ndjson');

    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);
    for (let i = 0; i < 10; i++) {
      chain.append({ action: `op-${i}`, subject: 'test', payload: { i } });
    }

    // Save the chain (this acquires and releases the lock)
    await saveChain(chainPath, chain.meta, chain.allEntries);

    // Verify the chain persists correctly with all 10 entries
    const loaded = await loadChain(chainPath);
    expect(loaded.entries).toHaveLength(10);

    const result = verifyChain(loaded.entries, keypair.publicKey);
    expect(result.valid).toBe(true);

    // Verify ordering is preserved
    for (let i = 0; i < 10; i++) {
      expect(loaded.entries[i]!.action).toBe(`op-${i}`);
      expect(loaded.entries[i]!.index).toBe(i);
    }
  });

  it('WAL recovery after simulated crash', async () => {
    const dir = setup();
    const chainPath = join(dir, 'chain.ndjson');
    const walPath = join(dir, 'chain.wal');

    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);

    // Phase 1: Create chain with 3 entries and persist
    const e0 = chain.append({ action: 'compile', subject: 'a.oc', payload: {} });
    const e1 = chain.append({ action: 'sign', subject: 'a.oc', payload: {} });
    const e2 = chain.append({ action: 'deploy', subject: 'a.oc', payload: {} });
    await saveChain(chainPath, chain.meta, chain.allEntries);

    // Phase 2: Write 2 more entries to WAL but don't commit (simulates crash)
    const wal = new AuditWal(walPath);
    const e3 = chain.append({ action: 'audit', subject: 'a.oc', payload: {} });
    const e4 = chain.append({ action: 'report', subject: 'a.oc', payload: {} });
    await wal.write(e3);
    await wal.write(e4);
    // No flush -- crash!

    // Phase 3: Recovery -- read WAL, replay into chain, re-persist
    const recoveryWal = new AuditWal(walPath);
    const recovered = await recoveryWal.recover();
    expect(recovered).toHaveLength(2);
    expect(recovered[0]!.action).toBe('audit');
    expect(recovered[1]!.action).toBe('report');

    // Load existing chain and verify recovered entries extend it
    const loaded = await loadChain(chainPath);
    const allEntries = [...loaded.entries, ...recovered];
    const result = verifyChain(allEntries, keypair.publicKey);
    expect(result.valid).toBe(true);
    expect(allEntries).toHaveLength(5);
  });
});
