/**
 * L0: Watch core unit tests.
 *
 * Covers:
 * 1. Debounce batches 3 events into 1 batch
 * 2. Content hash detects unchanged file (save without edit)
 * 3. Content hash detects changed file
 * 4. Incremental parser re-parses only changed files
 * 5. File dedup within debounce batch
 * 6. Event normalizer suppresses NTFS double-fire
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import { Debouncer } from '../../src/watch/debounce.js';
import { ContentHashStore, hashContent } from '../../src/watch/content-hash.js';
import { EventNormalizer, type RawWatchEvent } from '../../src/watch/event-normalizer.js';
import { IncrementalParser } from '../../src/watch/incremental.js';
import type { ParseResult, FileEntry } from '../../src/compile/types.js';

// ── Debouncer ────────────────────────────────────────────────────────────

describe('Debouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('batches 3 rapid events into a single batch', () => {
    const batches: string[][] = [];
    const debouncer = new Debouncer((files) => batches.push([...files]), 300);

    debouncer.add('SOUL.md');
    debouncer.add('TOOLS.md');
    debouncer.add('AGENTS.md');

    expect(batches).toHaveLength(0);
    vi.advanceTimersByTime(301);

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(3);
    expect(batches[0]).toContain('SOUL.md');
    expect(batches[0]).toContain('TOOLS.md');
    expect(batches[0]).toContain('AGENTS.md');
  });

  it('deduplicates the same file within a batch window', () => {
    const batches: string[][] = [];
    const debouncer = new Debouncer((files) => batches.push([...files]), 300);

    debouncer.add('SOUL.md');
    debouncer.add('SOUL.md');
    debouncer.add('SOUL.md');

    vi.advanceTimersByTime(301);

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(1);
    expect(batches[0]).toContain('SOUL.md');
  });

  it('flush() emits immediately and clears pending', () => {
    const batches: string[][] = [];
    const debouncer = new Debouncer((files) => batches.push([...files]), 300);

    debouncer.add('SOUL.md');
    debouncer.add('TOOLS.md');
    expect(debouncer.pendingCount).toBe(2);

    debouncer.flush();

    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);
    expect(debouncer.pendingCount).toBe(0);
  });

  it('flush() is a no-op when no pending events', () => {
    const batches: string[][] = [];
    const debouncer = new Debouncer((files) => batches.push([...files]), 300);

    debouncer.flush();
    expect(batches).toHaveLength(0);
  });

  it('cancel() clears pending without emitting', () => {
    const batches: string[][] = [];
    const debouncer = new Debouncer((files) => batches.push([...files]), 300);

    debouncer.add('SOUL.md');
    debouncer.add('TOOLS.md');
    expect(debouncer.pendingCount).toBe(2);

    debouncer.cancel();

    expect(debouncer.pendingCount).toBe(0);
    vi.advanceTimersByTime(500);
    expect(batches).toHaveLength(0);
  });

  it('cancel() is safe when no timer is active', () => {
    const batches: string[][] = [];
    const debouncer = new Debouncer((files) => batches.push([...files]), 300);

    debouncer.cancel();
    expect(debouncer.pendingCount).toBe(0);
    expect(batches).toHaveLength(0);
  });

  it('pendingCount tracks unique files', () => {
    const debouncer = new Debouncer(() => {}, 300);

    expect(debouncer.pendingCount).toBe(0);
    debouncer.add('SOUL.md');
    expect(debouncer.pendingCount).toBe(1);
    debouncer.add('SOUL.md');
    expect(debouncer.pendingCount).toBe(1);
    debouncer.add('TOOLS.md');
    expect(debouncer.pendingCount).toBe(2);
  });

  it('resets timer on each add (last-event debounce)', () => {
    const batches: string[][] = [];
    const debouncer = new Debouncer((files) => batches.push([...files]), 300);

    debouncer.add('SOUL.md');
    vi.advanceTimersByTime(200);
    expect(batches).toHaveLength(0);

    debouncer.add('TOOLS.md');
    vi.advanceTimersByTime(200);
    expect(batches).toHaveLength(0);

    vi.advanceTimersByTime(101);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toHaveLength(2);
  });
});

// ── ContentHashStore ─────────────────────────────────────────────────────

describe('ContentHashStore', () => {
  it('detects unchanged file (same content → no change)', () => {
    const store = new ContentHashStore();

    const content = '# SOUL\nPurpose statement\n';
    const changed1 = store.update('SOUL.md', content);
    expect(changed1).toBe(true);

    const changed2 = store.update('SOUL.md', content);
    expect(changed2).toBe(false);
  });

  it('detects changed file (different content → changed)', () => {
    const store = new ContentHashStore();

    store.update('SOUL.md', '# SOUL\nVersion 1\n');
    const changed = store.update('SOUL.md', '# SOUL\nVersion 2\n');
    expect(changed).toBe(true);
  });

  it('normalizes CRLF to LF before hashing', () => {
    const hash1 = hashContent('line1\nline2\n');
    const hash2 = hashContent('line1\r\nline2\r\n');
    expect(hash1).toBe(hash2);
  });

  it('strips BOM before hashing', () => {
    const hash1 = hashContent('content');
    const hash2 = hashContent('\uFEFFcontent');
    expect(hash1).toBe(hash2);
  });

  describe('updateFromDisk', () => {
    let testDir: string;

    beforeEach(async () => {
      testDir = join(tmpdir(), `claws-hash-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
      await mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      await rm(testDir, { recursive: true, force: true });
    });

    it('reads file from disk and returns changed=true on first read', async () => {
      const filePath = join(testDir, 'SOUL.md');
      await writeFile(filePath, '# SOUL\n', 'utf-8');

      const store = new ContentHashStore();
      const changed = await store.updateFromDisk(filePath);
      expect(changed).toBe(true);
    });

    it('returns changed=false when file content has not changed', async () => {
      const filePath = join(testDir, 'SOUL.md');
      await writeFile(filePath, '# SOUL\n', 'utf-8');

      const store = new ContentHashStore();
      await store.updateFromDisk(filePath);
      const changed = await store.updateFromDisk(filePath);
      expect(changed).toBe(false);
    });

    it('returns changed=true when file was deleted and was tracked', async () => {
      const filePath = join(testDir, 'SOUL.md');
      await writeFile(filePath, '# SOUL\n', 'utf-8');

      const store = new ContentHashStore();
      await store.updateFromDisk(filePath);
      await rm(filePath);

      const changed = await store.updateFromDisk(filePath);
      expect(changed).toBe(true);
    });

    it('returns changed=false when file was deleted and was not tracked', async () => {
      const store = new ContentHashStore();
      const changed = await store.updateFromDisk(join(testDir, 'nonexistent.md'));
      expect(changed).toBe(false);
    });
  });

  it('remove() deletes a tracked file', () => {
    const store = new ContentHashStore();
    store.update('SOUL.md', 'content');
    expect(store.get('SOUL.md')).toBeDefined();

    store.remove('SOUL.md');
    expect(store.get('SOUL.md')).toBeUndefined();
  });

  it('get() returns undefined for untracked file', () => {
    const store = new ContentHashStore();
    expect(store.get('unknown.md')).toBeUndefined();
  });

  it('get() returns hash for tracked file', () => {
    const store = new ContentHashStore();
    store.update('SOUL.md', 'content');
    const hash = store.get('SOUL.md');
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash!.length).toBe(64);
  });

  it('clear() removes all tracked files', () => {
    const store = new ContentHashStore();
    store.update('SOUL.md', 'a');
    store.update('TOOLS.md', 'b');
    expect(store.get('SOUL.md')).toBeDefined();
    expect(store.get('TOOLS.md')).toBeDefined();

    store.clear();
    expect(store.get('SOUL.md')).toBeUndefined();
    expect(store.get('TOOLS.md')).toBeUndefined();
  });
});

// ── EventNormalizer ──────────────────────────────────────────────────────

describe('EventNormalizer', () => {
  it('suppresses duplicate events within 50ms dedup window (NTFS double-fire)', () => {
    const normalizer = new EventNormalizer();
    const now = Date.now();

    const event1: RawWatchEvent = { eventType: 'change', filename: 'SOUL.md', timestamp: now };
    const event2: RawWatchEvent = { eventType: 'change', filename: 'SOUL.md', timestamp: now + 10 };

    expect(normalizer.normalize(event1)).toBe('SOUL.md');
    expect(normalizer.normalize(event2)).toBeNull();
  });

  it('allows events outside the dedup window', () => {
    const normalizer = new EventNormalizer();
    const now = Date.now();

    const event1: RawWatchEvent = { eventType: 'change', filename: 'SOUL.md', timestamp: now };
    const event2: RawWatchEvent = { eventType: 'change', filename: 'SOUL.md', timestamp: now + 100 };

    expect(normalizer.normalize(event1)).toBe('SOUL.md');
    expect(normalizer.normalize(event2)).toBe('SOUL.md');
  });

  it('tracks different files independently', () => {
    const normalizer = new EventNormalizer();
    const now = Date.now();

    const e1: RawWatchEvent = { eventType: 'change', filename: 'SOUL.md', timestamp: now };
    const e2: RawWatchEvent = { eventType: 'change', filename: 'TOOLS.md', timestamp: now + 5 };

    expect(normalizer.normalize(e1)).toBe('SOUL.md');
    expect(normalizer.normalize(e2)).toBe('TOOLS.md');
  });

  it('handles rename events the same as change events', () => {
    const normalizer = new EventNormalizer();
    const now = Date.now();

    const rename: RawWatchEvent = { eventType: 'rename', filename: 'SOUL.md', timestamp: now };
    const change: RawWatchEvent = { eventType: 'change', filename: 'SOUL.md', timestamp: now + 10 };

    expect(normalizer.normalize(rename)).toBe('SOUL.md');
    expect(normalizer.normalize(change)).toBeNull();
  });

  it('clear() resets all tracking state', () => {
    const normalizer = new EventNormalizer();
    const now = Date.now();

    normalizer.normalize({ eventType: 'change', filename: 'SOUL.md', timestamp: now });
    normalizer.clear();

    const result = normalizer.normalize({ eventType: 'change', filename: 'SOUL.md', timestamp: now + 10 });
    expect(result).toBe('SOUL.md');
  });
});

// ── IncrementalParser ────────────────────────────────────────────────────

describe('IncrementalParser', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `claws-incr-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(testDir, { recursive: true });
    await writeFile(join(testDir, 'SOUL.md'), '# SOUL\nOriginal\n', 'utf-8');
    await writeFile(join(testDir, 'TOOLS.md'), '# TOOLS\nTool list\n', 'utf-8');
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  function makeSeedResult(): { soulEntry: FileEntry; toolsEntry: FileEntry; seedResult: ParseResult } {
    const soulEntry: FileEntry = {
      status: 'present',
      source: 'SOUL.md',
      content: '# SOUL\nOriginal\n',
      provenance: {
        source: 'SOUL.md',
        sourceType: 'filesystem',
        contentHash: 'aaa',
        readAt: new Date().toISOString(),
        rawSize: 18,
      },
    };
    const toolsEntry: FileEntry = {
      status: 'present',
      source: 'TOOLS.md',
      content: '# TOOLS\nTool list\n',
      provenance: {
        source: 'TOOLS.md',
        sourceType: 'filesystem',
        contentHash: 'bbb',
        readAt: new Date().toISOString(),
        rawSize: 19,
      },
    };
    return {
      soulEntry,
      toolsEntry,
      seedResult: {
        entries: [soulEntry, toolsEntry],
        diagnostics: [],
        presentCount: 2,
        absentCount: 0,
        shouldHalt: false,
      },
    };
  }

  it('re-parses only changed files, not all cached entries', async () => {
    const parser = new IncrementalParser(testDir);
    const { seedResult } = makeSeedResult();
    parser.seed(seedResult);

    await writeFile(join(testDir, 'SOUL.md'), '# SOUL\nUpdated content\n', 'utf-8');

    const updated = await parser.update(['SOUL.md']);

    expect(updated.entries).toHaveLength(2);
    expect(updated.presentCount).toBe(2);

    const soul = updated.entries.find(e => e.source === 'SOUL.md');
    expect(soul?.status).toBe('present');
    if (soul?.status === 'present') {
      expect(soul.content).toContain('Updated content');
    }

    const tools = updated.entries.find(e => e.source === 'TOOLS.md');
    expect(tools?.status).toBe('present');
    if (tools?.status === 'present') {
      expect(tools.content).toBe('# TOOLS\nTool list\n');
    }
  });

  it('handles absent file (file deleted from workspace)', async () => {
    const parser = new IncrementalParser(testDir);
    const { seedResult } = makeSeedResult();
    parser.seed(seedResult);

    await rm(join(testDir, 'SOUL.md'));

    const updated = await parser.update(['SOUL.md']);

    const soul = updated.entries.find(e => e.source === 'SOUL.md');
    expect(soul?.status).toBe('absent');
    expect(updated.presentCount).toBe(1);
    expect(updated.absentCount).toBe(1);
  });

  it('produces diagnostics for empty .md file', async () => {
    const parser = new IncrementalParser(testDir);
    const { seedResult } = makeSeedResult();
    parser.seed(seedResult);

    await writeFile(join(testDir, 'SOUL.md'), '   \n', 'utf-8');

    const updated = await parser.update(['SOUL.md']);

    expect(updated.diagnostics.length).toBeGreaterThan(0);
    expect(updated.diagnostics.some(d => d.code === 'CLAWS-P001')).toBe(true);
  });

  it('no diagnostics for non-md present file', async () => {
    const parser = new IncrementalParser(testDir);
    await writeFile(join(testDir, 'config.yaml'), 'key: value\n', 'utf-8');

    parser.seed({
      entries: [{
        status: 'present',
        source: 'config.yaml',
        content: 'key: value\n',
        provenance: { source: 'config.yaml', sourceType: 'filesystem', contentHash: 'x', readAt: new Date().toISOString(), rawSize: 11 },
      }],
      diagnostics: [],
      presentCount: 1,
      absentCount: 0,
      shouldHalt: false,
    });

    const updated = await parser.update(['config.yaml']);
    expect(updated.diagnostics).toHaveLength(0);
  });

  it('handles non-default file path in absent fallback', async () => {
    const parser = new IncrementalParser(testDir);
    const { seedResult } = makeSeedResult();
    parser.seed(seedResult);

    const updated = await parser.update(['custom-policy.md']);

    const entry = updated.entries.find(e => e.source === 'custom-policy.md');
    expect(entry?.status).toBe('absent');
    if (entry?.status === 'absent') {
      expect(entry.defaultDescription).toContain('custom-policy.md not found');
    }
  });

  it('seed() clears previous cache', () => {
    const parser = new IncrementalParser(testDir);
    const { seedResult, soulEntry } = makeSeedResult();
    parser.seed(seedResult);
    expect(parser.cacheSize).toBe(2);

    parser.seed({ entries: [soulEntry], diagnostics: [], presentCount: 1, absentCount: 0, shouldHalt: false });
    expect(parser.cacheSize).toBe(1);
  });

  it('remove() deletes entry from cache', () => {
    const parser = new IncrementalParser(testDir);
    const { seedResult } = makeSeedResult();
    parser.seed(seedResult);

    expect(parser.cacheSize).toBe(2);
    parser.remove('SOUL.md');
    expect(parser.cacheSize).toBe(1);
    expect(parser.getCached('SOUL.md')).toBeUndefined();
  });

  it('getCached() returns cached entry or undefined', () => {
    const parser = new IncrementalParser(testDir);
    const { seedResult } = makeSeedResult();
    parser.seed(seedResult);

    const soul = parser.getCached('SOUL.md');
    expect(soul).toBeDefined();
    expect(soul?.source).toBe('SOUL.md');

    const unknown = parser.getCached('UNKNOWN.md');
    expect(unknown).toBeUndefined();
  });

  it('cacheSize reflects current cache state', () => {
    const parser = new IncrementalParser(testDir);
    expect(parser.cacheSize).toBe(0);

    const { seedResult } = makeSeedResult();
    parser.seed(seedResult);
    expect(parser.cacheSize).toBe(2);
  });

  it('shouldHalt is true when all entries are absent', async () => {
    const parser = new IncrementalParser(testDir);
    parser.seed({
      entries: [{
        status: 'absent',
        source: 'SOUL.md',
        defaultDescription: 'not found',
      }],
      diagnostics: [],
      presentCount: 0,
      absentCount: 1,
      shouldHalt: true,
    });

    await rm(join(testDir, 'SOUL.md'), { force: true });

    const updated = await parser.update(['SOUL.md']);
    expect(updated.shouldHalt).toBe(true);
    expect(updated.presentCount).toBe(0);
  });
});
