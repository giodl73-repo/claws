/**
 * Distinct error types for blob integrity verification.
 *
 * Each error class maps to a specific failure mode during governance
 * artifact verification. Consumers can `instanceof` check to route
 * errors to the appropriate handler (e.g., SIEM emitter, CLI output).
 *
 * @module claws-sdk/compliance/verify-errors
 */

/**
 * Base class for all verification errors.
 * Provides a `code` discriminant for programmatic error routing.
 */
export abstract class VerificationError extends Error {
  abstract readonly code: string;
}

/**
 * The `.claws-manifest.json` file is missing entirely.
 *
 * Behavior depends on policy:
 * - Default: WARNING, loading proceeds (backward compatible with pre-signing era)
 * - `requireSignedArtifacts: true`: FAIL, block loading
 */
export class ManifestMissingError extends VerificationError {
  readonly code = 'MANIFEST_MISSING' as const;

  constructor(readonly manifestPath: string) {
    super(`Manifest not found: ${manifestPath}`);
    this.name = 'ManifestMissingError';
  }
}

/**
 * The manifest's signature does not match its content.
 * Indicates the manifest has been modified after signing.
 */
export class ManifestTamperedError extends VerificationError {
  readonly code = 'MANIFEST_TAMPERED' as const;

  constructor(readonly manifestPath: string, readonly detail: string) {
    super(`Manifest signature verification failed: ${detail}`);
    this.name = 'ManifestTamperedError';
  }
}

/**
 * An artifact's SHA-256 content hash does not match the hash
 * recorded in the manifest. Indicates the artifact file has been
 * modified or replaced.
 */
export class ArtifactHashMismatchError extends VerificationError {
  readonly code = 'ARTIFACT_HASH_MISMATCH' as const;

  constructor(
    readonly artifactPath: string,
    readonly expectedHash: string,
    readonly actualHash: string,
  ) {
    super(
      `Artifact hash mismatch for ${artifactPath}: expected ${expectedHash}, got ${actualHash}`,
    );
    this.name = 'ArtifactHashMismatchError';
  }
}

/**
 * Verification timed out before completing.
 * Prevents stalled verification from killing containers (10s default).
 */
export class VerificationTimeoutError extends VerificationError {
  readonly code = 'VERIFICATION_TIMEOUT' as const;

  constructor(readonly timeoutMs: number) {
    super(`Verification timed out after ${timeoutMs}ms`);
    this.name = 'VerificationTimeoutError';
  }
}

/**
 * The manifest contains zero artifacts.
 * Rejected as invalid — prevents bypass attacks that replace the
 * governance plugin with an empty manifest.
 */
export class EmptyManifestError extends VerificationError {
  readonly code = 'EMPTY_MANIFEST' as const;

  constructor() {
    super('Manifest contains zero artifacts — empty manifests are invalid');
    this.name = 'EmptyManifestError';
  }
}
