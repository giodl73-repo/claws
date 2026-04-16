/**
 * Manifest generation — .claws-manifest.json with build provenance,
 * policy hash, risk/OBO/tier fields, and cryptographic signature.
 *
 * Each published version gets its own manifest snapshot (S05-F09),
 * enabling per-version badge storage and independent governance tracking.
 *
 * @module claws-sdk/maker/manifest
 */

import { createHash, createHmac } from 'node:crypto';

import type { GovernanceTier, RiskLevel } from './types.js';

// ── Types ──────────────────────────────────────────────────────────────

/**
 * Build provenance fields for a published skill.
 */
export interface BuildProvenance {
  /** SDK version used for compilation. */
  readonly sdkVersion: string;
  /** ISO 8601 compilation timestamp. */
  readonly compiledAt: string;
  /** Governance tier at publish time. */
  readonly tier: GovernanceTier;
  /** Risk level at publish time. */
  readonly risk: RiskLevel;
  /** Whether OBO governance was enabled. */
  readonly obo: boolean;
  /** OBO scope description (empty string if not OBO). */
  readonly oboScope: string;
  /** SHA-256 hash of the applied policy configuration. */
  readonly policyHash: string;
}

/**
 * Signature status for a manifest.
 */
export type SignatureStatus = 'signed' | 'unsigned' | 'invalid';

/**
 * A complete .claws-manifest.json structure.
 */
export interface ClawsManifest {
  /** Manifest schema version. */
  readonly version: 1;
  /** Skill name. */
  readonly name: string;
  /** Published version string. */
  readonly publishedVersion: string;
  /** Build provenance. */
  readonly provenance: BuildProvenance;
  /** SHA-256 content hash of the skill package. */
  readonly contentHash: string;
  /** Cryptographic signature of the manifest (hex-encoded HMAC-SHA256). */
  readonly signature: string;
  /** Signature status. */
  readonly signatureStatus: SignatureStatus;
}

/**
 * Options for generating a manifest.
 */
export interface GenerateManifestOptions {
  /** Skill name. */
  readonly name: string;
  /** Version being published. */
  readonly version: string;
  /** SDK version. */
  readonly sdkVersion: string;
  /** Governance tier. */
  readonly tier: GovernanceTier;
  /** Risk level. */
  readonly risk: RiskLevel;
  /** OBO enabled. */
  readonly obo: boolean;
  /** OBO scope. */
  readonly oboScope: string;
  /** Policy configuration string to hash. */
  readonly policyConfig: string;
  /** Concatenated skill content to hash. */
  readonly skillContent: string;
  /** Signing key (if provided, manifest is signed). */
  readonly signingKey?: string | undefined;
  /** Optional compiledAt timestamp for deterministic output (default: new Date().toISOString()). */
  readonly compiledAt?: string | undefined;
}

/** Minimum signing key length in bytes for cryptographic strength. */
export const MIN_KEY_BYTES = 32;

// ── Core Functions ───────────────────────────────────────────────────

/**
 * Compute SHA-256 hash of a string.
 */
export function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Compute HMAC-SHA256 signature of data with the given key.
 */
export function hmacSign(data: string, key: string): string {
  return createHmac('sha256', key).update(data, 'utf-8').digest('hex');
}

/**
 * Verify an HMAC-SHA256 signature.
 */
export function hmacVerify(data: string, key: string, signature: string): boolean {
  const expected = hmacSign(data, key);
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Build the signable content string from manifest fields.
 * This is the canonical representation used for signing.
 */
function buildSignableContent(manifest: Omit<ClawsManifest, 'signature' | 'signatureStatus'>): string {
  return [
    manifest.version,
    manifest.name,
    manifest.publishedVersion,
    manifest.contentHash,
    manifest.provenance.sdkVersion,
    manifest.provenance.compiledAt,
    manifest.provenance.tier,
    manifest.provenance.risk,
    manifest.provenance.obo,
    manifest.provenance.oboScope,
    manifest.provenance.policyHash,
  ].join('|');
}

/**
 * Generate a .claws-manifest.json structure.
 *
 * If a signing key is provided, the manifest is signed (HMAC-SHA256).
 * If no key is provided, the manifest is unsigned (DECLARED tier skills).
 */
export function generateManifest(options: GenerateManifestOptions): ClawsManifest {
  const compiledAt = options.compiledAt ?? new Date().toISOString();
  const policyHash = sha256(options.policyConfig);
  const contentHash = sha256(options.skillContent);

  const provenance: BuildProvenance = {
    sdkVersion: options.sdkVersion,
    compiledAt,
    tier: options.tier,
    risk: options.risk,
    obo: options.obo,
    oboScope: options.oboScope,
    policyHash,
  };

  const unsigned: Omit<ClawsManifest, 'signature' | 'signatureStatus'> = {
    version: 1,
    name: options.name,
    publishedVersion: options.version,
    provenance,
    contentHash,
  };

  if (options.signingKey) {
    if (options.signingKey.length < MIN_KEY_BYTES) {
      throw new Error(
        `Signing key must be at least ${MIN_KEY_BYTES} bytes (got ${options.signingKey.length}). Use a cryptographically strong key.`,
      );
    }
    const signableContent = buildSignableContent(unsigned);
    const signature = hmacSign(signableContent, options.signingKey);
    return {
      ...unsigned,
      signature,
      signatureStatus: 'signed',
    };
  }

  return {
    ...unsigned,
    signature: '',
    signatureStatus: 'unsigned',
  };
}

/**
 * Verify a manifest's signature.
 *
 * Returns 'unsigned' for manifests with no signature,
 * 'signed' if the signature is valid, or 'invalid' if tampered.
 */
export function verifyManifest(manifest: ClawsManifest, signingKey: string): SignatureStatus {
  if (!manifest.signature) {
    return 'unsigned';
  }

  const unsigned: Omit<ClawsManifest, 'signature' | 'signatureStatus'> = {
    version: manifest.version,
    name: manifest.name,
    publishedVersion: manifest.publishedVersion,
    provenance: manifest.provenance,
    contentHash: manifest.contentHash,
  };

  const signableContent = buildSignableContent(unsigned);
  const valid = hmacVerify(signableContent, signingKey, manifest.signature);
  return valid ? 'signed' : 'invalid';
}
