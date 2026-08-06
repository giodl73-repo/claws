# EnterpriseClaw B-to-A Promotion Audit - 2026-08-02

## Decision

The 25-contract strengthening pass promotes 18 contracts and retains seven at
B. The resulting portfolio is:

| Grade | Count |
| --- | ---: |
| A | 28 |
| B | 7 |
| C | 0 |
| D | 0 |

Promotion uses the portfolio definition of A: audited current source plus at
least one representative accepted proof and one representative failure proof.
It does not mean target-complete, evidence-ready, construction-ready, or ready
to file upstream.

The audited OpenClaw baseline was
`C:\src\openclaw-design-audit@bde1602e6e86fd91dd0bec3aae714e059e556c4d`.
The EC-026 Rust proof was also inspected in
`C:\src\openclaw-rust-node@bde1602e6e86fd91dd0bec3aae714e059e556c4d`;
its proof files remain untracked working-tree content.

## Promoted Contracts

| Contract | Representative current source | Representative accepted/failure proof | Target gap retained |
| --- | --- | --- | --- |
| EC-002 | `src/flows/doctor-repair-flow.ts`; Policy Doctor repair metadata and automatic repairs | Repair plus validation and dry-run preview; thrown/unsafe repair remains a finding | Durable plan identity, preview/apply correlation, rollback settlement |
| EC-003 | Execution auth binding, credential fingerprint, runtime snapshot, and retry rotation paths | Stable-principal refresh accepted; unresolved or replaced owners and stale runtime leases fenced | Durable non-secret binding and restart reconciliation |
| EC-004 | Before-tool-call policy/approval and canonical Gateway approval handlers | Recorded canonical winner accepted; malformed or expired verdict fails closed | Normalized review/modify bound to intent, risk, and policy generations |
| EC-005 | Device/node pairing, registry invalidation, and revocation paths | Scope-valid token revocation accepted; invalid scope rejected and live node tools retired | Portable propagation identity and federated trust generations |
| EC-011 | Model fallback runner, model-call diagnostic events, and usage accumulator | Overloaded primary falls back; all-overloaded candidates return bounded failure | Durable candidate-attempt identity and per-candidate settlement |
| EC-012 | Usage accumulator and provider usage loading | Multiple calls accumulate; rejected/unsupported provider snapshots remain explicit | Identity-based delayed provider reconciliation |
| EC-013 | OpenClaw-owned tools, MCP runtime, tool adapter, and effective MCP catalog | Filtered local/MCP surface executes; policy block or invalid schema fails closed | Stable negotiated-surface identity and explicit degraded states |
| EC-014 | Tool gating, message delivery idempotency, diagnostic events, and audit events | Explicit send/idempotency behavior accepted; invalid input and unavailable outcomes remain explicit | Durable authority-to-effect correlation and portable certainty |
| EC-015 | Conversation resolution, route projection, and conversation binding | Provider-native conversation/parent identity preserved; provider rejection blocks fallback | Durable route-generation provenance and copy lifecycle correlation |
| EC-016 | Conversation delivery store, durable delivery, queue recovery, and channel delivery | Restart recovery and provider receipts accepted; unknown or partial outcomes do not authorize blind replay | Portable operation/native-attempt identity and mixed replay profiles |
| EC-017 | Session export, delete lifecycle, archive compression, and session manager | Export creates a copy; main/stale deletion is guarded and ordinary deletion archives | Source-generation export identity and retained-copy settlement |
| EC-018 | Attempt prompt context, runtime context prompt, context-engine lifecycle, and window guard | Hidden runtime context remains outside transcript; invalid assembly fails or falls back safely | Per-input provenance and explicit omitted-source export |
| EC-019 | Session-search visibility, memory path provenance, and LanceDB store | In-scope retrieval accepted; cross-agent/unscoped legacy retrieval denied | Revocation propagation through derived caches and indexes |
| EC-020 | Memory source sync, database publication, and QMD session export | Cleanup/migration accepted; stale shadow publication and incomplete rebuild are fenced | Aggregate settlement across every retained copy |
| EC-023 | ACP translator/replay, event ledger, and parent stream | Ordered replay and scoped cancellation accepted; another session sharing a key is not aborted | Owner-declared replay authority and semantic-settlement separation |
| EC-024 | Node pairing methods, pairing store, node registry, and dispatch path | Commandless pairing accepted; changed pairing generation or route rejects dispatch | Offline revocation convergence and portable trust evidence |
| EC-025 | Node invoke methods, registry, invoke stream, and wake path | Valid invocation/wake accepted; timeout, disconnect, late result, route change, and replaced pairing are fenced | Portable remote-effect certainty and durable route/policy correlation |
| EC-028 | Plugin manifest/install scan/commit and Claw provenance | Immutable official source can pass operator policy; policy block or post-plan provenance change rejects | Signed publisher/build provenance, SBOM, transparency, and portable revocation |

## Contracts Remaining B

| Contract | Strongest current evidence | Why A is not justified | Cheapest decisive proof |
| --- | --- | --- | --- |
| EC-001 | Unlike owners expose identity, generation, freshness, reason, certainty, and evidence facts | No representative shared cross-owner projection envelope accepted/failure fixture | Adapt configuration, readiness, and release into one versioned envelope and reject stale/incompatible projection |
| EC-021 | Per-owner SQLite snapshot, verify, atomic publication, and fresh restore | Cross-owner coordinator evidence remains design/fork weighted; no current mixed-generation or partial-settlement proof | Restore two owners with one incompatible checkpoint and block mixed admission |
| EC-022 | TypeScript role-specific min/max negotiation and structured mismatch tests | No language-neutral cross-implementation fixture or explicit support/removal window | Run adjacent-version TypeScript/Rust connect, upgrade, and downgrade from one manifest |
| EC-026 | Local Rust validator accepts one connect/invoke shape and rejects unsupported/missing-idempotency cases | Proof is untracked and side-effect-free; no live Gateway, authority, migration, release, or deletion evidence | Commit the fixture set and connect one disposable Gateway through one pre-admission Rust route |
| EC-027 | Plugin-first manifests, bundled metadata, install records, precedence, and scan blocks | No cross-family stable definition identity or fail-closed unknown-required metadata proof | Reject one unknown required key on a shared inert definition surface |
| EC-031 | Owner-local Cron admission, worktree leases/locks, stale-holder fencing, and usage observations | No durable restart-portable quota/lease identity or cross-node reconciliation | Persist, exhaust, restart, and reconcile one bounded lease |
| EC-034 | Fleet per-cell lifecycle plus Lobster immutable version slots | No portable parent/child fan-out, immutable target-set receipt, targeted repair, or containment certainty | Drive three cells under one parent operation, fail one child, and repair only that child |

## Corrections Applied

- Current facts were added to the affected RFC scopes so the target gap is not
  described as if current behavior were absent.
- EC-004 now depends on explicit EC-008 operation identity.
- EC-011 preserves current `model.call` as the child object.
- EC-012 states that current usage is aggregate plus provider snapshots, not
  durable candidate partitions.
- EC-013 does not infer unsupported behavior solely from MCP advertisement.
- EC-017 states explicitly that delete is not purge.
- EC-019 keeps provenance labels separate from enterprise classification.
- EC-020 keeps backend/index cleanup separate from whole-memory completion.
- EC-022 limits current N-1 claims to node/probe roles.
- EC-023 keeps cancellation/replay transport semantics separate from effect
  reversal and semantic success.
- EC-024 requires explicit pairing/route-change rejection.
- EC-026 identifies the Rust proof as untracked working-tree content.
- EC-027 narrows the current baseline to plugin-first evidence.
- EC-028 distinguishes local install provenance from signed publisher/build
  provenance.
- EC-031 separates current owner-local reservations from the target portable
  lease contract.
- EC-034 states that current Fleet is a single-host per-cell supervisor with
  no parent operation or repair-set object.

## Closure Consequence

The portfolio remains contract-scope closed and evidence-open. The seven B
contracts are now the complete evidence-promotion queue. The 28 A contracts
still retain target, migration, deletion, mixed-version, and disproof work
before they can pass the evidence-ready and depth-ready gates.
