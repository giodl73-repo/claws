/**
 * L0: IncrementalCompilationCache unit tests — the coordinator that
 * binds PhaseCache, DependencyGraph, and per-file hashing.
 *
 * Split from phase-cache.unit.test.ts because the class lives in
 * compile/cache.ts and has distinct behaviors worth exercising:
 *  - per-file hash delta detection (updateFileHash)
 *  - planRecompile fallback to full rebuild
 *  - setPhase + invalidateFile round-trip
 *  - clear resets every sub-component
 */

import { describe, it, expect } from 'vitest';
import { IncrementalCompilationCache } from '../../src/compile/cache.js';
import { hashContent } from '../../src/compilation-host.js';

describe('IncrementalCompilationCache.updateFileHash', () => {
  it('returns true for the first recording and for genuine changes', () => {
    const cache = new IncrementalCompilationCache();
    expect(cache.updateFileHash('SOUL.md', 'v1')).toBe(true);
    expect(cache.updateFileHash('SOUL.md', 'v1')).toBe(false);
    expect(cache.updateFileHash('SOUL.md', 'v2')).toBe(true);
    expect(cache.getFileHash('SOUL.md')).toBe(hashContent('v2'));
  });

  it('setFileHash accepts a pre-computed hash', () => {
    const cache = new IncrementalCompilationCache();
    cache.setFileHash('SOUL.md', 'precomputed');
    expect(cache.getFileHash('SOUL.md')).toBe('precomputed');
    expect(cache.getFileHash('missing.md')).toBeUndefined();
  });
});

describe('IncrementalCompilationCache.planRecompile', () => {
  it('returns fullRebuild when the dependency graph is empty', () => {
    const cache = new IncrementalCompilationCache();
    const plan = cache.planRecompile([{ filePath: 'SOUL.md', hash: 'h1' }]);
    expect(plan.fullRebuild).toBe(true);
    expect(plan.changedFiles).toEqual(['SOUL.md']);
    expect(plan.phases).toEqual([]);
  });

  it('returns empty plan when nothing changed', () => {
    const cache = new IncrementalCompilationCache();
    cache.setPhase('parse', [hashContent('v1')], 'out', ['SOUL.md']);
    cache.updateFileHash('SOUL.md', 'v1');
    const plan = cache.planRecompile([{ filePath: 'SOUL.md', hash: hashContent('v1') }]);
    expect(plan.fullRebuild).toBe(false);
    expect(plan.phases).toEqual([]);
    expect(plan.changedFiles).toEqual([]);
  });

  it('falls back to fullRebuild when an unknown file changed', () => {
    const cache = new IncrementalCompilationCache();
    cache.setPhase('parse', [hashContent('v1')], 'out', ['SOUL.md']);
    cache.updateFileHash('SOUL.md', 'v1');
    const plan = cache.planRecompile([
      { filePath: 'NEW-FILE.md', hash: hashContent('n1') },
    ]);
    expect(plan.fullRebuild).toBe(true);
    expect(plan.changedFiles).toEqual(['NEW-FILE.md']);
  });
});

describe('IncrementalCompilationCache.setPhase / getPhase / invalidateFile', () => {
  it('records dependencies when dependsOn is provided, skips when empty', () => {
    const cache = new IncrementalCompilationCache();
    cache.setPhase('parse', [hashContent('v1')], 'out', ['SOUL.md']);
    expect(cache.getPhase('parse', [hashContent('v1')])).toBeDefined();
    expect([...cache.graph.phasesFor('SOUL.md')]).toEqual(['parse']);

    // dependsOn defaults to [] — graph untouched by this call.
    cache.setPhase('tangent', ['zzz'], 'other');
    expect(cache.graph.phasesFor('SOUL.md').size).toBe(1);
  });

  it('invalidateFile drops phases resolved through the dependency graph', () => {
    const cache = new IncrementalCompilationCache();
    cache.setPhase('parse', [hashContent('v1')], 'out', ['SOUL.md']);
    cache.invalidateFile('SOUL.md');
    expect(cache.getPhase('parse', [hashContent('v1')])).toBeUndefined();
  });
});

describe('IncrementalCompilationCache.clear', () => {
  it('resets file hashes, phases, and dependency graph', () => {
    const cache = new IncrementalCompilationCache();
    cache.setPhase('parse', [hashContent('v1')], 'out', ['SOUL.md']);
    cache.updateFileHash('SOUL.md', 'v1');
    cache.clear();
    expect(cache.getFileHash('SOUL.md')).toBeUndefined();
    expect(cache.getPhase('parse', [hashContent('v1')])).toBeUndefined();
    expect(cache.graph.hasDependencies).toBe(false);
  });
});
