---
covers: [atom:SKC/cache-key, atom:SKC/lossless-roundtrip]
---

# Pitfalls: compiler cache + round-trip

## Cache cluster

### P-01 · Missing version in cache key

**Scenario**: Cache key is `sha256(workspaceHash)`. An SDK upgrade
adds G-30 (a new rule). The cache still returns the pre-upgrade
IR — G-30 never fires.

**Consequence**: silent staleness. The SDK thinks it's running all
rules; it's actually returning a cached result from before G-30
existed.

**Fix**: cache key MUST include `claws-sdk-version` and
`canonicalizer-version`. Any SDK change that alters compilation
output invalidates the cache. See
[../specs/SKC-compiler-internals.md § Incremental cache](../specs/SKC-compiler-internals.md).

### P-02 · Cache bleed across workspaces

**Scenario**: Two workspaces have identical content (unusual but
possible — two identical test fixtures). They share a cache entry
via the workspace-content hash.

**Consequence**: actually fine — compilation output is pure function
of input, so sharing is safe and beneficial.

**NOT a pitfall, but worth noting**: the cache key is content-based,
not workspace-ID-based, by design.

### P-03 · Stale cache after fleet change

**Scenario**: A workspace uses `fleet: 'acme'`. The fleet admin
rolls out a new fleet binding with a stricter policy. The workspace's
local cache still has the old IR.

**Fix**: the fleet binding hash is part of the cache key. When the
binding changes, the old cache entry never matches. The next
compile is a fresh one.

### P-04 · Cache size blowup

**Scenario**: CI spams the cache with hundreds of distinct workspace
snapshots over time. Disk fills.

**Fix**: `CompilerCache` implementations are LRU-bounded by default
(100 entries). CI runners pointing at a shared cache should also
have a size policy configured.

## Round-trip cluster

### P-05 · Whitespace mutation between canonicalize + hash

**Scenario**: Code reads
`sha256(JSON.stringify(canonicalize(ir).toString()))` — an accidental
`.toString()` turns the `Uint8Array` into a UTF-8 string with
platform-dependent encoding.

**Consequence**: hashes diverge silently across platforms. Chain
cross-linking breaks.

**Fix**: canonical bytes are `Uint8Array`. Feed directly to
`sha256()`. No `.toString()`, no re-serialisation, no concat with
other strings. See
[`workspace/specs/WSC-canonicalize.md § Pre-hashing requirement`](../../workspace/specs/WSC-canonicalize.md).

### P-06 · IR-level reformat

**Scenario**: Before hashing the IR, someone adds a "pretty-print"
debug hook that indents the canonical JSON for readability.

**Consequence**: hash diverges between debug and release.

**Fix**: `canonicalBytes` is the ONLY way to get canonical output.
Debug pretty-print is a separate function that NEVER feeds into
the hash path.

### P-07 · Version number omitted from IR

**Scenario**: `canonicalizerVersion` is missing from the IR emit
output.

**Consequence**: verifier can't tell which canonicalizer to use
when re-verifying.

**Fix**: `canonicalizerVersion: 1` is a REQUIRED field. The
canonicalizer refuses to emit IR without it.
