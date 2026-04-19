/**
 * Test-only override for the effective compiler version (CL-04 §IS.2, S03-F03).
 *
 * The override is gated on `NODE_ENV === 'test'`. Production builds always
 * return the embedded package version, regardless of env vars — benchmarks
 * and incremental tests use the override to force deterministic cache
 * invalidation without relying on an actual release bump.
 *
 * @module claws-sdk/compiler/host/compiler-version
 */

/** Default compiler version embedded in the package. */
const DEFAULT_COMPILER_VERSION = '0.1.0';

const OVERRIDE_ENV = 'CLAWS_COMPILER_VERSION_OVERRIDE';
const TEST_MODE_ENV = 'NODE_ENV';
const TEST_MODE_VALUE = 'test';

/**
 * Return the compiler version in effect for this compile.
 *
 * Rules:
 *  - If `NODE_ENV === 'test'` AND `CLAWS_COMPILER_VERSION_OVERRIDE` is a
 *    non-empty string, return the override.
 *  - Otherwise return the default (`DEFAULT_COMPILER_VERSION`).
 *
 * The override is never consulted outside test mode so a misconfigured
 * deployment cannot accidentally scramble on-disk caches.
 */
export function getCompilerVersion(): string {
  const nodeEnv = process.env[TEST_MODE_ENV];
  if (nodeEnv === TEST_MODE_VALUE) {
    const override = process.env[OVERRIDE_ENV];
    if (typeof override === 'string' && override.length > 0) {
      return override;
    }
  }
  return DEFAULT_COMPILER_VERSION;
}

/**
 * Exposed for tests that want to assert the default without env-var dance.
 */
export const COMPILER_VERSION_DEFAULT = DEFAULT_COMPILER_VERSION;
