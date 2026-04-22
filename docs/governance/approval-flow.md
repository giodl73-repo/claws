# Approval Flow — handle-binding Validation

<!-- atom:handle-binding -->
<!-- spec:CL-07 -->
<!-- spec:CL-11 -->

The claws governance boundary issues an `approvalHandle` per high-risk
tool call (R3+ per CL-02 §3) and requires the host to present it back on
redemption. The handle binds the decision to a specific caller, invocation,
and time window, and is signed HMAC-SHA256 by the companion. This document
is the canonical description of the redemption-side validator — the pure
library at `packages/openclaw-guardrails/src/handle-binding/` — and the
first-failing order it enforces.

## Surface

```ts
import {
  validateHandle,
  EVALUATION_ORDER,
  type ApprovalHandle,
  type ValidationContext,
  type ValidationDeps,
  type ValidationResult,
  type InvalidReason,
} from '@bic/openclaw-guardrails/handle-binding';
```

`validateHandle(handle, ctx, deps) -> { ok: true } | { ok: false, invalidReason }`
is a pure function. All effects are injected via `deps`:

- `clock: () => number` — host supplies epoch-ms (`Date.now` only in production wiring; tests inject a fake)
- `trustSet: ReadonlySet<string>` — currently trusted companion keyIds (pulse 50 drives live reloads)
- `keyLookup: (keyId) => Buffer | undefined` — HMAC key material by id
- `validateNonce: (nonce, scope) => boolean` — nonce-log freshness check (pulse 59 owns the persistent store)

## First-failing evaluation order

The validator evaluates the HMAC signature pre-check first, then **7 bound
fields** in deterministic order. On any single-field failure the
first-failing `invalidReason` is returned — never a composite, never an
array. This is the **canonical evaluation order**, duplicated verbatim in
CL-11 §3a, in `validator.ts::EVALUATION_ORDER`, and here:

```
signature → providerId → contentHash → sequenceNumber → approverPrincipal → keyId → ttl → nonce
```

| # | Step            | Failure `invalidReason`     | What it checks                                                            |
|---|-----------------|-----------------------------|---------------------------------------------------------------------------|
| 1 | signature       | `signature-mismatch`        | HMAC-SHA256 over `payload` with the trusted key for `keyId`               |
|   | (pre-check)     | `unknown-keyId`             | `keyId` in `trustSet` and registered in the lookup                        |
| 2 | providerId      | `provider-id-mismatch`      | `handle.providerId === ctx.expectedProviderId`                            |
| 3 | contentHash     | `content-hash-mismatch`     | `handle.contentHash === ctx.canonicalInvocationHash` (P-02, host-supplied) |
| 4 | sequenceNumber  | `sequence-rollback`         | `handle.sequenceNumber > ctx.sequenceHighWaterMark`                       |
| 5 | approverPrincipal | `principal-mismatch`      | `handle.approverPrincipal === ctx.expectedApproverPrincipal`              |
| 6 | keyId           | `unknown-keyId`             | `deps.trustSet.has(handle.keyId)`                                         |
| 7 | ttl             | `ttl-expired`               | `deps.clock() < handle.ttl` (absolute expiry in epoch-ms)                 |
| 8 | nonce           | `nonce-reuse`               | `deps.validateNonce(handle.nonce, ctx.nonceScope)` returns `true`         |

### Wording convention

"7 bound fields + signature pre-check" is the canonical phrasing. The
combined count is 8 *evaluation steps*, but the validator has **7 bound
fields** — the signature is a pre-check, not a bound field. This framing
applies across pulses 38, 49, 57-59 and CP-6 Q#1 (R1 type-system
F-03/F-09).

## Why the order is fixed

The order is load-bearing, not cosmetic. Pulse 59 SC-24 asserts a
property: for the 21 pairs (`C(7, 2)`) of wrong bound fields, the
`invalidReason` returned is always the one at the lower index. This
lets callers treat `invalidReason` as a stable signal — the same input
always produces the same reason. Changing the order without updating
pulse 59's property test and the three synchronized documentation sites
is a breaking change.

## Approval vs decision invalid reasons

`ApprovalInvalidReason` (this validator) is a separate enumeration from
`DecisionInvalidReason` (7-value union set by the merger + path-ingest
checks in pulses 37 and 56). Approval reasons are emitted by the
redemption-side validator; decision reasons are emitted upstream by the
OC-7 merger when authorizing the tool call itself.

## Doc-sync invariant

Any change to the evaluation order must land in all three places in the
same commit:

1. `packages/openclaw-guardrails/src/handle-binding/validator.ts`
   (`EVALUATION_ORDER` export + ordered `if`-ladder)
2. `docs/specs/CL-11-upstream-governance.md` §3a (the spec amendment
   this pulse codifies)
3. `docs/governance/approval-flow.md` (this file)

Pulse 49 commits all three in lockstep. The wave-scope spec amendment in
item 2 lands when CL-11 §3a is merged into the canonical spec during
CP-5 wave deployment.
