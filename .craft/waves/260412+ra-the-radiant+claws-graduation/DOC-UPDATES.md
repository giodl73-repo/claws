# Ra Wave — Documentation Updates

Completion checklist: every doc surface touched by Ra I + Ra II, with status.

## New / Changed Specs

- [x] **CL-01 CLI Surface Schema** — 20-verb registry (9 policy + 11 snap), `binaryName` parameterization, exit-code matrix. Updated for `claws` binary name.
- [x] **CL-02 Security Model** — Trust JWT + nonce consume-on-verify + `aud` scope (CP-7 FIX-E), R5 fail-closed wiring, violation-state machine, audit-chain sink plumbing.
- [x] **CL-04 Incremental Compile** (v1.2 §IS) — Per-stage cache keyed on content + stage-input hash, mtime fast-path, atomic emit.
- [x] **CL-06 FormaIR / CL-07 Target Emitters** — OC workspace, OC Gateway plugin, Claude Code skill/plugin, TypeScript codegen.
- [x] **CL-14 Compiler Events** (v1.4 §9.2, §9.5) — 20 discriminated-union event types + `./compiler/events` subpath export + WeakMap `bus.off` detach semantics.

## Package Specs (Ra II)

- [x] `docs/claws/proposals/openclaw-upstream/openclaw-upstream-spec.md` — reflects 4-package shape
- [x] `docs/claws/proposals/openclaw-upstream/specs/workspace.md` — path + ast + canonicalize subpaths
- [x] `docs/claws/proposals/openclaw-upstream/specs/guardrails.md` — 6 subpaths (audit, approvals, budget, identity, siem, secrets) + interfaces
- [x] `docs/claws/proposals/openclaw-upstream/specs/policy.md` — generator + runtime ABI + types
- [x] `docs/claws/proposals/openclaw-upstream/specs/snap.md` — registry + HTTP server + SnapError envelope
- [x] Scenario files: S40 (guardrails-subpaths), S41 (canonicalize-cross-consumer), S42 (snap-promote-precondition) — all with resolution paths

## Concept Guides

- [x] `docs/claws/concepts/pre-extraction-migration.md` — filter-repo boundary (what stays craftworks-side, what lifts to bic/claws, what's deferred) **[post-close: guide was listed here during Ra but never written; added 2026-04-19 to close the silent gap before Horus consumes it as input]**
- [x] `docs/claws/migration/cli-carveout.md` — every row reflects 4-package shape + `claws` binary name
- [x] `docs/claws/migration/diagnostic-id-registry.md` — CLAWS-E → OC-POLICY-E entries (CP-12 P59)
- [x] `docs/craft/concepts/sdk-architecture.md` — no changes needed (astro/ rule unchanged)

## Artifact

- [x] **`claws-sdk/FILTER-REPO-MANIFEST.md`** — NEW (CP-12 P74). Enumerates refs preservation, commit-rewrite rules, path-spec lift list, `.craft/waves/` disposition (stays craftworks-side), docs disposition, verification commands. This is Horus's input document.

## Plan File Status

| Plan | Before | After | Notes |
|------|--------|-------|-------|
| `claws-sdk-graduation` | Draft | **Implemented** | CP-1..CP-7 delivered (Ra I Phase 55) |
| `claws-cap-integration` | Draft | **Implemented** | 43 serve routes landed across CP-5, CP-6, CP-7 |
| `claws-compile-dx` | Draft | **Implemented** | watch + incremental + cache CLI + event bus (pulses 79-83) |
| `claws-pre-extraction-packaging` | Draft | **Implemented** | 4 @bic/openclaw-* packages delivered across CP-8..CP-12 (Ra II Phase 56) |
| `craftworks-package-extraction` | Draft | **Superseded** | Ra I CP-3 invalidated its premise; superseded header added |

## Indexes

- [x] PHASES.md — Ra = Phase 55 (Ra I) + Phase 56 (Ra II)
- [x] PLANS.md — 4 plans moved Active → Implemented
- [x] WAVES.md — wave 93 closed
- [x] SKILLS.md — `craft-start` per-checkpoint discipline exercised
- [x] ROLES.md — claws roles consolidated (role file naming aligned with directory layout per CP-11 push fix)
- [x] CORPUS.md — no new surfaces; existing surfaces (serve, LSP, CLI) kept version rows
- [x] CODEBASE.md — `claws-sdk/packages/` tree added (4 @bic/openclaw-* packages); `claws-lsp/` renamed to `@bic/openclaw-lsp`; FILTER-REPO-MANIFEST.md location documented

## Mirrors

- [x] `.craft/plans/openclaw-upstream-extraction.md` (Wepwawet plan) — source-inventory rewritten in CP-12 P59: every package row's Source column references `claws-sdk/packages/<name>/*` (pre-Horus canonical path). Conformance M12 closure — Ra doesn't leave claws-sdk; filter-repo is Horus's job.

## Counts

- [x] Atom count — no new atoms introduced (existing: atom:claws-compiler, atom:claws-publish, atom:upstream-contrib, atom:claws-sdk, atom:claws-serve, atom:claws-lsp all referenced by Ra II plans)
- [x] Spec count — 5 updated, 0 added repo-wide
- [x] Scenario count — 3 new scenarios added in CP-9 (S40, S41, S42)
- [x] Package count — 4 added in Ra II (`@bic/openclaw-workspace`, `-guardrails`, `-policy`, `-snap`) + 1 renamed (`claws-lsp` → `@bic/openclaw-lsp`) + 2 from Ra I (`@bic/claws-sdk`, `@bic/claws-sdk`)

## Deferred to Later Waves

- **Wepwawet wave** — upstream extraction to `openclaw-core-fork` after Peter greenlights `@openclaw/*` scope
- **Horus wave (next)** — `git filter-repo` run over Ra-output tree per FILTER-REPO-MANIFEST.md; lifts `claws-sdk/packages/*` into `bic/claws/packages/*`
- **Post-Horus waves** — Companion, TUI (ClawPilot), VS Code extension, Eval API (original Ra II scope deferred; these rebuild against final @bic/openclaw-* or @openclaw/* package names)
- **craftworks-modularization wave** — if ever revived, the 12-way dialect extraction from `compiler-sdk` into separate `@craftworks/*` packages (original `craftworks-package-extraction.md` plan, now marked Superseded)

## Notes for Future Waves

- The `--scope @openclaw` flag (CP-12 P57) is the mechanical flip for publishing under the upstream scope. Byte-parity on policy IR + audit manifest across scopes is the test that proves no scope-specific state leaked beyond import lines.
- The `FILTER-REPO-MANIFEST.md` is authoritative input for Horus. Any `.craft/waves/` subtree, docs reference, or source path not enumerated in the manifest does not enter `bic/claws`.
- The `binaryName` parameterization in policy/snap CLI handlers lets the same library power both `claws` (internal) and `openclaw` (upstream) — future surfaces should preserve this pattern rather than hard-coding a CLI framework in handler code.
