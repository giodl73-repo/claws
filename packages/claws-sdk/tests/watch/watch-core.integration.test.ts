/**
 * L1: Watch core integration tests.
 *
 * Covers:
 * 1. Watch on reference workspace detects TOOLS.md edit and triggers re-parse
 * 2. Dedup 3 rapid saves of the same file produces a single batch
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { parse } from '../../src/compile/parse.js';
import { DEFAULT_FILE_SOURCES } from '../../src/compile/types.js';
import { IncrementalParser } from '../../src/watch/incremental.js';
import { Debouncer } from '../../src/watch/debounce.js';
import { ContentHashStore } from '../../src/watch/content-hash.js';
import { EventNormalizer, type RawWatchEvent } from '../../src/watch/event-normalizer.js';

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `claws-watch-int-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await mkdir(testDir, { recursive: true });

  // Create minimal OC workspace
  for (const source of DEFAULT_FILE_SOURCES) {
    if (source.endsWith('/')) {
      await mkdir(join(testDir, source), { recursive: true });
    } else {
      await writeFile(join(testDir, source), `# ${source}\nMinimal content\n`, 'utf-8');
    }
  }
  await writeFile(join(testDir, 'claws.json'), '{}', 'utf-8');
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

describe('watch integration: TOOLS.md edit triggers re-parse', () => {
  it('detects TOOLS.md edit and incremental re-parse updates state', async () => {
    // Full parse to seed
    const initial = await parse(testDir);
    const parser = new IncrementalParser(testDir);
    parser.seed(initial);

    const toolsBefore = initial.entries.find(e => e.source === 'TOOLS.md');
    expect(toolsBefore?.status).toBe('present');
    if (toolsBefore?.status === 'present') {
      expect(toolsBefore.content).toContain('Minimal content');
    }

    // Simulate editing TOOLS.md
    await writeFile(join(testDir, 'TOOLS.md'), '# TOOLS\n## deploy\nR4 deployment tool\n', 'utf-8');

    // Content hash confirms change
    const hashStore = new ContentHashStore();
    const fullPath = join(testDir, 'TOOLS.md');
    hashStore.update(fullPath, '# TOOLS.md\nMinimal content\n'); // seed old hash
    const changed = await hashStore.updateFromDisk(fullPath);
    expect(changed).toBe(true);

    // Incremental update for just TOOLS.md
    const updated = await parser.update(['TOOLS.md']);

    const toolsAfter = updated.entries.find(e => e.source === 'TOOLS.md');
    expect(toolsAfter?.status).toBe('present');
    if (toolsAfter?.status === 'present') {
      expect(toolsAfter.content).toContain('R4 deployment tool');
    }

    // Other files remain cached
    expect(updated.presentCount).toBe(initial.presentCount);
  });
});

describe('watch integration: NTFS double-fire dedup + debounce', () => {
  it('3 rapid saves of the same file produce a single debounced batch', () => {
    vi.useFakeTimers();

    const normalizer = new EventNormalizer();
    const batches: string[][] = [];
    const debouncer = new Debouncer((files) => batches.push([...files]), 300);

    const now = Date.now();

    // Simulate 3 rapid NTFS events for the same file within 100ms
    // First pair within dedup window → second suppressed
    // Third after dedup window but within debounce window → included
    const events: RawWatchEvent[] = [
      { eventType: 'change', filename: 'TOOLS.md', timestamp: now },
      { eventType: 'change', filename: 'TOOLS.md', timestamp: now + 5 },   // NTFS dup → suppressed
      { eventType: 'change', filename: 'TOOLS.md', timestamp: now + 80 },  // outside dedup, same debounce
    ];

    for (const evt of events) {
      const normalized = normalizer.normalize(evt);
      if (normalized !== null) {
        debouncer.add(normalized);
      }
    }

    // Flush debounce
    vi.advanceTimersByTime(301);

    expect(batches).toHaveLength(1);
    // The Set-based debouncer deduplicates within the batch
    expect(batches[0]).toHaveLength(1);
    expect(batches[0]![0]).toBe('TOOLS.md');

    vi.useRealTimers();
  });
});
