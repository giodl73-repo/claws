/**
 * GovernanceManifest types — `.claws-manifest.json` schema.
 *
 * The manifest tracks all governance artifacts deployed to a container:
 * each artifact has a path, SHA-256 content hash, and size. The manifest
 * itself is signed with Ed25519 or HMAC-SHA256 using the artifact-signer
 * infrastructure from Pulse 18.
 *
 * Minimum 1 artifact required — an empty manifest (zero artifacts) is
 * rejected as invalid to prevent bypass attacks that replace the manifest
 * with an empty one.
 *
 * @module claws-sdk/compliance/manifest-types
 */

/**
 * A single governance artifact entry in the manifest.
 */
export interface GovernanceArtifact {
  /** Relative path to the artifact within the governance bundle. */
  readonly path: string;
  /** SHA-256 content hash of the artifact (64-char hex). */
  readonly contentHash: string;
  /** File size in bytes. */
  readonly size: number;
}

/**
 * GovernanceManifest — the `.claws-manifest.json` document.
 *
 * Contains a signed inventory of all governance artifacts in the bundle.
 * The `signature` field covers the entire manifest except the signature
 * metadata itself (signature, signedAt, keyId).
 */
export interface GovernanceManifest {
  /** Schema version for forward compatibility. */
  readonly schemaVersion: string;
  /** Governance artifacts (minimum 1 required). */
  readonly artifacts: readonly GovernanceArtifact[];
  /** Base64-encoded signature over the manifest content. */
  readonly signature: string | null;
  /** ISO 8601 timestamp when the manifest was signed. */
  readonly signedAt: string | null;
  /** Key ID used for signing. */
  readonly keyId: string | null;
}

/**
 * Current schema version for GovernanceManifest.
 */
export const GOVERNANCE_MANIFEST_SCHEMA_VERSION = '1.0.0';
