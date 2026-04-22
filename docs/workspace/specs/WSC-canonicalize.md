# WSC — Canonicalizer (RFC 8785 JCS)

**Sub-spec of**: [WS-workspace.md](./WS-workspace.md) · **Absorbs**: CL-15

## Algorithm

Strict RFC 8785 JSON Canonicalization Scheme:

1. Serialise numbers per ECMAScript `Number.prototype.toString()` with
   the fraction-digits rule from RFC 8259 §6.
2. Sort object keys by UTF-16 code unit value.
3. Serialise strings with UTF-16 → UTF-8 encoding, no unnecessary
   escapes.
4. Emit whitespace-free output.

Output is a `Uint8Array` of UTF-8 bytes.

## Byte-identical cross-platform contract

Running the canonicalizer over the same JSON value on Ubuntu 22.04,
Windows 11, and macOS 14 MUST produce byte-identical output. The
canonicalizer-check harness at `test/e2e/harness/canonicalizer-check.ts`
runs all three platforms in CI; any divergence blocks merge.

A single test suite drives this contract: three-consumer byte-identity
— plugin generator, snap runtime, and audit-chain verifier MUST
produce identical canonical bytes for the same input or the chain
integrity check fails. See
[../scenarios/WSC/](../scenarios/WSC/) for the byte-identity scenarios.

## Pre-hashing requirement

Every consumer that hashes canonical bytes MUST feed `canonicalize()`
output directly to `sha256()` with no intervening transformation
(whitespace normalisation, line-ending conversion, re-serialisation).
Violations are silent: the hashes no longer match and chain
cross-linking breaks.

## Algorithm version field

Every artifact that embeds a canonicalizer output MUST record the
algorithm version:

```ts
{
  canonicalizerVersion: 1,  // WSC v1 = RFC 8785 JCS as defined here
  canonicalBytes: <sha256 of canonicalize(value)>
}
```

Bumping the canonicalizer (e.g., to support a new numeric edge case)
bumps `canonicalizerVersion` to 2. The verifier uses the version field
to select the matching algorithm. Never silently upgrade.

See [../pitfalls/canonicalize.md](../pitfalls/canonicalize.md) for
the algorithm-version-mismatch failure mode.
