/**
 * Shared HS256 signing key for the trust-escalation endpoint in tests.
 *
 * CP-7 R1 FIX-E (ciso M3 / dragon M-2) removed the deterministic per-
 * workspace fallback in `createApp`: production boots must supply a
 * real key via `claws.json` / env, and `createApp` throws when compileFn
 * is set but trustSigningKey is not. Tests that don't exercise the trust
 * surface still need to satisfy the boot check — they import this fixed
 * 32-byte buffer so the shape of `createApp(state, { compileFn, ... })`
 * stays readable.
 *
 * The value is a constant, not a security secret: every test using it
 * runs against an isolated tmpdir workspace. Production deployers never
 * touch this file.
 */

export const TEST_TRUST_SIGNING_KEY: Buffer = Buffer.from(
  'claws-test-trust-key-32-bytes-00',
  'utf-8',
);
