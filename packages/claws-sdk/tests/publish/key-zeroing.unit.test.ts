/**
 * L0: Key material Buffer is filled with zeros after signing operation.
 *
 * S-04: Signing key held in Buffer (not JS string) during operations,
 * and explicitly zeroed (buffer.fill(0)) after use.
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { useSigningKey } from '../../src/publish/key-resolution.js';
import type { KeyResolutionResult } from '../../src/publish/key-resolution.js';

describe('key-zeroing', () => {
  it('key material Buffer is filled with zeros after signing operation completes', async () => {
    const keyHex = randomBytes(32).toString('hex');

    const fakeResult: KeyResolutionResult = {
      keyMaterial: keyHex,
      source: 'ci-env',
      keyId: 'test-key',
      reason: 'test',
    };

    let capturedBuffer: Buffer | null = null;

    await useSigningKey(fakeResult, (keyBuffer) => {
      // Capture reference to the buffer inside the callback
      capturedBuffer = keyBuffer;
      // Verify the buffer has the correct key material during the operation.
      // Hex-encoded keys are decoded to raw bytes, so compare as hex.
      expect(keyBuffer.toString('hex')).toBe(keyHex);
      return 'signed-result';
    });

    // After useSigningKey returns, the buffer should be zeroed
    expect(capturedBuffer).not.toBeNull();
    const allZero = (capturedBuffer! as Buffer).every((byte) => byte === 0);
    expect(allZero).toBe(true);
  });

  it('key material Buffer is zeroed even when the callback throws', async () => {
    const keyHex = randomBytes(32).toString('hex');

    const fakeResult: KeyResolutionResult = {
      keyMaterial: keyHex,
      source: 'fleet',
      keyId: 'test-key-err',
      reason: 'test',
    };

    let capturedBuffer: Buffer | null = null;

    await expect(
      useSigningKey(fakeResult, (keyBuffer) => {
        capturedBuffer = keyBuffer;
        throw new Error('signing failed');
      }),
    ).rejects.toThrow('signing failed');

    // Buffer should still be zeroed after error
    expect(capturedBuffer).not.toBeNull();
    const allZero = (capturedBuffer! as Buffer).every((byte) => byte === 0);
    expect(allZero).toBe(true);
  });
});
