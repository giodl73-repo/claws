/**
 * L0 unit test — compiler-version override (CL-04 §IS.2, S03-F03).
 *
 * The override is gated on `NODE_ENV === 'test'` AND a non-empty
 * `CLAWS_COMPILER_VERSION_OVERRIDE`. Production builds (any other
 * NODE_ENV) MUST ignore the env var.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  getCompilerVersion,
  COMPILER_VERSION_DEFAULT,
} from '#src/compiler/host/compiler-version.js';

describe('getCompilerVersion (unit)', () => {
  const prevOverride = process.env.CLAWS_COMPILER_VERSION_OVERRIDE;
  const prevNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.CLAWS_COMPILER_VERSION_OVERRIDE = prevOverride;
    process.env.NODE_ENV = prevNodeEnv;
  });

  it('returns the default when no override is set', () => {
    delete process.env.CLAWS_COMPILER_VERSION_OVERRIDE;
    process.env.NODE_ENV = 'test';
    expect(getCompilerVersion()).toBe(COMPILER_VERSION_DEFAULT);
  });

  it('honors the override in NODE_ENV=test', () => {
    process.env.NODE_ENV = 'test';
    process.env.CLAWS_COMPILER_VERSION_OVERRIDE = '9.9.9-benchmark';
    expect(getCompilerVersion()).toBe('9.9.9-benchmark');
  });

  it('ignores the override outside NODE_ENV=test (prod safety)', () => {
    process.env.NODE_ENV = 'production';
    process.env.CLAWS_COMPILER_VERSION_OVERRIDE = 'rogue';
    expect(getCompilerVersion()).toBe(COMPILER_VERSION_DEFAULT);
  });

  it('ignores an empty override string', () => {
    process.env.NODE_ENV = 'test';
    process.env.CLAWS_COMPILER_VERSION_OVERRIDE = '';
    expect(getCompilerVersion()).toBe(COMPILER_VERSION_DEFAULT);
  });
});
