/**
 * Crypto acceptance tests — scenario verification.
 *
 * L3: Verifies crypto findings from scenarios crypto/S01 and crypto/S04.
 *
 * crypto/S01: Free tier uses Node.js crypto directly, no external deps.
 * crypto/S04: Ed25519 signing in free tier (R1 finding C6).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { aesEncrypt, aesDecrypt, generateAesKey } from '#src/compiler/crypto/aes.js';
import { hmacSign, hmacVerify } from '#src/compiler/crypto/hmac.js';
import { sha256 } from '#src/compiler/crypto/hash.js';
import { generateKeypair, ed25519Sign, ed25519Verify } from '#src/compiler/crypto/ed25519.js';
import { keyFingerprint } from '#src/compiler/crypto/keys.js';

describe('Crypto acceptance — scenario findings', () => {
  it('crypto/S01: all primitives use Node.js crypto, zero third-party deps', () => {
    // Verify all four primitives work without external dependencies.
    // The acceptance criterion is that these functions exist and operate
    // using only Node.js built-in crypto.

    // AES-256-GCM
    const key = generateAesKey();
    const payload = aesEncrypt('test', key);
    expect(aesDecrypt(payload, key)).toBe('test');

    // HMAC-SHA256
    const mac = hmacSign('test', key);
    expect(hmacVerify('test', mac, key)).toBe(true);

    // SHA-256
    expect(sha256('test')).toHaveLength(64);

    // Ed25519
    const keypair = generateKeypair();
    const sig = ed25519Sign('test', keypair.privateKey);
    expect(ed25519Verify('test', sig, keypair.publicKey)).toBe(true);

    // Key fingerprint
    const fp = keyFingerprint(keypair.publicKey);
    expect(fp).toHaveLength(64);

    // Verify no third-party crypto imports in source files.
    // Read each source file and confirm only 'node:crypto' imports.
    const srcDir = resolve(__dirname, '../../../src/compiler/crypto');
    const srcFiles = ['aes.ts', 'hmac.ts', 'hash.ts', 'ed25519.ts', 'keys.ts'];

    for (const file of srcFiles) {
      const content = readFileSync(resolve(srcDir, file), 'utf-8');
      // All crypto imports must be from 'node:crypto'
      const cryptoImports = content.match(/from\s+['"]([^'"]+)['"]/g) ?? [];
      for (const imp of cryptoImports) {
        const moduleName = imp.match(/from\s+['"]([^'"]+)['"]/)?.[1] ?? '';
        // Allow node: builtins and relative imports only
        expect(
          moduleName.startsWith('node:') || moduleName.startsWith('.'),
          `${file} imports from non-builtin module: ${moduleName}`,
        ).toBe(true);
      }
    }
  });

  it('crypto/S04: Ed25519 signing in free tier per R1 finding C6', () => {
    // R1 finding C6: HMAC-only audit is cryptographically insufficient.
    // Free tier MUST include Ed25519 keypair generation + signing.

    // Generate keypair
    const keypair = generateKeypair();
    expect(keypair.publicKey).toContain('BEGIN PUBLIC KEY');
    expect(keypair.privateKey).toContain('BEGIN PRIVATE KEY');

    // Sign audit data
    const auditPayload = JSON.stringify({
      timestamp: '2026-04-16T00:00:00Z',
      eventType: 'policy-check',
      actor: 'agent-001',
      target: 'tool:shell',
      action: 'invoke',
      outcome: 'deny',
      ruleId: 'G-PERM-01',
    });

    const signature = ed25519Sign(auditPayload, keypair.privateKey);
    expect(signature).toBeTruthy();

    // Verify signature
    expect(ed25519Verify(auditPayload, signature, keypair.publicKey)).toBe(true);

    // Tampered data fails verification
    const tampered = auditPayload.replace('deny', 'allow');
    expect(ed25519Verify(tampered, signature, keypair.publicKey)).toBe(false);

    // Fingerprint for key identification
    const fp = keyFingerprint(keypair.publicKey);
    expect(fp).toHaveLength(64);
    // Fingerprint is deterministic
    expect(keyFingerprint(keypair.publicKey)).toBe(fp);
  });
});
