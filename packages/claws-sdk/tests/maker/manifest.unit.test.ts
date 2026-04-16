/**
 * L0 unit tests for manifest generation.
 *
 * P29: provenance fields correct, signature generation correct.
 */

import { describe, it, expect } from 'vitest';

import {
  generateManifest,
  verifyManifest,
  sha256,
  hmacSign,
  hmacVerify,
} from '../../src/maker/manifest.js';

describe('provenance fields correct', () => {
  it('generates manifest with all required provenance fields', () => {
    const manifest = generateManifest({
      name: 'test-skill',
      version: '1.0.0',
      sdkVersion: '0.5.0',
      tier: 'TYPED',
      risk: 3,
      obo: true,
      oboScope: 'email sending',
      policyConfig: '{"trustTier":2}',
      skillContent: 'skill content here',
    });

    // Top-level fields
    expect(manifest.version).toBe(1);
    expect(manifest.name).toBe('test-skill');
    expect(manifest.publishedVersion).toBe('1.0.0');
    expect(manifest.contentHash).toBe(sha256('skill content here'));

    // Provenance fields
    expect(manifest.provenance.sdkVersion).toBe('0.5.0');
    expect(manifest.provenance.compiledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(manifest.provenance.tier).toBe('TYPED');
    expect(manifest.provenance.risk).toBe(3);
    expect(manifest.provenance.obo).toBe(true);
    expect(manifest.provenance.oboScope).toBe('email sending');
    expect(manifest.provenance.policyHash).toBe(sha256('{"trustTier":2}'));

    // Unsigned without key
    expect(manifest.signatureStatus).toBe('unsigned');
    expect(manifest.signature).toBe('');
  });
});

describe('signature generation correct', () => {
  it('generates signed manifest with valid HMAC-SHA256 signature', () => {
    const key = 'claws-test-signing-key-32-bytes!';

    const manifest = generateManifest({
      name: 'signed-skill',
      version: '2.0.0',
      sdkVersion: '0.5.0',
      tier: 'VERIFIED',
      risk: 4,
      obo: false,
      oboScope: '',
      policyConfig: '{}',
      skillContent: 'signed content',
      signingKey: key,
    });

    expect(manifest.signatureStatus).toBe('signed');
    expect(manifest.signature).toMatch(/^[a-f0-9]{64}$/);

    // Verify round-trips
    const status = verifyManifest(manifest, key);
    expect(status).toBe('signed');
  });

  it('detects tampered manifest as invalid', () => {
    const key = 'claws-test-signing-key-32-bytes!';

    const manifest = generateManifest({
      name: 'tampered-skill',
      version: '1.0.0',
      sdkVersion: '0.5.0',
      tier: 'TYPED',
      risk: 2,
      obo: false,
      oboScope: '',
      policyConfig: '{}',
      skillContent: 'original content',
      signingKey: key,
    });

    // Tamper with the manifest
    const tampered = { ...manifest, name: 'evil-skill' };
    const status = verifyManifest(tampered, key);
    expect(status).toBe('invalid');
  });

  it('reports unsigned for manifests without signature', () => {
    const manifest = generateManifest({
      name: 'unsigned-skill',
      version: '1.0.0',
      sdkVersion: '0.5.0',
      tier: 'DECLARED',
      risk: 1,
      obo: false,
      oboScope: '',
      policyConfig: '{}',
      skillContent: 'content',
    });

    const status = verifyManifest(manifest, 'any-key');
    expect(status).toBe('unsigned');
  });

  it('hmacSign produces deterministic output', () => {
    const sig1 = hmacSign('hello', 'key');
    const sig2 = hmacSign('hello', 'key');
    expect(sig1).toBe(sig2);
    expect(sig1).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hmacVerify returns false for wrong key', () => {
    const sig = hmacSign('data', 'correct-key');
    expect(hmacVerify('data', 'correct-key', sig)).toBe(true);
    expect(hmacVerify('data', 'wrong-key', sig)).toBe(false);
  });

  it('hmacVerify returns false for wrong data', () => {
    const sig = hmacSign('original', 'key');
    expect(hmacVerify('original', 'key', sig)).toBe(true);
    expect(hmacVerify('tampered', 'key', sig)).toBe(false);
  });

  it('hmacVerify returns false for signature of different length', () => {
    const sig = hmacSign('data', 'key');
    // Truncated signature — different length triggers early return
    expect(hmacVerify('data', 'key', sig.slice(0, 32))).toBe(false);
    // Empty signature
    expect(hmacVerify('data', 'key', '')).toBe(false);
  });
});

describe('minimum signing key length (CM-05)', () => {
  it('throws when signing key is shorter than MIN_KEY_BYTES', () => {
    expect(() => generateManifest({
      name: 'short-key-skill',
      version: '1.0.0',
      sdkVersion: '0.5.0',
      tier: 'TYPED',
      risk: 2,
      obo: false,
      oboScope: '',
      policyConfig: '{}',
      skillContent: 'content',
      signingKey: 'short',
    })).toThrow('Signing key must be at least 32 bytes (got 5). Use a cryptographically strong key.');
  });

  it('accepts signing key of exactly 32 bytes', () => {
    const key32 = 'a'.repeat(32);
    const manifest = generateManifest({
      name: 'exact-key-skill',
      version: '1.0.0',
      sdkVersion: '0.5.0',
      tier: 'TYPED',
      risk: 2,
      obo: false,
      oboScope: '',
      policyConfig: '{}',
      skillContent: 'content',
      signingKey: key32,
    });

    expect(manifest.signatureStatus).toBe('signed');
    expect(manifest.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyManifest(manifest, key32)).toBe('signed');
  });
});

describe('deterministic manifest generation (CM-09)', () => {
  it('uses provided compiledAt timestamp', () => {
    const fixedTimestamp = '2026-01-01T00:00:00.000Z';
    const manifest = generateManifest({
      name: 'deterministic-skill',
      version: '1.0.0',
      sdkVersion: '0.5.0',
      tier: 'DECLARED',
      risk: 1,
      obo: false,
      oboScope: '',
      policyConfig: '{}',
      skillContent: 'content',
      compiledAt: fixedTimestamp,
    });

    expect(manifest.provenance.compiledAt).toBe(fixedTimestamp);
  });

  it('produces identical manifests and signatures with same compiledAt', () => {
    const key = 'deterministic-test-key-32-bytes!';
    const fixedTimestamp = '2026-06-15T12:00:00.000Z';
    const opts = {
      name: 'repro-skill',
      version: '2.0.0',
      sdkVersion: '0.5.0',
      tier: 'TYPED' as const,
      risk: 3 as const,
      obo: false,
      oboScope: '',
      policyConfig: '{"strict": true}',
      skillContent: 'handler code here',
      signingKey: key,
      compiledAt: fixedTimestamp,
    };

    const m1 = generateManifest(opts);
    const m2 = generateManifest(opts);

    expect(m1.provenance.compiledAt).toBe(m2.provenance.compiledAt);
    expect(m1.contentHash).toBe(m2.contentHash);
    expect(m1.signature).toBe(m2.signature);
    expect(m1).toEqual(m2);
  });
});
