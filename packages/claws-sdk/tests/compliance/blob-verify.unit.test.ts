/**
 * L0: Blob integrity verification — unit tests.
 *
 * Tests:
 * 1. Valid manifest passes verification
 * 2. Tampered manifest fails verification
 * 3. Tampered artifact (hash mismatch) fails verification
 * 4. Missing signature warns (or fails when requireSigned)
 * 5. Empty manifest (zero artifacts) rejected
 * 6. Timeout fires on stalled verification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { verifyGovernanceArtifacts } from '../../src/compliance/blob-verify.js';
import { NullKeyResolver, EnvKeyResolver, FileKeyResolver } from '../../src/compliance/key-resolver.js';
import type { KeyResolver } from '../../src/compliance/key-resolver.js';
import { GOVERNANCE_MANIFEST_SCHEMA_VERSION, type GovernanceManifest } from '../../src/compliance/manifest-types.js';
import {
  ManifestMissingError,
  ManifestTamperedError,
  ArtifactHashMismatchError,
  VerificationTimeoutError,
  EmptyManifestError,
  VerificationError,
} from '../../src/compliance/verify-errors.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'blob-verify-'));
});

/**
 * Helper: write artifact files and a manifest to the temp directory.
 */
async function writeTestBundle(
  artifacts: Array<{ path: string; content: string }>,
  overrides?: Partial<GovernanceManifest>,
): Promise<string> {
  const entries = [];
  for (const a of artifacts) {
    const fullPath = join(tmpDir, a.path);
    await mkdir(join(tmpDir, ...a.path.split('/').slice(0, -1)), { recursive: true }).catch(() => {});
    await writeFile(fullPath, a.content, 'utf-8');
    const hash = createHash('sha256').update(a.content).digest('hex');
    entries.push({ path: a.path, contentHash: hash, size: Buffer.byteLength(a.content) });
  }

  const manifest: GovernanceManifest = {
    schemaVersion: '1.0.0',
    artifacts: entries,
    signature: null,
    signedAt: null,
    keyId: null,
    ...overrides,
  };

  const manifestPath = join(tmpDir, '.claws-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest), 'utf-8');
  return manifestPath;
}

// ── 1. Valid manifest passes ──────────────────────────────────────────────

describe('valid manifest passes verification', () => {
  it('verifies an unsigned manifest with NullKeyResolver', async () => {
    const manifestPath = await writeTestBundle([
      { path: 'governance.json', content: '{"rules": []}' },
      { path: 'policy.yaml', content: 'version: 1' },
    ]);

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),
    });

    expect(result.verified).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.some(w => w.includes('unsigned'))).toBe(true);
  });

  it('passes with single artifact', async () => {
    const manifestPath = await writeTestBundle([
      { path: 'rules.json', content: '{"deny": ["rm -rf"]}' },
    ]);

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),
    });

    expect(result.verified).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

// ── 2. Tampered manifest fails ───────────────────────────────────────────

describe('tampered manifest fails verification', () => {
  it('fails when manifest content is corrupted JSON', async () => {
    const manifestPath = join(tmpDir, '.claws-manifest.json');
    await writeFile(manifestPath, '{not valid json', 'utf-8');

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),
    });

    expect(result.verified).toBe(false);
    expect(result.errors.some(e => e.includes('parse'))).toBe(true);
  });
});

// ── 3. Tampered artifact fails ───────────────────────────────────────────

describe('tampered artifact fails verification', () => {
  it('fails when artifact content hash does not match', async () => {
    // Write a valid bundle first
    const manifestPath = await writeTestBundle([
      { path: 'governance.json', content: '{"rules": []}' },
    ]);

    // Tamper the artifact after writing the manifest
    await writeFile(join(tmpDir, 'governance.json'), '{"rules": ["ALLOW ALL"]}', 'utf-8');

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),
    });

    expect(result.verified).toBe(false);
    expect(result.errors.some(e => e.includes('hash mismatch'))).toBe(true);
  });

  it('fails when artifact file is missing', async () => {
    // Write manifest with an artifact that doesn't exist on disk
    const manifest: GovernanceManifest = {
      schemaVersion: '1.0.0',
      artifacts: [{ path: 'missing-file.json', contentHash: 'a'.repeat(64), size: 100 }],
      signature: null,
      signedAt: null,
      keyId: null,
    };

    const manifestPath = join(tmpDir, '.claws-manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest), 'utf-8');

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),
    });

    expect(result.verified).toBe(false);
    expect(result.errors.some(e => e.includes('not found'))).toBe(true);
  });
});

// ── 4. Missing signature warns / fails ───────────────────────────────────

describe('missing signature warns or fails', () => {
  it('warns when manifest is unsigned (default policy)', async () => {
    const manifestPath = await writeTestBundle([
      { path: 'governance.json', content: '{"rules": []}' },
    ]);

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),
    });

    expect(result.verified).toBe(true);
    expect(result.warnings.some(w => w.includes('unsigned'))).toBe(true);
  });

  it('fails when manifest is unsigned with requireSigned: true', async () => {
    const manifestPath = await writeTestBundle([
      { path: 'governance.json', content: '{"rules": []}' },
    ]);

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),
      requireSigned: true,
    });

    expect(result.verified).toBe(false);
    expect(result.errors.some(e => e.includes('unsigned') && e.includes('requireSigned'))).toBe(true);
  });

  it('warns when manifest file is missing entirely (default policy)', async () => {
    const missingPath = join(tmpDir, 'nonexistent', '.claws-manifest.json');

    const result = await verifyGovernanceArtifacts(missingPath, {
      keySource: new NullKeyResolver(),
    });

    expect(result.verified).toBe(true);
    expect(result.warnings.some(w => w.includes('not found'))).toBe(true);
  });

  it('fails when manifest file is missing with requireSigned: true', async () => {
    const missingPath = join(tmpDir, 'nonexistent', '.claws-manifest.json');

    const result = await verifyGovernanceArtifacts(missingPath, {
      keySource: new NullKeyResolver(),
      requireSigned: true,
    });

    expect(result.verified).toBe(false);
    expect(result.errors.some(e => e.includes('not found'))).toBe(true);
  });
});

// ── 5. Empty manifest rejected ───────────────────────────────────────────

describe('empty manifest rejected (GW F-08)', () => {
  it('rejects manifest with zero artifacts', async () => {
    const manifest: GovernanceManifest = {
      schemaVersion: '1.0.0',
      artifacts: [],
      signature: null,
      signedAt: null,
      keyId: null,
    };

    const manifestPath = join(tmpDir, '.claws-manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest), 'utf-8');

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),
    });

    expect(result.verified).toBe(false);
    expect(result.errors.some(e => e.includes('zero artifacts'))).toBe(true);
  });

  it('rejects manifest with missing artifacts field', async () => {
    const manifestPath = join(tmpDir, '.claws-manifest.json');
    await writeFile(manifestPath, JSON.stringify({ schemaVersion: '1.0.0' }), 'utf-8');

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),
    });

    expect(result.verified).toBe(false);
    expect(result.errors.some(e => e.includes('zero artifacts'))).toBe(true);
  });
});

// ── 6. Timeout fires ─────────────────────────────────────────────────────

describe('timeout fires on stalled verification', () => {
  it('times out and returns error', async () => {
    // Create a stalling key resolver that never resolves
    const stallingKeySource: KeyResolver = {
      resolve: () => new Promise(() => {
        // Never resolves — will be aborted by timeout
      }),
    };

    // Write a signed manifest to trigger key resolution
    const manifest: GovernanceManifest = {
      schemaVersion: '1.0.0',
      artifacts: [{ path: 'gov.json', contentHash: 'a'.repeat(64), size: 10 }],
      signature: 'dGVzdA==',
      signedAt: '2026-04-15T00:00:00Z',
      keyId: 'test-key',
    };

    const manifestPath = join(tmpDir, '.claws-manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest), 'utf-8');

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: stallingKeySource,
      timeoutMs: 50,
    });

    expect(result.verified).toBe(false);
    expect(result.errors.some(e => e.includes('timed out'))).toBe(true);
  });
});

// ── Schema version validation (CM17) ────────────────────────────────────

describe('schema version validation', () => {
  it('exports the governance manifest schema version', () => {
    expect(GOVERNANCE_MANIFEST_SCHEMA_VERSION).toBe('1.0.0');
  });

  it('rejects manifest with wrong schemaVersion', async () => {
    const manifestPath = await writeTestBundle(
      [{ path: 'governance.json', content: '{"rules": []}' }],
      { schemaVersion: '99.0.0' },
    );

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),
    });

    expect(result.verified).toBe(false);
    expect(result.errors.some(e => e.includes('Unsupported manifest schema version'))).toBe(true);
    expect(result.errors.some(e => e.includes('99.0.0'))).toBe(true);
  });

  it('accepts manifest with correct schemaVersion', async () => {
    const manifestPath = await writeTestBundle(
      [{ path: 'governance.json', content: '{"rules": []}' }],
      { schemaVersion: GOVERNANCE_MANIFEST_SCHEMA_VERSION },
    );

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),
    });

    expect(result.verified).toBe(true);
  });
});

// ── 7. Path traversal blocked ───────────────────────────────────────────

describe('path traversal blocked', () => {
  it('rejects artifact paths that escape the base directory', async () => {
    const manifest: GovernanceManifest = {
      schemaVersion: '1.0.0',
      artifacts: [
        { path: '../../etc/passwd', contentHash: 'a'.repeat(64), size: 10 },
      ],
      signature: null,
      signedAt: null,
      keyId: null,
    };

    const manifestPath = join(tmpDir, '.claws-manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest), 'utf-8');

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),
    });

    expect(result.verified).toBe(false);
    expect(result.errors.some(e => e.includes('Path traversal blocked'))).toBe(true);
  });
});

// ── 8. Signed manifest branches (key found / not found) ────────────────

describe('signed manifest — key not found (unit)', () => {
  it('warns when key is not found for a signed manifest (default policy)', async () => {
    const manifest: GovernanceManifest = {
      schemaVersion: '1.0.0',
      artifacts: [{ path: 'gov.json', contentHash: 'a'.repeat(64), size: 10 }],
      signature: 'dGVzdA==',  // base64 for "test"
      signedAt: '2026-04-15T00:00:00Z',
      keyId: 'missing-key',
    };

    await writeFile(join(tmpDir, 'gov.json'), '{"rules": []}', 'utf-8');
    const manifestPath = join(tmpDir, '.claws-manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest), 'utf-8');

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),  // always returns null
    });

    // Key not found, but default policy allows it with a warning
    expect(result.warnings.some(w => w.includes('Key not found'))).toBe(true);
    expect(result.warnings.some(w => w.includes('not verified'))).toBe(true);
  });

  it('fails when key is not found with requireSigned: true', async () => {
    const manifest: GovernanceManifest = {
      schemaVersion: '1.0.0',
      artifacts: [{ path: 'gov.json', contentHash: 'a'.repeat(64), size: 10 }],
      signature: 'dGVzdA==',
      signedAt: '2026-04-15T00:00:00Z',
      keyId: 'missing-key',
    };

    await writeFile(join(tmpDir, 'gov.json'), '{"rules": []}', 'utf-8');
    const manifestPath = join(tmpDir, '.claws-manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest), 'utf-8');

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: new NullKeyResolver(),
      requireSigned: true,
    });

    expect(result.verified).toBe(false);
    expect(result.errors.some(e => e.includes('Key not found'))).toBe(true);
  });
});

describe('signed manifest — signature verification (unit)', () => {
  it('fails when HMAC signature does not match content', async () => {
    const content = '{"rules": []}';
    const contentHash = createHash('sha256').update(content).digest('hex');
    // 4 bytes base64 → detected as hmac-sha256
    const dummySig = Buffer.alloc(32).toString('base64'); // 32 bytes → hmac-sha256
    const manifest: GovernanceManifest = {
      schemaVersion: '1.0.0',
      artifacts: [{ path: 'gov.json', contentHash, size: Buffer.byteLength(content) }],
      signature: dummySig,
      signedAt: '2026-04-15T00:00:00Z',
      keyId: 'test-key',
    };

    await writeFile(join(tmpDir, 'gov.json'), content, 'utf-8');
    const manifestPath = join(tmpDir, '.claws-manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest), 'utf-8');

    // Provide a fake key that will cause signature verification to fail
    const fakeKeyResolver: KeyResolver = {
      resolve: async () => Buffer.from('abcd'.repeat(8), 'hex'),
    };

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: fakeKeyResolver,
    });

    expect(result.verified).toBe(false);
    expect(result.errors.some(e => e.includes('signature') || e.includes('tampered'))).toBe(true);
  });

  it('fails when Ed25519-length signature does not match (covers ed25519 branch)', async () => {
    const content = '{"rules": []}';
    const contentHash = createHash('sha256').update(content).digest('hex');
    // 64 bytes → detected as ed25519
    const dummySig = Buffer.alloc(64).toString('base64');
    const manifest: GovernanceManifest = {
      schemaVersion: '1.0.0',
      artifacts: [{ path: 'gov.json', contentHash, size: Buffer.byteLength(content) }],
      signature: dummySig,
      signedAt: '2026-04-15T00:00:00Z',
      keyId: 'test-key',
    };

    await writeFile(join(tmpDir, 'gov.json'), content, 'utf-8');
    const manifestPath = join(tmpDir, '.claws-manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest), 'utf-8');

    // Provide a fake key — Ed25519 verify will reject
    const fakeKeyResolver: KeyResolver = {
      resolve: async () => Buffer.from('not-a-real-ed25519-public-key'),
    };

    const result = await verifyGovernanceArtifacts(manifestPath, {
      keySource: fakeKeyResolver,
    });

    // Either verifyEvidence returns false (tampered error) or throws (caught as error)
    expect(result.verified).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ── Verify error types ───────────────────────────────────────────────────

describe('error type hierarchy', () => {
  it('all error types extend VerificationError', () => {
    expect(new ManifestMissingError('/path')).toBeInstanceOf(VerificationError);
    expect(new ManifestTamperedError('/path', 'detail')).toBeInstanceOf(VerificationError);
    expect(new ArtifactHashMismatchError('/art', 'aaa', 'bbb')).toBeInstanceOf(VerificationError);
    expect(new VerificationTimeoutError(10000)).toBeInstanceOf(VerificationError);
    expect(new EmptyManifestError()).toBeInstanceOf(VerificationError);
  });

  it('error codes are distinct', () => {
    const codes = [
      new ManifestMissingError('/p').code,
      new ManifestTamperedError('/p', 'd').code,
      new ArtifactHashMismatchError('/a', 'a', 'b').code,
      new VerificationTimeoutError(10000).code,
      new EmptyManifestError().code,
    ];
    expect(new Set(codes).size).toBe(5);
  });
});

// ── Key resolver tests ───────────────────────────────────────────────────

describe('KeyResolver implementations', () => {
  it('NullKeyResolver always returns null', async () => {
    const resolver = new NullKeyResolver();
    expect(await resolver.resolve('any-key-id')).toBeNull();
  });

  it('EnvKeyResolver returns base64-decoded key from env', async () => {
    const testKey = Buffer.from('test-verify-key');
    process.env.CLAWS_VERIFY_KEY = testKey.toString('base64');
    try {
      const resolver = new EnvKeyResolver();
      const result = await resolver.resolve('key-id');
      expect(result).not.toBeNull();
      expect(result!.toString()).toBe('test-verify-key');
    } finally {
      delete process.env.CLAWS_VERIFY_KEY;
    }
  });

  it('EnvKeyResolver returns null when env var is not set', async () => {
    delete process.env.CLAWS_VERIFY_KEY;
    const resolver = new EnvKeyResolver();
    expect(await resolver.resolve('key-id')).toBeNull();
  });

  it('EnvKeyResolver supports custom env var name', async () => {
    process.env.CUSTOM_KEY = Buffer.from('custom-key').toString('base64');
    try {
      const resolver = new EnvKeyResolver('CUSTOM_KEY');
      const result = await resolver.resolve('key-id');
      expect(result!.toString()).toBe('custom-key');
    } finally {
      delete process.env.CUSTOM_KEY;
    }
  });

  it('EnvKeyResolver returns keyId-specific env var when set', async () => {
    const specificKey = Buffer.from('specific-key-for-mykey');
    process.env.CLAWS_VERIFY_KEY_mykey = specificKey.toString('base64');
    try {
      const resolver = new EnvKeyResolver();
      const result = await resolver.resolve('mykey');
      expect(result).not.toBeNull();
      expect(result!.toString()).toBe('specific-key-for-mykey');
    } finally {
      delete process.env.CLAWS_VERIFY_KEY_mykey;
    }
  });

  it('EnvKeyResolver sanitizes non-alphanumeric chars in keyId', async () => {
    const specificKey = Buffer.from('key-for-dotted');
    process.env.CLAWS_VERIFY_KEY_my_dotted_key = specificKey.toString('base64');
    try {
      const resolver = new EnvKeyResolver();
      const result = await resolver.resolve('my.dotted-key');
      expect(result).not.toBeNull();
      expect(result!.toString()).toBe('key-for-dotted');
    } finally {
      delete process.env.CLAWS_VERIFY_KEY_my_dotted_key;
    }
  });

  it('EnvKeyResolver falls back to base env var when no specific var exists', async () => {
    const baseKey = Buffer.from('base-fallback-key');
    process.env.CLAWS_VERIFY_KEY = baseKey.toString('base64');
    delete process.env.CLAWS_VERIFY_KEY_nonexistent;
    try {
      const resolver = new EnvKeyResolver();
      const result = await resolver.resolve('nonexistent');
      expect(result).not.toBeNull();
      expect(result!.toString()).toBe('base-fallback-key');
    } finally {
      delete process.env.CLAWS_VERIFY_KEY;
    }
  });

  it('FileKeyResolver reads key from file', async () => {
    const keyPath = join(tmpDir, 'verify.pem');
    await writeFile(keyPath, 'PEM-KEY-DATA', 'utf-8');

    const resolver = new FileKeyResolver(keyPath);
    const result = await resolver.resolve('key-id');
    expect(result!.toString()).toBe('PEM-KEY-DATA');
  });

  it('FileKeyResolver returns null for missing file', async () => {
    const resolver = new FileKeyResolver(join(tmpDir, 'nonexistent.pem'));
    expect(await resolver.resolve('key-id')).toBeNull();
  });
});
