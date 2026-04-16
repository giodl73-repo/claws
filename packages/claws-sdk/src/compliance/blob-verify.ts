/**
 * Blob integrity verification — verifies governance artifact signatures
 * before loading at container restart.
 *
 * Prevents tampered blobs from replacing the governance plugin with a
 * permissive version. Reuses Pulse 18 artifact-signer infrastructure
 * (Ed25519 + HMAC-SHA256).
 *
 * Verification flow:
 * 1. Read `.claws-manifest.json` from the specified path
 * 2. Validate manifest structure (non-empty artifacts, schema version)
 * 3. Verify manifest signature using the provided KeyResolver
 * 4. Compute SHA-256 content hash of each listed artifact
 * 5. Compare computed hashes against manifest-recorded hashes
 *
 * Key constraints:
 * - Missing signature → WARNING by default, FAIL when `requireSigned: true`
 * - Missing manifest entirely → WARNING, load proceeds (backward compatible)
 * - Tampered manifest or artifact → FAIL, block loading
 * - Empty manifest (zero artifacts) → FAIL (prevents bypass)
 * - Timeout prevents stalled verification from killing containers (10s default)
 *
 * @module claws-sdk/compliance/blob-verify
 */

import { readFile } from 'node:fs/promises';
import { join, dirname, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import type { KeyResolver } from './key-resolver.js';
import { GOVERNANCE_MANIFEST_SCHEMA_VERSION, type GovernanceManifest } from './manifest-types.js';
import {
  ManifestMissingError,
  ManifestTamperedError,
  ArtifactHashMismatchError,
  VerificationTimeoutError,
  EmptyManifestError,
} from './verify-errors.js';
import { verifyEvidence, hashEvidence } from './artifact-signer.js';
import type { SignedEvidence, SigningMode } from './artifact-signer.js';

/**
 * Options for `verifyGovernanceArtifacts`.
 */
export interface VerifyGovernanceArtifactsOptions {
  /** Key resolver for looking up verification keys. */
  readonly keySource: KeyResolver;
  /** Verification timeout in ms (default: 10000). */
  readonly timeoutMs?: number;
  /** When true, missing signatures are hard failures instead of warnings. */
  readonly requireSigned?: boolean;
}

/**
 * Result of governance artifact verification.
 */
export interface VerifyGovernanceArtifactsResult {
  /** Whether all checks passed. */
  readonly verified: boolean;
  /** Hard failure messages (verification blocked). */
  readonly errors: string[];
  /** Soft warnings (verification passed with caveats). */
  readonly warnings: string[];
}

/**
 * Verify governance artifact integrity from a manifest file.
 *
 * Reads `.claws-manifest.json`, checks manifest signature, and verifies
 * SHA-256 content hashes of each artifact. Returns a result with
 * `verified: boolean`, `errors`, and `warnings`.
 *
 * Uses `AbortController` for timeout enforcement (default: 10s).
 *
 * @param manifestPath - Path to `.claws-manifest.json`
 * @param options - Key source, timeout, and policy flags
 * @returns Verification result
 */
export async function verifyGovernanceArtifacts(
  manifestPath: string,
  options: VerifyGovernanceArtifactsOptions,
): Promise<VerifyGovernanceArtifactsResult> {
  const timeoutMs = options.timeoutMs ?? 10_000;

  // Race the verification logic against a timeout promise so that
  // stalling awaits (e.g., a key resolver that never resolves) are
  // properly interrupted.
  const timeoutResult: VerifyGovernanceArtifactsResult = {
    verified: false,
    errors: [new VerificationTimeoutError(timeoutMs).message],
    warnings: [],
  };

  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<VerifyGovernanceArtifactsResult>((resolve) => {
    timer = setTimeout(() => resolve(timeoutResult), timeoutMs);
  });

  try {
    return await Promise.race([
      doVerify(manifestPath, options),
      timeoutPromise,
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Internal verification logic — separated so `verifyGovernanceArtifacts`
 * can race it against a timeout promise.
 */
async function doVerify(
  manifestPath: string,
  options: VerifyGovernanceArtifactsOptions,
): Promise<VerifyGovernanceArtifactsResult> {
  const requireSigned = options.requireSigned ?? false;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: Read manifest
  let rawManifest: string;
  try {
    rawManifest = await readFile(manifestPath, 'utf-8');
  } catch {
    // Missing manifest entirely → backward compatible
    if (requireSigned) {
      const err = new ManifestMissingError(manifestPath);
      errors.push(err.message);
      return { verified: false, errors, warnings };
    }
    warnings.push(`Manifest not found: ${manifestPath} — loading proceeds (pre-signing era)`);
    return { verified: true, errors, warnings };
  }

  // Step 2: Parse manifest
  let manifest: GovernanceManifest;
  try {
    manifest = JSON.parse(rawManifest) as GovernanceManifest;
  } catch {
    errors.push(`Failed to parse manifest: ${manifestPath}`);
    return { verified: false, errors, warnings };
  }

  // Step 2b: Validate schema version (CM17)
  if (manifest.schemaVersion !== GOVERNANCE_MANIFEST_SCHEMA_VERSION) {
    errors.push(
      `Unsupported manifest schema version: ${manifest.schemaVersion} (expected ${GOVERNANCE_MANIFEST_SCHEMA_VERSION})`,
    );
    return { verified: false, errors, warnings };
  }

  // Step 3: Validate non-empty artifacts (GW F-08)
  if (!manifest.artifacts || manifest.artifacts.length === 0) {
    const err = new EmptyManifestError();
    errors.push(err.message);
    return { verified: false, errors, warnings };
  }

  // Step 4: Verify manifest signature
  if (manifest.signature && manifest.keyId) {
    const key = await options.keySource.resolve(manifest.keyId);
    if (!key) {
      if (requireSigned) {
        errors.push(`Key not found for keyId: ${manifest.keyId}`);
        return { verified: false, errors, warnings };
      }
      warnings.push(`Key not found for keyId: ${manifest.keyId} — signature not verified`);
    } else {
      // Build the signable content (everything except signature metadata)
      const signableContent = {
        schemaVersion: manifest.schemaVersion,
        artifacts: manifest.artifacts,
      };

      // Reconstruct the SignedEvidence envelope for verification
      const envelope: SignedEvidence = {
        algorithm: detectAlgorithm(manifest.signature),
        signature: manifest.signature,
        keyId: manifest.keyId,
        signedAt: manifest.signedAt ?? '',
        evidenceHash: hashEvidence(signableContent),
      };

      const keyStr = key.toString('utf-8');
      const valid = verifyEvidence(envelope, signableContent, keyStr);
      if (!valid) {
        const err = new ManifestTamperedError(manifestPath, 'signature does not match content');
        errors.push(err.message);
        return { verified: false, errors, warnings };
      }
    }
  } else {
    // No signature present
    if (requireSigned) {
      errors.push(`Manifest is unsigned and requireSignedArtifacts is enabled`);
      return { verified: false, errors, warnings };
    }
    warnings.push('Manifest is unsigned — signature verification skipped (pre-signing era)');
  }

  // Step 5: Verify artifact content hashes
  const baseDir = resolve(dirname(manifestPath));
  for (const artifact of manifest.artifacts) {
    const artifactPath = resolve(join(baseDir, artifact.path));
    // Path traversal guard: artifact must resolve within baseDir
    if (!artifactPath.startsWith(baseDir + sep) && artifactPath !== baseDir) {
      errors.push(`Path traversal blocked: ${artifact.path} resolves outside base directory`);
      continue;
    }
    let content: Buffer;
    try {
      content = await readFile(artifactPath);
    } catch {
      errors.push(`Artifact not found: ${artifact.path}`);
      continue;
    }

    const actualHash = createHash('sha256').update(content).digest('hex');
    if (actualHash !== artifact.contentHash) {
      const err = new ArtifactHashMismatchError(
        artifact.path,
        artifact.contentHash,
        actualHash,
      );
      errors.push(err.message);
    }
  }

  return {
    verified: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Detect the signing algorithm from a base64-encoded signature.
 *
 * Ed25519 signatures are always 64 bytes (88 base64 chars).
 * HMAC-SHA256 signatures are 32 bytes (44 base64 chars).
 */
function detectAlgorithm(signature: string): SigningMode {
  const sigBytes = Buffer.from(signature, 'base64');
  return sigBytes.length === 64 ? 'ed25519' : 'hmac-sha256';
}
