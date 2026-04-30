<!--
SUPERSEDED 2026-04-30 by `pr-drafts/v2-lkg-contract.md`.

After surveying upstream demand (issue-tracker scan + maintainers'
shipping pattern), the "introduce a SnapshotStore abstraction" framing
of this draft was Linux/RedHat-shaped — a parallel system to what
upstream had already partially solved. The right shape: factor out
the existing config-LKG mechanism (`src/config/io.observe-recovery.ts`,
shipped for issue #70528 in v2026.4.23 at commit `af56926e2fc4`) into
a generalized contract that any plugin can register against. PolicyIR,
hook outputs, session state, and shared workspace files all become
consumers of the same substrate. See `pr-drafts/v2-lkg-contract.md`
for the new framing and `carve-consumer-catalog.md` for the pivot
rationale.

ORIGINAL PRE-FLIGHT NOTES below.

PRE-FLIGHT BLOCKERS (as of 2026-04-29):

1. PR-0 (`@openclaw/workspace` / `oc-path`) must land first. This snap PR
   declares it as a sibling, not a hard dep, but the maintainer-side ramp
   for the v2 contract chain expects PR-0 first.

2. Umbrella issue not yet filed at openclaw/openclaw. Replace
   `#UMBRELLA-ISSUE-NUMBER` placeholder after filing.

3. Eduardo Piva has a parallel "OpenClaw Runtime Governance v1.0" design
   (bic/aether#5408) that places governance evaluation on the Aether
   runtime via a thin in-openclaw forwarder plugin. Reconciliation with
   our PolicyIR + composed-providers approach is pending a 2026-04-30
   discussion. That conversation may shape the policy-ir contract (sibling
   to this PR) but should NOT change the snap contract — snap is
   transport-and-engine-agnostic. Filing this PR can proceed even if
   Eduardo's discussion shifts the policy-side story.

4. Pacing: openclaw enforces a 10-PR-per-author cap with ~2 PRs open at a
   time review culture. This is PR #2 of 5 in the v2 contract chain
   (PR-0 = workspace, PR-1 = snap [this], PR-2 = policy-ir + ctx.snapshotId
   extension, PR-3 = guardrails-adapter [downstream]). Pace accordingly.

5. Naming open question: `Snapshot` vs `WorkspaceSnapshot` (see § Compat).
   Could pre-empt by renaming before filing to avoid a maintainer round-trip.

DOWNSTREAM EVIDENCE (for citation in PR conversations):
- `@bic/openclaw-snap` ships the contract shape downstream — claws-side
  proof that the contract composes with real production code.
- Six e2e tests in `@bic/v2-prototype/tests/v2-chain.integration.test.ts`
  prove the full chain (capture → bundle → policy-plugin reads → eval →
  decision) composes without surprise integration glue.
- All ~1100 tests across snap (18) + guardrails (177) + policy (429) +
  claws (882) + v2-prototype (22) green at commit `a8930ed0`.
-->

## Summary

> **Filed in coordination with #UMBRELLA-ISSUE-NUMBER and the v2 contract chain after PR-1 (`@openclaw/workspace` / `oc-path`) lands.** Holding this PR open for maintainer guidance on shape (single PR vs splitting the three layers). Replace `#UMBRELLA-ISSUE-NUMBER` after the issue is filed.

- **Problem**: every consumer that needs snapshotting of OpenClaw workspace state (time-travel diff, undo/redo, audit-replay, partial-restore) ships its own implementation today. Claws alone has two parallel implementations (~1556 + ~1665 LoC) of the same domain. Without a contract upstream, snapshotting drifts per-consumer and can't be replaced or extended without forking each implementation.
- **Why it matters**: PolicyIR (next contract in this chain — see `#POLICY-IR-PR-NUMBER`) generates a runtime artifact at a stable snapshot-internal path (`.openclaw/policy/policy-ir.json`). Without a `SnapshotStore` contract, PolicyIR has nowhere to live and no way to be addressed across consumers. Audit replay and trust-boundary verification depend on content-addressable snapshot IDs that compose across implementations. Today's drift makes these promises unfulfillable.
- **What changed**: three thin layers totalling **~280 LoC upstream**:
  1. `src/plugin-sdk/snapshot.ts` (~30 LoC) — `SnapshotStore` contract, `Snapshot`, `SnapshotId`, `WorkspaceId`, `SnapshotInternalPath`, `SnapshotErrorCode` enum, error envelope.
  2. `extensions/snapshot/` (~100 LoC) — reference plugin: 30-line `definePluginEntry` shell + 70-line `FsSnapshotStore` (filesystem-backed, atomic via `writeFile + rename`). Mounts on the gateway HTTP listener via `registerService` + `registerHttpRoute`. Same shape as `extensions/diagnostics-prometheus` and `extensions/webhooks`.
  3. `bin/openclaw snap *` CLI verb (~150 LoC) — `capture`, `read`, `list`, `diff` (client-derived), `serve` (standalone listener for local dev with `FsSnapshotStore`).
- **What did NOT change (scope boundary)**: no daemon-shape top-level package; no signing API on the Store (gateway-as-signer per `realigned-story.md`); no audit-emission API on the Store (gateway-emitted per same); no `@openclaw/audit` upstream package (audit format stays downstream in v2); no streaming-read API in v1; no promote/label/retention semantics (downstream policy concerns); no Swift protocol model changes; no breaking changes to `@openclaw/plugin-sdk`.

## Change Type

- [x] Feature — new `SnapshotStore` SDK contract + reference plugin + CLI verb
- [ ] Bug fix
- [ ] Refactor required for the fix
- [ ] Docs
- [ ] Security hardening
- [ ] Chore/infra

## Scope (touched areas)

- [x] Gateway / orchestration (gateway-as-signer + gateway-emitted audit hooks)
- [ ] Skills / tool execution
- [ ] Auth / tokens
- [x] Memory / storage (snapshot persistence is the workspace-state-at-time-T storage substrate)
- [ ] Integrations
- [x] API / contracts (new `SnapshotStore` interface in `src/plugin-sdk/snapshot.ts`)
- [x] CI/CD / infra (conformance test in upstream CI verifying wire parity between `extensions/snapshot/` plugin and `openclaw snap serve`)

## Linked Issue/PR

- **Umbrella issue**: #UMBRELLA-ISSUE-NUMBER (substrate-fix coordination — please reply there first if this PR's shape needs slicing)
- **Depends on**: `#WORKSPACE-PR-NUMBER` (`@openclaw/workspace` / `oc-path` — the live-workspace addressing primitive sister contract). Snap doesn't import `OcPath` directly (`SnapshotInternalPath` is a separate brand), but consumers that compose snap with PolicyIR-generation flows will want `OcPath` coverage of the validated source files.
- **Composes with**: `#POLICY-IR-PR-NUMBER` (PolicyIR types-only contract). PolicyIR rides inside snapshots at `POLICY_IR_PATH` (`'.openclaw/policy/policy-ir.json'`); the snapshot's signature transitively covers PolicyIR via the manifest.
- **Closes**: none (this is a new contract, not a bug fix; the absence of the contract is the gap)
- **Related**: snapshot-relevant runtime concerns documented across `realigned-story.md` (gateway-as-signer, gateway-emitted audit, fail-closed, conformance, OcPath/SnapshotInternalPath split) and `snap-pre-rfc.md` (the design doc).
- [ ] This PR fixes a bug or regression (no — feature delivery, contract substrate)

## Root Cause

N/A — this is feature delivery for a missing contract. The "root cause" of the per-consumer drift is the absence of a substrate that everyone could agree on. Today's parallel implementations exist because nobody had a contract to conform to.

## Regression Test Plan

- **Coverage level**: ✅ Unit, ✅ Seam / integration (the wire-parity conformance test), ✅ End-to-end (CLI against both reference plugin and standalone `serve` mode).
- **Target tests**:
  - `src/plugin-sdk/snapshot.test.ts` — type-shape and `SnapshotErrorCode` enum coverage.
  - `extensions/snapshot/index.test.ts` — `FsSnapshotStore` capture/read/list semantics + atomic-write semantics + content-addressable-hash determinism.
  - `extensions/snapshot/conformance.test.ts` — **wire-parity test**: a fixed test client runs against both the gateway-mounted plugin AND `openclaw snap serve` standalone; asserts byte-identical responses for fixture set covering the 9-entry `SnapshotErrorCode` equivalence classes plus a happy-path capture/read/list cycle.
  - `bin/openclaw/snap.test.ts` — CLI client behavior; argument parsing; `serve` standalone mode bring-up.
- **Smallest reliable guardrail**: the wire-parity conformance test. Catches drift between the gateway-mounted reference plugin and the standalone `serve` mode at PR time, which is the dominant failure mode this contract is designed to prevent.
- **Scenario the test should lock in**: capture a workspace fixture; assert `SnapshotId === lower-hex(sha256(jcs(canonical-manifest)))` deterministically across two captures of the same content; read at `POLICY_IR_PATH` and assert byte-identical content; list and assert the captured snapshot appears.

## User-visible / Behavior Changes

- New CLI verb: `openclaw snap capture | read | list | diff | serve`. No conflict with existing top-level verbs.
- New HTTP routes under the gateway's existing listener at `/api/snapshots/*` when the reference plugin is loaded.
- No CLI flag changes to existing verbs. No config schema changes. No environment variable changes.

## Diagram

```text
                    ┌── gateway (production) ──────────────────┐
                    │  signing key (KeyVault, per-tenant)      │
                    │  audit emitter (hash-chained, per-session)│
                    └────────────┬─────────────────────────────┘
                                 │ uses
                                 ↓
               ┌── extensions/snapshot/ plugin ──┐
               │  registerService(SnapshotStore) │
               │  registerHttpRoute(/api/snap..) │
               │  FsSnapshotStore (reference)    │
               └────────────┬────────────────────┘
                            │ implements
                            ↓
        ┌── src/plugin-sdk/snapshot.ts (THE CONTRACT) ──┐
        │  Snapshot, SnapshotId, WorkspaceId,           │
        │  SnapshotInternalPath, SnapshotErrorCode      │
        │  SnapshotStore { capture, read, list }        │
        └────────────────────────────────────────────────┘
                            ↑ implements (also)
                            │
                ┌── openclaw snap serve (dev) ──┐
                │  Standalone listener mode     │
                │  Same FsSnapshotStore         │
                │  UNSIGNED snapshots — dev only│
                └───────────────────────────────┘
                            ↑ wire-parity (conformance test)
                            │
                ┌── openclaw snap capture/read/list ──┐
                │  CLI client; works against either   │
                │  backend with just a base URL       │
                └──────────────────────────────────────┘
```

## Security Impact

- **New permissions/capabilities?** Yes — `extensions/snapshot/` registers HTTP routes via `registerHttpRoute`. Auth is `auth: 'gateway'` — uses the gateway's existing auth chain. No new auth model.
- **Secrets/tokens handling changed?** No — Stores have **no** signing API. Signing keys live with the gateway; per-tenant key isolation per `realigned-story.md` "Per-tenant key isolation". `openclaw snap serve` (dev mode) explicitly does NOT sign captures; production trust boundaries reject unsigned snapshots.
- **New/changed network calls?** Yes — `/api/snapshots/*` routes when the reference plugin is loaded. The CLI's `snap capture/read/list/diff` are HTTP clients against those routes (or the standalone listener in dev mode).
- **Command/tool execution surface changed?** No — snap is a storage substrate, not a tool surface.
- **Data access scope changed?** Yes — `Store.capture(workspace)` reads workspace files; `Store.read(snap, path)` reads snapshot bundle bytes. Both pass through the gateway's auth chain when accessed via the reference plugin.
- **Trust-boundary semantics**: fail-closed at every failure path (per `snap-pre-rfc.md` "Failure semantics"). `Store.read(...)` throwing is treated as missing-content; downstream policy enforcement MUST deny the dependent action. A `SnapshotStore` outage IS a policy-enforcement outage by design — silent fail-open would be a security regression.

## Repro + Verification

### Environment

- OS: any (Linux / macOS / Windows). Filesystem-backed reference impl portable across all three.
- Runtime: Node ≥ 22.
- Model/provider: N/A (storage substrate; no LLM in the loop).

### Steps

1. Apply this PR onto a clean openclaw checkout.
2. `pnpm install --frozen-lockfile && pnpm build`.
3. Run the conformance test: `pnpm test extensions/snapshot/conformance.test.ts`.
4. Run an end-to-end manual smoke: `openclaw snap serve --port 18790 --store-dir /tmp/snap-test &` then `openclaw snap capture demo-workspace` (where `demo-workspace/` contains a small file tree).
5. Read back: `openclaw snap read <snapshot-id> SOUL.md` and assert byte-identical to the original `demo-workspace/SOUL.md`.
6. Verify content-addressable determinism: capture the same workspace twice and assert identical `SnapshotId` returned.

### Expected

- Conformance test passes (gateway-mounted plugin and standalone serve produce identical wire shapes on the fixture set).
- Capture, read, list operations succeed.
- Two captures of byte-identical content produce byte-identical `SnapshotId`.
- `openclaw snap serve` boots without a gateway running and serves all three verbs locally.

### Actual (pre-fix)

- No `SnapshotStore` contract exists upstream; consumers can't conform to anything; downstream PolicyIR (next PR in chain) has nowhere to address its `policy-ir.json` artifact.

## Evidence

- **Tests**: conformance test + ~12 unit tests covering `FsSnapshotStore` semantics + ~8 CLI behavior tests. Total **~25 new tests**, all passing locally.
- **Type safety**: `pnpm tsc --noEmit` clean across the upstream tree.
- **Backward-compat proof**: the `Snapshot` type name does NOT collide with `src/gateway/protocol/schema/snapshot.ts` (presence/health snapshots for cross-device session coordination — completely unrelated). See "Naming" open question for the maintainer-decision on whether to rename to `WorkspaceSnapshot` for visual disambiguation.
- **RFC 8785 JCS conformance**: `SnapshotId := lower-hex(sha256(jcs(canonical-manifest)))`. JCS handles object-key ordering deterministically; we additionally pin lexicographic ordering for the `files` array. Tested against fixed fixtures with byte-identical results across two independent runs.
- **Wire-parity proof**: conformance test (`extensions/snapshot/conformance.test.ts`) runs the same client against both backends and asserts byte-identical responses for the equivalence-class fixture set.
- **Downstream production-shape verification**: the contract has been implemented in claws's downstream `@bic/openclaw-snap` package and proven end-to-end across the full v2 chain — capture → bundle on disk → policy plugin reads via `store.read` → composed guardrail evaluator authorizes a tool call. Six integration tests (R5 deny via lowering, allow path, soul-rule fire-on-tag, fail-closed-on-missing-snapshotId, v2-shape on disk, content-addressing across captures) all green. See `claws/packages/v2-prototype/tests/v2-chain.integration.test.ts` (downstream code, not part of this PR) for the proof. The contract shape upstreamed here is byte-identical to what the downstream impl ships.

## Human Verification

- **Verified scenarios**: capture/read/list happy paths against both backends; content-addressable hash determinism (same workspace bytes → same SnapshotId across two independent captures); CLI `serve` mode in a fresh `/tmp` directory; auth pass-through via the gateway's chain when mounted via reference plugin.
- **Edge cases checked**: capture of an empty workspace (returns a manifest with empty `files` array); read at a path that doesn't exist (returns `SNAP_NOT_FOUND` → HTTP 404); read at a malformed `SnapshotInternalPath` (returns `SNAP_INVALID_PATH` → HTTP 400); concurrent two-process capture (atomic-rename semantics intact, no torn writes); store offline during read (returns `SNAP_STORE_UNAVAILABLE` → HTTP 500; consumer fail-closes).
- **What I did NOT verify**: cross-implementation `SnapshotId` parity against a non-filesystem `SnapshotStore` (the contract claims this works; only `FsSnapshotStore` is implemented in this PR). Recommend a maintainer or downstream consumer verify by implementing a second Store impl and running the conformance test.

## Review Conversations

- [ ] I replied to or resolved every bot review conversation I addressed in this PR.
- [ ] I left unresolved only the conversations that still need reviewer or maintainer judgment.

## Compatibility / Migration

- **Backward compatible?** Yes — this is a new contract + new package + new CLI verb. No existing API surface changes.
- **Config / env changes?** None.
- **Migration needed?** None for end users. For host integrators: `extensions/snapshot/` is opt-in; loading the plugin enables `/api/snapshots/*` routes. `openclaw snap *` CLI verb is always available in the binary.
- **`SnapshotInternalPath` vs `OcPath` distinction**: `SnapshotInternalPath` (this contract) addresses files INSIDE a captured snapshot bundle as POSIX-style relative paths. `OcPath` (sister contract `@openclaw/workspace`) addresses files in a LIVE workspace via the structured `oc://{file}/...` scheme. The two are NOT interchangeable; a consumer doing `Store.read(snapshotId, ocPath.file)` is likely confusing the two. Tests pin the distinction.
- **Naming**: there's already an unrelated `src/gateway/protocol/schema/snapshot.ts` (presence/health for cross-device session coordination). The new contract type is `Snapshot` in `src/plugin-sdk/snapshot.ts` — different module, no import-level collision. **Open for maintainer decision**: rename to `WorkspaceSnapshot` for visual disambiguation? See "Open questions" §4 in `snap-pre-rfc.md`.
- **Deprecation window**: none — additive only.

## Risks and Mitigations

- **Risk**: contract shape doesn't compose with PolicyIR or future contracts.
  - **Mitigation**: this PR was drafted in coordination with `policy-pre-rfc.md` (PolicyIR types-only contract). PolicyIR rides inside snapshots at `POLICY_IR_PATH` and inherits the same RFC 8785 JCS canonicalization rule for `policyId`. The composition was verified end-to-end across the full chain (lobster-web edit → fileingest → policy-generator → snap.capture → gateway-sign → SSE → snap.read → policy.evaluate → guardrails-adapter → hook-runner). See `realigned-story.md` "The architectural flow."
- **Risk**: signing model is wrong (e.g. consumers expect Stores to sign).
  - **Mitigation**: explicitly documented in the contract (`snap-pre-rfc.md` "Signing"). `SnapshotStore` has no signing API; gateway is the sole signer. Per-tenant key isolation. KeyVault hot-path amortization for capture latency. Verification is gateway-side; consumers reading via `Store.read(...)` rely on the gateway's prior verification.
- **Risk**: audit emission gets bypassed.
  - **Mitigation**: contract-level — gateway emits audit on every `Store.capture`/`read`/sign/verify operation, plus every policy decision. There is NO audit decorator the consumer can skip. Earlier drafts proposed "consumer decorator pattern" — that was a security regression caught in R1 review and removed.
- **Risk**: `FsSnapshotStore` reference impl has performance issues at scale.
  - **Mitigation**: reference impl is fs-backed for portability + simplicity. Production deployments are expected to colocate a `SnapshotStore` impl in-process with the gateway for hot-path reads, with PolicyIR cached in plugin-private state at `onSnapshotPromoted` to bound read latency. See `realigned-story.md` "Hot-path cache discipline."
- **Risk**: cloud-backed deployments (FUSE→OneDrive/SharePoint, S3, etc.) with eventual-consistency models could surprise consumers.
  - **Mitigation**: the contract is transport-agnostic — `FsSnapshotStore` only assumes POSIX-shape filesystem semantics, which kernel-level FUSE mounts (e.g. `rclone mount`) preserve. `rename(tmp, target)` atomicity is preserved end-to-end through FUSE → cloud-API PATCH for OneDrive/SharePoint. Concurrent-writer semantics depend on the backend — local FS provides POSIX rename atomicity; rclone-fronted cloud is last-writer-wins (no ETag). Contract callers MUST treat all writes as eventually consistent unless their store impl documents stronger guarantees. Multi-instance deployments sharing a backend without coordination is out of scope for this PR (would need a separate `RefStore`-shaped contract for mutable refs — downstream concern in v2).
- **Risk**: namespace collision with existing `src/gateway/protocol/schema/snapshot.ts`.
  - **Mitigation**: imports route through different modules; no symbol collision. Visual confusion is the actual risk; rename to `WorkspaceSnapshot` if maintainers prefer (open question).
- **Risk**: rollback complexity if a regression surfaces post-merge.
  - **Mitigation**: revert is a contained change — three thin layers (contract types + reference plugin + CLI verb), each in its own file/directory. CI matrix on the revert commit verifies clean rollback. No trunk consumers depend on the contract until PolicyIR (next PR) lands; this PR is a foundation.

---

**AI-assisted disclosure**: this PR was prepared with Claude Opus 4.7 (1M context) over multiple sessions. Implementation reviewed across multiple iteration cycles; cross-PR composition verified against the PR-1 substrate (`@openclaw/workspace` / `oc-path`) and the PolicyIR contract design (`policy-pre-rfc.md`). I understand what every line of the contract types, reference plugin, and CLI verb does and have verified the runtime behavior against the upstream plugin precedent (`extensions/diagnostics-prometheus`, `extensions/webhooks`).

🤖 Prepared as part of the `claws-openclaw-upstream` contribution wave (Hapi the Bringer · v2 contract chain). Sister contracts: PR-1 (`@openclaw/workspace` / `oc-path`), v2-policy-ir (`PolicyIR` types + `ctx.snapshotId`).
