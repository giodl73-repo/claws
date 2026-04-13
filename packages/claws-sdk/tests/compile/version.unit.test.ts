/**
 * L0: version constants unit tests.
 *
 * Covers:
 * 1. COMPILER_VERSION is a valid semver string
 * 2. SCHEMA_VERSION is a positive integer
 */

import { describe, it, expect } from 'vitest';
import { COMPILER_VERSION, SCHEMA_VERSION } from '../../src/compile/version.js';

describe('compile/version constants', () => {
  it('COMPILER_VERSION is a valid semver string', () => {
    expect(COMPILER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('SCHEMA_VERSION is a positive integer', () => {
    expect(Number.isInteger(SCHEMA_VERSION)).toBe(true);
    expect(SCHEMA_VERSION).toBeGreaterThan(0);
  });

  it('COMPILER_VERSION is exported as a string', () => {
    expect(typeof COMPILER_VERSION).toBe('string');
  });

  it('SCHEMA_VERSION is exported as a number', () => {
    expect(typeof SCHEMA_VERSION).toBe('number');
  });
});
