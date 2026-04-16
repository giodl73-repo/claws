/**
 * L2 E2E: Blob integrity — compile → sign → tamper → verify → reject lifecycle.
 *
 * Simulates the full governance artifact lifecycle:
 * 1. Create a governance artifact bundle (multiple files)
 * 2. Sign the manifest with Ed25519
 * 3. Verify the intact bundle (passes)
 * 4. Tamper an artifact file
 * 5. Re-verify (rejects with hash mismatch)
 * 6. Verify empty manifest is rejected
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtemp, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  generateSigningKeyPair,
  signEd25519,
  verifyEd25519,
  hashEvidence,
} from '../../src/compliance/artifact-signer.js';
import { verifyGovernanceArtifacts } from '../../src/compliance/blob-verify.js';
import { FileKeyResolver } from '../../src/compliance/key-resolver.js';
import type { GovernanceManifest, GovernanceArtifact } from '../../src/compliance/manifest-types.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'blob-e2e-'));
});

describe('compile → sign → tamper → verify → reject lifecycle', () => {
  it('full lifecycle: sign, verify, tamper, reject', async () => {
    // ── Step 1: Create governance artifact bundle ─────────────────────────
    const artifactContents = {
      'governance/rules.json': JSON.stringify({
        version: '2.0.0',
        rules: [
          { id: 'SEC-001', action: 'deny', target: 'Bash', pattern: 'rm -rf /' },
          { id: 'SEC-002', action: 'deny', target: 'WriteFile', pattern: '/etc/passwd' },
        ],
      }),
      'governance/policy.yaml': 'enforcement: strict\naudit: true\nversion: 2.0.0',
      'governance/labels.json': JSON.stringify({
        labels: ['pii', 'credentials', 'secrets'],
        version: '1.0.0',
      }),
    };

    // Write artifact files
    const artifacts: GovernanceArtifact[] = [];
    for (const [path, content] of Object.entries(artifactContents)) {
      const fullPath = join(tmpDir, path);
      await mkdir(join(tmpDir, 'governance'), { recursive: true }).catch(() => {});
      await writeFile(fullPath, content, 'utf-8');
      const hash = createHash('sha256').update(content).digest('hex');
      artifacts.push({ path, contentHash: hash, size: Buffer.byteLength(content) });
    }

    // ── Step 2: Sign the manifest ─────────────────────────────────────────
    const keyPair = generateSigningKeyPair();

    const signableContent = {
      schemaVersion: '1.0.0',
      artifacts,
    };

    const envelope = signEd25519(signableContent, keyPair.privateKey, keyPair.keyId);

    const manifest: GovernanceManifest = {
      schemaVersion: '1.0.0',
      artifacts,
      signature: envelope.signature,
      signedAt: envelope.signedAt,
      keyId: envelope.keyId,
    };

    const manifestPath = join(tmpDir, '.claws-manifest.json');
    await writeFile(manifestPath, JSON.stringify(manifest), 'utf-8');

    // Write public key for verification
    const keyPath = join(tmpDir, 'verify.pem');
    await writeFile(keyPath, keyPair.publicKey, 'utf-8');
    const keySource = new FileKeyResolver(keyPath);

    // ── Step 3: Verify intact bundle (passes) ─────────────────────────────
    const intactResult = await verifyGovernanceArtifacts(manifestPath, { keySource });

    expect(intactResult.verified).toBe(true);
    expect(intactResult.errors).toHaveLength(0);
    expect(intactResult.warnings).toHaveLength(0);

    // ── Step 4: Tamper an artifact ────────────────────────────────────────
    const tamperedContent = JSON.stringify({
      version: '2.0.0',
      rules: [],  // Removed all security rules — permissive!
    });
    await writeFile(join(tmpDir, 'governance/rules.json'), tamperedContent, 'utf-8');

    // ── Step 5: Re-verify (rejects) ───────────────────────────────────────
    const tamperedResult = await verifyGovernanceArtifacts(manifestPath, { keySource });

    expect(tamperedResult.verified).toBe(false);
    expect(tamperedResult.errors.length).toBeGreaterThan(0);
    expect(tamperedResult.errors.some(e =>
      e.includes('hash mismatch') && e.includes('governance/rules.json'),
    )).toBe(true);

    // ── Step 6: Empty manifest is rejected ────────────────────────────────
    const emptyManifest: GovernanceManifest = {
      schemaVersion: '1.0.0',
      artifacts: [],
      signature: null,
      signedAt: null,
      keyId: null,
    };
    const emptyManifestPath = join(tmpDir, 'empty-manifest.json');
    await writeFile(emptyManifestPath, JSON.stringify(emptyManifest), 'utf-8');

    const emptyResult = await verifyGovernanceArtifacts(emptyManifestPath, { keySource });
    expect(emptyResult.verified).toBe(false);
    expect(emptyResult.errors.some(e => e.includes('zero artifacts'))).toBe(true);
  });
});
