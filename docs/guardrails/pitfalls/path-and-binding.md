---
covers: [atom:GRF/path-canonicalize, atom:GRA/nonce-scope, atom:GRR/r5-contract, atom:GRH, atom:GRT/fs-watch-reload]
---

# Pitfalls: paths, bindings, and R5

Three clusters of failure modes around `FileIngestProvider`
`redirectPath`, `ApprovalHandle` replay, and R5 downgrade attempts.

## Path cluster — `FileIngestProvider.redirectPath`

### P-03 · NTFS / symlink bypass

**Scenario**: Provider returns
`{ kind: 'modify', redirectPath: 'oc://reviewed/foo' }` where
`oc://reviewed/foo` is a symlink to `C:\Windows\System32\config\SAM`.

**Consequence without re-validation**: runtime reads the system file.
The review verdict was against a path that doesn't resolve to what
the runtime actually reads.

**Fix**: runtime ALWAYS re-parses with `parseOcUri` + re-resolves
with `resolveFsPath` before any syscall. Symlink-escape → denial +
`DecisionEntry { invalidReason: 'redirect-path-escape' }`. See
[GRF § redirectPath invariant](../specs/GRF-file-ingest.md).

### P-03b · TOCTOU race

**Scenario**: Provider returns a safe `redirectPath`. Between the
`beforeIngest` return and the actual filesystem read, an attacker
races to replace the target with a symlink.

**Fix**: resolution happens INSIDE the syscall boundary on the same
open file descriptor when platform supports it (O_NOFOLLOW on Linux,
REPARSE_POINT flags on Windows). Any mid-operation swap returns EACCES
or ERROR_INVALID_REPARSE_DATA and denies the ingest.

## Binding cluster — `ApprovalHandle` replay

### P-05 · Nonce replay within scope

**Scenario**: Attacker captures an approved `ApprovalHandle +
ApprovalResponse`. Two hours later, they replay it against the same
tool call.

**Consequence without nonce check**: the same approval authorises
two invocations.

**Fix**: the audit chain tracks consumed nonces per `(keyId,
snapshotId)` scope. Second redemption → `nonce-replay` finding →
denial. See [GRA § Nonce scope](../specs/GRA-audit-chain.md).

### P-05b · Nonce reuse across snapshots

**Scenario**: Same attacker captures a handle from `snapshotId: A`.
A rollback takes the system back to a prior snapshot. Does the old
nonce become reusable?

**Fix**: nonce scope is `(keyId, snapshotId)`. After rollback to
snapshot B, the nonce set resets relative to B's chain. But B's
chain is separate from A's — a nonce from A's chain doesn't collide
with B's. Worst case: attacker gets one replay per snapshot, audit
shows two independent approvals of the same call → detectable.

### P-06 · Content-hash bypass

**Scenario**: Attacker approves a harmless call, then substitutes
the `args` on redemption.

**Fix**: handle field 2 is `contentHash = sha256(canonicalize(args))`.
Runtime recomputes on redemption and compares. Mismatch →
`content-tampered`. See
[GRH § Binding validation](../specs/GRH-approval-handle.md).

## R5 cluster — runtime non-overridability

### P-R5-downgrade · `modify` attempting R5 → R3

**Scenario**: Provider returns `modify` that strips sensitive args,
hoping to bring the effective tier from R5 to R3.

**Fix**: tier is computed from the ORIGINAL args, not the modified
args. A `modify` that would cross a tier boundary is denied at
runtime with `tier-downgrade-attempt`.

### P-R5-failopen · `allow` on R5 outage

**Scenario**: Guardrail provider crashes. Host has `failMode: 'open'`
for R3 calls (correct). The same host receives an R5 call and applies
`failMode: 'open'` → R5 call proceeds without review.

**Fix**: `failMode` is tier-scoped. R5 is hardcoded to `closed` —
host config cannot override. Pre-merge registry guard rejects any
policy IR that attempts `failMode: 'open'` for an R5 tool. See
[GRR § Pre-merge registry guard](../specs/GRR-runtime.md).

### P-R5-external-only · `requiresExternalApproval` as substitute

**Scenario**: Policy author declares `allow` with
`requiresExternalApproval: true` for an R5 tool, thinking the
external approval is equivalent to review.

**Fix**: R5 requires `review`, full stop. `allow` is rejected at
compile time for R5 tools. The difference: `review` produces an
`ApprovalHandle` the runtime binds to the specific invocation;
`requiresExternalApproval` just sets a flag.
