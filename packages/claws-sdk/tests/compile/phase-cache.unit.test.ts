/**
 * L0: PhaseCache + DependencyGraph unit tests.
 *
 * Covers:
 *  1. phase cache hit returns cached output
 *  2. phase cache miss returns undefined
 *  3. invalidateByFile clears exactly the phases tied to that file
 *  4. dependency graph records phase→file associations on first compile
 *  5. LRU eviction drops the oldest entry under memory pressure
 *  6. hash mismatch (different inputHashes) returns undefined
 */

import { describe, it, expect } from 'vitest';
import {
  PhaseCache,
  DependencyGraph,
} from '../../src/compile/phase-cache.js';

describe('PhaseCache.get / set', () => {
  it('returns cached output on hit (composite hash match)', () => {
    const cache = new PhaseCache();
    cache.set('parse', ['hash-a', 'hash-b'], { ast: 'ok' });
    const hit = cache.get('parse', ['hash-a', 'hash-b']);
    expect(hit).toBeDefined();
    expect(hit!.output).toEqual({ ast: 'ok' });
    expect(hit!.inputHash).toHaveLength(64);
  });

  it('returns undefined on miss', () => {
    const cache = new PhaseCache();
    expect(cache.get('parse', ['never-seen'])).toBeUndefined();
  });

  it('returns undefined when input hashes differ (hash mismatch invalidates phase)', () => {
    const cache = new PhaseCache();
    cache.set('classify', ['h1'], { labels: [] });
    expect(cache.get('classify', ['h2'])).toBeUndefined();
    expect(cache.get('classify', ['h1'])).toBeDefined();
  });
});

describe('PhaseCache.invalidateByFile via DependencyGraph', () => {
  it('clears exactly the phases tied to the changed file', () => {
    const graph = new DependencyGraph();
    const cache = new PhaseCache();
    graph.record('classify', ['TOOLS.md']);
    graph.record('evaluate', ['TOOLS.md', 'POLICY.md']);
    graph.record('emit', ['POLICY.md']);
    cache.set('classify', ['h-t'], 'classify-out');
    cache.set('evaluate', ['h-t', 'h-p'], 'evaluate-out');
    cache.set('emit', ['h-p'], 'emit-out');

    cache.invalidateByFile('TOOLS.md', graph);

    expect(cache.get('classify', ['h-t'])).toBeUndefined();
    expect(cache.get('evaluate', ['h-t', 'h-p'])).toBeUndefined();
    // emit does not depend on TOOLS.md — survives.
    expect(cache.get('emit', ['h-p'])).toBeDefined();
  });
});

describe('DependencyGraph.record', () => {
  it('builds file→phases and phases→files on first compile', () => {
    const graph = new DependencyGraph();
    graph.record('parse', ['SOUL.md', 'TOOLS.md']);
    graph.record('classify', ['TOOLS.md']);

    expect([...graph.phasesFor('TOOLS.md')].sort()).toEqual(['classify', 'parse']);
    expect([...graph.phasesFor('SOUL.md')]).toEqual(['parse']);
    expect([...graph.filesFor('parse')].sort()).toEqual(['SOUL.md', 'TOOLS.md']);
    expect(graph.hasDependencies).toBe(true);
  });
});

describe('PhaseCache LRU eviction', () => {
  it('drops the oldest entry when maxEntries is exceeded', () => {
    const cache = new PhaseCache({ maxEntries: 2 });
    cache.set('a', ['1'], 'first');
    cache.set('b', ['2'], 'second');
    // Touch 'a' so 'b' becomes the LRU target.
    cache.get('a', ['1']);
    cache.set('c', ['3'], 'third');

    expect(cache.size).toBe(2);
    expect(cache.get('b', ['2'])).toBeUndefined();
    expect(cache.get('a', ['1'])).toBeDefined();
    expect(cache.get('c', ['3'])).toBeDefined();
  });
});

describe('PhaseCache.invalidate / clear', () => {
  it('invalidate drops every entry for a single phase only', () => {
    const cache = new PhaseCache();
    cache.set('parse', ['h1'], 'p1');
    cache.set('parse', ['h2'], 'p2');
    cache.set('emit', ['h1'], 'e1');

    cache.invalidate('parse');

    expect(cache.get('parse', ['h1'])).toBeUndefined();
    expect(cache.get('parse', ['h2'])).toBeUndefined();
    expect(cache.get('emit', ['h1'])).toBeDefined();
  });

  it('clear drops every entry and resets tick', () => {
    const cache = new PhaseCache();
    cache.set('a', ['1'], 'x');
    cache.set('b', ['2'], 'y');
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a', ['1'])).toBeUndefined();
  });

  it('set tolerates non-JSON-serializable payloads without throwing', () => {
    const cache = new PhaseCache();
    const cyclic: Record<string, unknown> = {};
    cyclic['self'] = cyclic;
    // estimateSize's catch path: JSON.stringify throws on cycles.
    expect(() => cache.set('parse', ['h1'], cyclic)).not.toThrow();
    expect(cache.get('parse', ['h1'])).toBeDefined();
  });
});

describe('DependencyGraph.clear / filesFor fallback', () => {
  it('clear drops every dependency', () => {
    const graph = new DependencyGraph();
    graph.record('parse', ['SOUL.md']);
    expect(graph.hasDependencies).toBe(true);
    graph.clear();
    expect(graph.hasDependencies).toBe(false);
    expect(graph.phasesFor('SOUL.md').size).toBe(0);
    expect(graph.filesFor('parse').size).toBe(0);
  });
});
