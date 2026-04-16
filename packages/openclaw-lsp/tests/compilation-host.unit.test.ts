/**
 * L0 unit tests for CompilationHost.
 *
 * 5 tests:
 *   1. Cache hit returns cached IR
 *   2. Cache miss triggers recompile
 *   3. Hash invalidation on file change
 *   4. Batch window batches rapid saves
 *   5. Unchanged file re-save skips recompile
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CompilationHost,
  hashContent,
  type GovernanceIRLike,
  type CompileFn,
} from '../src/compilation-host.js';

/** Minimal valid GovernanceIR-like object for testing. */
function makeIR(tag: string): GovernanceIRLike {
  return {
    capabilities: { tag },
    analysis: {},
    intents: [],
    delegationMap: [],
    conflicts: {},
    compiler: {
      compilerVersion: '0.36.0',
      compiledAt: '2026-04-15T00:00:00Z',
      schemaVersion: 1,
    },
  };
}

describe('CompilationHost', () => {
  let compileFn: ReturnType<typeof vi.fn<CompileFn>>;
  let host: CompilationHost;

  beforeEach(() => {
    vi.useFakeTimers();
    compileFn = vi.fn<CompileFn>();
    // Use 0ms batch window by default for instant tests; batch test overrides
    host = new CompilationHost(compileFn, 0);
  });

  afterEach(() => {
    host.clear();
    vi.useRealTimers();
  });

  it('returns cached IR on cache hit without recompiling', async () => {
    const ir = makeIR('first');
    compileFn.mockResolvedValueOnce(ir);

    // First call: compiles
    host.notifyChange('file:///a.crest', 'content-a');
    await vi.advanceTimersByTimeAsync(0);

    // Second call with same content: should hit cache
    compileFn.mockClear();
    host.notifyChange('file:///a.crest', 'content-a');
    await vi.advanceTimersByTimeAsync(0);

    expect(compileFn).not.toHaveBeenCalled();
    expect(host.getCachedIR('file:///a.crest')).toBe(ir);
  });

  it('triggers recompile on cache miss', async () => {
    const ir = makeIR('miss');
    compileFn.mockResolvedValueOnce(ir);

    const promise = host.notifyChange('file:///b.crest', 'new-content');
    await vi.advanceTimersByTimeAsync(0);
    const result = await promise;

    expect(compileFn).toHaveBeenCalledWith('file:///b.crest', 'new-content');
    expect(result.recompiled).toContain('file:///b.crest');
    expect(result.skipped).toHaveLength(0);
    expect(host.getCachedIR('file:///b.crest')).toBe(ir);
  });

  it('invalidates cache when file content changes (different hash)', async () => {
    const ir1 = makeIR('v1');
    const ir2 = makeIR('v2');
    compileFn.mockResolvedValueOnce(ir1);

    // Compile v1
    host.notifyChange('file:///c.crest', 'version-1');
    await vi.advanceTimersByTimeAsync(0);
    expect(host.getCachedIR('file:///c.crest')).toBe(ir1);

    // Change content -> new hash -> should recompile
    compileFn.mockResolvedValueOnce(ir2);
    const promise = host.notifyChange('file:///c.crest', 'version-2');
    await vi.advanceTimersByTimeAsync(0);
    const result = await promise;

    expect(result.recompiled).toContain('file:///c.crest');
    expect(host.getCachedIR('file:///c.crest')).toBe(ir2);
    expect(compileFn).toHaveBeenCalledTimes(2);
  });

  it('batches rapid saves into a single compile pass', async () => {
    // Use a real 300ms batch window for this test
    const batchHost = new CompilationHost(compileFn, 300);
    const ir = makeIR('batched');
    compileFn.mockResolvedValue(ir);

    // Fire 3 rapid changes to the same file within the batch window
    batchHost.notifyChange('file:///d.crest', 'save-1');
    await vi.advanceTimersByTimeAsync(50);
    batchHost.notifyChange('file:///d.crest', 'save-2');
    await vi.advanceTimersByTimeAsync(50);
    const promise = batchHost.notifyChange('file:///d.crest', 'save-3');
    // Advance past the batch window
    await vi.advanceTimersByTimeAsync(300);
    await promise;

    // Only the last content should have been compiled (one compile call)
    expect(compileFn).toHaveBeenCalledTimes(1);
    expect(compileFn).toHaveBeenCalledWith('file:///d.crest', 'save-3');

    batchHost.clear();
  });

  it('skips recompile when unchanged file is re-saved', async () => {
    const ir = makeIR('unchanged');
    compileFn.mockResolvedValueOnce(ir);

    // Initial compile
    host.notifyChange('file:///e.crest', 'same-content');
    await vi.advanceTimersByTimeAsync(0);
    expect(compileFn).toHaveBeenCalledTimes(1);

    // Re-save with identical content
    compileFn.mockClear();
    const promise = host.notifyChange('file:///e.crest', 'same-content');
    await vi.advanceTimersByTimeAsync(0);
    const result = await promise;

    expect(compileFn).not.toHaveBeenCalled();
    expect(result.skipped).toContain('file:///e.crest');
    expect(result.recompiled).toHaveLength(0);
    expect(host.getCachedIR('file:///e.crest')).toBe(ir);
  });

  it('flush() bypasses the batch timer and compiles immediately', async () => {
    const batchHost = new CompilationHost(compileFn, 5000);
    const ir = makeIR('flushed');
    compileFn.mockResolvedValueOnce(ir);

    batchHost.notifyChange('file:///f.crest', 'flush-me');
    // Don't advance timers — flush manually
    const result = await batchHost.flush();

    expect(compileFn).toHaveBeenCalledTimes(1);
    expect(result.recompiled).toContain('file:///f.crest');
    expect(batchHost.getCachedIR('file:///f.crest')).toBe(ir);

    batchHost.clear();
  });

  it('invalidate() removes a URI from the cache', async () => {
    const ir = makeIR('to-remove');
    compileFn.mockResolvedValueOnce(ir);

    host.notifyChange('file:///g.crest', 'content-g');
    await vi.advanceTimersByTimeAsync(0);
    expect(host.getCachedIR('file:///g.crest')).toBe(ir);
    expect(host.size).toBe(1);

    host.invalidate('file:///g.crest');
    expect(host.getCachedIR('file:///g.crest')).toBeUndefined();
    expect(host.size).toBe(0);
  });

  it('getHash() returns the stored hash for a compiled URI', async () => {
    const ir = makeIR('hashed');
    compileFn.mockResolvedValueOnce(ir);

    host.notifyChange('file:///h.crest', 'hash-me');
    await vi.advanceTimersByTimeAsync(0);

    const hash = host.getHash('file:///h.crest');
    expect(hash).toBe(hashContent('hash-me'));
    expect(host.getHash('file:///missing')).toBeUndefined();
  });

  it('clear() cancels pending timers and resets all state', async () => {
    const batchHost = new CompilationHost(compileFn, 5000);
    compileFn.mockResolvedValueOnce(makeIR('will-clear'));

    // Compile one file
    batchHost.notifyChange('file:///i.crest', 'content-i');
    await batchHost.flush();
    expect(batchHost.size).toBe(1);

    // Enqueue another change with active timer
    batchHost.notifyChange('file:///j.crest', 'content-j');
    // Clear while timer is pending
    batchHost.clear();

    expect(batchHost.size).toBe(0);
    expect(batchHost.getCachedIR('file:///i.crest')).toBeUndefined();
  });

  it('flush() with no pending changes returns empty result', async () => {
    // No notifyChange called — flush has no timer to cancel and no resolve
    const result = await host.flush();

    expect(result.recompiled).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
    expect(compileFn).not.toHaveBeenCalled();
  });

  it('handles compile errors gracefully without caching', async () => {
    compileFn.mockRejectedValueOnce(new Error('compile failed'));

    const promise = host.notifyChange('file:///k.crest', 'bad-content');
    await vi.advanceTimersByTimeAsync(0);
    const result = await promise;

    // File shows up in recompiled (attempted) but no cached IR
    expect(result.recompiled).toContain('file:///k.crest');
    expect(host.getCachedIR('file:///k.crest')).toBeUndefined();
  });
});

describe('hashContent', () => {
  it('normalizes CRLF to LF before hashing', () => {
    const lf = hashContent('line1\nline2');
    const crlf = hashContent('line1\r\nline2');
    expect(lf).toBe(crlf);
  });

  it('produces a 64-character hex SHA-256 digest', () => {
    const hash = hashContent('test');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
