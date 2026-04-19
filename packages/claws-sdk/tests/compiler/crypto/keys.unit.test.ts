/**
 * Key management unit tests.
 *
 * L0: generate+save round-trip, load keypair, fingerprint determinism.
 */

import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  generateAndSave,
  loadKeypair,
  loadPublicKey,
  keyFingerprint,
} from '#src/compiler/crypto/keys.js';

describe('Key management', () => {
  it('generateAndSave creates valid PEM files', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'claws-keys-'));
    try {
      const paths = {
        publicKeyPath: join(tmpDir, 'test.pub.pem'),
        privateKeyPath: join(tmpDir, 'test.key.pem'),
      };

      const keypair = generateAndSave(paths);

      expect(keypair.publicKey).toContain('BEGIN PUBLIC KEY');
      expect(keypair.privateKey).toContain('BEGIN PRIVATE KEY');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('loadKeypair reads back saved keys', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'claws-keys-'));
    try {
      const paths = {
        publicKeyPath: join(tmpDir, 'test.pub.pem'),
        privateKeyPath: join(tmpDir, 'test.key.pem'),
      };

      const original = generateAndSave(paths);
      const loaded = loadKeypair(paths);

      expect(loaded.publicKey).toBe(original.publicKey);
      expect(loaded.privateKey).toBe(original.privateKey);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('loadPublicKey reads a single public key file', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'claws-keys-'));
    try {
      const paths = {
        publicKeyPath: join(tmpDir, 'test.pub.pem'),
        privateKeyPath: join(tmpDir, 'test.key.pem'),
      };

      const original = generateAndSave(paths);
      const pubKey = loadPublicKey(paths.publicKeyPath);

      expect(pubKey).toBe(original.publicKey);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('keyFingerprint is deterministic', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'claws-keys-'));
    try {
      const paths = {
        publicKeyPath: join(tmpDir, 'test.pub.pem'),
        privateKeyPath: join(tmpDir, 'test.key.pem'),
      };

      const keypair = generateAndSave(paths);
      const fp1 = keyFingerprint(keypair.publicKey);
      const fp2 = keyFingerprint(keypair.publicKey);

      expect(fp1).toBe(fp2);
      expect(fp1).toHaveLength(64);
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
