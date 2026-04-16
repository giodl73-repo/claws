import { describe, it, expect } from 'vitest';
import { CompilationHost, hashContent } from '../src/compilation-host.js';
import { minimalGovernanceIR } from './fixtures/governance-ir.js';

describe('CompilationHost', () => {
  it('returns undefined for getCachedIR before any compile', () => {
    const host = new CompilationHost(async () => minimalGovernanceIR(), '/test');
    expect(host.getCachedIR()).toBeUndefined();
    expect(host.getCompiledAt()).toBeUndefined();
    expect(host.getHash()).toBeUndefined();
    expect(host.hasCachedIR).toBe(false);
  });

  it('caches IR after compile', async () => {
    const ir = minimalGovernanceIR();
    const host = new CompilationHost(async () => ir, '/test');

    const result = await host.compile();
    expect(result.cached).toBe(false);
    expect(result.ir).toEqual(ir);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    expect(host.getCachedIR()).toEqual(ir);
    expect(host.getCompiledAt()).toBeTruthy();
    expect(host.getHash()).toBeTruthy();
    expect(host.hasCachedIR).toBe(true);
  });

  it('returns cached result when IR hash unchanged', async () => {
    const ir = minimalGovernanceIR();
    const host = new CompilationHost(async () => ir, '/test');

    await host.compile();
    const second = await host.compile();

    expect(second.cached).toBe(true);
    expect(second.durationMs).toBe(0);
  });

  it('invalidates cache when IR changes', async () => {
    let version = 1;
    const host = new CompilationHost(async () => {
      const base = minimalGovernanceIR();
      return { ...base, compiler: { ...base.compiler, schemaVersion: version } };
    }, '/test');

    await host.compile();
    const hash1 = host.getHash();

    version = 2;
    const result = await host.compile();
    expect(result.cached).toBe(false);
    expect(host.getHash()).not.toBe(hash1);
  });

  it('clear resets the cache', async () => {
    const host = new CompilationHost(async () => minimalGovernanceIR(), '/test');
    await host.compile();
    expect(host.hasCachedIR).toBe(true);

    host.clear();
    expect(host.hasCachedIR).toBe(false);
    expect(host.getCachedIR()).toBeUndefined();
    expect(host.getCompiledAt()).toBeUndefined();
    expect(host.getHash()).toBeUndefined();
  });
});

describe('hashContent', () => {
  it('normalizes CRLF to LF before hashing', () => {
    const withCRLF = hashContent('hello\r\nworld');
    const withLF = hashContent('hello\nworld');
    expect(withCRLF).toBe(withLF);
  });

  it('returns consistent hash for same content', () => {
    const a = hashContent('test content');
    const b = hashContent('test content');
    expect(a).toBe(b);
  });

  it('returns different hash for different content', () => {
    const a = hashContent('content a');
    const b = hashContent('content b');
    expect(a).not.toBe(b);
  });
});
