/**
 * L3 SDK Acceptance: Blob Integrity Verification.
 *
 * Consumer calls verifyGovernanceArtifacts with signed manifest,
 * verifies:
 * - Valid signed bundle passes
 * - Tampered artifact rejects
 * - Missing signature warns (or fails with requireSigned)
 * - Timeout fires on stalled verification
 *
 * Uses the blob-verify-sim runner to simulate container restart
 * blob rehydration without real container infrastructure.
 */

import { describe, it, expect } from 'vitest';
import { runBlobVerifySim } from '../accept/runners/blob-verify-sim.js';
import type { KeyResolver } from '../../src/compliance/key-resolver.js';
import { verifyGovernanceArtifacts } from '../../src/compliance/blob-verify.js';
import { NullKeyResolver } from '../../src/compliance/key-resolver.js';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GovernanceManifest } from '../../src/compliance/manifest-types.js';

const sampleArtifacts = [
  { path: 'governance/rules.json', content: '{"rules": ["deny-rm", "deny-sudo"]}' },
  { path: 'governance/policy.yaml', content: 'enforcement: strict\naudit: true' },
  { path: 'governance/labels.json', content: '{"labels": ["pii", "credentials"]}' },
];

describe('SDK Acceptance: blob-integrity-verification', () => {
  it('signed bundle passes verification', async () => {
    const sim = await runBlobVerifySim({
      artifacts: sampleArtifacts,
      sign: true,
    });

    expect(sim.verifyResult.verified).toBe(true);
    expect(sim.verifyResult.errors).toHaveLength(0);
    expect(sim.verifyResult.warnings).toHaveLength(0);
  });

  it('tampered artifact is detected and rejected', async () => {
    const sim = await runBlobVerifySim({
      artifacts: sampleArtifacts,
      sign: true,
      tamperArtifact: 'governance/rules.json',
      tamperContent: '{"rules": []}',
    });

    expect(sim.verifyResult.verified).toBe(false);
    expect(sim.verifyResult.errors.some(e => e.includes('hash mismatch'))).toBe(true);
    expect(sim.verifyResult.errors.some(e => e.includes('governance/rules.json'))).toBe(true);
  });

  it('unsigned manifest warns by default', async () => {
    const sim = await runBlobVerifySim({
      artifacts: sampleArtifacts,
      sign: false,
    });

    expect(sim.verifyResult.verified).toBe(true);
    expect(sim.verifyResult.warnings.some(w => w.includes('unsigned'))).toBe(true);
  });

  it('unsigned manifest fails with requireSigned: true', async () => {
    const sim = await runBlobVerifySim({
      artifacts: sampleArtifacts,
      sign: false,
      requireSigned: true,
    });

    expect(sim.verifyResult.verified).toBe(false);
    expect(sim.verifyResult.errors.some(e => e.includes('unsigned') || e.includes('requireSigned'))).toBe(true);
  });

  it('timeout fires on stalled verification', async () => {
    // Create a stalling key resolver
    const stallingKeySource: KeyResolver = {
      resolve: () => new Promise(() => {
        // Never resolves
      }),
    };

    const tmpDir = await mkdtemp(join(tmpdir(), 'blob-accept-'));
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

  it('empty manifest is always rejected regardless of signing', async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), 'blob-accept-empty-'));
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

  it('multiple artifacts verified — all hashes must match', async () => {
    const sim = await runBlobVerifySim({
      artifacts: [
        ...sampleArtifacts,
        { path: 'governance/extra.txt', content: 'extra governance data' },
      ],
      sign: true,
    });

    expect(sim.verifyResult.verified).toBe(true);
    expect(sim.verifyResult.errors).toHaveLength(0);
  });
});
