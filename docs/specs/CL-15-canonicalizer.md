# CL-15 — Canonicalizer Byte-Identical Contract

**Status**: Draft
**Version**: 1.0
**Source**: Horus wave CP-5/6 (proposal §2 `/canonicalize`, §5 property 6)
**Atom**: `atom:canonicalizer` (C-NEW)
**Reviewer roles**: craft:architect, claws:platform-eng, craft:conformance
**Dependencies**: CL-07 (Deep Integration), CL-11 (Upstream Governance)
**Compliance scope**: Audit-chain integrity — canonicalization is load-bearing for content-addressable references and cross-platform reproducibility

---

## Abstract

This spec declares the byte-identical canonicalizer contract that `@openclaw/workspace/canonicalize` provides to three consumers: `@openclaw/policy` (PolicyIR → policyId), `@openclaw/snap` (workspace files → snapshotId), and `@openclaw/guardrails/audit` (AuditEntry before hashing). The contract is load-bearing for content-addressability, cross-OS reproducibility, and audit-chain integrity.

## Contract

### 1. Single canonicalizer

All three consumers MUST invoke the same canonicalization function from `@openclaw/workspace/canonicalize`. No package ships its own parallel canonicalizer. CI lint rule forbids `JSON.stringify` + ad-hoc key-sort in any `@openclaw/*` or `@bic/openclaw-*` package's runtime code (test code exempt).

### 2. Algorithm

The canonicalizer implements RFC 8785 JSON Canonicalization Scheme (JCS):
- UTF-8 encoded output
- Object keys sorted by UTF-16 code unit order (lexicographic on codepoints)
- No whitespace between tokens
- Numbers in shortest-round-trip form per IEEE 754 + ECMA-262 §6.1.6.1
- Strings use JSON standard escapes; no optional escapes

### 3. Byte-identical across platforms

For identical input, canonicalized output MUST be byte-identical across Linux x64, Windows x64, macOS arm64, and macOS x64. CI-enforced per-PR: the canonicalizer test suite runs on ubuntu-latest + windows-latest + macos-latest matrix and fails if any pair differs.

### 4. Byte-identical across consumers

For identical input, the same canonicalizer invoked from `@openclaw/policy`, `@openclaw/snap`, or `@openclaw/guardrails/audit` MUST produce byte-identical output. Enforced via L1 integration test: one input fixture, three invocation paths, byte-compare all pairs.

### 5. Versioning

Canonicalizer algorithm version is pinned in `@openclaw/workspace/canonicalize/package.json` as a peer-visible field (`canonicalizerAlgorithmVersion`). Major version bumps require coordinated migration across all consumers. A consumer MUST refuse to canonicalize against an algorithm version it doesn't support, emitting `CanonicalizerVersionMismatchError`.

### 6. Pre-hashing requirement

Any consumer that hashes canonicalized output (policy IR → policyId, workspace files → snapshotId, audit entry → hash-chain link) MUST:
- Canonicalize first
- Hash over the canonicalized bytes only
- Never hash over in-memory object representations (different serializations would produce different hashes for the same logical content)

## Interface

```typescript
export function canonicalize(value: unknown): Uint8Array;
export const canonicalizerAlgorithmVersion: 1;

export class CanonicalizerVersionMismatchError extends Error {
  constructor(
    public readonly expected: number,
    public readonly actual: number,
  ) {
    super(`Canonicalizer algorithm version mismatch: expected ${expected}, got ${actual}`);
  }
}
```

## Test tiers

- **L0 unit**: per-primitive canonicalization (object-key sort, number shortest-round-trip, string escape rules, UTF-8 encoding) — ~10 tests
- **L1 integration**: 3-consumer byte-identity (policy/snap/guardrails-audit on same input) — ~3 tests
- **L2 CI matrix**: ubuntu-latest + windows-latest + macos-latest, single fixture, byte-compare all pairs — 1 scenario (runs on main + PR-to-main only)

## Relation to other specs

- **CL-07 amendment** cites this spec for workspace file hashing (content-addressable references)
- **CL-11 amendment** cites this spec for audit-entry pre-hash canonicalization
- **Proposal §2** is the upstream source; this spec captures the in-repo obligation

## Upstream implication

When the upstream contribution wave files, `@openclaw/workspace/canonicalize` becomes the public API. Before that, `@bic/openclaw-workspace/canonicalize` is the implementation. Scope flip (Ra's `--scope` flag) does not change bytes.

---

## Evolution rules

- **Major bump** required: changing the canonicalization algorithm (e.g., RFC 8785 → some successor); changing the byte output for any input that prior versions canonicalized successfully; removing the version-mismatch error (`CanonicalizerVersionMismatchError`); removing the "byte-identical across platforms" or "byte-identical across consumers" invariants; removing the pre-hashing requirement.
- **Minor bump**: adding new input-type support (e.g., accepting a new JavaScript primitive class whose canonical bytes are defined additively); adding new optional invariants that strengthen platform-equivalence guarantees; adding new test-tier coverage categories; adding new error subtypes that are variants of `CanonicalizerVersionMismatchError`.
- **Patch**: documentation clarifications; example updates; wording fixes to error messages that do not change error class names; test-vector additions that exercise already-specified behaviour.
- **Tightening is MINOR**: adding a new platform to the CI matrix (L2) strengthens the "byte-identical across platforms" invariant without changing any accepted input's output. Similarly, adding a new consumer to the byte-identical-across-consumers L1 check tightens the matrix without changing bytes.
- **Coordinated-migration playbook**: a major version bump REQUIRES a deployment plan that publishes the new version additively alongside the old, negotiates version at consumer startup via a handshake RPC, flips all consumers in a single release window, and retires the old version in the following release. Spec text MUST include this playbook when a major bump is proposed.
