# Scenario — `snap promote` Precondition + 409 Matrix

**Pulse**: Ra P45 (CP-9)
**Plan**: `claws-pre-extraction-packaging`
**Governing roles**: `craft:architect`, `craft:security`, `claws:gateway-eng`
**Scope**: end-to-end `POST /v1/snapshots/:id/promote` — generate PolicyIR via `@openclaw/policy`, compute `policyId` via `@openclaw/workspace/canonicalize`, bundle into a snapshot, upload, promote, audit. Probe the coupling between client-side `policyId` (set in `.openclaw/policy/policy-ir.json`) and server-side re-computation at promote time.

---

## Fixture — Waffles workspace

Minimal policy snapshot used as the walk-through:

```json
{
  "version": "1.0.0",
  "policyId": "sha256-__COMPUTED_AT_GENERATE__",
  "soul":  { "denyRules": [{ "id": "no-public-post", "pattern": "post-to-channel", "reason": "ask first" }],
             "modelAllowlist": ["claude-opus-4-7"], "tone": "friendly" },
  "user":  { "oboScope": ["waffles@team"], "authorityBounds": [] },
  "agents": { "delegationMap": {}, "architectureBoundaries": [] },
  "tools": [{ "name": "post-to-channel", "riskLevel": 5,
              "capabilities": ["COMMUNICATE", "IRREVERSIBLE_EXTERNAL"],
              "argsFrom": { "message": ["user_prompt"], "channel": ["user_prompt"] } }],
  "skills": [],
  "governance": { "rules": [], "sensitivityPropagation": [] },
  "identity": { "name": "waffles" }
}
```

Let **`policyId_client = canonicalHash(PolicyIR_without_policyId_or_canonicalizerVersion_fields)`** be the value the generator writes back into the `policyId` field (computed over the IR with both the `policyId` and `canonicalizerVersion` keys stripped — `canonicalHash` emits the `sha256-<base64url>` prefix directly; see Finding F1).

Pre-computed expected: `policyId = sha256-a8b4…e2f1` (stand-in — real bytes emitted by the conformance test suite in P44; note hyphen + base64url prefix per workspace.md §`canonicalHash`).

Snapshot bundle is the workspace directory: `SOUL.md`, `TOOLS.md`, `USER.md`, `AGENTS.md`, `IDENTITY.md`, plus `.openclaw/policy/policy-ir.json`, `.openclaw/policy/gateway-plugin.ts`, `.openclaw/policy/audit-manifest.json`. `snapshotId = sha256(canonical(files))` is computed by snap on upload.

---

## Walk-through — byte-parity at promote time

```
1. Host runs `openclaw policy generate` in workspace
   → writes .openclaw/policy/policy-ir.json with policyId = policyId_client

2. Host runs `openclaw snap upload`
   → POST /v1/snapshots with the bundle
   → server canonicalizes files, returns { id: snapshotId, status: 'draft' }

3. Host runs `openclaw snap promote {snapshotId}`
   → POST /v1/snapshots/{snapshotId}/promote
   → server:
      a. fetches snapshot
      b. reads .openclaw/policy/policy-ir.json
      c. safeParse(bytes, {maxDepth:100}) → PolicyIR_server
         (per workspace.md §/canonicalize C-15; direct JSON.parse is a spec violation)
      d. extracts declared_policyId = PolicyIR_server.policyId
      e. strips policyId field, canonicalize(remainder), sha256
         → policyId_recomputed
      f. assert declared_policyId === policyId_recomputed
         PASS → transition to 'current', emit audit event
         FAIL → 409 POLICY_IR_INCONSISTENT

4. Audit event emitted:
   { category: 'snapshot_promote',
     snapshotId: 'sha256-…',
     policyId:   'sha256-a8b4…e2f1',
     promotedBy: 'user@host',
     promotedAt: '2026-04-18T12:00:00Z' }
```

Byte-parity holds iff steps 3e and the generator's own `policyId` computation use **the same canonicalization bytes** — i.e., both traverse the same strip-policyId-before-hashing convention and both call `@openclaw/workspace/canonicalize` at the same major version.

---

## 409 Response-Code Matrix

All 4xx/409 responses use the unified `SnapError` envelope (see F2 / `snap.md` §Fail-closed postures): `{ code, message, details?, snapshotId? }`. The `Body` column below shows the `details` payload only — `code` is the tuple column, `message` is a ≤200-char human-readable string per the `toSnapError` helper contract.

| Condition | Status | Code | Details |
|---|---|---|---|
| `.openclaw/policy/policy-ir.json` missing, `promotion.requirePolicy` default (`true`) | 409 | `POLICY_NOT_GENERATED` | `{ path: '.openclaw/policy/policy-ir.json' }` |
| `policy-ir.json` present, not valid JSON / not parseable | 409 | `POLICY_IR_MALFORMED` | `{ line, column, snippet }` (snippet ≤200 chars, no file path) |
| `policy-ir.json` parses, declared `policyId` ≠ recomputed `policyId` | 409 | `POLICY_IR_INCONSISTENT` | `{ declared, recomputed }` |
| `.openclaw/policy/policy-ir.json` missing, `promotion.requirePolicy: false` | 200 | — | `{ promotedAt }` (precondition skipped) |
| `policy-ir.json` `canonicalizerVersion` outside server's supported set (checked at upload AND promote per F4) | 400 (upload) / 409 (promote) | `POLICY_IR_VERSION_UNSUPPORTED` | `{ supported: [..], declared }` |
| Snapshot id unknown | 404 | `SNAPSHOT_NOT_FOUND` | `{ id }` |
| Caller lacks promote authority | 403 | `FORBIDDEN` | `{}` |
| `Idempotency-Key` header missing on state-mutating call (per F9) | 400 | `IDEMPOTENCY_KEY_REQUIRED` | `{}` |
| `authContext` closure unavailable mid-lifetime (per F3) | 503 | `AUTH_CONTEXT_UNAVAILABLE` | `{ since?: string }` |

---

## Findings

### F1 — `policyId` self-hashing convention is unspecified (Major · security, architect)

**Observation.** `policyId = sha256(canonical(PolicyIR))` per `policy.md`, but `PolicyIR` itself contains the `policyId` field. The spec does not say whether the hash is computed:
  (a) over the IR with `policyId` omitted,
  (b) over the IR with `policyId` set to `""`,
  (c) over the IR with `policyId` set to a sentinel,
  (d) or some wrapper type that separates hash input from hash output.

Any generator implementation picks one; the server picks one; they must match exactly or every promote fails with `409 POLICY_IR_INCONSISTENT`.

**Why this is Major.** This is a silent interop footgun. Two conforming implementations of `@openclaw/policy` can produce snapshots that no `@openclaw/snap` will ever promote. The bug surfaces only end-to-end, not in unit tests of either package.

**Resolution.** Amend `policy.md` §PolicyIR to mandate convention (a), with concrete pseudocode:

```ts
// normative
function computePolicyId(ir: PolicyIR): string {
  // Strip BOTH self-referential fields before hashing:
  //  - policyId: the output, must not participate in its own input (F1).
  //  - canonicalizerVersion: diagnostic handshake field (F4); if it participated
  //    in the hash, every canonicalizer patch-bump would silently rotate every
  //    policyId across the fleet — the exact drift F4's version lock is meant
  //    to detect, hidden behind a value change.
  const { policyId: _p, canonicalizerVersion: _v, ...rest } = ir;
  return canonicalHash(rest);   // canonicalHash emits `sha256-<base64url>` per workspace.md
}
```

Note on prefix: `canonicalHash` (per `workspace.md` §`canonicalHash`) already emits the `sha256-<base64url>` (multibase-style, hyphen) prefix. Consumers MUST NOT re-prefix with `'sha256:'` — doing so produces `sha256:sha256-<base64url>`, which is non-conformant and fails the `/^sha256-[A-Za-z0-9_-]+$/` regex the CP-10 conformance test asserts. The stripped-fields set for `computePolicyId` input is: `{ policyId, canonicalizerVersion }` — document in the `policy.md` §PolicyIR rules table.

Add a conformance vector (fixed IR → expected `sha256-<base64url>` string) to the `@openclaw/workspace/canonicalize` test suite so every consumer (policy generator, snap server, third-party tooling) passes the same bytes. The vector MUST exercise an IR with `canonicalizerVersion` present to prove all consumers strip identically.

**Amendment target**: `docs/claws/proposals/openclaw-upstream/policy.md` §PolicyIR + `snap.md` §Promotion preconditions (cross-ref).

---

### F2 — Error body contract for 409 codes is undefined (Major · gateway-eng, security)

**Observation.** `snap.md` §Semantics lists 409 codes by name (`POLICY_NOT_GENERATED`, `POLICY_IR_MALFORMED`, `POLICY_IR_INCONSISTENT`) but does not specify the response body shape. A CLI or review-UI integrator can't render a useful error without the body contract. Current implementations will ship three incompatible shapes.

**Why this is Major.** The gateway-eng role covers integrator perspective: every OC supervisor app, SIEM connector, and CLI error formatter has to branch on `code` to render actionable messaging. Undefined bodies → each integrator reverse-engineers a different impl.

**Resolution.** Amend `snap.md` §Uploading + §Promotion + §Rollback + §Fail-closed postures with a **unified** normative ResponseError schema shared across all snap 4xx responses — not a promote-specific fork. Snap already returns `400 SNAPSHOT_MALFORMED` and `400 SNAPSHOT_ID_MISMATCH` from upload without a defined body; the F2 amendment must cover those plus promote + rollback + resolve under one envelope so integrator error-formatters switch on `code`, not on endpoint:

```ts
// Canonical envelope for every snap 4xx/409 response.
// Applied uniformly across /snapshots (upload), /promote, /rollback, /resolve.
export interface SnapError {
  code:
    // Upload (§Uploading)
    | 'SNAPSHOT_MALFORMED' | 'SNAPSHOT_ID_MISMATCH' | 'POLICY_ID_MISMATCH'
    // Promote (§Promotion)
    | 'POLICY_NOT_GENERATED' | 'POLICY_IR_MALFORMED'
    | 'POLICY_IR_INCONSISTENT' | 'POLICY_IR_VERSION_UNSUPPORTED'
    // Identity / auth
    | 'FORBIDDEN' | 'IDEMPOTENCY_KEY_REQUIRED'
    // Resolution
    | 'SNAPSHOT_NOT_FOUND';
  message: string;                     // human-readable, no secrets, ≤200 chars
  details?: Record<string, unknown>;   // per-code payload (see matrix)
  snapshotId?: string;                 // always populated when a snapshot is in scope
}
```

Retained alias: `PromoteError = SnapError` (type-only re-export) for CP-10 callers that already reference it; no runtime divergence. All state-mutating endpoints (upload, promote, rollback) return bodies of this shape on 4xx. All 5xx responses are server-health conditions (see F3) and share the same envelope shape.

**Security requirement — error funnel.** To prevent SyntaxError/Ajv/Zod/TypeError leaks of file paths or attacker-controlled bytes, ALL error-producing code paths (not just the named codes above) MUST route through a single helper:

```ts
// normative (internal)
function toSnapError(err: unknown, errContext: ErrContext): SnapError {
  // (i) truncate message to ≤200 chars
  // (ii) strip any absolute path matching /^(\/|[A-Z]:\\)/
  // (iii) redact bearer/secret patterns
  // (iv) allow `code` only from the closed enum above; default 'SNAPSHOT_MALFORMED'
  // ...
}
```

`message` and `details` must not include **raw file content** from `policy-ir.json` beyond a short snippet (≤200 chars) and must never include any environment path outside the snapshot. Malformed-input responses must not reflect attacker-controlled bytes into logs verbatim; the funnel truncates and escapes. Fuzz the helper: 1000 random byte sequences as `policy-ir.json`, assert no path or secret substring leaks in any emitted `SnapError`.

**Amendment target**: `snap.md` §Uploading + §Promotion + §Rollback + §Fail-closed postures (unified envelope note).

---

### F3 — `promotion.requirePolicy: false` escape needs identity guard (Major · security, gateway-eng)

**Observation.** `snap.md` says hosts running snap as a pure workspace-history service set `promotion.requirePolicy: false` in server config to skip the precondition entirely. The spec treats this as server-level config, but does not require authentication on the escape path. Implication: a server configured without `authContext` AND `promotion.requirePolicy: false` will let any caller promote any snapshot into `current`.

**Why this is Major.** Fail-closed posture is the governance boundary's reason for existing. A server-level flag that bypasses that boundary with no identity guard is a credential-free `current`-pointer hijack. Matches the security-role lens: "If a feature requires an unsafe default, the feature ships without the default."

**Resolution.** Amend `snap.md` §Auth is pluggable + §Promotion:

1. `authContext` MUST be configured when `promotion.requirePolicy: false`. Startup rejects with a config error otherwise.
2. Document the combined posture as a **two-axis matrix**: `(authContext: required | optional) × (requirePolicy: true | false)` — with the `(optional, false)` cell called out as "read-only deployments only; server will refuse to start on any state-mutating endpoint call."
3. Every `promote` call under `requirePolicy: false` records `promotionPolicy: 'bypassed'` in the audit event so post-hoc compliance review can filter.
4. **Per-request principal assertion (security — closes mid-lifetime rotation hole).** Startup config checks are insufficient: `authContext` is a closure that typically wraps OIDC discovery or a secret-backed JWT validator. If the discovery endpoint goes empty or the validator's backing secret rotates to a missing value mid-lifetime, `authContext` silently returns `{ principal: '' }` or throws — and `requirePolicy: false` would let the request through against a credential-free caller. Every state-mutating request (upload, promote, rollback) MUST re-assert `principal !== '' && principal !== undefined` per-call, returning `503 AUTH_CONTEXT_UNAVAILABLE` (not 401, which implies caller fault — this is server health) if the assertion fails. Expose `authContext` readiness via `GET /v1/healthz` so load balancers drain drifting instances. Log `authContext.freshness: <seconds-since-last-successful-validation>` on every `promotionPolicy: 'bypassed'` audit event so post-hoc compliance review can spot the rotation window.

**Amendment target**: `snap.md` §Promotion + §Auth is pluggable (per-request principal assertion + 503 AUTH_CONTEXT_UNAVAILABLE).

---

### F4 — Promote-time canonicalizer version drift can silently wedge an entire fleet (Major · architect, gateway-eng)

**Observation.** Generator at host A ships with `@openclaw/workspace@1.3.0`. Snap server ships with `@openclaw/workspace@1.4.0`. Both versions claim RFC 8785 compliance; the 1.4.0 release notes say "bug fix: stricter UTF-16 lexicographic ordering in rare code-point edge cases." Per `workspace.md`: "Any change that alters output bytes for any valid input is a major bump — even bug fix changes." So 1.3.0 → 1.4.0 should have been a major. If it was mis-released as a minor, every host on 1.3.0 produces snapshots that fail promote at 1.4.0 servers with `POLICY_IR_INCONSISTENT`, with no useful diagnostic.

**Why this is Major.** This is the coupling the spec names explicitly ("one named coupling" in `snap.md`) and the failure mode is fleet-wide + silent. The architect-role lens covers layered-boundary enforcement: the canonicalizer-version constraint is the load-bearing invariant and needs explicit runtime surfacing, not trust in release discipline.

**Resolution.** Four amendments:

1. **Handshake — at BOTH upload and promote (shift-left).** `policy-ir.json` embeds the `CANONICALIZER_VERSION` used at generate time (top-level `canonicalizerVersion: string` field). Server runs the version check at **upload** (rejects pre-storage with `400 POLICY_IR_VERSION_UNSUPPORTED` under the unified `SnapError` envelope — no `draft` created, no storage exhaustion vector from spammed incompatible uploads filling disk as un-promotable drafts) AND at **promote** (catches server-upgrade crossings where a snapshot uploaded under 1.x is later promoted against a 2.x server). Matches F8's `X-Expected-Policy-Id` upload-gate shift-left pattern.
2. **Diagnostic-vs-security framing.** `canonicalizerVersion` is a **diagnostic** field, not a security field — the authoritative integrity check remains the byte recomputation (F1). When bytes mismatch AND versions also mismatch, server MUST return `POLICY_IR_VERSION_UNSUPPORTED` (more actionable — "upgrade your server/client") rather than `POLICY_IR_INCONSISTENT` ("your IR was tampered"); the former directs the operator to the real fix, the latter triggers a tamper-investigation runbook.
3. **Minor-bump discipline.** Reinforce in `workspace.md` §Versioning that a minor-bump that changes bytes is an SDL-level release error; CI gate runs the cross-platform determinism vector suite on every PR to `@openclaw/workspace`.
4. **Diagnostic path.** Expose `GET /v1/healthz` to include `{ canonicalizerVersion }` so integrators can pre-flight compatibility without attempting a promote.

**Amendment target**: `snap.md` §Uploading + §Promotion (dual version-check gates) + `policy.md` §PolicyIR (add `canonicalizerVersion` field; document it's stripped by `computePolicyId`) + `workspace.md` §Versioning (reinforce byte-stability).

---

### F5 — No code for "PolicyIR major version unsupported" distinct from self-inconsistency (Warning · gateway-eng)

**Observation.** Spec currently bundles "IR doesn't canonicalize the same way" into `POLICY_IR_INCONSISTENT`. A `PolicyIR.version: 2.x` IR landing at a server that only understands 1.x will hash-mismatch even with an honest client — but the *reason* is a major-version skew, not a tampered hash. The integrator can't distinguish "upgrade your snap server" from "your policy was manipulated."

**Why Warning.** Wrong exit code → wrong runbook. This is the gateway-eng lens: a runbook that says "rotate the promoter's key" when the real fix is "upgrade the server" wastes incident time.

**Resolution.** Add `POLICY_IR_VERSION_UNSUPPORTED` to the 409 taxonomy (see matrix row above). Server checks `PolicyIR.version` major against supported set **before** re-canonicalizing. Return the version-specific code; only fall through to `POLICY_IR_INCONSISTENT` if versions align but bytes don't.

**Amendment target**: `snap.md` §Promotion §Fail-closed postures — extend code list.

---

### F6 — Audit event shape for promote is underspecified (Warning · architect, security)

**Observation.** Main spec §6 OC-5 names the audit category `snapshot_promote`; `snap.md` §Promotion is the governance boundary but does not specify the event body beyond what's implied. The pulse plan deliverable calls for `{ category, policyId, snapshotId, promotedBy }` but the spec text doesn't lock this.

**Why Warning.** Compliance rubrics (`@openclaw/policy` `evaluateCompliance` dynamic checks) depend on stable event shape. If snap implementations diverge on field names (`promotedBy` vs `principal` vs `actor`), the rubric's audit-correlation evidence breaks.

**Resolution.** Amend `snap.md` §Promotion to normatively specify:

```ts
interface SnapshotPromoteEvent {
  category: 'snapshot_promote';
  snapshotId: string;             // promoted snapshot
  parentId?: string;              // prior current (if any) now 'superseded'
  policyId?: string;              // from .openclaw/policy/policy-ir.json; absent if requirePolicy: false and no IR
  promotedBy: string;             // principal from authContext
  promotedAt: string;             // ISO-8601 UTC
  promotionPolicy: 'enforced' | 'bypassed';   // see F3
  tenant?: string;                // from authContext
  canonicalizerVersion?: string;  // see F4
}
```

Cross-reference into `@openclaw/guardrails/audit` so verifyAudit chain semantics are unchanged.

**Amendment target**: `snap.md` §Promotion + cross-ref in `guardrails.md` §Audit.

---

### F7 — Rollback shares the precondition path but is absent from the matrix (Warning · architect)

**Observation.** `snap.md` §Rollback says "same audit category, same preconditions." If rollback replays the full 409 matrix, a rollback target that happens to pre-date generator v2 could get stuck — the target snapshot's `policy-ir.json` was valid when originally promoted but its canonicalizer version is now unsupported. This turns rollback (a recovery path) into a non-recovery path.

**Why Warning.** Breaks the recovery guarantee snap advertises. The architect-role lens: "if the only path to roll back is 'upgrade the policy generator and re-promote the old state,' rollback isn't actually a rollback." gateway-eng lens: post-upgrade 10-restart scenario cited in role description becomes un-recoverable.

**Resolution.** Amend `snap.md` §Rollback to:
1. Split the precondition: rollback **must** verify the snapshot exists + caller has authority + (if `requirePolicy: true`) `policy-ir.json` is syntactically parseable.
2. Rollback **does not** re-verify `policyId` self-consistency (the hash was verified at original promote; re-verifying now imposes forward-only version compatibility).
3. Rollback **does not** reject on `canonicalizerVersion` mismatch from F4 — it emits a `snapshot_rollback_canonicalizer_downgrade` audit signal but proceeds.

**Amendment target**: `snap.md` §Rollback — explicit precondition subset.

---

### F8 — `X-Expected-Snapshot-Id` header does not compose with `policyId` verification (Warning · security)

**Observation.** `snap.md` §Uploading says a client can pass `X-Expected-Snapshot-Id` to detect payload corruption on upload. There is no analogous `X-Expected-Policy-Id` — the client cannot assert at upload time "the IR I included hashes to this policyId." Result: corruption between generate and upload is not detected until promote, possibly hours or a review cycle later.

**Why Warning.** Shift-left principle: catch bad bytes at upload rather than at the governance boundary. Lower severity than F1/F4 because promote eventually catches it — but a delayed detection invalidates the review-flow staging use case (snap.md §Motivation: "staging area reviewable by humans before promotion").

**Resolution.** Add optional `X-Expected-Policy-Id` header on `POST /v1/snapshots`. If present, server parses the bundle's `policy-ir.json`, recomputes `policyId`, compares. Mismatch returns `400 POLICY_ID_MISMATCH` — pre-storage, so no `draft` snapshot is created. Security-role bonus: the client-asserted `policyId` is logged on upload audit (`snapshot_upload` event) so a review UI can show "uploader *claimed* this IR; server verified it matches."

**Amendment target**: `snap.md` §Uploading + §Fail-closed postures.

---

### F9 — Promote is not idempotent on the error path (Warning · gateway-eng)

**Observation.** `snap.md` does not specify idempotency for promote. Two consecutive `POST /promote` on the same `snapshotId` — first succeeds, second arrives during the audit-sink flush race. Current shape: second call either succeeds (no-op, good) or conflicts (what status code?). If a load balancer retries on 5xx from the first call's audit sink, the behavior is impl-defined.

**Why Warning.** Operational. Retries are normal in HTTP. The gateway-eng lens: "What happens when this hook throws?" extends to "What happens when the client retries?"

**Resolution.** Amend `snap.md` §Promotion:
- State-mutating endpoints (`POST /snapshots/:id/promote`, `POST /snapshots/:id/rollback`) MUST require a client-supplied `Idempotency-Key` header per RFC 9457 / Stripe convention. Missing header returns `400 IDEMPOTENCY_KEY_REQUIRED` under the unified `SnapError` envelope. (Dedup-at-audit-sink on `(snapshotId, promotedAt)` is insufficient: `promotedAt` is server-generated, so a retry after a transient 5xx from the first call's audit-sink flush can emit two timestamps for the same logical promotion — breaking the guardrails/audit invariant "every state transition = exactly one event".)
- Server persists `idempotency_key → first_response` for ≥24h. Retries return the cached response including the original `promotedAt` and produce NO additional audit event. Dedup key at the handler boundary: `(snapshotId, idempotency_key)` — client-controlled, not server-generated.
- Promote is **idempotent on the success path**: re-promoting a snapshot already `current` (with the same `Idempotency-Key`) returns `200 { promotedAt: <original-timestamp>, alreadyCurrent: true }`, no new audit event.
- Promote is **not idempotent on the failure path**: retrying a `409 POLICY_IR_INCONSISTENT` with the same key returns the cached failure; with a fresh key re-runs the check (if the snapshot was re-uploaded with corrected IR between retries — impossible since content-addressed — the caller must have uploaded a new snapshot, the new call resolves against the new bytes).
- Server MUST generate a single audit event per successful state transition (moving to `current`), even under retry — dedup enforced at the handler via `(snapshotId, idempotency_key)`, not at the audit sink.

**Amendment target**: `snap.md` §Promotion — new §Idempotency subsection (Idempotency-Key header required, handler-boundary dedup).

---

### F10 — Canonicalize-before-hash is vulnerable to PolicyIR extension-slot abuse (Note · security)

**Observation.** `policy.md` §Open items proposes `extensions?: Record<string, unknown>` for org-specific fields. If added, any extension payload participates in the `policyId` hash (because extensions are part of the IR). A large extension payload → a legitimate IR with megabytes of `extensions` content → `snap promote` does a full canonicalize + hash per request. DoS-lite: a malicious generator inflates extensions to make every promote slow.

**Why Note.** Conditional on F10's extension proposal being accepted. Severity low because promote is low-QPS (governance boundary, not hot path), and gateway-eng lens cites 50ms budget for request-path governance — promote is not request-path.

**Resolution.** If extensions land, amend `policy.md` to cap extension byte-size (proposed: 64KB per extension key, 256KB total), enforced at generate time (generator rejects) and at promote time (server returns `409 POLICY_IR_EXTENSIONS_OVERSIZE`). No-op if extensions are deferred.

**Amendment target**: `policy.md` §Open items — add size-cap to the extension proposal before acceptance.

---

## Summary

10 findings — 4 Major, 5 Warning, 1 Note. All Major/Warning findings have explicit resolution paths. Findings F1–F6 amend `snap.md` or `policy.md` within this pulse per the Spec Amendment Absorption rule; F7–F9 extend `snap.md` §Promotion; F10 is gated on an open-items decision and amends conditionally.

**Canonical coupling closed**: F1 (self-hashing convention) + F4 (canonicalizer version handshake) together ensure client and server compute the same `policyId` bytes.
**Fail-closed escape audited**: F3 ensures `requirePolicy: false` cannot silently bypass governance.
**Response-code matrix complete**: F2 (body contract) + F5 (version-unsupported code) + F9 (idempotency) lock the 409 surface.
**Audit integrity**: F6 normalizes the event body so compliance rubrics survive across implementations.
