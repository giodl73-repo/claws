/**
 * LLM extraction cache — composite-key cache for LLM extraction results.
 *
 * Key = content hash + prompt hash + model ID. Supports export/import
 * for deterministic CI builds without re-calling the API.
 *
 * Cache lives at `.claws/cache/llm-intents.json` — local by default,
 * portable via export/import.
 *
 * @module claws-sdk/compile/llm/cache
 */

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';

import type { ExtractionResult } from './types.js';

// ── Constants ──────────────────────────────────────────────────────────

const CACHE_DIR = '.claws/cache';
const CACHE_FILE = 'llm-intents.json';

// ── Types ──────────────────────────────────────────────────────────────

/**
 * Composite cache key components.
 */
export interface CacheKey {
  /** SHA-256 of the file content. */
  readonly contentHash: string;
  /** SHA-256 of the prompt text. */
  readonly promptHash: string;
  /** Model identifier (e.g. 'claude-sonnet-4-20250514'). */
  readonly modelId: string;
}

/**
 * A single cache entry stored on disk.
 */
export interface LLMCacheEntry {
  /** The composite key string. */
  readonly key: string;
  /** Stored extraction result. */
  readonly result: ExtractionResult;
  /** ISO 8601 timestamp when this entry was cached. */
  readonly storedAt: string;
}

/**
 * Portable export format — JSON-serializable.
 */
export interface LLMCacheExport {
  /** Format version for forward compatibility. */
  readonly version: 1;
  /** Entries keyed by composite key. */
  readonly entries: Record<string, LLMCacheEntry>;
  /** ISO 8601 timestamp of the export. */
  readonly exportedAt: string;
}

/**
 * Cache status summary.
 */
export interface LLMCacheStatus {
  /** Number of entries in the cache. */
  readonly size: number;
  /** Cache hit count since load. */
  readonly hits: number;
  /** Cache miss count since load. */
  readonly misses: number;
  /** Hit rate as a fraction (0.0 -- 1.0), or null if no lookups. */
  readonly hitRate: number | null;
  /** Distinct model IDs present in the cache. */
  readonly modelIds: readonly string[];
  /** Distinct prompt hashes present in the cache. */
  readonly promptVersions: readonly string[];
}

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Compute SHA-256 hash of a string (line-ending normalized).
 */
function sha256(input: string): string {
  const normalized = input.replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Build the composite key string from components.
 */
function buildCompositeKey(key: CacheKey): string {
  return `${key.contentHash}:${key.promptHash}:${key.modelId}`;
}

/**
 * Extract the prompt hash (second segment) from a composite key.
 */
function extractPromptHash(compositeKey: string): string {
  const first = compositeKey.indexOf(':');
  const second = compositeKey.indexOf(':', first + 1);
  return compositeKey.slice(first + 1, second);
}

/**
 * Validate a single cache entry's shape before import.
 * Returns an error message string if invalid, or null if valid.
 */
function validateCacheEntry(compositeKey: string, entry: unknown): string | null {
  if (typeof entry !== 'object' || entry === null) {
    return `Entry "${compositeKey}": not an object`;
  }

  const e = entry as Record<string, unknown>;

  if (typeof e['key'] !== 'string') {
    return `Entry "${compositeKey}": missing or invalid "key" field`;
  }
  if (typeof e['storedAt'] !== 'string') {
    return `Entry "${compositeKey}": missing or invalid "storedAt" field`;
  }

  // Validate result shape
  const result = e['result'];
  if (typeof result !== 'object' || result === null) {
    return `Entry "${compositeKey}": missing or invalid "result" field`;
  }

  const r = result as Record<string, unknown>;
  if (typeof r['source'] !== 'string') {
    return `Entry "${compositeKey}": result missing "source" field`;
  }
  if (typeof r['modelId'] !== 'string') {
    return `Entry "${compositeKey}": result missing "modelId" field`;
  }
  if (!Array.isArray(r['intents'])) {
    return `Entry "${compositeKey}": result missing "intents" array`;
  }

  return null;
}

// ── LLMCache class ─────────────────────────────────────────────────────

/**
 * Composite-key cache for LLM extraction results.
 *
 * In-memory store backed by `.claws/cache/llm-intents.json`.
 * Call `load()` to hydrate from disk, `save()` to persist.
 */
export class LLMCache {
  private entries = new Map<string, LLMCacheEntry>();
  private promptHashes = new Set<string>();
  private hitCount = 0;
  private missCount = 0;
  private readonly workspaceRoot: string;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /** Absolute path to the cache file. */
  private get cachePath(): string {
    return join(this.workspaceRoot, CACHE_DIR, CACHE_FILE);
  }

  /**
   * Load cache from disk. Silently starts empty if file is missing or corrupt.
   */
  async load(): Promise<void> {
    try {
      const raw = await readFile(this.cachePath, 'utf-8');
      const data = JSON.parse(raw) as LLMCacheExport;
      if (data.version === 1 && typeof data.entries === 'object' && data.entries !== null) {
        this.entries = new Map(Object.entries(data.entries));
        for (const key of this.entries.keys()) {
          this.promptHashes.add(extractPromptHash(key));
        }
      }
    } catch {
      // No cache file or invalid JSON — start empty
    }
  }

  /**
   * Persist cache to disk.
   */
  async save(): Promise<void> {
    const exportData = this.export();
    const dir = dirname(this.cachePath);
    await mkdir(dir, { recursive: true });
    await writeFile(this.cachePath, JSON.stringify(exportData, null, 2), 'utf-8');
  }

  /**
   * Check for a cached extraction result.
   *
   * Returns the cached ExtractionResult on hit, or null on miss.
   */
  check(contentHash: string, promptHash: string, modelId: string): ExtractionResult | null {
    const key = buildCompositeKey({ contentHash, promptHash, modelId });
    const entry = this.entries.get(key);
    if (entry) {
      this.hitCount++;
      return entry.result;
    }
    this.missCount++;
    return null;
  }

  /**
   * Store an extraction result in the cache.
   */
  store(contentHash: string, promptHash: string, modelId: string, result: ExtractionResult): void {
    const key = buildCompositeKey({ contentHash, promptHash, modelId });
    this.entries.set(key, {
      key,
      result,
      storedAt: new Date().toISOString(),
    });
    this.promptHashes.add(promptHash);
  }

  /**
   * Export cache as a portable JSON-serializable object.
   */
  export(): LLMCacheExport {
    const entries: Record<string, LLMCacheEntry> = {};
    for (const [k, v] of this.entries) {
      entries[k] = v;
    }
    return {
      version: 1,
      entries,
      exportedAt: new Date().toISOString(),
    };
  }

  /**
   * Import cache data from a portable export, merging with existing entries.
   *
   * Validates schema of each entry before importing. Invalid entries are
   * skipped and reported as diagnostics. Existing entries with the same
   * key are overwritten by the import.
   *
   * Returns the number of entries that failed validation.
   */
  import(data: LLMCacheExport): { skipped: number; reasons: string[] } {
    if (data.version !== 1) {
      throw new Error(`Unsupported cache version: ${data.version}`);
    }
    if (typeof data.entries !== 'object' || data.entries === null) {
      throw new Error('Invalid cache export: missing entries');
    }

    const reasons: string[] = [];

    for (const [k, v] of Object.entries(data.entries)) {
      const invalid = validateCacheEntry(k, v);
      if (invalid) {
        reasons.push(invalid);
        continue;
      }
      this.entries.set(k, v);
      this.promptHashes.add(extractPromptHash(k));
    }

    return { skipped: reasons.length, reasons };
  }

  /**
   * Return cache status summary.
   */
  status(): LLMCacheStatus {
    const modelIds = new Set<string>();
    for (const entry of this.entries.values()) {
      modelIds.add(entry.result.modelId);
    }

    const total = this.hitCount + this.missCount;
    return {
      size: this.entries.size,
      hits: this.hitCount,
      misses: this.missCount,
      hitRate: total > 0 ? this.hitCount / total : null,
      modelIds: [...modelIds].sort(),
      promptVersions: [...this.promptHashes].sort(),
    };
  }

  /**
   * Clear all cache entries. Does not remove the file from disk — call `save()` after.
   */
  clear(): void {
    this.entries.clear();
    this.promptHashes.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }
}

// ── Convenience hash functions ─────────────────────────────────────────

/**
 * Hash file content for use as cache key component.
 */
export function hashContent(content: string): string {
  return sha256(content);
}

/**
 * Hash prompt text for use as cache key component.
 */
export function hashPrompt(promptText: string): string {
  return sha256(promptText);
}
