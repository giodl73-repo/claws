## What

Lands the **hapi-the-bringer wave** into `main`. 34 commits covering three intertwined threads:

1. **OpenClaw v2 carve work** — extract architecture-shaped abstractions from claws's local openclaw-* packages (snap, policy, guardrails, workspace) into a shared v2 contract surface (`packages/v2-prototype/`) that openclaw upstream can consume.
2. **LKG (Last-Known-Good) generalization** — factor the existing config-LKG mechanism into a reusable `LKGTracker` any plugin can register against. Two new packages (`openclaw-lkg`, `openclaw-lkg-git`), reference policy plugin, and an extensive adversarial test sweep.
3. **`.craft/waves/hapi-the-bringer/` proposal trail** — pre-RFCs, scenarios, issue drafts, PR drafts, and the strategic pivot record from "introduce SnapshotStore abstraction" (Linux/RedHat-shaped parallel abstraction) to "factor out config-LKG into a generalized LKGTracker" (Chromium/Edge-shaped factor-out-and-layer).

## Why land this now

This PR is **paired with an upcoming claws cleanup PR** that converts the `bic/claws` repo into the proposal/governance home (`.craft/{plans, roles, waves}` + `.claude/` + governance) and removes the local code packages that have moved out (lobster_web → `bic/lobster`, openclaw-* eventually upstream). Landing the hapi wave first ensures the latest code in those packages is captured in `main` before the cleanup cuts them.

## Scope

- **Files**: ~440 changed (tracked vs `origin/main`), +54K / -6K
- **New packages**: `openclaw-lkg/`, `openclaw-lkg-git/`, `v2-prototype/`
- **Modified packages**: `openclaw-policy/` (v2 carve), `openclaw-snap/` (v2 carve, drop HTTP daemon), `openclaw-guardrails/` (v2 carve, drop shell-exec-provider, add LKG plugin), `openclaw-workspace/` (FUSE-mode env override), `claws/`
- **Wave artifacts**: `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/` (PR drafts, issue drafts, scenarios, FINDINGS, design notes)

## Commit threads

### v2 carves (PolicyIR / Snapshot / Guardrails)

- `pkg(openclaw-policy): v2 carve — emit v2 PolicyIR shape with R5-lowering`
- `pkg(openclaw-snap, claws): v2 carve — two-layer SnapshotStore + RefStore, drop HTTP daemon`
- `pkg(openclaw-guardrails): v2 carve — adapter + policy-runtime, drop shell-exec-provider`
- `pkg(v2-prototype): local fork of upstream openclaw v2 contract types`
- `test(v2-prototype): e2e integration — full v2 contract chain composes`
- 4 adversarial test rounds (S1..S101, threat-model + concurrency + tamper-detection-on-read)

### LKG generalization (the strategic pivot)

- `wave(hapi): LKG pivot — supersede snap-contract draft, add lkg-contract draft`
- `wip(hapi): LKG pivot follow-on — packages, adversarial test sweep, proposal refresh`
  - New `packages/openclaw-lkg/`: `LKGTracker` types + InMemory + FS reference store + fingerprint helper
  - New `packages/openclaw-lkg-git/`: git-backend store wrapping `git-cmd`
  - New reference plugin `policy-plugin-lkg.ts` in openclaw-guardrails (mirrors existing config-LKG byte-for-byte; conformance-tested)
  - 18 new `v2-chain-lkg-adversarial-N.integration.test.ts` files covering concurrent capture races, fingerprint drift, store back-end swap, missing-LKG-on-read, partial-write recovery, cascading-config edges
  - Wave/proposal refresh: 3 new issue drafts, 2 new superseded PR drafts, design notes for the git backend, scenarios + FINDINGS update

### Workspace + carve catalog

- 10 commits on `openclaw-workspace` (env override `OPENCLAW_WORKSPACE_ROOT`, FUSE-mode seam, etc.)
- `wave(hapi): carve catalog — record local-only resolution + defer remote impl`
- `wave(hapi): lock in Ryan's FUSE answers + LWW concurrency constraint`
- `wave(hapi/PR-snap): pre-flight polish — cite shipped evidence + record blockers`

## Test plan

This PR isn't a "review every line" event — it's a "land the snapshot of work" event paired with the cleanup PR. Substantive review should focus on:

- [ ] **Wave artifact integrity**: `.craft/waves/260427+hapi-the-bringer+openclaw-upstream/` reads coherently as a wave trail (PROGRESS, FINDINGS, scenarios, PR drafts).
- [ ] **v2-prototype contract surface**: `packages/v2-prototype/src/{index,snapshot,lkg}.ts` matches what we want openclaw upstream to adopt.
- [ ] **LKG conformance pin**: `policy-plugin-lkg.ts` mirrors the existing config-LKG behavior (test in `v2-prototype/tests/v2-chain-lkg.integration.test.ts`).
- [ ] **No regression on the existing v2 chain**: existing v2-chain integration tests still pass (full suite via `npm run test`).
- [ ] **CI green**.

## Followups (NOT in this PR)

- The **claws cleanup PR** (paired). Removes lobster_web (already only on a dead local branch) and reframes the repo around `.craft/` + `.claude/` + governance. Lands second so we cut from the latest snapshot.
- **Send the v2 carves upstream** to `bic/openclaw` once the contract surface stabilizes here. The local `v2-prototype` package is meant as a forking-ground, not a permanent home.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
