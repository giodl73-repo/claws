/**
 * SHA-256 hashing using Node.js `crypto`.
 *
 * Content-addressable hashing for cache keys and audit entries.
 * Supports both string and Buffer inputs.
 *
 * @module claws-sdk/compiler/crypto/hash
 */

import { createHash } from 'node:crypto';

/**
 * Compute a SHA-256 hash.
 *
 * @param input - String or Buffer to hash
 * @returns Hex-encoded SHA-256 digest (64 hex chars)
 */
export function sha256(input: string | Buffer): string {
  const hash = createHash('sha256');
  if (typeof input === 'string') {
    hash.update(input, 'utf-8');
  } else {
    hash.update(input);
  }
  return hash.digest('hex');
}

/**
 * Compute a SHA-256 hash from a stream of parts.
 *
 * Feeds each yielded chunk into a single hasher, avoiding the full
 * concatenation that `sha256(parts.join(''))` would allocate. Used by
 * `contentHash` so large workspaces never materialize the canonical
 * input as one string.
 *
 * @param parts - Generator factory yielding UTF-8 string or Buffer chunks.
 * @returns Hex-encoded SHA-256 digest (64 hex chars)
 */
export function sha256Stream(parts: () => Iterable<string | Buffer>): string {
  const hash = createHash('sha256');
  for (const chunk of parts()) {
    if (typeof chunk === 'string') {
      hash.update(chunk, 'utf-8');
    } else {
      hash.update(chunk);
    }
  }
  return hash.digest('hex');
}
