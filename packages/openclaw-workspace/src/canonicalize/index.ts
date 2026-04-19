/**
 * @bic/openclaw-workspace/canonicalize — RFC 8785 JCS + extended rules.
 *
 * One canonicalizer, shared across the openclaw family. Byte-identical
 * across Linux + Windows + macOS per PR (CI-enforced).
 *
 * @module @bic/openclaw-workspace/canonicalize
 */

export {
  canonicalize,
  canonicalHash,
  computeStrippedHash,
  safeParse,
  CANONICALIZER_VERSION,
  CanonicalizeError,
  CanonicalizeErrorCode,
  type CanonicalizeErrorCodeValue,
} from './canonicalize.js';
