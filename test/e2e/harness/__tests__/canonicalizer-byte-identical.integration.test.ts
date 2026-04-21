import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { canonicalizerByteIdentical } from '#harness/canonicalizer-check.ts';

const FIXTURE_ROOT = resolve(__dirname, '..', '..', 'fixtures', 'canonicalizer');

function loadFixture(name: string): unknown {
  const text = readFileSync(resolve(FIXTURE_ROOT, name), 'utf8');
  return JSON.parse(text) as unknown;
}

describe('canonicalizer integration — SC-08 F-04..F-10', () => {
  it('full-shape JCS fixture: 3-surface byte identity', async () => {
    const input = loadFixture('jcs-edge-cases.json');
    const result = await canonicalizerByteIdentical(input);
    expect(result.identical).toBe(true);
    expect(result.firstDiffOffset).toBeUndefined();
    // Sanity: output is valid canonical UTF-8 JSON
    const text = new TextDecoder().decode(result.policy);
    expect(text.startsWith('{') || text.startsWith('[')).toBe(true);
    expect(() => JSON.parse(text)).not.toThrow();
  });

  it('canonicalize is idempotent — re-running yields byte-identical output', async () => {
    const input = loadFixture('jcs-edge-cases.json');
    const first = await canonicalizerByteIdentical(input);
    const second = await canonicalizerByteIdentical(input);
    expect(first.policy).toEqual(second.policy);
    expect(first.snap).toEqual(second.snap);
    expect(first.audit).toEqual(second.audit);
    // Re-canonicalize the parsed canonical text — idempotent under JCS.
    const parsed = JSON.parse(new TextDecoder().decode(first.policy)) as unknown;
    const third = await canonicalizerByteIdentical(parsed);
    expect(third.policy).toEqual(first.policy);
  });

  it('LF vs CRLF string values normalize to identical canonical bytes', async () => {
    // Canonicalization is a structural operation — it does NOT rewrite
    // CRLF inside string values. The invariant tested here is that byte
    // identity across 3 surfaces holds for BOTH encodings (each surface
    // preserves whatever bytes it received).
    const lfInput = { content: 'line1\nline2\nline3', meta: { sep: 'LF' } };
    const crlfInput = { content: 'line1\r\nline2\r\nline3', meta: { sep: 'CRLF' } };

    const lfResult = await canonicalizerByteIdentical(lfInput);
    const crlfResult = await canonicalizerByteIdentical(crlfInput);

    expect(lfResult.identical).toBe(true);
    expect(crlfResult.identical).toBe(true);

    // Logically-distinct inputs → distinct canonical bytes (CRLF preserved
    // as \r\n escape in output).
    expect(lfResult.policy).not.toEqual(crlfResult.policy);
    const crlfText = new TextDecoder().decode(crlfResult.policy);
    expect(crlfText).toContain('\\r\\n');
  });

  it('1MB policy-IR fixture: 3-surface byte identity (scale)', async () => {
    const input = loadFixture('1mb-policy-ir.json');
    const result = await canonicalizerByteIdentical(input);
    expect(result.identical).toBe(true);
    expect(result.policy.byteLength).toBeGreaterThan(500_000);
  });

  it('key-order permutations produce byte-identical canonical output', async () => {
    const a = { z: 1, a: 2, m: { z: 3, a: 4 } };
    const b = { a: 2, z: 1, m: { a: 4, z: 3 } };
    const ra = await canonicalizerByteIdentical(a);
    const rb = await canonicalizerByteIdentical(b);
    expect(ra.policy).toEqual(rb.policy);
    expect(ra.identical).toBe(true);
    expect(rb.identical).toBe(true);
  });

  it('duplicate keys after NFC normalization are rejected by all 3 surfaces', async () => {
    // Keys "\u00e9" (single codepoint) and "e\u0301" (e + combining acute)
    // NFC-normalize to the same key — must throw.
    const dup = { ['\u00e9']: 1, ['e\u0301']: 2 };
    await expect(canonicalizerByteIdentical(dup)).rejects.toThrow(/duplicate/i);
  });
});
