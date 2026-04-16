/**
 * L0: T-01 regression tests — path traversal in keyId must throw.
 *
 * Validates that `../`, `/`, and `\` in keyId are rejected by
 * the validateKeyId function to prevent path traversal through
 * key management APIs.
 */

import { describe, it, expect } from 'vitest';
import { validateKeyId } from '../../src/keys/storage.js';

describe('T-01: path traversal in keyId throws', () => {
  it('rejects keyId containing "../" (parent directory traversal)', () => {
    expect(() => validateKeyId('../etc/passwd')).toThrow(
      /Invalid keyId.*must match/,
    );
    // key with / is rejected by regex before the .. check
    expect(() => validateKeyId('key-../../secret')).toThrow(
      /Invalid keyId.*must match/,
    );
    // Pure .. without / triggers the explicit traversal check
    expect(() => validateKeyId('key..secret')).toThrow(
      /path traversal sequence/,
    );
  });

  it('rejects keyId containing "/" (forward slash path separator)', () => {
    expect(() => validateKeyId('path/to/key')).toThrow(
      /Invalid keyId.*must match/,
    );
    expect(() => validateKeyId('/absolute-key')).toThrow(
      /Invalid keyId.*must match/,
    );
  });

  it('rejects keyId containing "\\" (backslash path separator)', () => {
    expect(() => validateKeyId('path\\to\\key')).toThrow(
      /Invalid keyId.*must match/,
    );
    expect(() => validateKeyId('..\\parent')).toThrow(
      /Invalid keyId.*must match/,
    );
  });
});
