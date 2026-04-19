/**
 * Audit chain end-to-end test.
 *
 * L2: full lifecycle -- generate keypair, create chain, append 100 entries,
 * persist to file, reload from file, verify entire chain, tamper one entry,
 * verify detects tampering.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AuditChain } from '#src/compiler/audit/chain.js';
import { verifyChain } from '#src/compiler/audit/verify.js';
import { saveChain, loadChain } from '#src/compiler/audit/storage.js';
import { generateKeypair } from '#src/compiler/crypto/ed25519.js';

describe('Audit e2e', () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('full lifecycle: 100-entry chain with tamper detection', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'audit-e2e-'));
    const chainPath = join(tempDir, 'chain.ndjson');

    // 1. Generate keypair
    const keypair = generateKeypair();

    // 2. Create chain
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);

    // 3. Append 100 entries
    for (let i = 0; i < 100; i++) {
      chain.append({
        action: `action-${i}`,
        subject: `subject-${i % 10}`,
        payload: { iteration: i, data: `value-${i}` },
      });
    }
    expect(chain.length).toBe(100);

    // 4. Persist to file
    await saveChain(chainPath, chain.meta, chain.allEntries);

    // 5. Reload from file
    const loaded = await loadChain(chainPath);
    expect(loaded.entries).toHaveLength(100);
    expect(loaded.meta.entryCount).toBe(100);

    // 6. Verify entire chain
    const validResult = verifyChain(loaded.entries, keypair.publicKey);
    expect(validResult.valid).toBe(true);

    // 7. Tamper with entry at index 50
    const content = readFileSync(chainPath, 'utf-8');
    const lines = content.split('\n');
    // Line 0 is header, line 51 is entry index 50
    const tampered = JSON.parse(lines[51]!) as Record<string, unknown>;
    tampered['payload'] = { iteration: 50, data: 'TAMPERED' };
    lines[51] = JSON.stringify(tampered);
    writeFileSync(chainPath, lines.join('\n'), 'utf-8');

    // 8. Reload and verify detects tampering
    const reloaded = await loadChain(chainPath);
    const tamperedResult = verifyChain(reloaded.entries, keypair.publicKey);
    expect(tamperedResult.valid).toBe(false);
    expect(tamperedResult.brokenAt).toBe(50);
    expect(tamperedResult.reason).toContain('hash mismatch');
  });
});
