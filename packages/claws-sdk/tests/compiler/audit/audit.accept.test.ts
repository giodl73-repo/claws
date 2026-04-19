/**
 * Audit chain acceptance tests.
 *
 * L3: scenario acceptance test verifying crypto findings from
 * scenarios crypto/S02 and crypto/S03.
 *
 * crypto/S02: Every audit entry MUST be Ed25519-signed (not just HMAC).
 * crypto/S03: Hash chain MUST be tamper-evident with signature verification.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AuditChain } from '#src/compiler/audit/chain.js';
import { verifyChain } from '#src/compiler/audit/verify.js';
import { saveChain, loadChain } from '#src/compiler/audit/storage.js';
import { AuditWal } from '#src/compiler/audit/wal.js';
import { generateKeypair, ed25519Verify } from '#src/compiler/crypto/ed25519.js';
import type { AuditEntry } from '#src/compiler/audit/types.js';

describe('Audit acceptance: crypto scenario findings', () => {
  const keypair = generateKeypair();
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('crypto/S02 + S03: Ed25519 signing, tamper detection, chain integrity, WAL recovery', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'audit-accept-'));
    const chainPath = join(tempDir, 'chain.ndjson');
    const walPath = join(tempDir, 'chain.wal');

    // ── Finding: Every audit entry is Ed25519 signed ──────────────────
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);

    const actions = ['compile', 'parse', 'resolve', 'sign', 'deploy'];
    for (const action of actions) {
      chain.append({ action, subject: 'workspace.oc', payload: { step: action } });
    }

    // Verify every entry has a valid Ed25519 signature (not HMAC)
    for (const entry of chain.allEntries) {
      const sigValid = ed25519Verify(entry.hash, entry.signature, keypair.publicKey);
      expect(sigValid).toBe(true);
      // Signature is hex-encoded Ed25519 (128 hex chars = 64 bytes)
      expect(entry.signature).toMatch(/^[0-9a-f]{128}$/);
    }

    // ── Finding: Hash chain is tamper-evident ─────────────────────────
    const validResult = verifyChain(chain.allEntries, keypair.publicKey);
    expect(validResult.valid).toBe(true);

    // Tamper with middle entry -- chain breaks from that point
    const entries = [...chain.allEntries] as AuditEntry[];
    entries[2] = { ...entries[2]!, payload: { step: 'TAMPERED' } };
    const tamperedResult = verifyChain(entries, keypair.publicKey);
    expect(tamperedResult.valid).toBe(false);
    expect(tamperedResult.brokenAt).toBe(2);

    // ── Finding: Wrong key fails verification ────────────────────────
    const wrongKeypair = generateKeypair();
    const wrongKeyResult = verifyChain(chain.allEntries, wrongKeypair.publicKey);
    expect(wrongKeyResult.valid).toBe(false);
    expect(wrongKeyResult.brokenAt).toBe(0);
    expect(wrongKeyResult.reason).toContain('signature');

    // ── Finding: Persist/reload preserves chain integrity ─────────────
    await saveChain(chainPath, chain.meta, chain.allEntries);
    const loaded = await loadChain(chainPath);
    const reloadResult = verifyChain(loaded.entries, keypair.publicKey);
    expect(reloadResult.valid).toBe(true);
    expect(loaded.entries).toHaveLength(5);

    // ── Finding: WAL prevents data loss ──────────────────────────────
    const wal = new AuditWal(walPath);
    const extraEntry = chain.append({ action: 'audit', subject: 'workspace.oc', payload: {} });
    await wal.write(extraEntry);
    // No flush -- simulating crash

    const recoveryWal = new AuditWal(walPath);
    const recovered = await recoveryWal.recover();
    expect(recovered).toHaveLength(1);
    expect(recovered[0]!.action).toBe('audit');

    // Recovered entries extend the chain validly
    const fullEntries = [...loaded.entries, ...recovered];
    const fullResult = verifyChain(fullEntries, keypair.publicKey);
    expect(fullResult.valid).toBe(true);
  });
});
