/**
 * Cache invalidation — content-hash-driven compile cache invalidation.
 *
 * Tracks per-file content hashes and determines which compiled artifacts
 * are stale when source files change. A hash mismatch invalidates the
 * compile cache for that file, marking dependent artifacts for recompilation.
 *
 * @module claws-sdk/watch/cache-invalidation
 */

import { hashContent } from './content-hash.js';

/**
 * Status of a cached artifact after invalidation check.
 */
export type ArtifactStatus = 'valid' | 'stale';

/**
 * A tracked artifact with its source file dependency and content hash.
 */
export interface TrackedArtifact {
  /** Relative path to the compiled artifact. */
  readonly artifactPath: string;
  /** Relative path to the source OC file that produced this artifact. */
  readonly sourcePath: string;
  /** Content hash of the source at compilation time. */
  readonly sourceHash: string;
}

/**
 * Result of an invalidation check.
 */
export interface InvalidationResult {
  /** Artifact paths that are stale and need recompilation. */
  readonly staleArtifacts: readonly string[];
  /** Artifact paths that are still valid. */
  readonly validArtifacts: readonly string[];
  /** Source files whose hash changed. */
  readonly changedSources: readonly string[];
}

/**
 * Cache invalidation tracker — maps source files to compiled artifacts
 * and determines staleness based on content hashes.
 */
export class CacheInvalidator {
  private readonly artifacts = new Map<string, TrackedArtifact>();

  /**
   * Register a compiled artifact with its source dependency and hash.
   *
   * @param artifactPath - Relative path to the compiled artifact
   * @param sourcePath - Relative path to the source OC file
   * @param sourceContent - Content of the source file at compile time
   */
  track(artifactPath: string, sourcePath: string, sourceContent: string): void {
    this.artifacts.set(artifactPath, {
      artifactPath,
      sourcePath,
      sourceHash: hashContent(sourceContent),
    });
  }

  /**
   * Register a compiled artifact with a pre-computed source hash.
   * Used when restoring from persisted artifact metadata.
   *
   * @param artifactPath - Relative path to the compiled artifact
   * @param sourcePath - Relative path to the source OC file
   * @param sourceHash - Pre-computed content hash of the source
   */
  trackWithHash(artifactPath: string, sourcePath: string, sourceHash: string): void {
    this.artifacts.set(artifactPath, {
      artifactPath,
      sourcePath,
      sourceHash,
    });
  }

  /**
   * Check which artifacts are stale given a set of changed files and their
   * current content.
   *
   * @param changedFiles - Map of relative source path → current content
   * @returns InvalidationResult with stale/valid artifact lists
   */
  check(changedFiles: ReadonlyMap<string, string>): InvalidationResult {
    const staleArtifacts: string[] = [];
    const validArtifacts: string[] = [];
    const changedSources: string[] = [];

    // Determine which source files actually have new content
    const changedSourceSet = new Set<string>();
    for (const [sourcePath, content] of changedFiles) {
      const currentHash = hashContent(content);
      // Check if any tracked artifact depends on this source with a different hash
      for (const [, artifact] of this.artifacts) {
        if (artifact.sourcePath === sourcePath && artifact.sourceHash !== currentHash) {
          changedSourceSet.add(sourcePath);
          break;
        }
      }
    }
    changedSources.push(...changedSourceSet);

    // Classify each artifact
    for (const [, artifact] of this.artifacts) {
      if (changedSourceSet.has(artifact.sourcePath)) {
        staleArtifacts.push(artifact.artifactPath);
      } else {
        validArtifacts.push(artifact.artifactPath);
      }
    }

    return { staleArtifacts, validArtifacts, changedSources };
  }

  /**
   * Update the stored hash for a source file after recompilation.
   * All artifacts depending on this source get their hash updated.
   *
   * @param sourcePath - Relative path to the source OC file
   * @param newContent - Updated content of the source file
   */
  updateSource(sourcePath: string, newContent: string): void {
    const newHash = hashContent(newContent);
    for (const [key, artifact] of this.artifacts) {
      if (artifact.sourcePath === sourcePath) {
        this.artifacts.set(key, {
          ...artifact,
          sourceHash: newHash,
        });
      }
    }
  }

  /**
   * Remove a tracked artifact.
   */
  remove(artifactPath: string): void {
    this.artifacts.delete(artifactPath);
  }

  /**
   * Get all tracked artifacts for a given source file.
   */
  getArtifactsForSource(sourcePath: string): readonly TrackedArtifact[] {
    const result: TrackedArtifact[] = [];
    for (const [, artifact] of this.artifacts) {
      if (artifact.sourcePath === sourcePath) {
        result.push(artifact);
      }
    }
    return result;
  }

  /** Number of tracked artifacts. */
  get size(): number {
    return this.artifacts.size;
  }

  /** Clear all tracking state. */
  clear(): void {
    this.artifacts.clear();
  }
}
