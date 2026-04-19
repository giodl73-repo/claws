/**
 * L0 unit tests for the mtime-based compile-level fast-path index
 * (CL-04 §IS, S01-F04).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  computeFingerprint,
  lookupCacheKey,
  optionsSalt,
  recordCacheKey,
} from '#src/compiler/host/mtime-shortcut.js';

describe('optionsSalt (unit)', () => {
  it('sorts targets so argument order does not affect the salt', () => {
    const a = optionsSalt({
      targets: ['oc', 'claude-code'],
      outputDir: '/o',
      dryRun: false,
      compilerVersion: '1.0.0',
    });
    const b = optionsSalt({
      targets: ['claude-code', 'oc'],
      outputDir: '/o',
      dryRun: false,
      compilerVersion: '1.0.0',
    });
    expect(a).toBe(b);
  });

  it('changes when signingKeyId is set', () => {
    const a = optionsSalt({
      targets: ['oc'],
      outputDir: '/o',
      dryRun: false,
      compilerVersion: '1.0.0',
    });
    const b = optionsSalt({
      targets: ['oc'],
      outputDir: '/o',
      dryRun: false,
      compilerVersion: '1.0.0',
      signingKeyId: 'abc',
    });
    expect(a).not.toBe(b);
  });

  it('changes when dryRun toggles', () => {
    const a = optionsSalt({
      targets: ['oc'],
      outputDir: '/o',
      dryRun: false,
      compilerVersion: '1.0.0',
    });
    const b = optionsSalt({
      targets: ['oc'],
      outputDir: '/o',
      dryRun: true,
      compilerVersion: '1.0.0',
    });
    expect(a).not.toBe(b);
  });
});

describe('computeFingerprint (unit)', () => {
  let workspace: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), 'mtime-fp-'));
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it('returns a deterministic string across two calls with no fs changes', async () => {
    writeFileSync(join(workspace, 'SOUL.md'), 'soul');
    writeFileSync(join(workspace, 'TOOLS.md'), 'tools');
    mkdirSync(join(workspace, 'skills'), { recursive: true });

    const a = await computeFingerprint(workspace);
    const b = await computeFingerprint(workspace);
    expect(a).toBeDefined();
    expect(a).toBe(b);
  });

  it('includes "missing" sentinel for absent paths so later arrivals invalidate', async () => {
    const fp = await computeFingerprint(workspace);
    expect(fp).toBeDefined();
    expect(fp!.includes('|missing')).toBe(true);
  });

  it('differs when file content is rewritten (mtime + size changes)', async () => {
    const path = join(workspace, 'SOUL.md');
    writeFileSync(path, 'a');
    mkdirSync(join(workspace, 'skills'), { recursive: true });
    const before = await computeFingerprint(workspace);
    // mtime has 1ms resolution on most platforms; bump content length too.
    await new Promise((r) => setTimeout(r, 10));
    writeFileSync(path, 'abcdef');
    const after = await computeFingerprint(workspace);
    expect(before).not.toBe(after);
  });
});

describe('lookupCacheKey + recordCacheKey (unit)', () => {
  let cacheDir: string;

  beforeEach(() => {
    cacheDir = mkdtempSync(join(tmpdir(), 'mtime-idx-'));
  });

  afterEach(() => {
    rmSync(cacheDir, { recursive: true, force: true });
  });

  it('returns undefined on a fresh cacheDir', async () => {
    const result = await lookupCacheKey(cacheDir, 'fp-1', 'opts-1');
    expect(result).toBeUndefined();
  });

  it('returns the key recorded under the same fingerprint + options', async () => {
    await recordCacheKey(cacheDir, 'fp-1', 'opts-1', 'key-abc');
    const result = await lookupCacheKey(cacheDir, 'fp-1', 'opts-1');
    expect(result).toBe('key-abc');
  });

  it('misses when the fingerprint differs', async () => {
    await recordCacheKey(cacheDir, 'fp-1', 'opts-1', 'key-abc');
    const result = await lookupCacheKey(cacheDir, 'fp-other', 'opts-1');
    expect(result).toBeUndefined();
  });

  it('misses when the options salt differs', async () => {
    await recordCacheKey(cacheDir, 'fp-1', 'opts-1', 'key-abc');
    const result = await lookupCacheKey(cacheDir, 'fp-1', 'opts-other');
    expect(result).toBeUndefined();
  });

  it('updates the stored key when re-recording the same fingerprint+options', async () => {
    await recordCacheKey(cacheDir, 'fp-1', 'opts-1', 'key-old');
    await recordCacheKey(cacheDir, 'fp-1', 'opts-1', 'key-new');
    const result = await lookupCacheKey(cacheDir, 'fp-1', 'opts-1');
    expect(result).toBe('key-new');
  });

  it('keeps entries for different fingerprints alongside each other', async () => {
    await recordCacheKey(cacheDir, 'fp-1', 'opts-1', 'key-1');
    await recordCacheKey(cacheDir, 'fp-2', 'opts-1', 'key-2');
    expect(await lookupCacheKey(cacheDir, 'fp-1', 'opts-1')).toBe('key-1');
    expect(await lookupCacheKey(cacheDir, 'fp-2', 'opts-1')).toBe('key-2');
  });

  it('tolerates a corrupt index file by returning undefined and overwriting on next record', async () => {
    writeFileSync(join(cacheDir, 'mtime-index.json'), 'not json{{');
    expect(await lookupCacheKey(cacheDir, 'fp-1', 'opts-1')).toBeUndefined();
    await recordCacheKey(cacheDir, 'fp-1', 'opts-1', 'key-1');
    expect(await lookupCacheKey(cacheDir, 'fp-1', 'opts-1')).toBe('key-1');
  });

  it('tolerates an index with an older version by treating it as empty', async () => {
    writeFileSync(
      join(cacheDir, 'mtime-index.json'),
      JSON.stringify({ version: 0, entries: [{ fingerprint: 'fp-1', options: 'opts-1', cacheKey: 'key-old' }] }),
    );
    expect(await lookupCacheKey(cacheDir, 'fp-1', 'opts-1')).toBeUndefined();
  });

  it('caps the index at 16 entries, evicting oldest by insertion order', async () => {
    for (let i = 0; i < 20; i++) {
      await recordCacheKey(cacheDir, `fp-${i}`, 'opts', `key-${i}`);
    }
    // fp-0..fp-3 should be evicted (oldest); fp-4..fp-19 (16 entries) remain.
    expect(await lookupCacheKey(cacheDir, 'fp-0', 'opts')).toBeUndefined();
    expect(await lookupCacheKey(cacheDir, 'fp-3', 'opts')).toBeUndefined();
    expect(await lookupCacheKey(cacheDir, 'fp-19', 'opts')).toBe('key-19');
  });

  it('treats an index whose `entries` is not an array as empty (shape guard)', async () => {
    // A JSON index with the current version but a malformed entries shape
    // (e.g., an object where an array is required) must be treated as empty
    // rather than crashing the reader. The next record then overwrites it.
    writeFileSync(
      join(cacheDir, 'mtime-index.json'),
      JSON.stringify({ version: 1, entries: { 'fp-1': 'key-old' } }),
    );
    expect(await lookupCacheKey(cacheDir, 'fp-1', 'opts-1')).toBeUndefined();
    await recordCacheKey(cacheDir, 'fp-1', 'opts-1', 'key-new');
    expect(await lookupCacheKey(cacheDir, 'fp-1', 'opts-1')).toBe('key-new');
  });
});
