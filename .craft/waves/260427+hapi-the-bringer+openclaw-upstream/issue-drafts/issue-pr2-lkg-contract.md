# Issue draft — PR-2: LKG contract (generalize the existing config-LKG)

**File this issue BEFORE filing PR-2.** Purpose: get a maintainer thumbs-up on factoring out the existing `recoverConfigFromLastKnownGood` mechanism into a generalized `LKGTracker<T>` / `LKGStore` contract that any plugin can register against.

**Submit via**: `gh issue create -R openclaw/openclaw -t "..." -F <this-file-body>` or via the Feature-request template.

**AI-assisted**: yes. Drafted with Claude Opus 4.7. Backed by 326 LKG-specific adversarial scenarios across 18 waves in `@bic/v2-prototype/tests/v2-chain-lkg-adversarial-{,2..18}.integration.test.ts` (one real bug found and fixed in-session, three known limits documented).

---

## Title

`[Feature]: Generalize the config-LKG mechanism into an LKGTracker / LKGStore contract for plugin-registered files`

---

## Summary

Factor out the existing `recoverConfigFromLastKnownGood` machinery in `src/config/io.observe-recovery.ts` (issue [#70528](https://github.com/openclaw/openclaw/issues/70528) closed-as-implemented, commit [`af56926e2fc4`](https://github.com/openclaw/openclaw/commit/af56926e2fc4), shipped in `v2026.4.23`) into a generalized **`LKGTracker<T>` / `LKGStore`** contract in `src/plugin-sdk/lkg.ts` so any plugin can register a per-file tracker and inherit promote-on-validate, restore-on-invalid, `.clobbered.<ts>` preservation, audit emission, and recovery-notice enqueue.

This is the **carrier** for the v2 contract chain: PolicyIR (a sister PR) is the first new consumer, but the abstraction is shape-agnostic and can support any policy-bearing file (PolicyIR, hook outputs, session state, shared workspace files in multi-agent setups).

---

## Problem to solve

OpenClaw already protects gateway config from agent-broken edits via `recoverConfigFromLastKnownGood`. The mechanism is real and shipping. But it's hardcoded to config files: function names, validators, state file (`config-health.json`), audit kind, and backup rotation are all config-shaped.

Other artifacts that are equally agent-edited and equally important — generated PolicyIR with a contradictory rule, a hook that emits malformed JSON, a session-state file that loses fields, shared workspace files in multi-agent setups — ship without this safety net or each implements an ad-hoc version.

Several open feature requests point at this gap from different angles:

- [#13700](https://github.com/openclaw/openclaw/issues/13700) — session snapshots
- [#17211](https://github.com/openclaw/openclaw/issues/17211) — checkpoint engine
- [#40245](https://github.com/openclaw/openclaw/issues/40245) — shared workspace dir

The mechanism that closed #70528 already does what these need, just scoped to config files only.

---

## Proposed solution

**Types + reference plugin only**, ~250–350 LoC upstream:

1. **`src/plugin-sdk/lkg.ts`** (~80 LoC) — `LKGTracker<T>`, `LKGStore`, `LKGFingerprint`, `LKGEntry`, `ValidationIssue`, `LKGObservation` types + the public ABI any plugin can register against.

2. **`extensions/lkg/`** (~150 LoC) — reference implementation: pluggable validator wrapper, fingerprint computation (sha256 lower-hex over raw bytes), atomic promote-on-validate, restore-on-invalid, `.clobbered.<ts>` preservation, audit append, recovery-notice enqueue. Mirrors `io.observe-recovery.ts` shape but parameterized over the tracker.

3. **`extensions/lkg/conformance.test.ts`** (~80–100 LoC) — wire-parity test asserting the reference implementation matches the existing config-LKG behavior on a fixed fixture set covering: promote-on-validate, restore-on-invalid, suspicious-vs-LKG, plugin-local-skip, audit record shape, recovery notice.

**What does NOT change**: existing `src/config/io.observe-recovery.ts`, `src/config/recovery-policy.ts`, and `src/gateway/server-startup-config.ts` are **untouched**. Migrating config code to use the new abstraction is explicitly out-of-scope for this PR (the abstraction lands first; existing config code becomes the reference consumer in a follow-up).

**Plugin-facing API**: plugins call `api.registerLKGTracker(tracker)` to opt in. No changes to plugins that don't register. Same fail-closed semantics as the existing config mechanism.

**Two reference backend impls** (downstream, not part of this PR — Project Lobster's `@bic/openclaw-lkg` + `@bic/openclaw-lkg-git`):

- FS-backed: `<path>.lkg` companion file + recovery on hash mismatch.
- Git-backed: `git commit` = promote, `git checkout HEAD --` = recover. Multi-agent merge for free vs rclone last-writer-wins on OneDrive-backed workspaces.

The contract is **proven backend-agnostic** via dual-backend `describe.each([fs, git])` in our test suite (18 invariants × 2 backends = 36 dual-backend tests; ARCH13 specifically locks `LKGStore` keys to exactly `{register, observe, readLastKnownGood, getEntry}` — no work-tree-specific API leaks through).

---

## Killer step (the one thing this PR proves)

**The same primitive works for everything that needs to recover from agent corruption.** PolicyIR is the next consumer (sister PR), but the abstraction extends to hook outputs, session checkpoints, shared workspace files, etc. — without each consumer reimplementing the dance.

Concrete evidence: 326 LKG-specific adversarial scenarios across 18 waves and 75 categories pass against both an FS-backed and git-backed reference implementation. Wave 11 specifically runs every architectural invariant against BOTH backends to prove the contract is genuinely backend-agnostic. Wave 16 runs synthesized fixtures matching the documented behavior of `recoverConfigFromLastKnownGood` to prove wire-format parity.

---

## Alternatives considered

- **Keep config-LKG hardcoded; let each new consumer reimplement.** Status quo. Drift accumulates; bug surface multiplies; PolicyIR reinvents what config already solves.
- **Snapshot-store abstraction** (the prior framing of this work). Heavier lift; introduces a parallel system to the one already shipping. Rejected after upstream-demand survey: zero open issues asking for snapshot semantics; multiple asking for what config-LKG already does, scoped to other files.

---

## Scope boundary (what this PR does NOT do)

- No changes to existing config-LKG callers; they keep using `recoverConfigFromLastKnownGood` directly. Migration is out-of-scope.
- No daemon-shape package; no HTTP transport. The contract is types-only with a reference plugin.
- No signing API on the tracker. Signing is operator-territory layered on top (gateway can sign `(lkgFingerprint, capturedAt, gatewayKeyId)` for chain-of-custody — not a contract concern).
- No new env vars. No CLI flag changes. No config schema changes.
- No public API changes to existing surfaces.

---

## Evidence

- The existing config-LKG mechanism in `src/config/io.observe-recovery.ts` is the _exact_ pattern this PR generalizes. Issue #70528 closed-as-implemented; commit `af56926e2fc4`.
- Project Lobster's `@bic/openclaw-lkg` + `@bic/openclaw-lkg-git` reference implementations have 326 adversarial scenarios across 75 categories all green; wire-format parity (CONF), architectural invariants (ARCH dual-backend), audit completeness (OBS), and security (SEC including symlink-attack) all proven. **One real bug found and fixed in-session** (`gitLKGStore.commitPromote` was sweeping pre-staged paths into the LKG commit; fixed to `git commit -- <relPath>`). **Three known limits documented as `[GAP]`s** with mitigation paths.

---

## Linked PRs

- This issue: gates the LKG contract PR.
- **PR-1**: `@openclaw/workspace` (workspace addressing primitive — composes but does not depend).
- **PR-3**: PolicyIR + `ctx.lkgFingerprint` extension + hook merger conjunctive AND fix (the first consumer of LKG; lands after this).

---

## Maintainer asks

1. Does the proposed shape conflict with any in-flight work on `io.observe-recovery.ts`?
2. Preference on naming: `LKGTracker` / `LKGStore` (current draft) vs. `recoveryTracker` / `recoveryStore` (closer to the existing function name)?
3. Preference on reference plugin location: `extensions/lkg/` (current draft) vs. inline in `src/plugin-sdk/`?
4. Acceptable to land as-is, or prefer to split (types-first PR, reference plugin in a follow-up)?
