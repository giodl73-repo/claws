/**
 * L1 integration tests for CompilationHost.
 *
 * 2 tests:
 *   1. CompilationHost on fixture workspace (multi-file compile)
 *   2. Incremental recompile on single file change
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CompilationHost,
  type GovernanceIRLike,
  type CompileFn,
} from '../src/compilation-host.js';

/** Build a GovernanceIR-like from workspace file content. */
function compileFromContent(uri: string, content: string): GovernanceIRLike {
  return {
    capabilities: { source: uri, length: content.length },
    analysis: { ruleCount: content.split('\n').length },
    intents: [],
    delegationMap: [],
    conflicts: {},
    compiler: {
      compilerVersion: '0.36.0',
      compiledAt: new Date().toISOString(),
      schemaVersion: 1,
    },
  };
}

describe('CompilationHost integration', () => {
  let compileFn: ReturnType<typeof vi.fn<CompileFn>>;
  let host: CompilationHost;

  beforeEach(() => {
    vi.useFakeTimers();
    compileFn = vi.fn<CompileFn>().mockImplementation(
      async (uri, content) => compileFromContent(uri, content),
    );
    host = new CompilationHost(compileFn, 0);
  });

  afterEach(() => {
    host.clear();
    vi.useRealTimers();
  });

  it('compiles a fixture workspace with multiple files', async () => {
    // Simulate a workspace with 3 governance files
    const files = [
      { uri: 'file:///ws/AGENTS.md', content: '# Agents\n- agent-1\n- agent-2' },
      { uri: 'file:///ws/TOOLS.md', content: '# Tools\n- tool-a (risk: medium)' },
      { uri: 'file:///ws/RULES.md', content: '# Rules\nR1: no-shell\nR2: require-approval' },
    ];

    // Notify all files in the same batch
    let lastPromise: Promise<unknown> | undefined;
    for (const f of files) {
      lastPromise = host.notifyChange(f.uri, f.content);
    }
    await vi.advanceTimersByTimeAsync(0);
    await lastPromise;

    // All 3 should be compiled
    expect(compileFn).toHaveBeenCalledTimes(3);
    expect(host.size).toBe(3);

    // Each file should have a cached IR
    for (const f of files) {
      const ir = host.getCachedIR(f.uri);
      expect(ir).toBeDefined();
      expect((ir!.capabilities as { source: string }).source).toBe(f.uri);
    }
  });

  it('incrementally recompiles only the changed file', async () => {
    // Initial compile of 2 files
    host.notifyChange('file:///ws/A.md', 'content-A');
    host.notifyChange('file:///ws/B.md', 'content-B');
    await vi.advanceTimersByTimeAsync(0);

    expect(compileFn).toHaveBeenCalledTimes(2);
    const irA = host.getCachedIR('file:///ws/A.md');
    const irB = host.getCachedIR('file:///ws/B.md');

    // Change only file A
    compileFn.mockClear();
    const promise = host.notifyChange('file:///ws/A.md', 'content-A-modified');
    // Also re-notify B with the same content (no-op save)
    host.notifyChange('file:///ws/B.md', 'content-B');
    await vi.advanceTimersByTimeAsync(0);
    const result = await promise;

    // Only A should recompile, B should be skipped
    expect(compileFn).toHaveBeenCalledTimes(1);
    expect(compileFn).toHaveBeenCalledWith('file:///ws/A.md', 'content-A-modified');
    expect(result.recompiled).toContain('file:///ws/A.md');
    expect(result.skipped).toContain('file:///ws/B.md');

    // A's IR should be new, B's IR should be the same object
    expect(host.getCachedIR('file:///ws/A.md')).not.toBe(irA);
    expect(host.getCachedIR('file:///ws/B.md')).toBe(irB);
  });
});
