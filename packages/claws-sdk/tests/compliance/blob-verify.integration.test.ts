/**
 * L1: Blob integrity verification — integration tests.
 *
 * Tests cross-module interactions:
 * 1. Sign → verify round-trip (Ed25519 keys, manifest, artifacts)
 * 2. Tamper → detect (modify artifact after signing, verify catches it)
 * 3. Missing manifest backward compatibility
 * 4. KeyResolver env/file/null integration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  generateSigningKeyPair,
  signEd25519,
  hashEvidence,
} from '../../src/compliance/artifact-signer.js';
import { verifyGovernanceArtifacts } from '../../src/compliance/blob-verify.js';
import { EnvKeyResolver, FileKeyResolver, NullKeyResolver } from '../../src/compliance/key-resolver.js';
import type { GovernanceManifest, GovernanceArtifact } from '../../src/compliance/manifest-types.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'blob-int-'));
});

/**
 * Helper: write artifact files, sign the manifest with Ed25519, and return the manifest path.
 */
async function writeSignedBundle(
  artifacts: Array<{ path: string; content: string }>,
  keyPair: ReturnType<typeof generateSigningKeyPair>,
): Promise<string> {
  const entries: GovernanceArtifact[] = [];
  for (const a of artifacts) {
    const fullPath = join(tmpDir, a.path);
    const dir = join(tmpDir, ...a.path.split('/').slice(0, -1));
    if (dir !== tmpDir) {
      await mkdir(dir, { recursive: true }).catch(() => {});
    }
    await writeFile(fullPath, a.content, 'utf-8');
    const hash = createHash('sha256').update(a.content).digest('hex');
    entries.push({ path: a.path, contentHash: hash, size: Buffer.byteLength(a.content) });
  }

  // Sign the manifest content
  const signableContent = {
    schemaVersion: '1.0.0',
    artifacts: entries,
  };

  const envelope = signEd25519(signableContent, keyPair.privateKey, keyPair.keyId);

  const manifest: GovernanceManifest = {
    schemaVersion: '1.0.0',
    artifacts: entries,
    signature: envelope.signature,
    signedAt: envelope.signedAt,
    keyId: envelope.keyId,
  };

  const manifestPath = join(tmpDir, '.claws-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest), 'utf-8');
  return manifestPath;
}

// ── 1. Sign → verify round-trip ──────────────────────────────────────────

describe('sign → verify round-trip', () => {
  it('Ed25519 signed manifest passes verification with FileKeyResolver', async () => {
    const keyPair = generateSigningKeyPair();

    // Write the public key to a file
    const keyPath = join(tmpDir, 'verify.pem');
    await writeFile(keyPath, keyPair.publicKey, 'utf-8');

    // Write a signed bundle
    const manifestPath = await writeSignedBundle(
      [
        { path: 'governance.json', content: '{"rules": ["deny-rm"]}' },
        { path: 'config.yaml', content: 'strict: true' },
      ],
      keyPair,
    );

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new FileKeyResolver(keyPath),
    });

    expect(result.verified).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});

// ── 2. Tamper → detect ───────────────────────────────────────────────────

describe('tamper → detect', () => {
  it('detects tampered artifact after signing', async () => {
    const keyPair = generateSigningKeyPair();
    const keyPath = join(tmpDir, 'verify.pem');
    await writeFile(keyPath, keyPair.publicKey, 'utf-8');

    const manifestPath = await writeSignedBundle(
      [{ path: 'governance.json', content: '{"rules": ["deny-rm"]}' }],
      keyPair,
    );

    // Tamper the artifact AFTER signing
    await writeFile(join(tmpDir, 'governance.json'), '{"rules": []}', 'utf-8');

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new FileKeyResolver(keyPath),
    });

    expect(result.verified).toBe(false);
    expect(result.errors.some(e => e.includes('hash mismatch'))).toBe(true);
  });

  it('detects tampered manifest content (signature invalid)', async () => {
    const keyPair = generateSigningKeyPair();
    const keyPath = join(tmpDir, 'verify.pem');
    await writeFile(keyPath, keyPair.publicKey, 'utf-8');

    const manifestPath = await writeSignedBundle(
      [{ path: 'governance.json', content: '{"rules": ["deny-rm"]}' }],
      keyPair,
    );

    // Read manifest, tamper it, rewrite (without re-signing)
    const manifestContent = JSON.parse(
      await (await import('node:fs/promises')).readFile(manifestPath, 'utf-8'),
    ) as GovernanceManifest;

    const tampered = {
      ...manifestContent,
      artifacts: [
        {
          path: 'governance.json',
          contentHash: 'a'.repeat(64),
          size: 999,
        },
      ],
    };

    await writeFile(manifestPath, JSON.stringify(tampered), 'utf-8');

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new FileKeyResolver(keyPath),
    });

    expect(result.verified).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ── 3. Missing manifest backward compat ──────────────────────────────────

describe('missing manifest backward compatibility', () => {
  it('passes with warning when manifest is missing (default policy)', async () => {
    const result = await verifyGovernanceArtifacts(
      join(tmpDir, 'nonexistent', '.claws-manifest.json'),
      { keySource: new NullKeyResolver() },
    );

    expect(result.verified).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.some(w => w.includes('not found'))).toBe(true);
  });

  it('fails when manifest is missing with requireSigned', async () => {
    const result = await verifyGovernanceArtifacts(
      join(tmpDir, 'nonexistent', '.claws-manifest.json'),
      { keySource: new NullKeyResolver(), requireSigned: true },
    );

    expect(result.verified).toBe(false);
    expect(result.errors.some(e => e.includes('not found'))).toBe(true);
  });
});

// ── 4. KeyResolver env/file/null ─────────────────────────────────────────

describe('KeyResolver integration', () => {
  it('EnvKeyResolver provides key for verification', async () => {
    const keyPair = generateSigningKeyPair();

    // Store public key in env var
    process.env.CLAWS_VERIFY_KEY = Buffer.from(keyPair.publicKey).toString('base64');

    try {
      const manifestPath = await writeSignedBundle(
        [{ path: 'rules.json', content: '{"strict": true}' }],
        keyPair,
      );

      const result = await verifyGovernanceArtifacts(manifestPath, {
        keySource: new EnvKeyResolver(),
      });

      expect(result.verified).toBe(true);
      expect(result.errors).toHaveLength(0);
    } finally {
      delete process.env.CLAWS_VERIFY_KEY;
    }
  });

  it('NullKeyResolver warns about unverified signature', async () => {
    const keyPair = generateSigningKeyPair();

    const manifestPath = await writeSignedBundle(
      [{ path: 'rules.json', content: '{"strict": true}' }],
      keyPair,
    );

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),
    });

    // NullKeyResolver returns null for the key, so signature can't be verified
    expect(result.verified).toBe(true);
    expect(result.warnings.some(w => w.includes('not found') || w.includes('not verified'))).toBe(true);
  });

  it('NullKeyResolver + requireSigned fails when key not found', async () => {
    const keyPair = generateSigningKeyPair();

    const manifestPath = await writeSignedBundle(
      [{ path: 'rules.json', content: '{"strict": true}' }],
      keyPair,
    );

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),
      requireSigned: true,
    });

    expect(result.verified).toBe(false);
    expect(result.errors.some(e => e.includes('Key not found'))).toBe(true);
  });
});
