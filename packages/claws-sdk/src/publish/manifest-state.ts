/**
 * Manifest state detection for publish pipeline.
 *
 * Detects 4 manifest states:
 * - absent: no manifest file found
 * - valid-signed: signature matches content
 * - invalid-signed: tampered, signature mismatch
 * - stale-signed: content changed since signing
 *
 * @module claws-sdk/publish/manifest-state
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * The 4 manifest states detected by the publish pipeline.
 */
export type ManifestState = 'absent' | 'valid-signed' | 'invalid-signed' | 'stale-signed';

/**
 * Parsed manifest data from skill.yaml.
 */
export interface ManifestData {
  /** Raw YAML content of the manifest. */
  readonly content: string;
  /** HMAC signature embedded in the manifest (null if unsigned). */
  readonly signature: string | null;
  /** Content hash at signing time (null if unsigned). */
  readonly contentHash: string | null;
  /** Skill name from the manifest. */
  readonly name: string;
  /** Skill tier (declared | typed | verified). */
  readonly tier: string;
}

/**
 * Result of manifest state detection.
 */
export interface ManifestStateResult {
  /** Detected manifest state. */
  readonly state: ManifestState;
  /** Manifest data (null if absent). */
  readonly manifest: ManifestData | null;
  /** Current content hash computed at detection time. */
  readonly currentHash: string | null;
  /** Human-readable explanation. */
  readonly reason: string;
}

/**
 * Manifest file name within a skill directory.
 */
const MANIFEST_FILE = 'skill.yaml';

/**
 * Signature field name in the manifest YAML.
 */
const SIGNATURE_FIELD = 'signature';

/**
 * Content hash field name in the manifest YAML.
 */
const CONTENT_HASH_FIELD = 'content-hash';

/**
 * Compute HMAC-SHA256 of content using the given key.
 */
export function computeContentHash(content: string, key: string): string {
  const hmac = createHmac('sha256', Buffer.from(key, 'hex'));
  hmac.update(content, 'utf8');
  return hmac.digest('hex');
}

/**
 * Extract the signable content from a manifest — the content without
 * signature and content-hash fields (to avoid circular hashing).
 */
export function extractSignableContent(content: string): string {
  return content
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      return !trimmed.startsWith(`${SIGNATURE_FIELD}:`) &&
             !trimmed.startsWith(`${CONTENT_HASH_FIELD}:`);
    })
    .join('\n');
}

/**
 * Parse a manifest YAML to extract signature and content-hash fields.
 * Simple line-based parser — avoids heavy YAML library dependency.
 */
export function parseManifestFields(content: string): ManifestData {
  let signature: string | null = null;
  let contentHash: string | null = null;
  let name = '';
  let tier = 'declared';

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    const sigMatch = trimmed.match(/^signature:\s*(\S+)$/);
    if (sigMatch?.[1]) {
      signature = sigMatch[1];
    }
    const hashMatch = trimmed.match(/^content-hash:\s*(\S+)$/);
    if (hashMatch?.[1]) {
      contentHash = hashMatch[1];
    }
    const nameMatch = trimmed.match(/^name:\s*(\S.*)$/);
    if (nameMatch?.[1]) {
      name = nameMatch[1].trimEnd();
    }
    const tierMatch = trimmed.match(/^tier:\s*(\S+)$/);
    if (tierMatch?.[1]) {
      tier = tierMatch[1];
    }
  }

  return { content, signature, contentHash, name, tier };
}

/**
 * Constant-time comparison of two hex-encoded strings.
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Detect the manifest state for a skill directory.
 *
 * @param skillDir - Absolute path to the skill directory
 * @param signingKey - Hex-encoded signing key for verification
 * @returns ManifestStateResult with detected state
 */
export async function detectManifestState(
  skillDir: string,
  signingKey: string,
): Promise<ManifestStateResult> {
  const manifestPath = join(skillDir, MANIFEST_FILE);

  // Try to read the manifest
  let rawContent: string;
  try {
    rawContent = await readFile(manifestPath, 'utf-8');
  } catch {
    return {
      state: 'absent',
      manifest: null,
      currentHash: null,
      reason: `No ${MANIFEST_FILE} found in ${skillDir}`,
    };
  }

  const manifest = parseManifestFields(rawContent);

  // No signature = unsigned manifest (treated as absent for signing purposes)
  if (!manifest.signature) {
    return {
      state: 'absent',
      manifest,
      currentHash: null,
      reason: `${MANIFEST_FILE} exists but is unsigned`,
    };
  }

  // Compute current content hash
  const signableContent = extractSignableContent(rawContent);
  const currentHash = computeContentHash(signableContent, signingKey);

  // Verify signature matches current content
  const expectedSignature = computeContentHash(signableContent, signingKey);

  if (!safeCompare(manifest.signature, expectedSignature)) {
    // Signature doesn't match — could be tampered or wrong key
    return {
      state: 'invalid-signed',
      manifest,
      currentHash,
      reason: 'Manifest signature does not match content — possible tampering or wrong key',
    };
  }

  // Signature matches, but check if content hash at signing time differs
  if (manifest.contentHash && !safeCompare(manifest.contentHash, currentHash)) {
    return {
      state: 'stale-signed',
      manifest,
      currentHash,
      reason: 'Manifest content changed since last signing — re-sign required',
    };
  }

  return {
    state: 'valid-signed',
    manifest,
    currentHash,
    reason: 'Manifest signature is valid and current',
  };
}
