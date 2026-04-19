/**
 * L0 unit — `claws fleet compile` argument validation (fleet/S02 AC-12).
 *
 * `--max-concurrency 0 / -1 / "foo" / "1.5"` all reject with the exact
 * spec-declared error message. Absent flag defaults to os.cpus().length.
 */

import { describe, it, expect } from 'vitest';
import { cpus } from 'node:os';
import { parseMaxConcurrency } from '#src/commands/fleet-compile.js';

describe('parseMaxConcurrency (unit)', () => {
  const INVALID_MSG = '--max-concurrency must be a positive integer';

  it('defaults to os.cpus().length when undefined', () => {
    expect(parseMaxConcurrency(undefined)).toBe(cpus().length);
  });

  it('accepts a positive integer', () => {
    expect(parseMaxConcurrency('1')).toBe(1);
    expect(parseMaxConcurrency('4')).toBe(4);
    expect(parseMaxConcurrency('16')).toBe(16);
  });

  it('rejects 0 with the exact spec message', () => {
    expect(() => parseMaxConcurrency('0')).toThrow(INVALID_MSG);
  });

  it('rejects negative values with the exact spec message', () => {
    expect(() => parseMaxConcurrency('-1')).toThrow(INVALID_MSG);
  });

  it('rejects non-integer strings with the exact spec message', () => {
    expect(() => parseMaxConcurrency('foo')).toThrow(INVALID_MSG);
    expect(() => parseMaxConcurrency('1.5')).toThrow(INVALID_MSG);
    expect(() => parseMaxConcurrency('')).toThrow(INVALID_MSG);
    expect(() => parseMaxConcurrency('3a')).toThrow(INVALID_MSG);
  });
});
