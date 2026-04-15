/**
 * Incremental parser — re-parse only changed files, merge with cached state.
 *
 * The incremental parser maintains a cache of ParseResult entries keyed by
 * source file path. When a batch of changed files arrives, only those files
 * are re-parsed. The results are merged with the cached entries to produce
 * a complete, up-to-date ParseResult without re-reading every file.
 *
 * @module claws-sdk/watch/incremental
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { stripBOM, normalizeLF } from '../util/text.js';
import { normalizePath } from '../util/path.js';
import type {
  FileEntry,
  FileEntryPresent,
  FileEntryAbsent,
  ParseResult,
  ParseDiagnostic,
  CGRProvenance,
} from '../compile/types.js';
import { ABSENT_DEFAULTS, type DefaultFileSource } from '../compile/types.js';

/**
 * Normalize file content: BOM strip + CRLF→LF.
 */
function normalizeContent(raw: string): string {
  return normalizeLF(stripBOM(raw));
}

/**
 * Build a CGR provenance record for a file.
 */
function buildProvenance(
  source: string,
  normalized: string,
  rawSize: number,
): CGRProvenance {
  const contentHash = createHash('sha256').update(normalized, 'utf8').digest('hex');
  return {
    source: normalizePath(source),
    sourceType: 'filesystem',
    contentHash,
    readAt: new Date().toISOString(),
    rawSize,
  };
}

/**
 * Read a single file and return a FileEntry.
 */
async function readFileEntry(
  workspaceRoot: string,
  relativePath: string,
): Promise<FileEntry> {
  const fullPath = join(workspaceRoot, relativePath);
  try {
    const raw = await readFile(fullPath, 'utf-8');
    const normalized = normalizeContent(raw);
    const provenance = buildProvenance(relativePath, normalized, Buffer.byteLength(raw, 'utf-8'));
    return {
      status: 'present',
      source: normalizePath(relativePath),
      content: normalized,
      provenance,
    } satisfies FileEntryPresent;
  } catch {
    const defaultDesc = ABSENT_DEFAULTS[relativePath as DefaultFileSource]
      ?? `${relativePath} not found`;
    return {
      status: 'absent',
      source: normalizePath(relativePath),
      defaultDescription: defaultDesc,
    } satisfies FileEntryAbsent;
  }
}

/**
 * Validate file content (simplified for incremental updates).
 */
function validateEntry(entry: FileEntry): ParseDiagnostic[] {
  if (entry.status === 'absent') return [];

  const diagnostics: ParseDiagnostic[] = [];
  const { source, content } = entry;

  if (source.endsWith('.md') && content.trim().length === 0) {
    diagnostics.push({
      severity: 'warning',
      message: `${source} is empty or contains only whitespace`,
      file: source,
      line: 1,
      column: 1,
      code: 'CLAWS-P001',
    });
  }

  return diagnostics;
}

/**
 * Incremental parser that caches per-file state and re-parses only changed files.
 */
export class IncrementalParser {
  private readonly workspaceRoot: string;
  private readonly entryCache = new Map<string, FileEntry>();

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Seed the cache from a full ParseResult (e.g., from the initial full parse).
   */
  seed(result: ParseResult): void {
    this.entryCache.clear();
    for (const entry of result.entries) {
      this.entryCache.set(entry.source, entry);
    }
  }

  /**
   * Re-parse only the files in the change set, merge with cached entries,
   * and return a complete ParseResult.
   *
   * @param changedFiles - Relative paths of files that changed
   * @returns Merged ParseResult reflecting the current workspace state
   */
  async update(changedFiles: readonly string[]): Promise<ParseResult> {
    // Re-read only changed files
    const updates = await Promise.all(
      changedFiles.map(async (rel) => {
        const normalized = normalizePath(rel);
        const entry = await readFileEntry(this.workspaceRoot, normalized);
        this.entryCache.set(normalized, entry);
        return entry;
      }),
    );

    // Merge: use cache for all entries
    const entries = [...this.entryCache.values()];

    // Collect diagnostics from ALL entries (not just changed)
    const diagnostics: ParseDiagnostic[] = [];
    for (const entry of entries) {
      diagnostics.push(...validateEntry(entry));
    }

    const presentCount = entries.filter(e => e.status === 'present').length;
    const absentCount = entries.filter(e => e.status === 'absent').length;
    const shouldHalt = presentCount === 0;

    return {
      entries,
      diagnostics,
      presentCount,
      absentCount,
      shouldHalt,
    };
  }

  /**
   * Remove a file from the cache (e.g., on deletion).
   */
  remove(source: string): void {
    this.entryCache.delete(normalizePath(source));
  }

  /** Number of cached entries. */
  get cacheSize(): number {
    return this.entryCache.size;
  }

  /** Get a cached entry by source path. */
  getCached(source: string): FileEntry | undefined {
    return this.entryCache.get(normalizePath(source));
  }
}
