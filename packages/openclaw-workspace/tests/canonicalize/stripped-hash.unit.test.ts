/**
 * L0 tests for `computeStrippedHash` — the one helper shared between
 * @bic/openclaw-policy (PolicyIR → policyId) and @bic/openclaw-snap
 * (promote-time PolicyIR self-consistency). The invariant under test
 * here is byte-for-byte equivalence with canonicalHash applied to a
 * manually-stripped object; snap + policy then rely on that invariant
 * instead of keeping parallel implementations.
 */

import { describe, expect, it } from 'vitest';
import {
  canonicalHash,
  computeStrippedHash,
} from '../../src/canonicalize/index.js';

describe('computeStrippedHash — shared strip-and-hash primitive', () => {
  it('produces the same hash as canonicalHash on a manually-stripped clone', () => {
    const obj = {
      policyId: 'sha256-whatever',
      canonicalizerVersion: '1.0.0',
      rules: [{ id: 'r1', action: 'allow' }],
      version: 1,
    };
    const stripped = computeStrippedHash(obj, ['policyId', 'canonicalizerVersion']);
    const manual = canonicalHash({
      rules: [{ id: 'r1', action: 'allow' }],
      version: 1,
    });
    expect(stripped).toBe(manual);
  });

  it('is insensitive to the values of omitted fields', () => {
    const base = { policyId: 'sha256-a', canonicalizerVersion: '1.0.0', rules: [] };
    const alt = { policyId: 'sha256-b', canonicalizerVersion: '9.9.9', rules: [] };
    expect(computeStrippedHash(base, ['policyId', 'canonicalizerVersion'])).toBe(
      computeStrippedHash(alt, ['policyId', 'canonicalizerVersion']),
    );
  });

  it('does not mutate the input object', () => {
    const obj: Record<string, unknown> = { policyId: 'sha256-x', rules: [1, 2] };
    const snapshot = JSON.stringify(obj);
    computeStrippedHash(obj, ['policyId']);
    expect(JSON.stringify(obj)).toBe(snapshot);
  });

  it('omit empty list = canonicalHash of full object', () => {
    const obj = { a: 1, b: [2, 3] };
    expect(computeStrippedHash(obj, [])).toBe(canonicalHash(obj));
  });

  it('omitting absent keys is a no-op', () => {
    const obj = { a: 1 };
    expect(computeStrippedHash(obj, ['nope', 'alsoNope'])).toBe(canonicalHash(obj));
  });

  it('produces sha256-<base64url> envelope (delegates to canonicalHash)', () => {
    const h = computeStrippedHash({ a: 1 }, []);
    expect(h).toMatch(/^sha256-[A-Za-z0-9_-]+$/);
  });
});
