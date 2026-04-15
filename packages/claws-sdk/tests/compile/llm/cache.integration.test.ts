/**
 * L1: LLM extraction cache integration — disk persistence and portability.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { LLMCache, hashContent, hashPrompt } from '../../../src/compile/llm/cache.js';
import type { ExtractionResult } from '../../../src/compile/llm/types.js';

// ── Helpers ────────────────────────────────────────────────────────────

function makeResult(source: string, modelId: string): ExtractionResult {
  return {
    source,
    intents: [
      {
        kind: 'require',
        target: 'approval',
        description: 'Requires approval',
        confidence: 0.9,
        sourceText: 'Must have approval',
      },
    ],
    modelId,
  };
}

let tempDirs: string[] = [];

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'llm-cache-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  for (const d of tempDirs) {
    await rm(d, { recursive: true, force: true });
  }
  tempDirs = [];
});

// ── Tests ──────────────────────────────────────────────────────────────

describe('LLMCache integration', () => {
  it('cache survives across two independent load/save cycles', async () => {
    const ws = await makeTempDir();

    // Cycle 1: create cache, store entries, save
    const cache1 = new LLMCache(ws);
    const contentHash = hashContent('# Soul\nNever do X');
    const promptHash = hashPrompt('Extract governance intents');
    const result = makeResult('SOUL.md', 'claude-sonnet-4-20250514');

    cache1.store(contentHash, promptHash, 'claude-sonnet-4-20250514', result);
    await cache1.save();

    // Cycle 2: fresh cache instance, load from disk, check hit
    const cache2 = new LLMCache(ws);
    await cache2.load();

    const hit = cache2.check(contentHash, promptHash, 'claude-sonnet-4-20250514');
    expect(hit).not.toBeNull();
    expect(hit!.source).toBe('SOUL.md');
    expect(hit!.intents).toHaveLength(1);
    expect(hit!.modelId).toBe('claude-sonnet-4-20250514');

    // Status reflects loaded entries
    const st = cache2.status();
    expect(st.size).toBe(1);
  });

  it('export/import works across fresh workspace directories', async () => {
    const ws1 = await makeTempDir();
    const ws2 = await makeTempDir();

    // Build cache in workspace 1
    const cache1 = new LLMCache(ws1);
    cache1.store('ch1', 'ph1', 'model-a', makeResult('SOUL.md', 'model-a'));
    cache1.store('ch2', 'ph2', 'model-b', makeResult('TOOLS.md', 'model-b'));

    // Export to a temp file
    const exportData = cache1.export();
    const exportPath = join(ws1, 'cache-export.json');
    await writeFile(exportPath, JSON.stringify(exportData, null, 2), 'utf-8');

    // Import into workspace 2 from the file
    const raw = await readFile(exportPath, 'utf-8');
    const importData = JSON.parse(raw);

    const cache2 = new LLMCache(ws2);
    cache2.import(importData);
    await cache2.save();

    // Verify entries are accessible in workspace 2
    expect(cache2.check('ch1', 'ph1', 'model-a')).not.toBeNull();
    expect(cache2.check('ch2', 'ph2', 'model-b')).not.toBeNull();
    expect(cache2.status().size).toBe(2);

    // Verify the file was written to workspace 2
    const savedPath = join(ws2, '.claws', 'cache', 'llm-intents.json');
    const savedRaw = await readFile(savedPath, 'utf-8');
    const savedData = JSON.parse(savedRaw);
    expect(savedData.version).toBe(1);
    expect(Object.keys(savedData.entries)).toHaveLength(2);
  });
});
