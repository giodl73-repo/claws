/**
 * PromoteProvenance — cryptographic provenance metadata for promoted snapshots.
 *
 * Attached to every promoted snapshot to attest governance validity
 * at the time of promotion. Stored as provenance.json alongside the
 * promoted snapshot in the fleet registry.
 *
 * @module claws-sdk/snapshot/provenance
 */

/**
 * Provenance metadata for a promoted snapshot.
 */
export interface PromoteProvenance {
  /** Semantic version of the claws SDK that performed the promotion. */
  readonly clawsVersion: string;
  /** SHA-256 hash of the workspace governance state at promotion time. */
  readonly workspaceHash: string;
  /** ISO 8601 timestamp of when the promotion occurred. */
  readonly timestamp: string;
  /** Identifier of the entity that performed the promotion. */
  readonly signer: string;
  /** SHA-256 hash of the entire promoted snapshot directory contents. */
  readonly bundleHash: string;
}
