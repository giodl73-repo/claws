import type { InvalidReason } from '../types.js';

export interface KeyIdInput {
  readonly handleKeyId: string;
  readonly trustSet: ReadonlySet<string>;
}

export function checkKeyId(input: KeyIdInput): InvalidReason | null {
  return input.trustSet.has(input.handleKeyId) ? null : 'unknown-keyId';
}
