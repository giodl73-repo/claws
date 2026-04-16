/**
 * Blob-verify-sim runner — mock blob rehydration runner.
 *
 * Simulates container restart blob rehydration: downloads fixtures,
 * writes a governance manifest, and verifies artifact hashes.
 *
 * Used by L3 acceptance tests to exercise the full verification flow
 * without actual container infrastructure.
 *
 * @module claws-sdk/tests/accept/runners/blob-verify-sim
 */

import { mkdtemp, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  generateSigningKeyPair,
  signEd25519,
} from '../../../src/compliance/artifact-signer.js';
import { verifyGovernanceArtifacts } from '../../../src/compliance/blob-verify.js';
import { FileKeyResolver, NullKeyResolver } from '../../../src/compliance/key-resolver.js';
import type { KeyResolver } from '../../../src/compliance/key-resolver.js';
import type { GovernanceManifest, GovernanceArtifact } from '../../../src/compliance/manifest-types.js';
import type { VerifyGovernanceArtifactsResult } from '../../../src/compliance/blob-verify.js';

/**
 * Fixture artifact — content to write into the simulated bundle.
 */
export interface FixtureArtifact {
  /** Relative path within the governance bundle. */
  readonly path: string;
  /** File content. */
  readonly content: string;
}

/**
 * Options for running the blob verification simulation.
 */
export interface BlobVerifySimOptions {
  /** Artifacts to include in the bundle. */
  readonly artifacts: readonly FixtureArtifact[];
  /** Whether to sign the manifest. */
  readonly sign?: boolean;
  /** Whether to tamper an artifact after signing. */
  readonly tamperArtifact?: string;
  /** Content to write as tampered artifact. */
  readonly tamperContent?: string;
  /** Whether to require signed artifacts. */
  readonly requireSigned?: boolean;
  /** Timeout in ms (default: 10000). */
  readonly timeoutMs?: number;
}

/**
 * Result of the blob verification simulation.
 */
export interface BlobVerifySimResult {
  /** The verification result from verifyGovernanceArtifacts. */
  readonly verifyResult: VerifyGovernanceArtifactsResult;
  /** Path to the temp directory containing the simulated bundle. */
  readonly bundlePath: string;
  /** Path to the manifest file. */
  readonly manifestPath: string;
}

/**
 * Run the blob verification simulation.
 *
 * Creates a temp directory, writes artifact files and a manifest,
 * optionally signs and/or tampers, then runs verification.
 */
export async function runBlobVerifySim(
  options: BlobVerifySimOptions,
): Promise<BlobVerifySimResult> {
  const tmpDir = await mkdtemp(join(tmpdir(), 'blob-sim-'));

  // Write artifact files and build manifest entries
  const entries: GovernanceArtifact[] = [];
  for (const a of options.artifacts) {
    const fullPath = join(tmpDir, a.path);
    const parentDir = join(tmpDir, ...a.path.split('/').slice(0, -1));
    if (parentDir !== tmpDir) {
      await mkdir(parentDir, { recursive: true }).catch(() => {});
    }
    await writeFile(fullPath, a.content, 'utf-8');
    const hash = createHash('sha256').update(a.content).digest('hex');
    entries.push({ path: a.path, contentHash: hash, size: Buffer.byteLength(a.content) });
  }

  // Build manifest
  let manifest: GovernanceManifest;
  let keySource: KeyResolver;

  if (options.sign) {
    const keyPair = generateSigningKeyPair();
    const signableContent = { schemaVersion: '1.0.0', artifacts: entries };
    const envelope = signEd25519(signableContent, keyPair.privateKey, keyPair.keyId);

    manifest = {
      schemaVersion: '1.0.0',
      artifacts: entries,
      signature: envelope.signature,
      signedAt: envelope.signedAt,
      keyId: envelope.keyId,
    };

    // Write public key for verification
    const keyPath = join(tmpDir, 'verify.pem');
    await writeFile(keyPath, keyPair.publicKey, 'utf-8');
    keySource = new FileKeyResolver(keyPath);
  } else {
    manifest = {
      schemaVersion: '1.0.0',
      artifacts: entries,
      signature: null,
      signedAt: null,
      keyId: null,
    };
    keySource = new NullKeyResolver();
  }

  const manifestPath = join(tmpDir, '.claws-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest), 'utf-8');

  // Optionally tamper an artifact
  if (options.tamperArtifact && options.tamperContent !== undefined) {
    await writeFile(join(tmpDir, options.tamperArtifact), options.tamperContent, 'utf-8');
  }

  // Run verification
  const verifyResult = await verifyGovernanceArtifacts(manifestPath, {
    keySource,
    requireSigned: options.requireSigned,
    timeoutMs: options.timeoutMs,
  });

  return { verifyResult, bundlePath: tmpDir, manifestPath };
}
