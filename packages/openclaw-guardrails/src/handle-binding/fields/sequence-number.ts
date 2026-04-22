import type { InvalidReason } from '../types.js';

export interface SequenceNumberInput {
  readonly handleSequenceNumber: number;
  readonly highWaterMark: number;
}

/**
 * Rejects rollback attempts: the handle's sequenceNumber must be strictly
 * greater than the persisted high-water mark.
 */
export function checkSequenceNumber(input: SequenceNumberInput): InvalidReason | null {
  return input.handleSequenceNumber > input.highWaterMark
    ? null
    : 'sequence-rollback';
}
