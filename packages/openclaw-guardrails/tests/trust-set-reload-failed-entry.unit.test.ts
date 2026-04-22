/**
 * TrustSetReloadFailedEntry — guard + discriminator tests (pulse 50 D2).
 */

import { describe, expect, it } from 'vitest';

import {
  TRUST_SET_RELOAD_FAILED_TYPE,
  isTrustSetReloadFailedEntry,
  type TrustSetReloadFailedEntry,
} from '../src/audit/trust-set-reload-failed-entry.js';

describe('TrustSetReloadFailedEntry', () => {
  const valid: TrustSetReloadFailedEntry = {
    type: 'trust-set-reload-failed',
    path: '/tmp/trust-set.json',
    error: 'unexpected token at position 3',
    lastSuccessfulReloadAt: 1_700_000_000_000,
    attemptedAt: 1_700_000_005_000,
    stale: false,
  };

  it('discriminator constant matches the type literal', () => {
    expect(TRUST_SET_RELOAD_FAILED_TYPE).toBe('trust-set-reload-failed');
    expect(valid.type).toBe(TRUST_SET_RELOAD_FAILED_TYPE);
  });

  it('isTrustSetReloadFailedEntry accepts a well-formed entry', () => {
    expect(isTrustSetReloadFailedEntry(valid)).toBe(true);
  });

  it('isTrustSetReloadFailedEntry rejects non-object values', () => {
    expect(isTrustSetReloadFailedEntry(null)).toBe(false);
    expect(isTrustSetReloadFailedEntry(undefined)).toBe(false);
    expect(isTrustSetReloadFailedEntry(42)).toBe(false);
    expect(isTrustSetReloadFailedEntry('trust-set-reload-failed')).toBe(false);
  });

  it('isTrustSetReloadFailedEntry rejects entries with wrong type discriminator', () => {
    expect(isTrustSetReloadFailedEntry({ ...valid, type: 'decision' })).toBe(false);
  });

  it('isTrustSetReloadFailedEntry rejects entries with missing or mistyped fields', () => {
    const { path: _path, ...noPath } = valid;
    expect(isTrustSetReloadFailedEntry(noPath)).toBe(false);

    expect(isTrustSetReloadFailedEntry({ ...valid, error: 42 })).toBe(false);
    expect(isTrustSetReloadFailedEntry({ ...valid, lastSuccessfulReloadAt: '0' })).toBe(
      false,
    );
    expect(isTrustSetReloadFailedEntry({ ...valid, attemptedAt: null })).toBe(false);
    expect(isTrustSetReloadFailedEntry({ ...valid, stale: 'yes' })).toBe(false);
  });
});
