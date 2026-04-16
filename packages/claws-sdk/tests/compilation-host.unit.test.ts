/**
 * L0: CompilationHost — hashContent + ICompilationHost structural tests.
 *
 * The only runtime function exported from compilation-host.ts is `hashContent`.
 * The rest are interfaces (ICompilationHost, GovernanceIRLike) — no runtime
 * code to cover. This test exercises all branches of `hashContent`.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { hashContent } from '../src/compilation-host.js';
import type { ICompilationHost, GovernanceIRLike } from '../src/compilation-host.js';

// ── hashContent ─────────────────────────────────────────────────────────────

describe('hashContent', () => {
  it('returns SHA-256 hex digest of the input', () => {
    const content = 'hello world';
    const expected = createHash('sha256').update(content, 'utf8').digest('hex');
    expect(hashContent(content)).toBe(expected);
  });

  it('normalizes CRLF to LF before hashing', () => {
    const withCRLF = 'line1\r\nline2\r\nline3';
    const withLF = 'line1\nline2\nline3';

    expect(hashContent(withCRLF)).toBe(hashContent(withLF));
  });

  it('preserves standalone CR (not part of CRLF)', () => {
    const withCR = 'line1\rline2';
    const withLF = 'line1\nline2';

    // \r alone is NOT normalized — only \r\n is
    expect(hashContent(withCR)).not.toBe(hashContent(withLF));
  });

  it('returns consistent hash for empty string', () => {
    const expected = createHash('sha256').update('', 'utf8').digest('hex');
    expect(hashContent('')).toBe(expected);
  });

  it('returns 64-character hex string', () => {
    const hash = hashContent('test');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces different hashes for different content', () => {
    expect(hashContent('a')).not.toBe(hashContent('b'));
  });

  it('handles multi-line content with mixed endings', () => {
    // Mixed CRLF and LF — only CRLF is normalized
    const mixed = 'line1\r\nline2\nline3\r\n';
    const normalized = 'line1\nline2\nline3\n';
    expect(hashContent(mixed)).toBe(hashContent(normalized));
  });
});

// ── GovernanceIRLike structural type ────────────────────────────────────────

describe('GovernanceIRLike', () => {
  it('accepts structurally compatible objects', () => {
    const irLike: GovernanceIRLike = {
      capabilities: { tools: [] },
      analysis: { risk: 'R3' },
      intents: [{ name: 'test' }],
      delegationMap: [],
      conflicts: { items: [] },
      compiler: {
        compilerVersion: '1.0.0',
        compiledAt: '2026-04-15T00:00:00Z',
        schemaVersion: 1,
      },
    };

    expect(irLike.compiler.compilerVersion).toBe('1.0.0');
    expect(irLike.compiler.schemaVersion).toBe(1);
    expect(irLike.intents).toHaveLength(1);
  });
});

// ── ICompilationHost structural type ────────────────────────────────────────

describe('ICompilationHost', () => {
  it('can be implemented with getCachedIR, getHash, clear', () => {
    const host: ICompilationHost = {
      getCachedIR: () => undefined,
      getHash: () => undefined,
      clear: () => {},
    };

    expect(host.getCachedIR()).toBeUndefined();
    expect(host.getHash()).toBeUndefined();
    expect(host.clear()).toBeUndefined();
  });

  it('getCachedIR can return a GovernanceIRLike', () => {
    const irLike: GovernanceIRLike = {
      capabilities: {},
      analysis: {},
      intents: [],
      delegationMap: [],
      conflicts: {},
      compiler: {
        compilerVersion: '1.0.0',
        compiledAt: '2026-04-15T00:00:00Z',
        schemaVersion: 1,
      },
    };

    const host: ICompilationHost = {
      getCachedIR: () => irLike,
      getHash: () => 'abc123',
      clear: () => {},
    };

    expect(host.getCachedIR()).toBe(irLike);
    expect(host.getHash()).toBe('abc123');
  });
});
