---
wave: 260416+horus-the-heir+clawc-migration
date: 2026-04-19
trigger: openclaw-upstream proposal reframe + aether/lobster integration deferral
supersedes: original 2-plan scope (clawc-pre-extraction-packaging + clawc-repo-migration only)
---

# Horus Replan — From Extract-Only to Extract-Plus-Simulate

## Why

The `openclaw-upstream` proposal (`docs/clawc/proposals/openclaw-upstream/`) reframes what our governance stack is for: four OC-native packages (`guardrails`, `workspace`, `policy`, `snap`) composed in three layers (**decide → track → enforce+review**), host-neutral by construction. Ra (PR #643) builds those packages in-monorepo and adds a `--scope` flag that flips emitted imports between `@bic/openclaw-*` and upstream `@openclaw/*` with byte-identical policy IR and audit manifest.

Two constraints shaped this replan:

1. **Upstream timing.** Peter's greenlight for the `@openclaw/*` scope is weeks-to-a-month+ out. We have to run as `@bic/openclaw-*` now and flip later via Ra's `--scope`.
2. **The old aether/lobster plans don't fit.** `aether-clawc-serve-integration.md` (47k tokens) and `lobster-clawc-serve-integration.md` (38k tokens) were written against Eduardo's engine — credential-rotation taxonomies, correlation tables, dispatch circuit breakers, inline Haiku classifier tiers. That shape assumes real-repo wire-up to a specific runtime. It's wrong for Horus, which needs to prove the *proposal's* model runs E2E in a simulator before we touch any external repo.

Horus's new charter: **setup shop in `microsoft.ghe.com/bic/claws` with clean package structure, then prove the decide/track/enforce+review loop works E2E under three host shapes (openclaw / lobster / aether) via a hybrid-fidelity sim.** Wepwawet's new charter: real integration with the aether / lobster / openclaw repos using `@bic/openclaw-*`. Upstream PRs become a later wave triggered on Peter greenlight.

### Host adapter contract (addition)

A late-Stage-3 revision lifted the preset concept from "three ad-hoc host-shape configs" to a formal `HostAdapter` interface that third-party OC adopters can implement on their own. Each Horus preset maps 1:1 to a concrete `HostAdapter` implementation; the four shipping-in-Horus adapters — `AetherAdapter`, `LobsterAdapter`, `OpenClawVanillaAdapter`, and the `ClawsServiceAdapter` stub — are peer implementations of the same four-method contract (`extractIdentity` / `routePolicy` / `getApprovalSink` / `shapeResponse`). The contract is defined in:

- **CL-07 amendment §1a** — `HostAdapter` interface + obligations + `PolicyArtifactRef` / `IncomingRequest` / `OutgoingResponse` envelopes (spec draft at `.craft/waves/260416+horus-the-heir+clawc-migration/specs/drafts/CL-07-amendment-file-ingest-provider.md`, promoted to canonical `docs/specs/CL-07.md` at wave close / deploy stage).
- **CL-11 amendment §3a** — `ApprovalSink` interface (four shipping sinks: `AetherToolApprovalSink`, `LobsterSupervisorHttpSink`, `OpenClawStdinSink`, `ClawsServiceJsonlSink`) + the shared `ApprovalSinkConformance` suite that every adapter's sink must pass (spec draft at `.craft/waves/260416+horus-the-heir+clawc-migration/specs/drafts/CL-11-amendment-audit-cross-linking.md`).
- **Public-facing pitch** — `docs/clawc/proposals/host-adapter/brief.md`, the extensibility narrative for third-party OC hosts ("someone else can run a different HTTP server for their thing").

The three Horus presets (openclaw / lobster / aether) plus the claws-service stub are 4 `HostAdapter` implementations, not 3 + 1 special-case. The contract is extensible: a new host adds its own adapter + sink, passes `host-adapter-contract.unit.test.ts` (plan 4) + `adapter-swap.integration.test.ts` (plan 4) + `ApprovalSinkConformance` (plan 4), and inherits plan 5's approval-flow behaviour suite unchanged. Aether's existing `openclaw_adapter.py` is aether's informal adapter today; the interface formalizes the contract aether already has, and becomes the **reference implementation** once the interface is standardized upstream.

This revision touches plan 4 (harness accepts `HostAdapter` via `startHarness({ adapter, ... })` + ships test doubles + the conformance-suite skeleton), plan 5 (scenarios are adapter-agnostic by construction; every behaviour holds under any conformant adapter), and plan 6 (three shipping adapters + one stub replace the old "three preset configs"). Wepwawet's real-integration plans each swap the in-process adapter for the real one; the diff is bounded to the adapter's four methods.

## Wave sequence (locked)

```
Horus (XCVI)    : extract + E2E sim                  ← this replan
Wepwawet (XCVII): real integration (bic scope)       ← rescoped below
Later wave      : upstream PRs to openclaw-core      ← Peter-triggered
```

## Horus plans after replan

Updated 2026-04-19: `clawc-repo-ops` inserted as CP-3, pushing later CPs by 1 (now 8 CPs total).

| CP | Plan | Status | Role |
|---|---|---|---|
| 1 | `clawc-pre-extraction-packaging` | existing (Implemented via Ra CP-8..CP-12) | Final monorepo-side polish; 4-package tree ready to lift |
| 2 | `clawc-repo-migration` | existing (Active) | Filter-repo into `microsoft.ghe.com/bic/claws`; `clawc` → `claws` binary rename; scrubbing via `--replace-text`; zero craftworks refs left behind |
| 3 | `clawc-repo-ops` | **NEW** | Port doc-validation + accept-runner from craftworks into `devtools/repo-ops/`; publish atoms registry as oracle; ship no-craftworks CI gate + allowlist; scrubber + atom scaffolder |
| 4 | `clawc-bic-operations` | existing (Draft, pulled in) | CI matrix, CODEOWNERS, branch protection, release playbook; activates CP-3 gates via 5 new workflows (doc-validation, accept-tests, atoms-oracle, no-craftworks, doctor) |
| 5 | `claws-e2e-sim-harness` | **NEW** | Hybrid-fidelity test host + mock companion app + fixtures; real `snap serve`, real generated plugin, real CLI, in-process host + companion |
| 6 | `claws-sim-approval-flows` | **NEW** | External approval symmetric across tools-at-risk (R5/RESTRICTED via `GuardrailProvider`) + file-ingest (RESTRICTED via `FileIngestProvider`) |
| 7 | `claws-sim-host-presets` | **NEW** | Three preset configurations (openclaw / lobster / aether) parameterizing plans 5+6 |
| 8 | close | — | Wave-level close, flair, doc-sync, spec-amendment merges into canonical `docs/specs/` |

## Archived (old model)

Moved to `.craft/plans/_archive/` with archival note header:

- `aether-clawc-serve-integration.md` — Eduardo-coupled; credential rotation, correlation tables, dispatch circuit breakers, inline Haiku tiers. The intent is re-expressed at proposal-level fidelity in plans 4-6; the runtime ownership + failure-mode depth belongs in Wepwawet's `aether-real-integration` plan.
- `lobster-clawc-serve-integration.md` — same shape; intent re-expressed in plan 6 (lobster preset) + Wepwawet's `lobster-real-integration`.
- `clawc-local-sim-evolution.md` — superseded by plans 4-6.

## Fidelity model (what the sim proves)

**Hybrid** — the host and companion are in-process mocks; everything else is real:

- **Real**: `snap serve` HTTP daemon (43 routes), generated gateway plugin, `@bic/openclaw-policy` generator, `@bic/openclaw-guardrails/audit` hash chain, 20-verb `claws` CLI, byte-identical artifacts across `@bic/openclaw-*` ↔ `@openclaw/*` via `--scope`.
- **Mocked (in-process)**: host's OC plugin-hook registry (what aether / lobster / openclaw provides in reality); supervisor companion app (signs `approvalHandle` via real HMAC, but lives as a callback not a service).

Wepwawet's job is swap the in-process mocks for real code against real repos. The diff is bounded and known.

## Preset scenario inventory (plan 6)

Each preset name below is the `adapterId` of a concrete `HostAdapter` implementation (CL-07 amendment §1a). The three shipping presets + one stub map 1:1 to the four adapters; preset-specific scenarios exercise the adapter shape itself, while the plan 5 behaviour suite runs under all four via plan 6's dispatcher.

**openclaw** — `OpenClawVanillaAdapter`; zero-Microsoft-infra adopter shape (~5 scenarios):
- `bare-plugin-loads` — plugin works with only local `.openclaw/policy/`, no snap running
- `hot-reload-local-dev` — edit SOUL.md → `openclaw policy generate` → plugin picks up new IR without restart
- `CLI-HITL-approval` — stdin-based approval, no companion app
- `scope-flip-byte-identical` — same workspace compiled at `@bic/openclaw-*` and `@openclaw/*` produces byte-identical IR + audit manifest
- `doctor-diagnoses-missing-policy` — `openclaw doctor` surfaces missing artifacts; `openclaw policy generate` recovers

**lobster** — `LobsterAdapter`; single-tenant pod + sidecar snap + supervisor (~6 scenarios):
- `RO-mount-EROFS-redirect-to-stage` — direct container write rejected; `FileIngestProvider.modify + redirectPath` routes to `.openclaw/.stage/`
- `stage-on-promote-rehydrate` — full stage → approve → `snap promote` → container rehydrate loop
- `R5-supervisor-gate` — R5 tool in container → approvalHandle → supervisor approves → execute
- `sidecar-crash-policy-survives` — snap sidecar crash; plugin still enforces from baked-in last-promote policy
- `onSnapshotPromoted-hot-reload` — provider lifecycle fires; in-flight calls complete against old; new calls use new
- `stale-handle-sequence-mismatch-rejected` — replay of old approvalHandle fails `sequenceNumber` check

**aether** — `AetherAdapter` (formalizes aether's existing `openclaw_adapter.py`, which becomes the reference implementation upstream); multi-tenant + RESTRICTED file ingest + per-tenant promote (~6 scenarios):
- `tenant-isolation` — tenant A + B have separate `currentSnapshotId`s; no cross-talk
- `RESTRICTED-file-ingest-approved` — `before_workspace_file_ingest` → FileIngestProvider review → supervisor approves → file enters context
- `RESTRICTED-file-ingest-denied` — same shape, supervisor denies → file never enters context, audit shows denial
- `sensitivity-propagation-G-CHAIN` — RESTRICTED source in `args_from` → output inherits RESTRICTED → R5 escalation
- `cross-tenant-oc-URI-rejected` — agent in A resolves `oc://` against B's snapshot → rejected
- `mid-session-promote-snapshot-semantics` — tenant-admin promotes mid-session; in-flight call completes against N; next call uses N+1 (non-uplift rule)

**Total preset sim surface**: ~17 scenarios across 3 shipping adapters + 1 stub adapter (`ClawsServiceAdapter`; identity-from-header, `ClawsServiceJsonlSink` local JSONL, direct response) that is wired at the interface level to prove `HostAdapter` is not aether-bound by construction. The stub runs plan 5's behaviour suite for conformance signal only; production wire-up of claws-service is out of scope for Horus.

## Scope-flip strategy

Horus packages ship as `@bic/openclaw-*` throughout. The `--scope` flag from Ra is exercised in the openclaw preset's `scope-flip-byte-identical` scenario to prove the flip is a one-line deploy change. Actual flip to `@openclaw/*` happens in the later upstream wave, post-Peter-greenlight, with the bic scope retained in parallel for GHE Packages publishing.

## Wepwawet rescope (XCVII)

Wepwawet's charter shifts from "16 PRs to openclaw-core" to "real integration with aether / lobster / openclaw using `@bic/openclaw-*`". The new plan inventory:

- `aether-real-integration` — real wire-up to aether runtime (Eduardo's engine); snap deployment as sidecar, supervisor identity bound to Cowork, promote triggered by `/v1/workspace-write`
- `lobster-real-integration` — real wire-up to lobster container runtime; sidecar snap, supervisor identity bound to lobster Cowork instance
- `openclaw-local-integration` — real drop-in of generated plugin into vanilla openclaw; CLI HITL; proves external-adopter path before upstream

**Drops**: `openclaw-upstream-extraction` plan moves to a dedicated later wave, triggered on Peter greenlight. The plan content stays authoritative; only the wave that files it changes.

Wepwawet's sim presets (plan 6) are the contract each real integration must preserve — scenarios pass before Wepwawet, and continue passing against real code after.

## Artifacts produced

- `REPLAN.md` (this doc)
- `.craft/plans/claws-e2e-sim-harness.md`
- `.craft/plans/claws-sim-approval-flows.md`
- `.craft/plans/claws-sim-host-presets.md`
- `.craft/plans/_archive/aether-clawc-serve-integration.md`
- `.craft/plans/_archive/lobster-clawc-serve-integration.md`
- `.craft/plans/_archive/clawc-local-sim-evolution.md`
- Updates to `.craft/waves/260416+horus-the-heir+clawc-migration/wave.yaml`
- Updates to `.craft/waves/260418+wepwawet-the-opener+openclaw-upstream-extraction/wave.yaml`

## 2026-04-22 amendment — CP-7 moved to Wepwawet

After CP-6 shipped clean (27 scenarios + real CLI + library layer), we re-scoped CP-7 based on:

1. **The 4-adapter plan was over-scoped.** OpenClawVanilla + Lobster adapters were speculative — no real integration target exists today. Lobster had weakest case of all: the only Lobster docs we have (lobster-openclaw-ingestion-pipeline) describe workspace-file ingestion INTO Lobster containers, a separate architectural concern from "plugin runs inside a Lobster pod."
2. **The 2 adapters we need are already real-integration work.** AetherAdapter is a TypeScript port of aether's live Python code that Wepwawet's aether-real-integration plan will swap for direct calls. ClawsServiceAdapter is our actual product direction and needs product-design before implementation.
3. **Horus was scoped "extract + E2E sim" — both delivered.** Closing Horus at CP-6 + CP-8 (close) is honest and complete. CP-7 belongs in Wepwawet alongside the real-integration work its adapters feed into.

**What moved:**
- `claws-sim-host-presets` plan → stays authoritative but consumed by Wepwawet instead of Horus
- `checkpoints/cp-7.md` → `.../wepwawet-.../checkpoints/cp-7.md`
- Pulses 63–72 → `.../wepwawet-.../pulses/`
- Wepwawet's CP-1 is now claws-sim-host-presets; CP-2+ resumes its original aether-real-integration charter

**Reduction from 4 adapters to 2:**
- Kept: AetherAdapter (real Python source to mirror), ClawsServiceAdapter (upgraded from stub to real — product)
- Deferred: OpenClawVanillaAdapter (to a future OSS-contribution wave if/when OpenClaw ships externally), LobsterAdapter (to real lobster-integration work, if a target commits)

Horus now closes at CP-6 (implementation) + CP-8 (doc-sync / spec-reboot / flair). 6 tagged checkpoints, ~950 tests passing, separate bic/claws repo with full CLI + library layer.
