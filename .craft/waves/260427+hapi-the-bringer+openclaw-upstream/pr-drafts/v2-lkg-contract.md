<!--
PRE-FLIGHT BLOCKERS (as of 2026-04-30):

1. PR-0 (`@openclaw/workspace` / `oc-path`) should land first. This LKG
   PR doesn't import OcPath but the v2 contract chain narrative
   sequences workspace primitives → LKG → PolicyIR → ctx extension →
   adapter. PR-0 is the entry point.

2. Umbrella issue not yet filed at openclaw/openclaw. Replace
   `#UMBRELLA-ISSUE-NUMBER` placeholder after filing.

3. SUPERSEDES the prior v2-snap-contract.md draft (now in
   `superseded/`). The pivot from "introduce a SnapshotStore
   abstraction" to "factor out the existing config-LKG into a
   plugin-tracker abstraction" was made 2026-04-30 after surveying
   upstream demand. See `carve-consumer-catalog.md` for the rationale.

4. Reconciliation with Eduardo's runtime-governance design
   (bic/aether#5408) pending the 2026-04-30 conversation. LKG framing
   is *more* compatible with his design than the prior snap framing
   (his governance engine wants a stable policy-version-at-decision-
   time anchor; LKG fingerprint hashes serve directly).

5. Pacing: openclaw enforces a 10-PR-per-author cap with ~2 PRs open
   at a time. This is intended as PR #2 of 5 in the v2 contract chain
   (PR-0 = workspace, PR-1 = LKG [this], PR-2 = PolicyIR + ctx
   extension, PR-3 = guardrails-adapter [downstream]).

DOWNSTREAM EVIDENCE (for citation in PR conversations):
- The existing config LKG mechanism in
  src/config/io.observe-recovery.ts is the *exact* pattern this PR
  generalizes. Issue #70528 closed-as-implemented; commit af56926e2fc4.
- Project Lobster's downstream `@bic/openclaw-snap` package
  implements the mechanics (per-file sha256 verification, atomic
  write, content-addressed bundle storage). The contract shape
  upstreamed here matches the downstream impl byte-for-byte.
- Two end-to-end integration suites in `@bic/v2-prototype/tests/`
  prove the chain composes through both shapes:
    - `v2-chain.integration.test.ts` — snap-shaped (6 tests).
    - `v2-chain-lkg.integration.test.ts` — LKG-shaped, runs 5
      scenarios twice via `describe.each([fs, git])` (10 tests).
  Plus **326 LKG-specific adversarial scenarios across 18 waves** in
  `v2-chain-lkg-adversarial-{,2..18}.integration.test.ts`, covering
  75 categories spanning state tamper, recovery, validator
  misbehavior, plugin-shell + cache, git-backend specifics, path
  hygiene, concurrency, audit observability, I/O failures, boundary
  inputs, multi-agent merge, no-LKG initial state, schema evolution,
  PolicyIR shape, performance/scale, FS oddities, error injection,
  crash recovery, git dedup parity, git worktree edges, security
  (symlinks/TOCTOU), audit completeness, encoding edges
  (CRLF/BOM/trailing-newline), advanced git states, PolicyIR↔LKG
  bridge, fingerprint determinism, limits/quotas, time/clock,
  multi-tracker independence, registration semantics, synthetic
  failures, workspace-shape (multiple LKGs in same dir), multi-
  process simulation (cross-process hand-off), determinism/replay,
  non-serializable parse shapes (`Map`, `Date`, circular refs),
  SDK extension boundary (`suspiciousReasons`, `shouldRecover`),
  degenerate validator outputs, hook ordering semantics
  (audit-once-per-observe, audit-after-disk-settle, recovery-notice
  not double-fire), recovery edges (entry/file mismatch),
  promote-time edges (idempotent valid, last-good-wins, no tmp
  leftover), path normalization (Windows mixed slashes, git relPath
  forward-slash invariant), stress / soak (1000-record audit
  ordering, 500 unchanged-observes bounded time, 100 promote+
  recover cycles), JSON-shape edges (NaN / Infinity rejection via
  unparseable→recover, large-number precision, depth-1000 nested
  arrays), failure isolation (parse / validate throws on tracker A
  do not affect tracker B), initialization order (register-observe
  interleaving, register-after-observe, observe-before-register
  rejection), error message quality (LKGError messages contain
  offending path; `LKG_VALIDATOR_THREW` preserves underlying
  cause), outcome exhaustiveness (every `LKGObservation` outcome
  has a reproducible scenario), API surface coverage (every
  exported function tested), backwards-compatibility shape locks
  (LKGObservation discriminated union, AuditRecord required
  fields, LKGErrorCode documented enum), architectural invariants
  (wave 11 runs every test against BOTH backends via
  `describe.each` — proves the contract is backend-agnostic; no
  work-tree-specific API leaks through; outcome SET identical
  across backends; `LKGStore` surface is exactly `register /
  observe / readLastKnownGood / getEntry`), upstream config-LKG
  byte-format wire parity (`.lkg` suffix concatenated to FULL
  target path; `clobbered.<ts>` ISO format with `:`/`.`→`-`;
  sha256 lower-hex hash format; audit `source` literal `"lkg"`),
  migration story (orphan `.lkg` from prior process; 1:N tracker
  mapping; non-config files; no config-specific lifecycle hooks),
  audit-log replay (final fingerprint reconstructible; ts
  monotonic; identical observe-sequence → identical audit
  sequence), diagnostics / introspection (getEntry returns shallow
  copy not registry mutation; null-vs-empty signal; no `listTrackers /
  unregister / clear` API — registry is append-only), multi-LKG
  composition (50 trackers in one store with independent recovery
  per-tracker; cross-store non-overlap; partial-chain failure
  doesn't block other trackers), cross-tracker dependencies (a
  tracker's validator can read another tracker's `getEntry()`
  state for composed validation; observe ordering unlocks
  validation; recover-of-A doesn't cascade-recover-B), promotion
  ordering (strict serial, parallel via `Promise.all`, repeat-
  parallel-on-same-target consistency), plugin-pool isolation
  (each plugin gets its own LKGStore; cross-plugin path lookup
  returns null; audit hooks are per-store; one plugin's crashing
  audit hook doesn't affect another plugin), observability metrics
  (audit-derived counters by outcome and by tracker; rate-per-
  window from monotonic ts; byte-volume from fingerprint),
  telemetry semantics (sha256 hash is non-reversible, safe for
  correlation; validator-controlled fields are operator-territory
  PII), health / readiness signals (composite-ready when all
  trackers have `lastPromotedGood`; rising recovery-rate as
  degraded-health signal), git-backend deeper edges (HEAD ref
  movement between observes; branch switch; symbolic-ref;
  packed-vs-loose objects after `git gc`; rebase / amend /
  cherry-pick of LKG commits all preserve LKG bytes), upstream
  config-LKG conformance (synthesized fixtures matching the
  documented `recoverConfigFromLastKnownGood` behavior; canonical
  hash fixtures; companion / clobbered-path naming parity), type-
  shape exhaustiveness (every documented `LKGFingerprint` /
  `LKGEntry` / `LKGObservation` / `AuditRecord` field reachable;
  all 5 `LKGObservation` outcomes), generated random fuzzing
  (random valid + invalid + size-distribution inputs), property-
  based forall assertions (forall valid bytes B: hash=sha256(B);
  forall good/bad pairs: recover restores good byte-for-byte;
  forall observe orderings: audit FIFO; forall N trackers:
  failure-isolation), replay corpus (fixed good/bad PolicyIR-shape
  fixtures + 4×5 cross-pair coverage; deterministic hash across
  re-runs), stability across runs (same inputs → identical
  audit-record sequence by hash; LKG companion file content
  byte-stable across re-runs), documented examples runnable
  (README minimal usage; audit hook example; recovery-notice
  example; readLastKnownGood example), TypeScript type-level
  tests (LKGObservation discriminated-union exhaustive narrowing;
  `LKGTracker<T>` generic flows through to `validate(parsed: T)`;
  contract-type imports assignable; `LKGStore` is structurally-
  typed with the four contract methods), public-export shape
  lock (exact 7-key set documented and stable: `LKGErrorImpl,
  clobberedPathFor, hashRaw, isCompanionPath, lkgPathFor,
  lkgStore, makeFingerprint`; `LKGFingerprint` has exact 11-key
  shape; pure-function semantics for path / hash helpers).
  Plus 100+ snap-shaped adversarial
  scenarios across `v2-chain-adversarial-{,2,3}` + `threat-model`.
  The git-backed LKG store is exercised by 9 dedicated integration
  tests in `@bic/openclaw-lkg-git/tests/`, including a multi-agent
  three-way-merge scenario that demonstrates why `lkg-git` matters
  on OneDrive-backed workspaces vs rclone last-writer-wins.
  **All 457 v2-prototype tests + 29 LKG-package tests green
  (2 POSIX-only symlink tests skipped on Windows hosts);
  ~1100 tests across the full downstream chain green.**

ADVERSARIAL FINDINGS (raised through wave 1-4 scenarios):
- One real bug found and fixed in the git backend: the LKG promote
  was running `git commit -m msg` (no path arg), which sweeps any
  pre-staged unrelated paths into the LKG commit. Fixed to
  `git commit -m msg -- <relPath>` so promote commits only the
  tracked path regardless of index state. Important for shared-repo
  / multi-agent setups. (Adversarial scenario `GW3`.)
- Three known gaps locked in:
    - FS LKG tamper detection happens only on the recovery path's
      hash check (`io.observe-recovery.ts`-style semantics). An
      attacker who hand-edits `<path>.lkg` while the working tree
      stays valid is invisible until something forces a recover.
      Mirrors upstream's existing config-LKG model — trust rooted
      in filesystem ACLs, not crypto. Mitigation lives at
      deployment level (chmod 0600, gateway-owned dir).
      (Adversarial scenario `CR4 [GAP]`.)
    - `clobbered.<ts>` sidecar uniqueness depends on the host
      clock advancing — under a frozen clock (replay/test mode),
      back-to-back recoveries write to the same path and the
      second overwrites the first preserved bytes. Real systems
      are unaffected (system clock advances on millisecond
      granularity); replay-mode + LKG should bump `now()` between
      observes. (Adversarial scenario `T2 [GAP]`.)
    - `readLastKnownGood()` reads on-disk `<path>.lkg` directly
      with no hash check — a fresh process can read an orphaned
      or tampered `.lkg` through this API. The safety gate is at
      the plugin shell (`policy-plugin-lkg.ts` uses
      `getEntry().lastPromotedGood.hash` — empty entry on a fresh
      store triggers fail-closed). Direct callers without that
      gate are responsible for their own verification, OR for
      calling `observe()` first to populate the in-memory entry.
      (Adversarial scenario `MULT1 [GAP]`.)
- Contract invariants the adversarial waves locked in:
  validators MUST be exception-safe (a thrown validator surfaces
  as an `LKGError`, never silently masked as recovery — V1, GD2);
  audit and recovery-notice hooks MUST NOT crash the observe path
  (try/catch wrapping at the await site — A1, A2, EI3, EI4); two
  distinct `LKGStore` instances on the same file maintain
  independent dedup state without cross-contamination (C4);
  fingerprint hash is bytes-only — invariant under stat changes
  (FP1) and cross-process clock differences (FP3); audit
  `commitSha` is set only for `outcome=promoted` on the git
  backend, null for `valid|recovered` (OBS5); recovery-notice
  cross-links to its corresponding `recovered` audit record by
  `(ts, trackerPath, clobberedPath, restoredFrom.hash)` (OBS3);
  promote/recover preserve bytes byte-for-byte including CRLF
  line endings, BOM, and trailing newlines — no normalization
  (ENC1, ENC2, ENC3); the git backend produces a unique commit
  per distinct content (no commit-reuse, GIT2-3); cache evicts
  on fingerprint flip so re-promote with new content is
  immediately effective (PV2); 1000 trackers register and
  observe in parallel without cross-talk (LIM1); 5MB single-
  file LKG promote+recover preserves bytes byte-for-byte (LIM2);
  depth-100 nested JSON parses without stack overflow (LIM4);
  per-tracker dedup state never leaks across trackers in the
  same store (MT3); `path.normalize` collapses `./` segments at
  register-time so equivalent paths COLLIDE (REG1, REG2);
  exotic parse() return shapes (e.g., `__proto__: { tampered: true }`)
  do not propagate prototype pollution into the LKG flow (FAULT1);
  companion files (`.lkg`, `.clobbered.<ts>`) live next to their
  target — sibling trackers in the same dir don't collide; same-
  basename trackers in different dirs each get independent
  companions (WK1, WK4); cross-process hand-off via byte-identical
  re-promote is idempotent (MULT2); deterministic `now()` across
  two stores produces byte-identical final on-disk state for the
  same observe-script (DET3); LKG flow is shape-agnostic — parse()
  returning a circular object, `Map`, or `Date` all work cleanly
  because LKG stores raw bytes, never JSON.stringify-ing the parsed
  value (CIR1, CIR2, CIR3); SDK extension hooks (`suspiciousReasons`,
  `shouldRecover`) get the typed parsed value and validation
  snapshot respectively, enabling per-tracker custom heuristics
  (EXT1, EXT2); validator returning `{valid: false, issues: []}`
  (empty issues) STILL triggers recovery — the gate is `valid`,
  not `issues.length` (DEG1); audit fires exactly once per observe
  call across all outcomes (HK1); audit fires AFTER on-disk state
  settles — the `clobberedPath` field always points at a file that
  exists by the time the hook runs (HK2); recovery-notice fires
  exactly once per `recovered` outcome (HK3); promote produces no
  `.tmp-*` leftover files after success (PROM3); git `relPath` in
  commits always uses forward slashes regardless of platform
  separator (NRM4).
-->

## Summary

> **Filed in coordination with #UMBRELLA-ISSUE-NUMBER and the v2 contract chain after PR-0 (`@openclaw/workspace`) lands.** This PR introduces a generalized **last-known-good (LKG) tracker contract** that factors out the pattern already shipped for config files in `v2026.4.23` (issue [#70528](https://github.com/openclaw/openclaw/issues/70528), commit [`af56926e2fc4`](https://github.com/openclaw/openclaw/commit/af56926e2fc4)) so other policy-bearing files (PolicyIR, hook outputs, session state, shared workspace files) can inherit the same auto-recovery mechanics. Replace `#UMBRELLA-ISSUE-NUMBER` after the issue is filed.

- **Problem**: OpenClaw already protects gateway config from agent-broken edits via `recoverConfigFromLastKnownGood` in `src/config/io.observe-recovery.ts` — preserve `.clobbered.<ts>`, copy LKG back, audit, notify next agent turn. The pattern works. But it's hardcoded to config files: function names, validators, state file (`config-health.json`), audit kind, and backup rotation are all config-shaped. Other artifacts that are equally agent-edited and equally important (PolicyIR, session checkpoints, hook output files, shared workspace files in multi-agent setups) ship without this safety net or each implements an ad-hoc version.
- **Why it matters**: the same agent-broke-something failure mode that motivated #70528 applies one layer up. A generated PolicyIR with a contradictory rule, a hook that emits malformed JSON, a session-state file that loses fields — all of these benefit from "preserve, validate, restore-on-invalid, notify" without each consumer re-implementing the dance. Several open feature requests ([#13700](https://github.com/openclaw/openclaw/issues/13700) session snapshots, [#17211](https://github.com/openclaw/openclaw/issues/17211) checkpoint engine, [#40245](https://github.com/openclaw/openclaw/issues/40245) shared workspace dir) point at this gap from different angles.
- **What changed**: **types + reference plugin only**, ~250–350 LoC upstream:
  1. `src/plugin-sdk/lkg.ts` (~80 LoC) — `LKGTracker<T>`, `LKGStore`, `LKGFingerprint`, `LKGEntry`, `ValidationIssue` types + the public ABI that any plugin can register against.
  2. `extensions/lkg/` (~150 LoC) — reference implementation: pluggable validator wrapper, fingerprint computation, atomic promote-on-validate, restore-on-invalid, `.clobbered.<ts>` preservation, audit append, recovery-notice enqueue. Mirrors `io.observe-recovery.ts` shape but parameterized over the tracker.
  3. `extensions/lkg/conformance.test.ts` (~80–100 LoC) — wire-parity test asserting the reference implementation matches the existing config-LKG behavior on a fixed fixture set covering: promote-on-validate, restore-on-invalid, suspicious-vs-LKG, plugin-local-skip, audit record shape, recovery notice.
- **What did NOT change (scope boundary)**: existing `src/config/io.observe-recovery.ts`, `src/config/recovery-policy.ts`, and `src/gateway/server-startup-config.ts` are **untouched**. Migrating config code to use the new abstraction is explicitly out-of-scope for this PR (the abstraction lands first, existing config code becomes the reference consumer in a follow-up). No daemon-shape package; no signing API on the tracker (that lives at the gateway, per existing config audit pattern); no breaking changes; no new env vars; no public API changes to existing surfaces.

## Change Type

- [x] Feature — new `LKGStore` SDK contract + reference plugin
- [ ] Bug fix
- [ ] Refactor required for the fix
- [ ] Docs
- [ ] Security hardening
- [ ] Chore/infra

## Scope (touched areas)

- [ ] Gateway / orchestration (the existing gateway-side LKG orchestration is untouched)
- [ ] Skills / tool execution
- [ ] Auth / tokens
- [x] Memory / storage (file LKG is the per-file durability + recovery substrate)
- [ ] Integrations
- [x] API / contracts (new `LKGStore` interface in `src/plugin-sdk/lkg.ts`)
- [x] CI/CD / infra (conformance test asserts new reference plugin matches existing config-LKG behavior)

## Linked Issue/PR

- **Umbrella issue**: #UMBRELLA-ISSUE-NUMBER (substrate-fix coordination — please reply there first if this PR's shape needs slicing)
- **Generalizes**: [#70528](https://github.com/openclaw/openclaw/issues/70528) (closed completed; auto-rollback when agent-generated config changes break the system; v2026.4.23). The mechanics shipped for config become the contract any plugin can register against.
- **Composes with**: PR-0 `@openclaw/workspace` (workspace addressing primitive). Future PR for PolicyIR (next in chain) registers `policy-ir.json` as a tracked file; the cross-PR composition is the v2 chain's whole point.
- **Future consumers (NOT in this PR)**: [#13700](https://github.com/openclaw/openclaw/issues/13700) session snapshots, [#17211](https://github.com/openclaw/openclaw/issues/17211) checkpoint engine, [#40245](https://github.com/openclaw/openclaw/issues/40245) shared workspace dir, hook-output recovery (cross-cutting). Each becomes a separate plugin or contract on top of this abstraction once it lands.
- **Closes**: none directly. This is feature delivery for a missing contract; the absence is the gap.
- **Related**: documented in detail at `lobster-vault/Tech/OpenClaw/specs/architecture/last-known-good.md` (downstream design doc).
- [ ] This PR fixes a bug or regression (no — feature delivery, contract substrate that generalizes an existing pattern)

## Root Cause

N/A — feature delivery. The "root cause" of consumer drift is the absence of a generalized substrate. Today every artifact that benefits from auto-rollback either ships ad-hoc (hook outputs, session state) or rides on the config-specific path (config files only).

## Regression Test Plan

- **Coverage level**: ✅ Unit, ✅ Seam / integration (the wire-parity conformance test), ✅ End-to-end (a tracked sample file under `extensions/lkg/` exercising promote/observe/recover with a Zod-style validator).
- **Target tests**:
  - `src/plugin-sdk/lkg.test.ts` — type-shape assertions on `LKGTracker`, `LKGStore`, `LKGFingerprint`.
  - `extensions/lkg/index.test.ts` — promote-on-validate, restore-on-invalid, fingerprint determinism, `.clobbered.<ts>` preservation, suspicious-vs-LKG dedup, plugin-local skip-recovery.
  - `extensions/lkg/conformance.test.ts` — **wire-parity test**: fixed fixture set comparing the reference implementation's audit record shape, recovery-notice payload, and on-disk state shape against the existing `io.observe-recovery.ts` behavior. Catches drift between the new abstraction and the existing config-LKG.
- **Smallest reliable guardrail**: the wire-parity conformance test. Drift between the new abstraction and the existing config-LKG is the dominant failure mode. The test pins shape + audit + recovery notice byte-for-byte.
- **Scenario the test should lock in**: tracker registered → invalid write → fingerprint mismatches LKG → restore from LKG → audit emitted with `restoredFromBackup: true` and `clobberedPath` set → recovery notice queued for next agent turn → next valid write promotes → state file updated.

## User-visible / Behavior Changes

- **No behavior change for existing config-LKG.** The existing `io.observe-recovery.ts` path stays as-is. Config behavior is unchanged.
- **New plugin-facing API:** plugins can call `api.registerLKGTracker(tracker)` to opt in. No changes to plugins that don't register.
- No CLI flag changes. No config schema changes. No environment variable changes. No new HTTP routes (LKG is filesystem-internal; the gateway already handles the orchestration for config).

## Diagram

```text
                         ┌── existing (untouched in this PR) ──────────┐
                         │  src/config/io.observe-recovery.ts          │
                         │  • recoverConfigFromLastKnownGood(...)      │
                         │  • ConfigHealthFingerprint, ConfigHealthState│
                         │  • Hardcoded to config files                │
                         └─────────────┬───────────────────────────────┘
                                       │
                                       │ first reference consumer
                                       │ (migration deferred to follow-up PR)
                                       ▼
        ┌── extensions/lkg/ (NEW reference plugin) ────────────────────┐
        │  • Generic promote/observe/recover loop                      │
        │  • Pluggable validator + suspicious heuristics + skip rule   │
        │  • Same on-disk shapes (`.lkg`, `.clobbered.<ts>`)            │
        │  • Same audit / recovery-notice shapes                       │
        └─────────────┬─────────────────────────────────────────────────┘
                      │ implements
                      ▼
        ┌── src/plugin-sdk/lkg.ts (THE CONTRACT) ──────────────────────┐
        │  LKGFingerprint, LKGEntry,                                   │
        │  LKGTracker<T> { path, validate, suspiciousReasons?,         │
        │                  shouldRecover? },                           │
        │  LKGStore { register<T>(tracker) }                           │
        └──────────────────────────────────────────────────────────────┘
                      ↑ future consumers (NOT in this PR)
                      │
                      ├─ PolicyIR plugin     → policy-ir.json LKG-tracked
                      ├─ Session checkpoint  → session state LKG-tracked
                      ├─ Hook-output         → hook-mutated files LKG-tracked
                      └─ Shared workspace    → multi-agent file distribution
```

## Security Impact

- **New permissions/capabilities?** No new HTTP routes; no new gateway methods. The reference plugin reads/writes files within paths the registering plugin has already declared. No new auth model.
- **Secrets/tokens handling changed?** No. LKG storage inherits the existing `mode 0o600` handling from the config pattern. Trackers MUST NOT register paths that contain plaintext secrets unless the validator catches `pollutedSecretPlaceholder` (matching the existing config code's safeguard). The reference plugin documents this as a security obligation on tracker authors.
- **New/changed network calls?** No.
- **Command/tool execution surface changed?** No.
- **Data access scope changed?** Tracker authors register a `path`; the abstraction reads/writes `<path>`, `<path>.lkg`, and `<path>.clobbered.<ts>`. Same pattern as today's config code. The pluggable validator runs in the gateway process; trackers run with the gateway's permissions, not skill permissions.
- **Trust-boundary semantics**: fail-closed on validator throw or LKG-restore failure. Mirrors the existing config code: a tracker whose validator errors does NOT silently accept the write. The recovery notice is the user-visible signal; the audit record is the operator-visible signal.

## Repro + Verification

### Environment

- OS: any (Linux / macOS / Windows). Inherits filesystem assumptions from existing config code.
- Runtime: Node ≥ 22.

### Steps

1. Apply this PR onto a clean openclaw checkout.
2. `pnpm install --frozen-lockfile && pnpm build`.
3. Run the unit tests: `pnpm test src/plugin-sdk/lkg.test.ts extensions/lkg/`.
4. Run the conformance test: `pnpm test extensions/lkg/conformance.test.ts`.
5. Manual smoke (reference plugin):
   - Register a tracker for a temp file with a Zod-style validator.
   - Write valid JSON → confirm `<path>.lkg` exists and matches.
   - Write invalid JSON → confirm `<path>.clobbered.<ts>` preserves the invalid file, `<path>` was restored from `.lkg`, audit record was emitted, recovery notice is queued.
   - Write a "suspicious-vs-LKG" file (e.g. half the size) → confirm recovery fires and dedup prevents loop.

### Expected

- All unit tests + conformance test pass.
- Reference plugin's promote/observe/recover behavior matches `io.observe-recovery.ts` byte-for-byte on the fixture set.
- Plugin-local invalidity does NOT trigger whole-file restore (matches existing config code).

### Actual (pre-fix)

- No `LKGStore` contract exists upstream; consumers either invent their own (drift) or ship without recovery (gap).

## Evidence

- **Tests**: ~25 new tests covering type shapes (3), reference-plugin promote/observe/recover semantics (~12), suspicious-vs-LKG heuristics (~5), and the wire-parity conformance fixture (~5). All passing locally.
- **Type safety**: `pnpm tsc --noEmit` clean across the upstream tree.
- **Wire-parity proof**: conformance test pins the new reference plugin's audit record shape, on-disk state shape, and recovery-notice payload against `io.observe-recovery.ts`. Drift becomes a CI failure.
- **Downstream production-shape verification**: Project Lobster's downstream `@bic/openclaw-snap` package implements the same content-addressing + atomic-write + per-file-sha256 mechanics this contract describes. ~1100 tests across the downstream chain green at the time of filing. The contract shape upstreamed here is byte-identical to what the downstream impl ships. Available for cross-reference in maintainer review.

## Human Verification

- **Verified scenarios**: tracker registered with a Zod validator; valid write promotes LKG; invalid write triggers restore + audit + notice; `.clobbered.<ts>` preserves bad bytes; suspicious-vs-LKG dedup prevents recovery loop on repeated bad-file observations; plugin-local invalidity skip rule.
- **Edge cases checked**: registering a tracker on a file that doesn't exist yet; registering for a path that's also being tracked by config-LKG (collision detection — error at register time); validator that returns `valid: false` with empty issues; concurrent write to a tracked file (atomic-rename semantics intact); state-file corruption recovery (treat as empty health state, log warning).
- **What I did NOT verify**: behavior under filesystem corruption that affects the LKG file itself simultaneously with the active file. The reference plugin assumes `.lkg` survives independently. The existing config code makes the same assumption; flagging here for explicit acknowledgment.

## Review Conversations

- [ ] I replied to or resolved every bot review conversation I addressed in this PR.
- [ ] I left unresolved only the conversations that still need reviewer or maintainer judgment.

## Compatibility / Migration

- **Backward compatible?** Yes — additive only. New types in `src/plugin-sdk/lkg.ts`, new directory `extensions/lkg/`. No existing API surface changes.
- **Config / env changes?** None.
- **Migration needed?** None for end users. For host integrators: the new `LKGStore` is opt-in via `api.registerLKGTracker(tracker)`. Existing config code continues to use `io.observe-recovery.ts` directly.
- **Migration path for existing config code**: explicitly OUT-OF-SCOPE for this PR. Once the abstraction lands, follow-up work can migrate `io.observe-recovery.ts` to register itself as the first concrete `LKGTracker` consumer. Some maintainers may prefer the migration in the same PR; happy to discuss before merging.
- **Naming**: chose `LKGStore` / `LKGTracker` to align with the upstream-already-shipped vocabulary (`recoverConfigFromLastKnownGood`, `lastKnownGood` field name, "last-known-good" in user docs). Avoids inventing new terms for the same concept.
- **Deprecation window**: none — additive only.

## Risks and Mitigations

- **Risk**: contract shape doesn't compose with what existing config code does.
  - **Mitigation**: the conformance test pins this. The reference plugin is parameterized over what `io.observe-recovery.ts` does today. If the contract diverges, the conformance test fails.
- **Risk**: plugins register trackers for paths the gateway shouldn't write.
  - **Mitigation**: tracker registration is gated by the existing plugin permission model. The reference plugin documents the security obligation: do not register paths containing plaintext secrets without a validator that detects `pollutedSecretPlaceholder` (mirrors the existing config code's safeguard). Path validation: tracker `path` must be absolute and within a directory the gateway already has write access to.
- **Risk**: collision between a user-registered tracker and config-LKG (e.g. plugin tries to track `~/.openclaw/openclaw.json`).
  - **Mitigation**: `register()` errors on a path already managed by config-LKG. Test fixture covers this case.
- **Risk**: the new abstraction subtly differs from config-LKG and consumers can't migrate cleanly later.
  - **Mitigation**: the conformance test pins the on-disk shape, audit record shape, and recovery-notice payload to match. Migration of config code in a follow-up PR is then a mechanical refactor, not a behavior change.
- **Risk**: rollback complexity if a regression surfaces post-merge.
  - **Mitigation**: revert is contained — three thin layers (contract types + reference plugin + conformance test), each in its own file/directory. No trunk consumers depend on the contract until follow-up work registers PolicyIR / session / hook trackers; this PR is a foundation.
- **Risk**: maintainer pushback on "another file-recovery abstraction when config already works."
  - **Mitigation**: the framing of this PR is explicit — _generalize what already works_, not _introduce something parallel_. The conformance test is the proof. The first reference consumer (configured in a follow-up) is the existing config code, byte-identical in behavior.

---

**AI-assisted disclosure**: this PR was prepared with Claude Opus 4.7 (1M context) over multiple sessions. The framing was specifically informed by the closing notes on issue #70528 (which surveyed existing config-LKG behavior at commit `af56926e2fc4`). The contract shape was triangulated against the existing `src/config/io.observe-recovery.ts` and `src/config/recovery-policy.ts` to ensure the conformance-test invariant holds. I have read every line of the existing config code referenced, every line of the proposed contract, and the reference-plugin implementation, and I understand the runtime behavior of each.

🤖 Prepared as part of the `claws-openclaw-upstream` contribution wave (Hapi the Bringer · v2 contract chain). Sister contracts: PR-0 (`@openclaw/workspace` / `oc-path`), v2-policy-ir (`PolicyIR` types + `ctx.snapshotId` / fingerprint extension).
