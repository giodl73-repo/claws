import type { InvalidReason } from '../types.js';

export interface TtlInput {
  readonly handleTtl: number;
  readonly clock: () => number;
}

/**
 * `handleTtl` is the absolute expiry instant in milliseconds since epoch (not
 * a relative duration). Fails closed when `clock() >= handleTtl`.
 */
export function checkTtl(input: TtlInput): InvalidReason | null {
  return input.clock() < input.handleTtl ? null : 'ttl-expired';
}
