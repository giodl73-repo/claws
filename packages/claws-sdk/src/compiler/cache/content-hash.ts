/**
 * Content-addressable hashing for the compilation cache.
 *
 * Computes a single SHA-256 digest over the concatenated contents of a
 * workspace's files. Files are sorted by path so the hash is deterministic
 * regardless of read order. Uses the project's crypto/hash.ts from pulse 4 --
 * zero third-party dependencies.
 *
 * @module claws-sdk/compiler/cache/content-hash
 */

import type { WorkspaceFile } from '../readers/types.js';
import { sha256Stream } from '../crypto/hash.js';

/**
 * Record separator between files in the canonical concatenation.
 *
 * Embeds the length of the file's path and the length of its normalized
 * content to prevent boundary-collision attacks -- two different workspaces
 * cannot produce the same hash by rearranging where a file boundary falls.
 */
const SEPARATOR = '\u0000';

/**
 * Compute a stable SHA-256 hash of a workspace's file contents.
 *
 * Determinism rules:
 * 1. Files are sorted by `path` (stable ASCII order).
 * 2. Each file contributes `path|length(content)|content` with NUL separators.
 * 3. The `normalizedContent` field is hashed, not `rawContent` -- CRLF/BOM
 *    differences across machines must not produce different hashes.
 *
 * Streams updates into a single SHA-256 hasher so large workspaces never
 * materialize the concatenated input as one string.
 *
 * @param files - Workspace files to hash. Empty array hashes the empty string.
 * @returns 64-char hex SHA-256 digest.
 */
export function contentHash(files: readonly WorkspaceFile[]): string {
  const sorted = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  return sha256Stream(function* () {
    for (const file of sorted) {
      yield file.path;
      yield SEPARATOR;
      yield String(file.normalizedContent.length);
      yield SEPARATOR;
      yield file.normalizedContent;
      yield SEPARATOR;
    }
  });
}
