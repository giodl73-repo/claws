---
slug: claws-repo-migration
preset: "claws"
plan: "3 headlines: claws source lives entirely in bic/claws with preserved history, craftworks has zero local claws references, fresh-clone CI green + npm install works"
area: claws
status: Active
phase: horus
atoms: [atom:claws-repo-boundary, atom:claws-publish, atom:upstream-contrib]
---

# claws Repo Migration — From craftworks Monorepo to bic/claws

## Headlines

1. **H1: claws source lives entirely in `bic/claws` with preserved git history — the entire claws-* set moves; zero claws in craftworks** — All 7 claws packages (`claws-compiler` [renamed from `claws-sdk`], `claws-sdk`, `claws-cli`, `claws-skill-kit`, `claws-test`, `claws-serve`, `claws-lsp`), design area, docs, wave history, plans, and roles extract cleanly from craftworks into the standalone repo via `git filter-repo`. Ptah/Anubis/Thoth/Ra commit context remains walkable from `git log` and `git blame` inside the new repo. The extraction operates on a fresh temp clone — craftworks main is never mutated during filter-repo. A pre/post `git log` manifest diff validates commit-set preservation, and `git log --follow` is validated across path-renames.
   - Validation: `cd /c/src/claws && git log --all --oneline | wc -l` returns > 1000 commits (preserves substantial wave history).
   - Validation: `cd /c/src/claws && git log --follow src/compile/index.ts` shows commits dated before the migration day, originating from craftworks history.
   - Validation: `cd /c/src/claws && git log --follow design/ATOMS.md` shows commits from the original `design/claws/ATOMS.md` path pre-flatten.
   - Validation: **(a) intra-clone pre-filter vs post-filter commit-set diff** on the real clone — `git log --oneline --all` before filter-repo vs after, zero unexpected losses (every craftworks commit touching migrated paths has a corresponding entry in the claws repo). Signed into `history-preservation-evidence.json` (§6.1).
   - Validation: **(b) dry-run vs real-run inter-clone parity diff** — dry-run manifest SHA-256 equals real-run manifest SHA-256, OR an explicit reviewer-signed diff-approval entry exists explaining each divergence. Signed into `dry-run-parity-evidence.json` (§6.1). Both (a) and (b) are required; neither substitutes for the other (S1-F5).
   - Validation: `ls /c/src/claws/.craft/waves/` contains Ptah, Anubis, and Thoth wave directories.
   - Validation: `ls /c/src/claws/design/` contains `ATOMS.md`, `SPECS.md`, `specs/`, `scenarios/`, `surface-contracts/` (flattened from the original `design/claws/` prefix).

2. **H2: craftworks has zero local references to claws source — it consumes `@bic/claws-*` via GPR like any other consumer** — After migration, craftworks contains no `claws-*/` packages, no `design/claws/`, no `docs/claws/`, no `.craft/plans/claws-*.md`, no `.craft/roles/claws/`, and no claws-named wave directories. All 7 claws packages (including the enterprise tier formerly `@bic/claws-sdk`, now `@bic/claws-sdk`) move. All doc/script residue items identified during Horus planning are scrubbed, plus workflow files (`claws-release.yml`, any `claws-*.yml`) are removed.
   - Validation: `ls /c/src/craftworks/` returns no directory starting with `claws-` — all 7 packages have moved.
   - Validation: `rg "@craftworks/claws" /c/src/craftworks/` returns zero matches (no `-runtime`, `-lsp`, `-serve`, `-sdk`, `-skill-kit`, `-compiler`, `-cli`, `-test` suffixes).
   - Validation: `rg -l '@bic/claws-' /c/src/craftworks/` returns only `package.json` entries and `package-lock.json`.
   - Validation: `CODEBASE.md`, `design/agent/focus/Q12k.md`, `design/agent/focus/Q12m/results/exp-d.md`, `scripts/rewrite-file-deps.sh`, and `.github/workflows/claws-*.yml` no longer reference `@craftworks/claws-*` (updated to reflect the GPR dep model or removed outright).
   - Validation: `cd /c/src/craftworks && npm run build && npm test` passes green with no local claws source present.

3. **H3: claws repo is self-sufficient — fresh-clone CI green and `npm install @bic/claws-cli@0.1.0` runs `claws --help` in an empty directory** — The scaffold CI workflow already committed in `bic/claws` PR #2 un-gates (removes `if: false`), restores `push`/`pull_request` triggers, and its matrix `package` list updates to reflect the real workspaces. A fresh clone builds and tests green. A fresh empty project installs `@bic/claws-cli@0.1.0` from GPR and runs the CLI end-to-end.
   - Validation: GitHub Actions run on the Horus-wave PR in `bic/claws` shows all jobs green (Linux/Windows/macOS × build/unit/integration/e2e/coverage).
   - Validation: In a fresh directory: `git clone https://microsoft.ghe.com/bic/claws && cd claws && npm ci && npm run build && npm test` passes.
   - Validation: In a separate fresh directory: `npm init -y && npm install @bic/claws-cli@0.1.0 && claws --help` runs without error.
   - Validation: Programmatic API smoke — in a fresh empty project, `require('@bic/claws-sdk').compile({workspaceDir: './fixture'})` returns a `CompileResult` without throwing. Verifies the library export surface, not just the CLI entry.
   - Validation: `cd /c/src/claws && npx tsc --noEmit -p tsconfig.json` succeeds across all workspaces.

## Summary

This plan executes the code extraction that the Ra wave (claws graduation) enables. Ra produces `@bic/claws-sdk` with zero `@craftworks/` runtime dependencies and a functioning GHE Packages publish flow; Horus then moves all 7 claws packages and their full wave history into the standalone `bic/claws` repo on `microsoft.ghe.com` via `git filter-repo`, scrubs residual references in craftworks, and verifies both repos are self-sufficient. Per S1 of `contract-seams.md`, the entire `claws-*` set migrates — zero claws source, tests, or docs remain in craftworks. claws is a Microsoft-internal project hosted on `microsoft.ghe.com/bic/claws`; all packages ship as `@bic/claws-*` on GHE Packages (auth-gated). A public-distribution posture (if ever) is a separate future decision and out of scope for Horus. Detailed Phase 2 checklist lives in `bic/claws` [`docs/MIGRATION.md`](https://microsoft.ghe.com/bic/claws/blob/main/docs/MIGRATION.md).

## Coverage Contract

### Specs
- [x] **NEW** — `atom:claws-repo-boundary` spec at `design/claws/specs/CL-13-repo-boundary.md` (authored in craftworks during Horus kickoff; migrates to `bic/claws/design/specs/` alongside the rest of `design/claws/` during extraction per S1 of `contract-seams.md`): documents the two-repo architecture, GPR consumption contract, version pinning rules, and how craftworks and claws stay coherent across the boundary.
- [ ] TBD — a spec amendment to CL-01 (package split) to reflect the repo boundary (all 7 packages on the claws side), or a new cross-cutting spec in the claws repo.

### Concept Guides
- [ ] `bic/claws/docs/MIGRATION.md` — **UPDATE** (already exists as scaffold): finalize Phase 2 execution steps, record filter-repo command, note any path rewrites performed during extraction.
- [ ] `bic/claws/docs/architecture/repo-boundary.md` — **NEW**: canonical guide to the craftworks ↔ claws boundary, dep direction (`@bic/claws-sdk` → `@bic/claws-sdk`), version pinning, how to develop across both repos locally.
- [ ] `bic/claws/CODEBASE.md` — **NEW**: claws-specific equivalent of craftworks' CODEBASE.md, covering the new workspace layout.
- [ ] `bic/claws/CLAUDE.md` — **NEW**: project instructions for agents working inside the claws repo.
- [ ] `craftworks/CODEBASE.md` — **UPDATE**: remove `@bic/openclaw-lsp` / `@bic/claws-serve` catalog rows that still point at removed sources; add note that `@bic/claws-sdk` is consumed externally.

### Scenario Coverage
- [ ] `migration/filter-repo-round-trip` — extract `claws-*` + `design/claws/` + `docs/claws/` + `.craft/` claws slices on a temp clone, verify `git log` history depth and `git blame` walkability.
- [ ] `migration/craftworks-residue-scrub` — after extraction, grep for `@craftworks/claws-runtime`, `@bic/openclaw-lsp`, `@bic/claws-serve`, `claws-sdk`, `design/claws`, `docs/claws` in craftworks; assert each remaining match is explicitly allowed (package.json GPR dep, lockfile, or incidental prose).
- [ ] `migration/fresh-clone-install` — `git clone bic/claws → npm ci → npm run build → npm test` passes.
- [ ] `migration/gpr-consumer-install` — in a scratch directory with no ambient `.npmrc`, `npm init -y && npm install @bic/claws-cli@0.1.0 && claws --help` succeeds (requires GPR auth setup documented).
- [ ] `migration/craftworks-consumes-gpr` — `@bic/claws-sdk` switches from `file:../claws-compiler` (or equivalent) to the GPR version range, `cd craftworks && npm test` stays green.
- [x] `migration/deletion-manifest-tampering` — post-merge GitHub PR body edit window vs signed-manifest cross-link; auditor 2 years later can't verify what was deleted; integrity-audit cron needed (sourced from P-319) [WALKED R2: 3 BLOCKER / 4 MAJOR / 2 MEDIUM / 1 LOW]
- [x] `migration/emergency-downgrade-1h-sla-miss` — CVE in `@bic/claws-cli` during release-eng PTO; consumer lockfile pinning, mirror propagation, test-version-assertions all compound the 1h SLA (sourced from P-326) [WALKED R2: 4 BLOCKER / 5 MAJOR / 2 MEDIUM / 1 LOW]
- [ ] `migration/snap-restore-during-fleet-upgrade` — emergency `claws snap restore` invoked by operator during a rolling `@bic/claws-serve` fleet upgrade; mid-rehydration push race, cross-version artifact compatibility, fleet-scope CISO co-sign SLO, breaking-glass long-operation token semantics, emergency write-hold, post-rollback validation; signed incident-evidence schema extended for rollback-during-upgrade fields (R5 post-pivot 14 findings; sourced from P-349, P-345, P-338, P-326)

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 0 | Migration is mechanical — no new library code to unit test. |
| L1 integration | 3 | filter-repo round-trip, craftworks build+test green post-scrub, claws build+test green post-extract. |
| L2 e2e | 2 | Fresh clone → install → test; GPR install in empty dir → CLI smoke. |
| L3 acceptance | 1 | `@bic/claws-sdk` consumes `@bic/claws-sdk` via GPR, full craftworks suite stays green. |

## Scope

### Preparation (before filter-repo)

Preparation is an explicitly numbered sequence. Skipping any step is detectable by checklist audit (S1-F13). **Definition — dry-run extraction**: a full end-to-end invocation of `tools/migration/claws-extract.sh` producing a complete output tree in a throwaway scratch directory. NOT a `git filter-repo --dry-run` flag (no such flag exists); NOT a no-op preview (S1-F12).

1. **Confirm `Ra-close-evidence.json` is signed-final** (§6.1) with all mandatory fields green — **do not rely on informal "verify Ra has closed" prose** (S3-F15). Required fields: `runtimeDepsChecked`, `devDepsChecked`, `peerDepsChecked`, `optionalDepsChecked`, `transitiveClosureChecked` all true for each of the 8 published tarballs. If any field is missing or yellow, Horus state 1 entry is blocked.
2. **Transitive closure check**: run `npm ls --all --json` against each of the 8 published `@bic/claws-*` tarballs from a `@bic/*`-only registry (no ambient `@craftworks/*` access). Any resolution to `@craftworks/*` — including peer or optional deps — blocks state 1 exit (S3-F12). Evidence appends to `tarball-dep-sweep-evidence.json` (§6.1).
3. **GPR billing tier check**: confirm GitHub org's package-plan limits support ≥8 private `@bic/claws-*` packages. Append API-query output or screenshot to `Ra-close-evidence.json` (S3-F14).
4. **Produce filter-repo manifest** — the definitive list of directories and file globs to extract (see Deliverables § Filter-Repo Manifest).
5. **Take a fresh temp clone** of `bic/claws` in a scratch directory — never mutate the working monorepo.
6. **Freeze craftworks claws-impacting paths against concurrent PRs** during the migration window — announce a freeze start-time, block merges touching the R5 freeze-path globs (extended per S1-F4 to include `scripts/rewrite-file-deps.sh`, `design/agent/focus/Q12**`, `CODEBASE.md`, `.mailmap`, `docs/claws/**`, `.github/workflows/claws-*.yml`, and `claws-*/`, `design/claws/`, `.craft/plans/claws-*.md`). Prevents orphan commits landing between extraction and cleanup.
7. **Dry-run extraction** (as defined above, see also CL-13 §7 state 2.5 `DryRunExtract`): full end-to-end invocation of `tools/migration/claws-extract.sh --source-sha <SHA> --mailmap <path> --mailmap-sha <sha>` against a fresh temp clone. Script MUST refuse to run if working-copy HEAD ≠ pinned SHA (S1-F7). Record dry-run manifest + `dry-run-evidence.json` (§6.1, HMAC-signed). If dry-run operator ≠ real-run operator, a signed `dry-run-handoff-evidence.json` is required (S1-F8, delegated to CL-13).
8. **Real-run extraction** — same pinned `--source-sha`, `--mailmap`, `--mailmap-sha`. Dry-run manifest SHA-256 MUST equal real-run manifest SHA-256 OR a reviewer-signed diff-approval entry explains each divergence (S1-F3). Mailmap SHA pinning per S1-F9 applies to both runs.
9. `git-filter-repo >= 2.38.0` installed and on PATH (`pip install git-filter-repo`); verify with `git filter-repo --version` before invoking the script.

### Extraction (filter-repo)

All 7 claws packages migrate per S1 of `contract-seams.md`. Source → destination mapping:

| Source path (craftworks)      | Destination path (bic/claws) |
|-------------------------------|-----------------------------------|
| `claws-sdk/`                  | `claws-compiler/` (renamed — Ra's compiler core) |
| `claws-cli/`                  | `claws-cli/` |
| `claws-skill-kit/`            | `claws-skill-kit/` |
| `claws-test/`                 | `claws-test/` |
| `claws-serve/`                | `claws-serve/` |
| `claws-lsp/`                  | `claws-lsp/` |
| (enterprise `claws-sdk` extension, if separate dir) | `claws-sdk/` (the paid extension — also moves, publishes as `@bic/claws-sdk`) |

Note: the source-directory inventory must be verified at extraction time (`ls /c/src/craftworks/claws-*`); the renames from `claws-sdk` (compiler core) → `claws-compiler` and the handling of the enterprise `claws-sdk` extension are recorded in `tools/migration/claws-extract.sh` as the authoritative mapping.

**Source-SHA pinning (S1-F7)**: `tools/migration/claws-extract.sh` MUST accept `--source-sha <SHA>` as a required argument and refuse to run if the working-copy HEAD differs from the pinned SHA. This guarantees the script is re-runnable for audit against the exact craftworks state originally extracted; without the pin, the "permanent chain-of-custody" property (§6 R4) is theoretical rather than operational.

- Extract all 7 package directories above with history.
- Extract `design/claws/**` → flatten to `design/` in the claws repo.
- Extract `docs/claws/**` → flatten to `docs/`.
- Extract `.craft/plans/claws-*.md` → `.craft/plans/` (history preserved).
- Extract `.craft/roles/claws/**` → `.craft/roles/`.
- Extract `.craft/waves/*+ptah*`, `*+anubis*`, `*+thoth*` wave directories → `.craft/waves/`.
- Extract Ra-wave claws-associated history — **binary decision (steward-M4)**: take **ALL** Ra-wave history associated with claws packages. Commits touching only non-claws paths are dropped; commits touching both claws and non-claws paths are kept (with both-sides context intact) into `.craft/waves/260412+ra-the-radiant+claws-graduation/`. Ra-wave blame for the freemium boundary is preserved end-to-end.

### Destination (bic/claws)
- Merge filtered history into `bic/claws` main via a dedicated branch (e.g. `feature/horus-migration`) — open PR, review, merge.
- Fill root `package.json` `workspaces` array with all 7 real workspaces.
- Un-gate `.github/workflows/test.yml` (remove `if: false`, restore `push`/`pull_request` triggers, update matrix to list all 7 packages).
- Add release workflow `.github/workflows/release.yml` per the **Release Workflow Spec** below that publishes `@bic/claws-*` to GPR on tag (replaces the craftworks one).
- Write `bic/claws/CODEBASE.md`, `bic/claws/CLAUDE.md`, `bic/claws/docs/architecture/repo-boundary.md`.
- Update `bic/claws/docs/MIGRATION.md` to record the actual commands run + post-migration state.
- Update scaffold `README.md` with the following disclosure: "claws is a Microsoft-internal project hosted on `microsoft.ghe.com/bic/claws`. Packages publish to GHE Packages. A public-distribution posture (if ever) is a separate future decision and out of scope for Horus. Install requires `.npmrc` auth against `npm.pkg.microsoft.ghe.com` — see `docs/operations/ghe-packages-auth.md`."

### Release Workflow Spec (release-eng-M1, release-eng-M5)

The `.github/workflows/release.yml` in the claws repo specifies:

- **Trigger**: git tag matching `vX.Y.Z` (semver); manual workflow-dispatch allowed for pre-release candidates only (`vX.Y.Z-rc.N`).
- **Atomic publish**: all 7 `@bic/claws-*` packages publish together or none do. A publish failure on any package rolls back the others (no partial releases). Implementation: sequential `npm publish` with `--dry-run` pre-flight across all packages, then real publish; if any step fails, emit a `GOVERNANCE_RELEASE_ABORTED` entry and halt.
- **Pre-tag gates** (must pass before tag is accepted):
  - Fresh-clone smoke: `git clone && npm ci && npm run build && npm test` on Linux, Windows, macOS.
  - Dogfood test: `npm install @bic/claws-sdk@<candidate>` in an empty directory, run `claws --help` and a canonical `claws build` against a fixture workspace.
  - TypeScript green: `npx tsc --noEmit` across all workspaces.
- **Rollback procedure**: published versions cannot be unpublished on GPR after 72h; rollback = deprecate the bad version via `npm deprecate @bic/claws-*@<bad> "deprecated: use <good>"` and publish a corrective `vX.Y.(Z+1)`. Document the rollback playbook in `docs/operations/release-rollback.md`.
- **First post-migration version**: `0.1.0` across all 7 packages, resetting semver — integrity-hash provenance (Ra's `generatorVersion` / artifact-hash contract) starts fresh in the new repo. The reset is a one-time event recorded in the release workflow spec and `docs/MIGRATION.md`.
- **Emergency-patch `generatorVersion` backward-compat rule (S5-F10)**: when publishing an emergency security patch (CL-13 §3 / §3.1 path), the patched release's `generatorVersion` semver prefix MUST be backward-compatible with the deprecated range's `generatorVersion` prefix (semver-compatible within the same major.minor lineage). Breaking `generatorVersion` format changes are forbidden on the emergency path — they invalidate consumer `ProducerEntry` validations mid-incident. Release workflow asserts this at publish time via `tools/release/assert-generator-version-compat.sh`; failure blocks publish with a `GOVERNANCE_EMERGENCY_INCOMPATIBLE_GENERATOR_VERSION` governance entry.
- **`generatorVersion` composition rule** (cross-plan S3-F1 — disambiguates pre/post-migration builds): the `generatorVersion` field in every emitted audit entry MUST use the format `{semver}+{repo}:{commitSha}` where `{repo}` is either `bic/claws` (pre-migration legacy) or `bic/claws` (post-migration). Example post-migration: `0.1.0+bic/claws:a1b2c3d4`. Example legacy: `0.1.0+bic/claws:9f8e7d6c`. Consumers (Aether, Lobster) parse this to distinguish build origin. Spec carrier: contract-seams.md §S7 (seam agent applies the full schema).
- **Permissions**: workflow-level `permissions: packages: write` scoped only to the release job; other jobs use `packages: read`.
- **Signed tags**: release workflow invokes `git tag -s vX.Y.Z -m '...'` using the claws release key; unsigned tags rejected by CI.
- **Sourcemaps**: each published `@bic/claws-*` tarball includes inline sourcemaps (`tsup --sourcemap inline` or equivalent); debuggability across the two-repo boundary depends on this.

### craftworks cleanup

**Generated inventory first (S2-F3)** — hand-enumerated deletion lists miss sibling directories (`docs/claws-historical/`, `docs/claws-archive/`, `claws-legacy-tests/`). Run `tools/migration/claws-inventory.sh` to produce the definitive deletion path list matching `**/*claws*` (basename AND path). Review, sign as `deletion-inventory-evidence.json` (§6.1) before state 7. The deletion PR deletes exactly this inventory's path list — nothing more, nothing less.

- Delete all 7 claws package directories (`claws-sdk/`, `claws-cli/`, `claws-skill-kit/`, `claws-test/`, `claws-serve/`, `claws-lsp/`, plus any enterprise `claws-sdk` extension dir if separate) — cross-checked against the generated inventory.
- Delete `design/claws/`, `docs/claws/`, `.craft/plans/claws-*.md`, `.craft/roles/claws/`, claws-named wave dirs — cross-checked against the generated inventory (including any sibling directories like `docs/claws-historical/`, `docs/claws-archive/`, `claws-legacy-tests/` surfaced by the inventory script).
- Scrub residue files (full list — use negative grep across all claws package suffixes `-runtime|-lsp|-serve|-sdk|-skill-kit|-compiler|-cli|-test` to ensure completeness):
  - `CODEBASE.md:352,364` — remove `@bic/openclaw-lsp` / `@bic/claws-serve` catalog rows and update to reflect that claws is consumed via GPR from `bic/claws`.
  - `design/agent/focus/Q12k.md` — **per-reference checklist (S2-F9)**: the file has 3 references to `@craftworks/claws-runtime` in the Phase 5 EMIT section. Each reference requires an explicit per-ref sign-off in the deletion PR: (1) Q12k.md L_a, (2) Q12k.md L_b, (3) Q12k.md L_c — exact line numbers resolved at state 7 entry and attached to `deletion-manifest.yaml` as before-after diffs. A partial edit (fixing 2 of 3) must fail PR review; no "revise or remove" ambiguity.
  - `design/agent/focus/Q12m/results/exp-d.md` — scrub or leave as historical artifact (experiment result showing a `@bic/claws-sdk` package.json snippet).
  - `scripts/rewrite-file-deps.sh:23` — remove the `@bic/claws-sdk=file:../claws-sdk` rewrite rule line.
  - `.github/workflows/claws-release.yml` (and any other `claws-*.yml`) — delete; release workflow now lives in the claws repo.
  - License-header preservation pre-flight: grep `@license|Copyright` across migrating paths before extraction; verify all headers round-trip in the filtered clone.
- Update craftworks root `package.json` `workspaces` array — remove all 7 migrated packages.
- Update `.github/workflows/` — remove any `claws-*` matrix entries and delete `claws-*.yml` workflow files.
- **Deletion PR path-mapping table (compliance-M4)**: the craftworks deletion PR body includes a table mapping every deleted path to its new location in `bic/claws`, with the destination commit SHA. Example row: `claws-sdk/src/compile/index.ts` → `bic/claws@<sha>:claws-compiler/src/compile/index.ts`. One row per deleted file or directory (directory-level rows acceptable where the entire subtree moves atomically).

### Verification
- `cd /c/src/craftworks && npm ci && npm run build && npm test` — all green.
- `cd /c/src/claws && npm ci && npm run build && npm test` — all green.
- Fresh empty directory (scratch directory; no ambient `.npmrc` present): `npm install @bic/claws-cli@0.1.0 && claws --help` — succeeds (CLI is in the migrating set per S1).
- Negative-grep sweep across all claws suffixes: `rg "@craftworks/claws-(runtime|lsp|serve|sdk|skill-kit|compiler|cli|test)" /c/src/craftworks/` — zero hits in code/scripts/docs/workflows.
- **Intra-clone pre-filter-vs-post-filter commit-set diff** (`git log --oneline --all` before vs after filter-repo, same clone) recorded and reviewed — no unexpected commit losses across the migrated paths. This is distinct from the **dry-run-vs-real-run inter-clone parity diff** under §Preparation step 8; both are required and both sign separate evidence artifacts (S1-F11).
- `.github/acl/` and `.github/compliance/` directory contents pre/post diff: no craftworks compliance scaffolding inadvertently removed; no claws-specific compliance scaffolding inadvertently left behind.
- Emitted-skill import paths post-rename: after migration, any emitted governance skill (from fixture compile) must reference `@bic/claws-*` import paths, zero `@craftworks/claws-*` in the emitted output.

## Deliverables

### Specs & Design
- [x] Headline-level spec entry for `atom:claws-repo-boundary` authored at `design/claws/specs/CL-13-repo-boundary.md` (spec id **CL-13** reserved in `design/claws/SPECS.md` v1.2; ships in craftworks now, migrates to claws repo alongside rest of `design/claws/` during extraction).
- [ ] `bic/claws/docs/architecture/repo-boundary.md` — concept guide for the cross-repo dep model.
- [ ] Filter-repo manifest — `tools/migration/claws-extract.sh` is a **permanent chain-of-custody artifact** (per C4 / compliance-M1), committed to **both** `bic/claws` and `bic/claws` repos. Captures the exact `git filter-repo` invocation, source-to-destination path rewrites (per the Extraction mapping table), branch names, and `--mailmap` usage. The script is re-runnable for audit / re-extraction — it is not deleted after Horus merges.

### SDK Logic (none — this plan is extraction, not code)
- [ ] N/A — no new SDK modules. All movement is existing code under new paths.

### CLI Wiring (none)
- [ ] N/A.

### Operational Runbooks (new deliverables — support state machine + rollback)
- [ ] `docs/operations/residue-runbook.md` (S2-F8, S4-F3) — owner: `claws-repo-steward`. Covers weekly §9 cron alert triage (active-code vs prose), open residue-fix PR with `horus-residue-fix` label, target `signed-final` evidence, when to escalate to full R6 vs the lightweight R6.1 path. **Expected-delete-list derivation (S4-F3)**: the runbook MUST derive the "paths-to-expect-gone" list from the signed `deletion-manifest.yaml` `pathMappings` array (1st-class YAML field per S4-F1 DELEGATED to CL-13 §6.1), never from the mutable GitHub PR body. Runbook asserts the manifest HMAC-hash at fetch time and refuses to run against an unsigned manifest.
- [ ] `docs/operations/boundary-oncall.md` (S2-F14) — distributed on-call coverage schedule for boundary-critical merges. Defines "business hours" for SLA computation. References 2-maintainer requirement (steward-N3 amend).
- [ ] `docs/operations/rollback-runbook.md` (S3-F9) — documents post-merge rollback procedure when state 7 merge commit (~1000s of files) must be reverted after Thaw and post-Thaw merges have landed. Covers conflict-region identification, rebase of revert over intervening merges, steward + release-eng sign-off. Expected timeline: up to 48h for high-conflict revert.
- [ ] `docs/operations/prior-wave-reopen-runbook.md` (S3-F3) — governs the process when R6 rollback reveals a prior-wave defect invalidating PreFlight entry (e.g. Ra was wrongly declared closed). Records prior wave id, defect description, re-open approver, re-open timeline, and the sequencing by which Ra can be administratively re-opened so Horus state 1 entry becomes legal again.
- [ ] `tools/migration/generate-deletion-manifest.sh` (S2-F12) — emits a signed `deletion-manifest.yaml` from the PR's file-change list. Reviewers edit PR source files; regeneration is deterministic. Avoids hand-edit signature mismatches during F-c-style review cycles.
- [ ] `tools/migration/claws-inventory.sh` (S2-F3) — outputs every craftworks path matching `**/*claws*` (basename AND path). Used pre-state-7 to generate the definitive deletion path list; signed as `deletion-inventory-evidence.json`.
- [ ] `docs/operations/pr-body-tampering-runbook.md` (S4-F6) — owner: `claws-repo-steward`. Triage flow when the deletion-PR-body integrity-audit cron fires: (1) was the edit authorized — counter-signed `deletion-manifest-amendment-evidence.json`; (2) if unauthorized, restore body via GitHub REST API using the `pr-edit-history-at-merge-evidence.json` baseline (S4-F4 DELEGATED to CL-13 §6.1); (3) open SEV-2 incident ticket; (4) emit `pr-body-tampering-response-evidence.json` (signed, 7-year). Distinguishes "authorized amendment" (tracked, counter-signed) from "unauthorized tampering" (SEV-2 + key-rotation). Quarterly synthetic-tamper drill validates the runbook end-to-end within a 2h target.
- [ ] `.github/rulesets/horus-deletion.yml` (S4-F5) — GitHub ruleset (or webhook equivalent if ruleset unavailable) requiring `CODEOWNERS` review on `pull_request.edited` events for PRs labeled `claws-boundary-deletion`, enforced for the PR's full lifetime (not just pre-merge). Fallback CI job watches `pull_request.edited` webhooks post-merge and opens an incident ticket on any unsanctioned edit.
- [ ] `docs/operations/emergency-downgrade-oncall.md` (S5-F1) — owner: `claws-release-eng`. Documents the 24×7 on-call rotation backing CL-13 §3's 1h emergency-downgrade SLA: ≥2 people hold `@bic/*` GHE Packages `admin` rights at all times; US + EU coverage; primary + secondary contacts; escalation path to `bic-org-admins` on-call if both primaries unreachable; quarterly rehearsal deprecation against a throwaway `@bic/rehearsal-*` scope validates rotation + runbook; rotation changes update this doc within 24h and are signed into `oncall-rotation-evidence.json` (§6.1, DELEGATED to CL-13).
- [ ] `docs/operations/emergency-downgrade-runbook.md` (S5-F9) — owner: `claws-release-eng`. Exact procedure for responding to a CRITICAL CVE in a published `@bic/claws-*` tarball: `npm deprecate --registry=https://npm.pkg.microsoft.ghe.com <pkg>@<range> '<reason>'` invocation with credential paths, mirror-invalidation API calls (per `mirror-policy.md`), stakeholder communication template, patched-minor rollout, rollback procedure, and signed `emergency-downgrade-evidence.json` template. Tested quarterly via rehearsal against `@bic/rehearsal-*`. Second-maintainer "breaking-glass" scenario is a tested code path, not an ad-hoc one.
- [ ] `docs/operations/mirror-policy.md` (S5-F5) — owner: `claws-release-eng` + `bic-org-admins`. Mirror-invalidation SLA table for air-gapped `@bic/*` enterprise mirrors: `CRITICAL = 1h` from deprecation to mirror push, `HIGH = 4h`, `MEDIUM = 24h`. Every mirror must subscribe to the GHE Packages security webhook and force-sync within SLA. Tenants running mirrors with slower sync cadences are flagged red in the `bic-org-admins` dashboard. Mirror owners countersign an annual attestation acknowledging the SLA.
- [ ] `.github/hooks/npm-audit-check.js` (S5-F3) — org-wide `.npmrc`-enforced pre-install hook that fails-closed on any tarball carrying a `blockReason` field (GHE Packages metadata extension for CRITICAL/RCE CVEs). Complements `npm deprecate` (which is a WARNING, not a BLOCK); ensures consumer `npm ci`/`npm install` cannot silently resolve an RCE-vulnerable tarball even when lockfile integrity hashes still match. Configured at the `@bic/*` scope in the org-wide `.npmrc` template shipped with `docs/operations/ghe-packages-auth.md`.
- [ ] **Deletion-PR-body integrity-audit cron (S4-F2)** — new recurring job (wired from CL-13 §9 weekly cron; cron definition DELEGATED to CL-13 §9): re-fetches the deletion PR body via the GitHub GraphQL API on a rotating schedule (quarterly full scan across all 42+ Horus-class deletion PRs + weekly 20% sampled scan, per S4-F7), re-hashes the body, compares against the signed `deletion-manifest.yaml` `prBodySha256`. Mismatch pages `claws-repo-steward` and writes `pr-body-tampering-detected-evidence.json` (schema DELEGATED to CL-13 §6.1). Plan-side owns only the operational hook-up; cron definition and SIEM rule live in CL-13 §9.

### Cross-Repo Operations
- [ ] `bic/claws` PR merging the migration (replaces the scaffold PR #2 after un-gating).
- [ ] `bic/claws` PR removing migrated dirs and scrubbing residue. Body includes the deletion path-mapping table (per compliance-M4 above).
- [ ] craftworks-side CHANGELOG entry: add a `## Removed` section under the next minor version noting claws extraction, linking to `bic/claws@<initial-sha>`.
- [ ] Coordinated merge order: claws migration PR lands → GPR publish of `@bic/claws-*` v0.1.0 tag → craftworks PR removing migrated dirs lands. **Merge order owner**: `claws-release-eng` role.
- [ ] **Green-main precondition (S2-F2)**: state 7 entry requires `bic/claws@main` CI green for the last commit before the PR branch diverged. If red, either resolve the unrelated failure or acquire explicit steward override documented in `main-ci-waiver-evidence.json` (§6.1). Opening the deletion PR into a red `main` is NOT a legal state transition.
- [ ] **SLA** with operational consequence matrix (S2-F7): craftworks deletion PR merges within **24 business hours** (business hours defined in `docs/operations/boundary-oncall.md` per S2-F14) of claws inaugural PR, to minimize split-state window. Consequence tiers:
  - **< 24h**: routine.
  - **< 48h**: steward review required; append `sla-extension-evidence.json` (§6.1) with rationale.
  - **< 72h**: release-eng + compliance joint signoff required.
  - **≥ 72h**: §7 `DeletePR:Failed` transition with signed rationale and full post-mortem.
- [ ] **Deletion PR label + title convention (S2-F15)**: title prefix `[horus-deletion]`; label `claws-boundary-deletion`; use template at `.github/pull_request_template/horus-deletion.md` enumerating mandatory sections (path-mapping table, CI-green confirmation, reviewer sign-off). Enables automated alerting and historical auditability.
- [ ] Release workflow lands in claws repo before first post-migration publish (per the Release Workflow Spec in Scope).
- [ ] Write `docs/operations/ghe-packages-auth.md` per S2 of `contract-seams.md` — single authoritative GPR auth doc (owner, rotation cadence, `.npmrc` template, CI setup, offline fallback, audit destination, least-privilege workflow permissions). Consumer repos (aether, lobster, cowork, sim) reference this doc; none fork it. Lives in the claws repo.
- [ ] Scaffold `README.md` in the claws repo discloses the GHE Packages auth requirement and bic-internal posture (see Destination section above).
- [ ] **Consumer version-pin lint rule (S5-F4)**: add a shared lint config shipped via `@bic/claws-test` (or the nearest shared lint package) that flags any test assertion of the form `expect(<cliVersion>).toBe('X.Y.Z')` against a `@bic/claws-*` version as an ERROR. Permitted forms: `expect(version).toMatch(/^0\.2\./)`, feature-detection, or range assertions. Cross-repo coordination pulse (aether, lobster, cowork, sim) removes any existing exact-pin assertions before the first emergency-downgrade rehearsal. Rationale: CL-13 §3.1 emergency-downgrade path fails if consumer tests pin the exact vulnerable version and break under patched-version adoption.
- [ ] **Consumer auto-adoption of CRITICAL CVE patches (S5-F6)**: every downstream consumer repo (aether, lobster, cowork, sim, any other `@bic/claws-*` consumer) subscribes to the `@bic/*` GHE Packages security webhook. CRITICAL-severity CVE patches trigger an automated dependabot-style MR with an `auto-merge-critical-cve` label; bot identity signs the merge; standard-review bypass is logged and audit-chained (not silent). Target adoption SLA: **≤ 4h** from patch-publish to merged-in-main on each consumer. Consumer-side obligation captured in each consumer repo's `docs/operations/security-patch-adoption.md`; the seed template lives in this plan's `docs/operations/emergency-downgrade-runbook.md` deliverable.
- [ ] **Running-container CLI-deprecation signal (S5-F8, cross-plan to lobster)**: `lobster-claws-serve-integration` plan must extend the `/api/chunks/governance-health` surface with `cliVersionDeprecated: bool`, `cliVersionDeprecationReason: string`, `cliVersionDeprecationSeverity: 'info'|'warn'|'critical'`. Lobster polls GHE Packages metadata every 6h (or on security-webhook push). Cowork consumers render a red banner on `CRITICAL` — baked-in `@bic/claws-cli@<vulnerable>` becomes visible without container redeploy. Cross-plan reference, not owned by Horus migration plan, but called out here so the lobster plan picks it up.

### Scenario Findings (added during wave)
*(empty — populated during implementation)*

## Out of Scope

- **ClawPilot / device runtime migration** — separate wave. Note: ensure the claws repo's `docs/architecture/repo-boundary.md` describes extension points so ClawPilot integration later doesn't require repainting the boundary.
- **Freemium packaging decision** — per D1 of `contract-seams.md`, not applicable during Horus. On `microsoft.ghe.com/bic/claws`, claws is an internal Microsoft-hosted project; all 7 claws packages move together and publish as `@bic/claws-*` on GHE Packages (auth-gated). Freemium commercial-tiering is only meaningful if/when claws ships publicly — a separate future decision outside Horus scope.
- **Potential future public distribution** — out of Horus scope. claws stays on `microsoft.ghe.com/bic/claws` via GHE Packages during Horus; any future public-distribution posture is a separate future decision.
- **Aether and Lobster consumer-side wiring** — covered by sibling Horus plans `aether-claws-serve-integration` and `lobster-claws-serve-integration`.
- **compiler-sdk dialect decomposition** — covered by Ra's `craftworks-package-extraction` plan; must land before Horus so the `@craftworks/*` extracted packages that `@bic/claws-sdk` consumes are stable.

## Scenario Findings

Hand-simulation findings surfaced during Horus wave scenario walk. Each finding has been catalogued to a scenario file under `.craft/waves/260416+horus-the-heir+claws-migration/scenarios/migration/`. Findings that require plan edits are checkboxed; resolved items are checked as we apply fixes.

### Series: migration

#### [S1] filter-repo-dry-run-vs-real-divergence
- [ ] F1 (BLOCKER): Dry-run is not a §7 state — operator can legally skip it under runway pressure → CL-13 §7 + §6.1 (add `DryRunExtract` state + evidence) [DELEGATED → CL-13; plan §Preparation step 7 references the future state]
- [ ] F2 (BLOCKER): `history-preservation-evidence.json` does not pin upstream craftworks SHA; "re-runnable" property is non-deterministic → CL-13 §6.1, §6 R4 [DELEGATED → CL-13; plan §Extraction now mandates `--source-sha` enforcement in tooling]
- [ ] F3 (BLOCKER): State 3→4 transition cannot detect dry-run/real divergence; no parity check anywhere → CL-13 §7 state 4, §Validation, §6.1 (`dry-run-parity-evidence.json`) [DELEGATED → CL-13; plan §Headlines H1 + §Preparation step 8 surface the parity requirement]
- [ ] F4 (MAJOR): Freeze path-globs exclude material residue files (rewrite-file-deps.sh, Q12m, CODEBASE.md, .mailmap, workflows) → CL-13 §6 R5 [DELEGATED → CL-13 §6 R5; plan §Preparation step 6 enumerates the extended globs]
- [x] F5 (MAJOR): Plan H1 conflates pre/post-filter manifest diff with dry-run/real-run parity diff → Plan §Headlines H1 [APPLIED: H1 validation split into (a) intra-clone + (b) inter-clone]
- [ ] F6 (MAJOR): Mailmap SHA not pinned in evidence; mid-window mailmap changes alter author attribution silently → CL-13 §6.1, §6 R1 [DELEGATED → CL-13]
- [x] F7 (MAJOR): `claws-extract.sh` doesn't require `--source-sha <SHA>` pin; re-run non-deterministic → CL-13 §6 R4, Plan §Extraction [APPLIED to plan §Extraction; CL-13 §6 R4 seam portion → DELEGATED]
- [ ] F8 (MEDIUM): No mandated operator-identity hand-off between dry-run and real-run operators → CL-13 §6.1 default inheritance [DELEGATED → CL-13]
- [x] F9 (MEDIUM): `--mailmap` binary decision doesn't pin mailmap file path + SHA; extract behavior can change silently → Plan §Notes; §Preparation [APPLIED: Author attribution bullet pins path+SHA; Preparation step 7 invokes them]
- [ ] F10 (MEDIUM): PRs can land between dry-run and Freeze start; no rule prohibits it → CL-13 §7 state 1-2 [DELEGATED → CL-13]
- [x] F11 (LOW): "Manifest" terminology conflated (intra-clone pre/post vs inter-clone dry/real) → Plan §Verification; CL-13 §6.1 [APPLIED to plan §Verification; CL-13 §6.1 portion → DELEGATED]
- [x] F12 (LOW): "Dry-run" never defined in spec/plan; risks misinterpretation as `--dry-run` flag → CL-13 §0 glossary; Plan §Preparation [APPLIED to Preparation definition; CL-13 glossary → DELEGATED]
- [x] F13 (LOW): Preparation bullets unnumbered; skipping dry-run undetectable by checklist → Plan §Preparation [APPLIED: 9 numbered steps]

#### [S2] deletion-pr-24h-sla-miss-scenarios
- [ ] F1 (BLOCKER): §7 state 7 has no SLA-miss sub-state or evidence artifact; SLA misses are silent → CL-13 §7, §6.1 (`sla-extension-evidence.json`) [DELEGATED → CL-13; plan §Cross-Repo Operations consequence matrix references `sla-extension-evidence.json` and the `DeletePR:Failed` transition]
- [x] F2 (BLOCKER): Red `main` CI blocks state 7 exit with no entry precondition nor escape-valve → CL-13 §7 state 7; Plan §Cross-Repo Operations [APPLIED to Cross-Repo Operations green-main bullet; CL-13 §7 state 7 seam → DELEGATED]
- [x] F3 (BLOCKER): Hand-enumerated delete list misses sibling dirs (`docs/claws-historical/`, etc.); no generated inventory → Plan §craftworks cleanup; CL-13 §6.1 [APPLIED: inventory-first clause + `claws-inventory.sh` deliverable; CL-13 §6.1 evidence row → DELEGATED]
- [ ] F4 (BLOCKER): R6 is disproportionate for small residue fixes; operators will skip it, creating audit gaps → CL-13 §6 R6 (add R6.1 lightweight path) [DELEGATED → CL-13; plan residue-runbook deliverable anchors the lightweight path]
- [ ] F5 (MAJOR): Single-maintainer review is SPOF; holiday/outage scenarios unmitigated → CL-13 §Notes steward-N3 [DELEGATED → CL-13; plan `boundary-oncall.md` deliverable supports 2-maintainer policy]
- [ ] F6 (MAJOR): Deletion-manifest write-once posture breaks realistic review cycles; no draft→final distinction → CL-13 §6.1 access control [DELEGATED → CL-13]
- [x] F7 (MAJOR): 24h SLA has no documented operational consequence; aspirational only → Plan §Cross-Repo Operations; CL-13 §7 [APPLIED: consequence matrix (< 24h / < 48h / < 72h / ≥ 72h); CL-13 §7 `DeletePR:Failed` → DELEGATED]
- [x] F8 (MAJOR): Weekly cron found-residue runbook missing; no prescribed operator response → Plan §Deliverables; CL-13 §9 [APPLIED: `docs/operations/residue-runbook.md` new deliverable; CL-13 §9 amend → DELEGATED]
- [x] F9 (MAJOR): Partial-edit risk on Q12k.md (3 refs listed without per-ref sign-off) → Plan §craftworks cleanup [APPLIED: per-reference checklist requirement + diff attachment]
- [ ] F10 (MEDIUM): Freeze window ≤24h creates race with state 7 stall; auto-lift during open state 7 → CL-13 §6 R5, §7 [DELEGATED → CL-13]
- [ ] F11 (MEDIUM): Residue-grep excludes `-runtime` suffix; Q12k `@craftworks/claws-runtime` refs slip through → CL-13 §Validation [DELEGATED → CL-13]
- [x] F12 (MEDIUM): No tooling for regenerating deletion-manifest.yaml mid-review; hand-edits break signatures → Plan §Deliverables [APPLIED: `tools/migration/generate-deletion-manifest.sh` new deliverable]
- [ ] F13 (MEDIUM): No evidence field anchors reviewer identity on state 7 exit → CL-13 §6.1 [DELEGATED → CL-13]
- [x] F14 (LOW): 24h SLA expressed without time-zone / business-hours clarification → Plan §Cross-Repo Operations [APPLIED: "24 business hours" with `docs/operations/boundary-oncall.md` reference]
- [x] F15 (LOW): No deletion PR label/title/template convention → Plan §Cross-Repo Operations [APPLIED: title prefix + label + template path]

#### [S3] ra-still-open-horus-cannot-start-dependency-trap
- [ ] F1 (BLOCKER): PreFlight entry excludes devDeps/peerDeps/optionalDeps; test-fixture and peer-dep leaks slip through → CL-13 §7 state 1; §6.1 [DELEGATED → CL-13; plan §Preparation step 1 requires all 4 dep-class green in `Ra-close-evidence.json`]
- [ ] F2 (BLOCKER): No mandated GPR rehearsal publish; real v0.1.0 is the first-ever test → CL-13 §7 (add state 4.5 `RehearsalPublish`), §6.1 [DELEGATED → CL-13]
- [x] F3 (BLOCKER): R6 assumes Ra stays closed; "Ra wrongly declared closed" has no defined re-open path → CL-13 §6 R6 (add R6.2); Plan §Deliverables [APPLIED: `docs/operations/prior-wave-reopen-runbook.md` deliverable; CL-13 §6 R6.2 → DELEGATED]
- [ ] F4 (BLOCKER): §4.1 atomic-publish aspirational for first publish; partial landing leaves permanent deprecate banners → CL-13 §4.1, §6.1 [DELEGATED → CL-13]
- [ ] F5 (MAJOR): Residue-grep doesn't sweep published tarball dep fields or transitive closure → CL-13 §Validation; §6.1 (`tarball-dep-sweep-evidence.json`) [DELEGATED → CL-13; plan §Preparation step 2 references the tarball dep sweep]
- [x] F6 (MAJOR): Blocked-by prose not machine-checkable; operators sign off informally → Plan §Notes [APPLIED: Notes Blocked-by bullet rewrites to per-field green criteria]
- [x] F7 (MAJOR): 2-month runway pressure has no "slow path" escape-hatch when Ra close is incomplete → Plan §Notes [APPLIED: Ra-incompletion escape hatch Notes bullet]
- [ ] F8 (MAJOR): Token-rotation propagation lag unaddressed; stale-cache can split pre-flight and real publish → CL-13 §5 [DELEGATED → CL-13]
- [x] F9 (MAJOR): State 7 revert has high conflict risk after post-Thaw merges; no rollback runbook → CL-13 §6 R6; Plan §Deliverables [APPLIED: `docs/operations/rollback-runbook.md` new deliverable; CL-13 §6 R6 amend → DELEGATED]
- [ ] F10 (MEDIUM): `Ra-close-evidence.json` schema under-specified; truthful but incomplete signing is possible → CL-13 §6.1 [DELEGATED → CL-13]
- [ ] F11 (MEDIUM): Consumer-repo pin-update coordination (24h) unrealistic during post-mortem period → CL-13 §3 [DELEGATED → CL-13]
- [x] F12 (MEDIUM): Peer-dep transitive resolution not covered by Ra-close verification → Plan §Preparation; CL-13 §Validation [APPLIED: §Preparation step 2 mandates `npm ls --all --json` against each tarball; CL-13 §Validation → DELEGATED]
- [ ] F13 (MEDIUM): Tag-signing first-run distribution not covered by §4.3 rotation-only language → CL-13 §4.3, §7 [DELEGATED → CL-13]
- [x] F14 (LOW): GPR billing/plan tier unchecked; package-count limits can block atomic publish → Plan §Preparation [APPLIED: §Preparation step 3]
- [x] F15 (LOW): "Verify Ra has closed" prose invites informal check; should cite signed evidence artifact → Plan §Preparation [APPLIED: §Preparation step 1 cites signed-final `Ra-close-evidence.json`]

**Totals (S1–S3)**: 10 BLOCKER, 17 MAJOR, 11 MEDIUM, 5 LOW across 3 scenarios (43 findings)

#### [S4] deletion-manifest-tampering
- [ ] F1 (BLOCKER): CL-13 §6.1 cross-references PR body as authoritative for path-mapping table; GitHub PR bodies are mutable post-merge → CL-13 §6.1 (add `pathMappings` as 1st-class YAML field) **DELEGATED — target: CL-13 §6.1 deletion-manifest schema; seam agent applies**
- [x] F2 (BLOCKER): No integrity-audit cron monitors post-merge PR body tampering → Plan §Deliverables (cron hookup); CL-13 §9 (cron definition) [APPLIED: deletion-PR-body integrity-audit cron deliverable added; CL-13 §9 cron definition → DELEGATED]
- [x] F3 (BLOCKER): Residue-grep runbook may cite mutable PR body to compute expected-delete-list → Plan §Deliverables residue-runbook [APPLIED: residue-runbook deliverable amended to derive expected-delete-list from signed manifest, asserting HMAC-hash at fetch]
- [ ] F4 (MAJOR): GitHub edit history not archived to signed evidence → CL-13 §6.1 (new `pr-edit-history-at-merge-evidence.json` artifact) **DELEGATED — target: CL-13 §6.1; seam agent applies**
- [x] F5 (MAJOR): No separation-of-duties for post-merge edits to boundary-critical PRs → Plan §Deliverables [APPLIED: `.github/rulesets/horus-deletion.yml` new deliverable]; CL-13 §6 R5 threat-model portion → DELEGATED
- [x] F6 (MAJOR): No documented process to respond to detected tampering → Plan §Deliverables [APPLIED: `docs/operations/pr-body-tampering-runbook.md` new deliverable]
- [ ] F7 (MAJOR): Integrity-audit scope not multi-wave; quarterly full + weekly sampled scan needed → CL-13 §9 runbook scope **DELEGATED — target: CL-13 §9; plan cron deliverable names the quarterly-full + weekly-20%-sampled cadence so the seam agent can formalize it in §9**
- [ ] F8 (MEDIUM): Plan does not name "PR body tampering" as a distinct threat class in §6 R5 threat-model → CL-13 §6 R5 **DELEGATED — target: CL-13 §6 R5; seam agent applies**
- [ ] F9 (MEDIUM): No rehearsal drill for tampering response → CL-13 §9 quarterly chaos drill **DELEGATED — target: CL-13 §9; drill expectation referenced in the pr-body-tampering-runbook deliverable (2h target), formal cron definition owned by CL-13**
- [ ] F10 (LOW): Archived PR edit history artifact not cross-linked from `deletion-manifest.yaml` → CL-13 §6.1 schema (`prEditHistoryAtMergeEvidenceUrl` required field) **DELEGATED — target: CL-13 §6.1 schema; seam agent applies**

#### [S5] emergency-downgrade-1h-sla-miss
- [x] F1 (BLOCKER): 1h emergency-downgrade SLA depends on single named role with no documented backup → Plan §Deliverables [APPLIED: `docs/operations/emergency-downgrade-oncall.md` new deliverable — ≥2 admin holders, 24×7 US+EU rotation, quarterly rehearsal]; CL-13 §3.1 seam portion → DELEGATED
- [ ] F2 (BLOCKER): No signed evidence artifact for emergency-downgrade events → CL-13 §6.1 (`emergency-downgrade-evidence.json` schema, signed, 7-year) **DELEGATED — target: CL-13 §6.1; seam agent applies**
- [x] F3 (BLOCKER): `npm deprecate` is WARN not BLOCK; consumer lockfiles still resolve vulnerable tarball → Plan §Deliverables [APPLIED: `.github/hooks/npm-audit-check.js` new deliverable with `blockReason` semantics fail-closed]; CL-13 §3.1 `blockReason` schema portion → DELEGATED
- [x] F4 (BLOCKER): Consumer test suites pinning exact patch version break under emergency downgrade → Plan §Cross-Repo Operations [APPLIED: Consumer version-pin lint rule bullet — `@bic/claws-test` shared lint config flags exact-pin CLI-version asserts as ERROR]
- [x] F5 (MAJOR): Air-gapped mirror propagation has no stated SLA → Plan §Deliverables [APPLIED: `docs/operations/mirror-policy.md` new deliverable with CRITICAL=1h/HIGH=4h/MEDIUM=24h SLA table]
- [x] F6 (MAJOR): Consumer repos adopt security patches manually (2–7 days) → Plan §Cross-Repo Operations [APPLIED: Consumer auto-adoption of CRITICAL CVE patches bullet — ≤4h SLA via security-webhook + auto-merge-critical-cve bot MR]
- [ ] F7 (MAJOR): "1 hour" SLA has no defined start clock → CL-13 §3 clock-definition amendment **DELEGATED — target: CL-13 §3 (amend to define `disclosureAt` start, `deprecateAt` stop); seam agent applies**
- [x] F8 (MAJOR): Running containers with baked-in vulnerable CLI have no runtime deprecation signal → Plan §Cross-Repo Operations [APPLIED: Running-container CLI-deprecation signal cross-plan bullet referencing lobster's `/api/chunks/governance-health` extension]
- [x] F9 (MAJOR): Emergency-downgrade runbook missing → Plan §Deliverables [APPLIED: `docs/operations/emergency-downgrade-runbook.md` new deliverable with exact npm deprecate invocation, mirror-invalidation API calls, comm template, rollback procedure, signed evidence template, quarterly rehearsal]
- [x] F10 (MEDIUM): Patched version's `generatorVersion` format may diverge and break consumer `ProducerEntry` validations → Plan §Release Workflow Spec [APPLIED: Emergency-patch `generatorVersion` backward-compat rule — forbids breaking format changes on emergency path, release workflow asserts]
- [ ] F11 (MEDIUM): No automated mitigation signal from running workspaces; post-CVE revalidation not specified → CL-13 §6 R7 (new) post-CVE revalidation + `cveExposureFlag` on affected `DecisionEntry` rows **DELEGATED — target: CL-13 §6 R7 (new); seam agent applies**
- [ ] F12 (LOW): Plan says `npm deprecate` without naming target registry → CL-13 §3 amend to specify `npm.pkg.microsoft.ghe.com/@bic/*` and exact `--registry` flag **DELEGATED — target: CL-13 §3; seam agent applies (plan-side `emergency-downgrade-runbook.md` deliverable already cites the full invocation so runbook consumers are not blocked on the CL-13 edit)**

**Totals (S4–S5)**: 5 BLOCKER, 9 MAJOR, 6 MEDIUM, 2 LOW across 2 scenarios (22 findings)

**Totals (all seed scenarios S1–S5)**: 15 BLOCKER, 26 MAJOR, 17 MEDIUM, 7 LOW across 5 scenarios (65 findings)

### Cross-plan findings routed here (migration)

From `.craft/waves/260416+horus-the-heir+claws-migration/scenarios/cross-plan/SCENARIO-FINDINGS.md` — 4 findings routed to migration (3 to §Notes + 1 to §Release Workflow Spec):

- [x] cross S3-F1 (BLOCKER): `generatorVersion` format unspecified; legacy vs post-migration ambiguous → §Release Workflow Spec [APPLIED: `{semver}+{repo}:{commitSha}` composition rule]
- [x] cross S3-F4 (BLOCKER): Producer-side amendment deferred post-Horus creates dangling `policyArtifactSha256` during gap → §Notes [APPLIED: publish-gated-on-Ra-producer-amendment Notes bullet]
- [x] cross S3-F11 (MEDIUM): `claws audit verify` not deliverable in any Horus plan → §Notes [APPLIED: audit-verify release-target Notes bullet]
- [x] cross S2-F13 (LOW): `NotImplementedInHorusError` class not defined anywhere → §Notes [APPLIED: spec-pointer Notes bullet; canonical home is contract-seams.md §S4, owned by seam agent]

Fix-pass summary (R1): `.craft/waves/260416+horus-the-heir+claws-migration/scenarios/migration/FIX-SUMMARY.md`
Fix-pass summary (R2, seed scenarios S4+S5): `.craft/waves/260416+horus-the-heir+claws-migration/scenarios/migration/FIX-SUMMARY-R2.md`

## Notes

- **Blocked by (machine-checkable — S3-F6)**: every item in `.craft/waves/<ra-wave>/close-checklist.md` checked and signed, AND every row in `Ra-close-evidence.json` (§6.1) passes green with all four dep-class fields (`runtimeDepsChecked`, `devDepsChecked`, `peerDepsChecked`, `optionalDepsChecked`) plus `transitiveClosureChecked` per-package true. AND `craftworks-package-extraction` completed. Prose phrasing ("Ra wave closes cleanly") is superseded — if any row is yellow or missing, Horus is blocked; operator discretion does not override.
- **Ra-incompletion escape hatch (S3-F7)**: if any PreFlight entry item fails to clear in the Horus wave's first 7 days, the wave is suspended and re-scoped. Proceeding with incomplete Ra under 2-month runway pressure (noted in contract-seams.md D2) is explicitly not sanctioned. Reference CL-13 §7 state 1 entry conditions as authoritative.
- **Cross-plan block: publish gated on Ra producer-side amendment (cross-plan S3-F4)**: the inaugural GPR publish (§7 state 5) is blocked until Ra's producer-side audit-chain amendment lands (`generatorVersion` + `ProducerEntry` schema). Without it, `policyArtifactSha256` pointers emitted by first-day consumers dangle during the gap window. Bootstrap-entry clause in contract-seams.md §S7 (seam agent) is the coordinating surface.
- **`claws audit verify` release target (cross-plan S3-F11)**: `claws audit verify` is referenced by Aether validation but is NOT deliverable in any Horus plan; sim scenario mocks it. This plan notes the gap so the post-Horus roadmap explicitly schedules `claws audit verify` implementation before Aether's audit-chain hard validation turns on.
- **`NotImplementedInHorusError` spec pointer (cross-plan S2-F13)**: the error class thrown by `ApprovalPolicyRegistry.resolve(toolCall, session?)` and `Layer3Client.getSession(ref)` for session-scoped calls is defined in contract-seams.md §S4 (seam agent applies); this plan does not ship the implementation but records the dep so consumer plans (lobster, aether) can reference a single canonical source.
- **Pre-existing scaffold**: `bic/claws` already has a scaffold PR (#2) with `LICENSE`, `.gitignore`, `package.json`, `tsconfig.json`, `README.md`, `docs/MIGRATION.md`, and gated `.github/workflows/test.yml`. Horus execution un-gates and extends this.
- **History preservation tooling**: use `git filter-repo` (not `git subtree split`, not `git filter-branch`) — multi-directory extraction with clean path rewrites.
- **Author attribution (S1-F9 — path + SHA pinning)**: run `filter-repo` with `--mailmap` to preserve author attribution across the migration (binary decision per compliance-M3). The mailmap file path AND content-SHA are pinned via `tools/migration/claws-extract.sh --mailmap <path> --mailmap-sha <sha>`. Mismatch between dry-run and real-run mailmap (path OR SHA) is a state 3 entry-block; the mailmap file is committed alongside `tools/migration/claws-extract.sh` for reproducibility, and its SHA is captured in both `history-preservation-evidence.json` and `dry-run-evidence.json`.
- **Dep direction after migration**: any craftworks code that consumes claws (post-migration) depends on `@bic/claws-*` via semver + integrity hash (per Ra graduation plan's API Stability Contract). No reverse deps.
- **GPR auth**: documented once in `docs/operations/ghe-packages-auth.md` in the claws repo per S2 of `contract-seams.md`. Craftworks CI (if any residual claws consumption remains post-migration) references that doc; no parallel or forked auth documentation.
- **Ra amendment reference (S7)**: producer-side `generatorVersion` + `ProducerEntry` audit-chain entries are a sibling plan amendment covered in Ra's `claws-aether-integration` follow-up; **not blocked by Horus**. See `contract-seams.md` §S7 for the full schema and cross-plan ripple.
- **Sibling Horus plans depend on this one**: `aether-claws-serve-integration` and `lobster-claws-serve-integration` consume claws-serve; having claws in its own repo clarifies the "what's public contract vs internal" line for integration partners.
- **Deity-named wave dirs (founder-M3 deferral)**: Ptah/Anubis/Thoth/Ra wave directory names remain in the internal `bic/claws` repo's `.craft/waves/` after migration. This is a deliberate deferral — renaming to neutral slugs would destroy git blame continuity. Internal naming vocabulary is acceptable in a Microsoft-internal repo; any future revisit is tied to a potential future public-distribution decision (out of Horus scope).
- **Repo visibility (compliance-N1)**: `bic/claws` is a Microsoft-internal repo on `microsoft.ghe.com` during Horus; GHE Packages access is auth-gated via `microsoft.ghe.com` identity. Any future public-distribution posture is a separate decision outside Horus scope.
- **Branch protection on `claws main` (steward-N3)**: Before Horus merges, configure `main` branch protection: required status checks (test.yml green), required review (1 maintainer), linear history, signed commits required. Applied once pre-Active.
