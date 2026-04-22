# Governance Approval Flow

**What this guide is**: how a governance decision (tool call or file ingest) moves from the agent through the gateway, a `GuardrailProvider`, the supervisor, and the companion app — with the 8-field `approvalHandle` that binds the request to the response, and the audit cross-links that let a verifier trace one call from compile time through approval.

## The decision moment

Every tool call hits OC-core's `before_tool_call` hook. The policy plugin's `GuardrailProvider.preAuthorize` runs; the plugin returns a hook-result; OC-core merges hook-results across all registered plugins (OC-7 envelope stickiness); if any returned `review`, the call stalls until the supervisor and companion app respond.

```
  Agent          Gateway         Provider        Supervisor      Companion
    │                │               │                │               │
    │──tool call────▶│               │                │               │
    │                │─before_tool──▶│                │               │
    │                │               │ preAuthorize   │               │
    │                │               │ → review +     │               │
    │                │               │   handle       │               │
    │                │               │─ApprovalReq───▶│               │
    │                │◀──requireApp──│                │──render──────▶│
    │◀──(stall)──────│               │                │               │ user reviews
    │                │               │                │               │ signs response
    │                │               │                │◀──response────│
    │                │               │◀─ApprovalResp──│               │
    │                │◀──resume──────│                │               │
    │◀──result───────│               │                │               │
    │                │               │─postAudit────────────▶ audit chain
```

File ingest is the same flow with `before_workspace_file_ingest` and `beforeIngest` — see [governance--file-ingest-review.md](./file-ingest-review.md).

## Decision vocabulary

| Verb | Meaning |
|------|---------|
| `allow` | Proceed as-is. Optional `requiresExternalApproval: true` still escalates. |
| `deny` | Reject with `reason`. No further processing; audited. |
| `review` | Route to supervisor with a signed `approvalHandle`. Call stalls. |
| `modify` | Rewrite `args` (tool call) or `redirectPath` (file ingest) before proceeding. |

Composition rule: `deny > review > modify > allow`. OC-7 merger makes `requireApproval` non-downgradable — once any provider sets it, it stays set for the decision lifetime, and the companion receives every `ApprovalDescriptor` the plugins emitted (conjunctive — all must be approved).

## The 8-field `approvalHandle`

Per proposal §1.5 Threading:

```ts
interface ApprovalHandle {
  providerId: string;        // which provider emitted the handle
  contentHash: string;       // sha256 of file bytes or tool args
  sequenceNumber: bigint;    // per-providerId, per-snapshot; closes replay-across-handles
  approverPrincipal: string; // expected approver identity
  keyId: string;             // HMAC key identifier from the trust set
  ttl: number;               // epoch-ms expiration
  nonce: string;             // random 128-bit, unique within (keyId, snapshotId)
  signature: string;         // HMAC over the canonicalized handle body
}
```

Verifier MUST check fields in this exact order: `providerId → contentHash → sequenceNumber → approverPrincipal → keyId → ttl → nonce`. First failure yields the `invalidReason` recorded on the `ApprovalEntry`.

Each field binds against a specific class of replay. `contentHash` prevents argument substitution between request and response. `sequenceNumber` prevents replay across handles. `keyId` supports rotation — old and new keys both accepted inside the overlap window, old one rejected after `notAfter`. `nonce` prevents replay within a scope.

## `ApprovalEntry.outcome` + `invalidReason`

Per the CL-11 amendment:

```ts
interface ApprovalEntry {
  type: 'approval';
  correlationId: string;     // matches DecisionEntry.correlationId
  handleId: string;
  approverPrincipal: string;
  outcome: 'approve' | 'deny' | 'timeout' | 'rejected';
  invalidReason?:            // present when outcome === 'rejected'
    | 'provider-id-mismatch'
    | 'content-hash-mismatch'
    | 'sequence-rollback'
    | 'principal-mismatch'
    | 'unknown-keyId'
    | 'ttl-expired'
    | 'nonce-reuse'
    | 'redirect-path-escape';
}
```

`approve` / `deny` are companion-driven outcomes. `timeout` fires when TTL passes with no response (R5 fail-closed invariant — always denies). `rejected` fires when the handle itself fails validation; `invalidReason` names the first-failing field.

## Cross-linking: compile → runtime → approval

Three audit entry types, two cross-link fields, one continuous chain per call.

```
  ProducerEntry              DecisionEntry              ApprovalEntry
  (compile time)             (runtime decide)           (supervisor response)
  ─────────────              ─────────────              ─────────────
  policyArtifactSha256 ──────policyArtifactSha256
  artifactName: 'policy-    │  correlationId: 'u-001' ─┐
    ir.json'               │  decision: 'review'       │
  snapshotId: 'snap-xyz'    │  effectiveTier: 'R5'     │
                            │                           └─▶ correlationId: 'u-001'
                                                           outcome: 'approve'
```

`policyArtifactSha256` joins a `DecisionEntry` to the `ProducerEntry` that emitted the compiled policy artifact under which the decision was made. A substituted plugin fails this link. `correlationId` joins `DecisionEntry` → `ApprovalEntry` 1:1 — no orphan approvals, no double-approved decisions.

`claws policy verify` asserts both links plus the hash chain.

## OC-7 envelope stickiness

Why it matters: without OC-7, a later plugin returning `allow` could override an earlier plugin's `review`. Every governance invariant would then depend on "our plugin is in the chain."

What OC-7 does: widens the hook-result `requireApproval` field from `boolean` to `boolean | ApprovalDescriptor | ApprovalDescriptor[]` and makes the merger non-downgradable. Once any plugin sets it, the flag sticks; the companion receives every `ApprovalDescriptor` emitted; every descriptor must be approved (conjunctive).

Harness coverage: `host-mock.ts` implements the same merger semantics OC-core will implement after OC-7 lands. Three L1 scenarios exercise it — single-provider latch, two-provider conjunctive, partial-approval stay-blocked.

OC-7 latches the **flag**, not the sensitivity label. Full "RESTRICTED never laundered" stickiness requires OC-9 (proposal §6.1, NOT shipping).

## Risk tier × sensitivity interaction

Effective tier is `max(declared tier, provenance-derived tier)`. RESTRICTED × any tier forces `requiresExternalApproval`; R5 never fail-open (generator rejects `failOpen: true` at compile time, plugin refuses `allow` at runtime); `IRREVERSIBLE_EXTERNAL` clamps to R5.

See [governance--decision-vocabulary.md § Risk tier × sensitivity interaction](./decision-vocabulary.md) for the authoritative two-path split (generator vs runtime), the R5-fail-open backstop, and the `IRREVERSIBLE_EXTERNAL` capability semantics.

## G-CHAIN propagation — generator-compiled

Proposal §5 property 1 row 2: sensitivity propagates through tool chains (G-CHAIN). clawc ships the **generator-compiled** form:

```
  TOOLS.md declares:
    summarize-secrets { args_from: [{ source: 'RESTRICTED-classifier' }] }

  claws policy generate compiles:
    policy-ir.json entry with effectiveSensitivity: 'RESTRICTED'

  Runtime enforces:
    preAuthorize → DecisionEntry.effectiveSensitivity === 'RESTRICTED'
    → requiresExternalApproval = true
```

This is distinct from OC-9 (hook-result envelope stickiness, proposal §6.1, first-class alternative). OC-9 makes the sensitivity label ride on hook-results and non-downgradable across plugin chains — that's **not shipping** in Horus. G-CHAIN gives us RESTRICTED-propagates-through-args-from within the compiled plugin; OC-9 gives us RESTRICTED-never-laundered across heterogeneous plugin chains. Only the former is ours to deliver.

## Cross-references

- [testing--e2e-harness.md](../testing/e2e-harness.md) — harness interface that exercises this flow
- [governance--file-ingest-review.md](./file-ingest-review.md) — symmetric peer path
- `docs/specs/CL-07-deep-integration.md` — `GuardrailProvider` + peer interfaces
- `docs/specs/CL-11-upstream-governance.md` — entry types, cross-link schema, trust set, sequence counter, nonce scope
- Proposal `openclaw-upstream-spec.md` §1.5 (async review), §1.6 (risk × sensitivity), §5 (security properties)
