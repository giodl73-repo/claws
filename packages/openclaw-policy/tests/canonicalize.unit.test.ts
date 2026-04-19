import { describe, it, expect } from 'vitest';
import {
  canonicalHash,
  canonicalize,
  computePolicyId,
  CANONICALIZER_VERSION,
} from '../src/compile/canonicalize.js';
import { waffles } from './helpers/fixture.js';

describe('canonicalize — JCS edge cases', () => {
  it('serializes primitives (null, booleans, numbers, strings)', () => {
    expect(canonicalize(null)).toBe('null');
    expect(canonicalize(true)).toBe('true');
    expect(canonicalize(false)).toBe('false');
    expect(canonicalize(0)).toBe('0');
    expect(canonicalize(42)).toBe('42');
    expect(canonicalize(1.5)).toBe('1.5');
  });

  it('escapes control chars in strings', () => {
    expect(canonicalize('"quote"')).toBe('"\\"quote\\""');
    expect(canonicalize('back\\slash')).toBe('"back\\\\slash"');
    expect(canonicalize('\b\t\n\f\r')).toBe('"\\b\\t\\n\\f\\r"');
    expect(canonicalize('\u0001')).toBe('"\\u0001"');
    expect(canonicalize('plain')).toBe('"plain"');
  });

  it('sorts object keys and drops undefined', () => {
    expect(canonicalize({ b: 2, a: 1, z: undefined })).toBe('{"a":1,"b":2}');
  });

  it('serializes nested arrays and objects', () => {
    expect(canonicalize([{ a: 1 }, 'x', null])).toBe('[{"a":1},"x",null]');
  });

  it('rejects non-finite numbers and exotic types', () => {
    expect(() => canonicalize(NaN)).toThrow(/not serializable/);
    expect(() => canonicalize(Infinity)).toThrow(/not serializable/);
    expect(() => canonicalize(Symbol('x') as unknown)).toThrow(/not serializable/);
  });

  it('canonicalHash produces sha256-<base64url> with url-safe charset', () => {
    const hash = canonicalHash({ a: 1 });
    expect(hash).toMatch(/^sha256-[A-Za-z0-9_-]+$/);
    expect(hash).not.toMatch(/[+/=]/);
  });

  it('computePolicyId strips policyId + canonicalizerVersion before hashing', () => {
    const base = waffles();
    const mutated = { ...base, policyId: 'tampered', canonicalizerVersion: '999' };
    expect(computePolicyId(base)).toBe(computePolicyId(mutated));
  });

  it('computePolicyId is byte-identical to workspace JCS on the waffles fixture', () => {
    // Regression: when policy stopped shipping its own JCS fallback and wired
    // to @bic/openclaw-workspace/canonicalize, any field-ordering drift
    // between the two would silently rewrite every policyId in the fleet.
    // This hash is frozen at the wiring point; a change means policyId
    // stability broke and signing/snapshots need a forced migration.
    expect(computePolicyId(waffles())).toBe(
      'sha256-3GhV00GhN1dBfPgqLNEZpYe9uyDCKgMZ_ypG3OIw8bo',
    );
  });

  it('CANONICALIZER_VERSION is a semver string', () => {
    expect(CANONICALIZER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
