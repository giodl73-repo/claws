/**
 * Auto-recompile — recompile governance artifacts when source files change.
 *
 * If .claws/compiled/ exists, the watcher auto-recompiles to keep artifacts
 * in sync with workspace state. Uses the CacheInvalidator to determine which
 * artifacts are stale, then recompiles only affected files.
 *
 * @module claws-sdk/watch/auto-recompile
 */

import { stat, readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { CacheInvalidator } from './cache-invalidation.js';
import { hashContent } from './content-hash.js';

/**
 * The directory within the workspace where compiled artifacts live.
 */
const COMPILED_DIR = '.claws/compiled';

/**
 * Result of an auto-recompile cycle.
 */
export interface RecompileResult {
  /** Whether recompilation was triggered (compiled dir exists + stale artifacts). */
  readonly triggered: boolean;
  /** Number of artifacts recompiled. */
  readonly recompiledCount: number;
  /** Paths of recompiled artifacts. */
  readonly recompiledArtifacts: readonly string[];
  /** Duration of the recompile pass in milliseconds. */
  readonly durationMs: number;
  /** Whether the compiled directory exists. */
  readonly compiledDirExists: boolean;
}

/**
 * Auto-recompiler — keeps .claws/compiled/ in sync with workspace source files.
 */
export class AutoRecompiler {
  private readonly workspaceRoot: string;
  private readonly invalidator = new CacheInvalidator();
  private initialized = false;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Check whether the compiled artifacts directory exists.
   */
  async hasCompiledDir(): Promise<boolean> {
    try {
      const s = await stat(join(this.workspaceRoot, COMPILED_DIR));
      return s.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Scan the compiled directory and seed the invalidator with existing artifacts.
   * Links each artifact to its source file by naming convention.
   *
   * Reads the stored contentHash from each artifact JSON so that invalidation
   * correctly compares against the hash at compile time, not the current source.
   *
   * Artifact naming: source file "TOOLS.md" → artifact "TOOLS.md.json"
   */
  async initialize(): Promise<void> {
    const compiledPath = join(this.workspaceRoot, COMPILED_DIR);
    try {
      const files = await readdir(compiledPath);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        // Derive source path from artifact name: "TOOLS.md.json" → "TOOLS.md"
        const sourceName = file.replace(/\.json$/, '');
        const artifactRelPath = COMPILED_DIR + '/' + file;
        try {
          // Read the artifact to extract the hash at compile time
          const artifactContent = await readFile(join(compiledPath, file), 'utf-8');
          const artifactData = JSON.parse(artifactContent) as { contentHash?: string };
          if (artifactData.contentHash) {
            // Use a synthetic content whose hash matches the stored hash
            // by directly setting via the internal tracker
            this.invalidator.trackWithHash(artifactRelPath, sourceName, artifactData.contentHash);
          } else {
            // No hash in artifact — track with empty to force recompile
            this.invalidator.track(artifactRelPath, sourceName, '');
          }
        } catch {
          // Can't read artifact — track with empty to force recompile
          this.invalidator.track(artifactRelPath, sourceName, '');
        }
      }
      this.initialized = true;
    } catch {
      // compiled dir doesn't exist — nothing to initialize
    }
  }

  /**
   * Recompile stale artifacts given a set of changed files.
   *
   * Reads current content for each changed file, checks the invalidator,
   * and recompiles stale artifacts. The recompile step writes updated
   * artifact JSON (a snapshot of the source content hash and timestamp).
   *
   * @param changedFiles - Relative file paths that changed
   * @returns RecompileResult with timing and artifact details
   */
  async recompile(changedFiles: readonly string[]): Promise<RecompileResult> {
    const start = Date.now();
    const compiledDirExists = await this.hasCompiledDir();

    if (!compiledDirExists) {
      return {
        triggered: false,
        recompiledCount: 0,
        recompiledArtifacts: [],
        durationMs: Date.now() - start,
        compiledDirExists: false,
      };
    }

    if (!this.initialized) {
      await this.initialize();
    }

    // Read current content for changed files
    const contentMap = new Map<string, string>();
    for (const relPath of changedFiles) {
      try {
        const fullPath = join(this.workspaceRoot, relPath);
        const content = await readFile(fullPath, 'utf-8');
        contentMap.set(relPath, content);
      } catch {
        // File was deleted — use empty string to force invalidation
        contentMap.set(relPath, '');
      }
    }

    // Check for stale artifacts
    const result = this.invalidator.check(contentMap);

    if (result.staleArtifacts.length === 0) {
      return {
        triggered: false,
        recompiledCount: 0,
        recompiledArtifacts: [],
        durationMs: Date.now() - start,
        compiledDirExists: true,
      };
    }

    // Recompile stale artifacts
    const recompiled: string[] = [];
    for (const artifactPath of result.staleArtifacts) {
      const sourceName = artifactPath.replace(COMPILED_DIR + '/', '').replace(/\.json$/, '');
      const sourceContent = contentMap.get(sourceName) ?? '';
      const artifactContent = JSON.stringify({
        source: sourceName,
        contentHash: hashContent(sourceContent),
        compiledAt: new Date().toISOString(),
      }, null, 2);

      const fullArtifactPath = join(this.workspaceRoot, artifactPath);
      await mkdir(join(this.workspaceRoot, COMPILED_DIR), { recursive: true });
      await writeFile(fullArtifactPath, artifactContent, 'utf-8');

      // Update the invalidator with new hash
      this.invalidator.updateSource(sourceName, sourceContent);
      recompiled.push(artifactPath);
    }

    return {
      triggered: true,
      recompiledCount: recompiled.length,
      recompiledArtifacts: recompiled,
      durationMs: Date.now() - start,
      compiledDirExists: true,
    };
  }

  /**
   * Track a new artifact (used when initial compilation creates artifacts).
   */
  trackArtifact(artifactPath: string, sourcePath: string, sourceContent: string): void {
    this.invalidator.track(artifactPath, sourcePath, sourceContent);
  }

  /** Number of tracked artifacts. */
  get trackedCount(): number {
    return this.invalidator.size;
  }

  /** Reset all tracking state. */
  reset(): void {
    this.invalidator.clear();
    this.initialized = false;
  }
}
