/**
 * L0: Error code registry — completeness and structure.
 */

import { describe, it, expect } from 'vitest';
import { ERROR_CODES, lookupErrorCode } from '../../src/errors/codes.js';

describe('error code registry', () => {
  it('contains all codes OC-POLICY-E001 through OC-POLICY-E099 with no gaps', () => {
    expect(ERROR_CODES.size).toBe(99);

    for (let i = 1; i <= 99; i++) {
      const code = `OC-POLICY-E${String(i).padStart(3, '0')}`;
      const entry = ERROR_CODES.get(code);
      expect(entry, `Missing entry for ${code}`).toBeDefined();
      expect(entry!.code).toBe(code);
      expect(entry!.description.length).toBeGreaterThan(0);
      expect(entry!.category.length).toBeGreaterThan(0);
    }
  });

  it('lookupErrorCode returns entry for known codes', () => {
    const entry = lookupErrorCode('OC-POLICY-E010');
    expect(entry).toBeDefined();
    expect(entry!.code).toBe('OC-POLICY-E010');
    expect(entry!.category).toBe('workspace');
  });

  it('lookupErrorCode returns undefined for unknown codes', () => {
    expect(lookupErrorCode('OC-POLICY-E999')).toBeUndefined();
  });
});
