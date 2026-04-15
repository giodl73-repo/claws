/**
 * Content hash layer — SHA-256 per-file content hashing to skip unchanged files.
 *
 * Editors often "save" a file without actual changes (e.g., Ctrl+S with no edits).
 * The content hash layer detects these no-op saves by comparing the SHA-256 of
 * the file's current content against the last-seen hash. Files whose hash hasn't
 * changed are skipped, avoiding unnecessary re-parse.
 *
 * @module claws-sdk/watch/content-hash
 */

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { stripBOM, normalizeLF } from '../util/text.js';

/**
 * Compute SHA-256 hash of a file's normalized content.
 *
 * Normalization: BOM strip + CRLF→LF before hashing, so the same
 * logical content always produces the same hash regardless of platform
 * line endings or editor BOM insertion.
 */
export function hashContent(content: string): string {
  const normalized = normalizeLF(stripBOM(content));
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * In-memory content hash store. Maps file paths to their last-seen SHA-256 hash.
 */
export class ContentHashStore {
  private readonly hashes = new Map<string, string>();

  /**
   * Update the stored hash for a file path. Returns whether the content
   * actually changed (hash differs from previous).
   *
   * @param filePath - Absolute or relative file path (used as map key)
   * @param content - The file's current content
   * @returns `true` if the content changed, `false` if the hash is the same
   */
  update(filePath: string, content: string): boolean {
    const newHash = hashContent(content);
    const oldHash = this.hashes.get(filePath);
    this.hashes.set(filePath, newHash);

    if (oldHash === undefined) {
      // First time seeing this file — treat as changed
      return true;
    }
    return newHash !== oldHash;
  }

  /**
   * Read the file from disk, update the hash, and return whether it changed.
   *
   * Returns `true` if the file changed, `false` if unchanged.
   * If the file cannot be read (deleted), removes the stored hash and returns `true`.
   */
  async updateFromDisk(filePath: string): Promise<boolean> {
    try {
      const content = await readFile(filePath, 'utf-8');
      return this.update(filePath, content);
    } catch {
      // File was deleted or unreadable — remove from store, report as changed
      const had = this.hashes.has(filePath);
      this.hashes.delete(filePath);
      return had;
    }
  }

  /**
   * Remove a file's hash from the store (e.g., on deletion).
   */
  remove(filePath: string): void {
    this.hashes.delete(filePath);
  }

  /**
   * Get the current stored hash for a file, or undefined if not tracked.
   */
  get(filePath: string): string | undefined {
    return this.hashes.get(filePath);
  }

  /** Clear all stored hashes. */
  clear(): void {
    this.hashes.clear();
  }
}
