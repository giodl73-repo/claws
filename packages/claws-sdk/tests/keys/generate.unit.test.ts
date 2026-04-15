/**
 * L0: Key generation — Ed25519 keypairs and HMAC-SHA256 secrets.
 */

import { describe, it, expect } from 'vitest';
import { generateKey, generateEd25519, generateHmac } from '../../src/keys/generate.js';

describe('generateEd25519', () => {
  it('produces a valid Ed25519 keypair', () => {
    const key = generateEd25519();
    expect(key.algorithm).toBe('ed25519');
    expect(key.publicKey).toContain('-----BEGIN PUBLIC KEY-----');
    expect(key.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
  });

  it('produces unique keypairs on each call', () => {
    const a = generateEd25519();
    const b = generateEd25519();
    expect(a.privateKey).not.toBe(b.privateKey);
    expect(a.publicKey).not.toBe(b.publicKey);
  });
});

describe('generateHmac', () => {
  it('produces a 32-byte hex-encoded HMAC key', () => {
    const key = generateHmac();
    expect(key.algorithm).toBe('hmac-sha256');
    expect(key.publicKey).toBeNull();
    // 32 bytes = 64 hex chars
    expect(key.privateKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces unique keys on each call', () => {
    const a = generateHmac();
    const b = generateHmac();
    expect(a.privateKey).not.toBe(b.privateKey);
  });
});

describe('generateKey', () => {
  it('delegates ed25519 to generateEd25519', () => {
    const key = generateKey('ed25519');
    expect(key.algorithm).toBe('ed25519');
    expect(key.publicKey).toContain('BEGIN PUBLIC KEY');
  });

  it('delegates hmac-sha256 to generateHmac', () => {
    const key = generateKey('hmac-sha256');
    expect(key.algorithm).toBe('hmac-sha256');
    expect(key.publicKey).toBeNull();
    expect(key.privateKey).toMatch(/^[0-9a-f]{64}$/);
  });
});
