/**
 * Ed25519 unit tests.
 *
 * L0: keypair generation, sign→verify round-trip, wrong key fails,
 * signature is deterministic for same input.
 */

import { describe, it, expect } from 'vitest';
import { generateKeypair, ed25519Sign, ed25519Verify } from '#src/compiler/crypto/ed25519.js';

describe('Ed25519', () => {
  it('generates a valid keypair', () => {
    const keypair = generateKeypair();

    expect(keypair.publicKey).toContain('BEGIN PUBLIC KEY');
    expect(keypair.publicKey).toContain('END PUBLIC KEY');
    expect(keypair.privateKey).toContain('BEGIN PRIVATE KEY');
    expect(keypair.privateKey).toContain('END PRIVATE KEY');
  });

  it('signs and verifies round-trip', () => {
    const keypair = generateKeypair();
    const data = 'audit entry #42';

    const signature = ed25519Sign(data, keypair.privateKey);
    const valid = ed25519Verify(data, signature, keypair.publicKey);

    expect(valid).toBe(true);
  });

  it('fails verification with wrong key', () => {
    const keypairA = generateKeypair();
    const keypairB = generateKeypair();
    const data = 'signed by key A';

    const signature = ed25519Sign(data, keypairA.privateKey);
    const valid = ed25519Verify(data, signature, keypairB.publicKey);

    expect(valid).toBe(false);
  });

  it('produces deterministic signatures for same input', () => {
    const keypair = generateKeypair();
    const data = 'deterministic check';

    const sig1 = ed25519Sign(data, keypair.privateKey);
    const sig2 = ed25519Sign(data, keypair.privateKey);

    expect(sig1).toBe(sig2);
  });
});
