---
covers: [atom:WSC/algorithm-version]
---

# Pitfalls: canonicalizer

## P-01 · Pre-hashing reformat

**Input**: `sha256(JSON.stringify(canonicalize(v)))` or
`sha256(canonicalize(v).trim())`.
**Consequence**: the hash diverges from every other consumer that
hashes raw canonical bytes. Audit chain cross-linking breaks silently.
**Fix**: `sha256(canonicalize(v))` with NO intervening transformation.
`canonicalize()` returns `Uint8Array`; feed it to `sha256` directly.

## P-02 · Algorithm version drift

**Input**: The plugin is built against canonicalizer v1; the snap
runtime ships v2 (say, a new numeric edge case was added). Both
compute a hash over the same JSON; the hashes diverge.
**Consequence**: audit chain entries from the plugin no longer match
entries from the snap. Chain verification fails with a hash-mismatch
finding, blocking every request.
**Fix**: every artifact embeds `canonicalizerVersion: N`. The verifier
selects the matching algorithm based on the version field. Upgrades
are explicit — never silently bumped.

## P-03 · Byte-identity cross-platform mismatch

**Input**: Canonicalize the same JSON on Windows and macOS; the
Windows output has `0.1` as `0.1`, the macOS output has it as `1e-1`.
**Consequence**: CI passes on one platform but fails on the other;
releases ship with a latent hash-divergence bug.
**Fix**: the canonicalizer-check harness runs all three platforms
(Ubuntu 22.04, Windows 11, macOS 14) in CI. ANY divergence blocks
merge. See `test/e2e/harness/canonicalizer-check.ts`.

## P-04 · Unicode normalisation drift

**Input**: A JSON value with `"café"` in NFC form; a consumer applies
NFD normalisation before hashing.
**Consequence**: hash diverges.
**Fix**: canonicalizer does NOT apply Unicode normalisation. Input
bytes are preserved. If you need NFC on input, normalise BEFORE
calling `canonicalize()` — never inside the hash loop.
