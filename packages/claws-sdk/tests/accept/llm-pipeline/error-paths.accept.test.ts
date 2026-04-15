/**
 * L3 acceptance: error paths for LLM pipeline.
 *
 * - No provider (null) -> graceful no-op, zero intents
 * - LLM timeout (mock that hangs) -> handled gracefully
 * - Corrupt cache import -> rejected with error
 * - Empty workspace (all files absent) -> graceful no-op
 *
 * @module claws-sdk/tests/accept/llm-pipeline/error-paths.accept
 */

import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'node:path';
import {
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

// LLM pipeline
import { ExtractorLLM } from '../../../src/compile/llm/extractor.js';
import { LLMCache } from '../../../src/compile/llm/cache.js';
import type { LLMCacheExport } from '../../../src/compile/llm/cache.js';
import type {
  LLMProvider,
  LLMExtractionRequest,
  ExtractionResult,
} from '../../../src/compile/llm/types.js';
import type { ParseDiagnostic, FileEntry } from '../../../src/compile/types.js';

// ── Temp Dir Management ───────────────────────────────────────────────

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best-effort
    }
  }
  tempDirs.length = 0;
});

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `claws-error-${prefix}-`));
  tempDirs.push(dir);
  return dir;
}

// ── Timeout Mock Provider ─────────────────────────────────────────────

class TimeoutMockProvider implements LLMProvider {
  readonly modelId = 'timeout-mock-v1';

  async extract(_request: LLMExtractionRequest): Promise<ExtractionResult> {
    // Simulate a timeout by waiting longer than typical test timeout
    await new Promise((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('LLM request timed out after 30000ms'));
      }, 100); // Fail fast for tests
      // Ensure the timer doesn't prevent node from exiting
      if (typeof timer === 'object' && 'unref' in timer) {
        (timer as NodeJS.Timeout).unref();
      }
    });
    // Unreachable
    return { source: '', intents: [], modelId: this.modelId };
  }

  async validate(_result: ExtractionResult): Promise<readonly ParseDiagnostic[]> {
    return [];
  }
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('accept: LLM pipeline error paths', () => {
  it('null provider -> graceful no-op, zero intents, no crash', async () => {
    const extractor = new ExtractorLLM(null);

    expect(extractor.available).toBe(false);
    expect(extractor.modelId).toBe('none');

    // extractFile returns null
    const fileResult = await extractor.extractFile({
      status: 'present',
      source: 'SOUL.md',
      content: '# Soul\n\nNever do bad things.',
      provenance: {
        source: 'SOUL.md',
        sourceType: 'filesystem',
        contentHash: 'abc',
        readAt: new Date().toISOString(),
        rawSize: 30,
      },
    });
    expect(fileResult).toBeNull();

    // extractAll returns empty
    const allResults = await extractor.extractAll([]);
    expect(allResults).toEqual([]);

    // validateResults returns empty
    const diags = await extractor.validateResults([]);
    expect(diags).toEqual([]);

    // extractVerifyMerge returns null
    const pipeline = await extractor.extractVerifyMerge(
      [],
      new Map(),
    );
    expect(pipeline).toBeNull();
  });

  it('empty workspace (all files absent) -> graceful no-op', async () => {
    const extractor = new ExtractorLLM(new TimeoutMockProvider());

    const absentEntries: FileEntry[] = [
      { status: 'absent', source: 'SOUL.md', defaultDescription: 'No SOUL.md found' },
      { status: 'absent', source: 'TOOLS.md', defaultDescription: 'No TOOLS.md found' },
      { status: 'absent', source: 'AGENTS.md', defaultDescription: 'No AGENTS.md found' },
    ];

    // extractAll should return empty — no present files to extract from
    const results = await extractor.extractAll(absentEntries);
    expect(results).toEqual([]);

    // extractVerifyMerge with only absent entries should return empty pipeline
    const pipeline = await extractor.extractVerifyMerge(
      absentEntries,
      new Map(),
    );
    expect(pipeline).not.toBeNull();
    expect(pipeline!.mergeResults).toEqual([]);
    expect(pipeline!.verificationResults).toEqual([]);
    expect(pipeline!.extractionResults).toEqual([]);
    expect(pipeline!.diagnostics).toEqual([]);
  });

  it('LLM timeout -> extractFile rejects with timeout error', async () => {
    const provider = new TimeoutMockProvider();
    const extractor = new ExtractorLLM(provider);

    const entry: FileEntry = {
      status: 'present',
      source: 'SOUL.md',
      content: '# Soul\n\nNever do bad things.',
      provenance: {
        source: 'SOUL.md',
        sourceType: 'filesystem',
        contentHash: 'abc',
        readAt: new Date().toISOString(),
        rawSize: 30,
      },
    };

    // The timeout provider throws — caller should handle it
    await expect(extractor.extractFile(entry)).rejects.toThrow(/timed out/);
  });

  it('corrupt cache import -> rejected with diagnostic', () => {
    const tempDir = createTempDir('corrupt-cache');
    const cache = new LLMCache(tempDir);

    // Wrong version
    expect(() => {
      cache.import({
        version: 42 as never,
        entries: {},
        exportedAt: new Date().toISOString(),
      } as LLMCacheExport);
    }).toThrow(/Unsupported cache version/);

    // Null entries
    expect(() => {
      cache.import({
        version: 1,
        entries: null as never,
        exportedAt: new Date().toISOString(),
      });
    }).toThrow(/Invalid cache export/);

    // After rejection, cache continues to work
    expect(cache.status().size).toBe(0);
  });

  it('corrupt cache file on disk -> load starts empty, compile continues', async () => {
    const tempDir = createTempDir('corrupt-file');

    // Write corrupt JSON to cache location
    const cacheDir = join(tempDir, '.claws', 'cache');
    const { mkdirSync, writeFileSync } = await import('node:fs');
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(join(cacheDir, 'llm-intents.json'), '{not valid json!!!', 'utf-8');

    // Load should succeed silently (start empty)
    const cache = new LLMCache(tempDir);
    await cache.load();
    expect(cache.status().size).toBe(0);

    // Cache is usable after corrupt load
    cache.store('hash1', 'prompt1', 'model1', {
      source: 'TEST.md',
      intents: [],
      modelId: 'model1',
    });
    expect(cache.status().size).toBe(1);
  });
});
