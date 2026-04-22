# Horus: extract clawc → bic/claws + E2E sim + per-package spec reboot

Closes the implementation side of craftworks wave **XCVI — Horus the Heir**.
Companion PR on `gim-home/craftworks` lands the wave close ceremony
(FLAIR + wave.yaml flip + index reconciliation).

## What this PR ships

Three independent deliverables, all landed across CP-1 through CP-8 on
`feature/horus-the-heir`:

### 1 · Extraction: clawc → bic/claws (CP-1..CP-4)

- Filter-repo lift from `gim-home/craftworks` into this repo with
  `clawc → claws` binary rename. 11 packages tracked under
  `packages/*/`:
  - `openclaw-workspace`, `openclaw-guardrails`, `openclaw-policy`,
    `openclaw-snap`, `openclaw-lsp` (incubating `@bic/openclaw-*`)
  - `claws`, `claws-sdk`, `claws-serve`, `claws-action`,
    `claws-skill-kit`, `claws-test` (internal `@bic/claws-*`)
- Zero `craftworks` references in this repo. Zero `clawc` references
  outside the retained legacy specs at `docs/specs/CL-*.md`
  (which carry explicit `Status: Retired` headers pointing at their
  per-package successors).
- bic operations scaffolded: CI matrix, CODEOWNERS, branch
  protection, release playbook.

### 2 · E2E governance simulation (CP-5..CP-6)

- `test/e2e/harness/` — hybrid-fidelity test harness: real
  `snap serve`, real generated plugin, real `claws` CLI under
  in-process host + companion mocks.
- 4 `HostAdapter` shapes proven against the harness:
  - `OpenClawAdapter` (in-process)
  - `LobsterAdapter` (MCP over stdio)
  - `AetherAdapter` (gRPC / mTLS)
  - `ClawsServiceAdapter` (HTTP + SSE)
- Scenario series (17 scenarios this wave):
  - `WSP/` 3 URI-rejection vectors
  - `WSC/` 3 canonicalizer byte-identity
  - `GRD/` 4 HostAdapter shapes
  - `SNP/` 3 snapshot non-uplift rules
  - approval-flows: audit-chain corruption (correlation-mismatch,
    chain-gap, hash-mismatch), ApprovalSink conformance, L3 acceptance
- Parallel execution hardening: `fileParallelism: false` on
  integration + accept projects so real-process-spawning tests
  serialize (fixes flakes under full-sweep load).

### 3 · Per-package spec reboot + oracle (CP-8)

The monolithic `docs/specs/CL-NN-*.md` tree is superseded by
per-package doc trees. Authored by pulses 74.5 + 74.6:

| Code | Package / Domain | Scope |
|------|------------------|-------|
| WS   | `openclaw-workspace`  | 5 specs (WS+WSP+WSC+WSA+WSE), 2 guides, 1 how-to, 2 pitfalls, 2 scenario series |
| GR   | `openclaw-guardrails` | 8 specs (GR+GRG+GRF+GRA+GRH+GRD+GRT+GRR), 4 guides, 2 how-tos, 2 pitfalls, GRD 4-case scenarios |
| PO   | `openclaw-policy`     | 3 specs (PO+POI+POC), 1 guide, 1 tutorial, 1 pitfall |
| SN   | `openclaw-snap`       | 4 specs (SN+SNS+SNA+SNP), 1 guide, 1 pitfall, SNP 3-case scenarios |
| LS   | `openclaw-lsp`        | 4 specs (LS+LSP+LSB+LSE), 2 guides, 1 pitfall |
| CX   | `claws` (CLI binary)  | 4 specs, 2 guides, 1 pitfall |
| AC   | `claws-action`        | 3 specs, 1 guide, 1 pitfall |
| SK   | `claws-sdk`           | 7 specs (SK+SKA+SKG+SKI+SKC+SKF+SKR), 2 guides, 2 pitfalls |
| SV   | `claws-serve`         | 4 specs, 2 guides, 1 pitfall |
| KT   | `claws-skill-kit`     | 4 specs (KT+KTR+KTB+KTA), 1 guide, 1 tutorial, 1 pitfall |
| TX   | `claws-test`          | 4 specs (TX+TXA+TXD+TXN), 2 guides, 1 pitfall |
| SM   | security domain       | Absorbs CL-02 (1 spec, 2 guides, 1 pitfall) |
| UG   | upstream domain       | Extends CL-11 (1 spec, 1 guide) |
| RB   | repo domain           | Absorbs CL-13 v1.8 (1 spec, 1 guide, 1 pitfall) |

**Retired monolithic specs** (preserved in place with successor pointers):
CL-03, CL-04, CL-06, CL-07, CL-08, CL-09, CL-12, CL-14.

**Promoted from drafts** (Horus pulse 73): CL-15 (canonicalizer byte-identity)
and CL-16 (oc:// URI canonical).

### 4 · Repo-ops oracle tooling (CP-8 pulses 73.7 / 73.8 / 75 / 76)

Four validators enforce structural + semantic invariants on every PR:

- `devtools/repo-ops/src/check.ts` — **doc-structure** (required files,
  required subdirs, no extra top-level md), **atom-coverage** (every
  atom's `Needs` met by spec-prefix or `covers:` frontmatter),
  **readme-reachability** (every md reachable from root README link
  chain), **accept-runner** (manifest-driven series + min-count).
- `tools/atoms-oracle/` — 4-way bidirectional sweep enforcing
  CL-13 v1.8 §N.1: atom→need-file, atom→scenario-series,
  covers→atom, series→atom.
- `tools/doc-sync/verify-indexes.ts` — drift detection between
  `docs/specs/README.md` and `CL-*.md` on disk, and between
  `docs/README.md` and per-package `ATOMS.md` on disk.
- `tools/guide-deploy/` — idempotent wave-guides → docs/ migration
  with three link-rewrite rules + broken-link verifier.

**Oracle run against the shipped tree**: 94 atoms, 0 orphans across
all 4 invariants. Evidence:
`.audit/migrations/horus/close/atoms-oracle-sweep-evidence.json`.

## Stats

| Metric | Count |
|--------|-------|
| Pulses committed | 77 (CP-1..CP-6 + CP-8; CP-7 moved to Wepwawet) |
| Per-package doc dirs seeded | 14 |
| Atoms in registry | 94 |
| Oracle orphans | 0 |
| CL-NN specs retired | 8 |
| CL-NN specs promoted | 2 (CL-15, CL-16) |
| New test cases (CP-8 tooling) | 60 (27 repo-ops + 9 atoms-oracle + 6 doc-sync + 18 guide-deploy) |
| HostAdapter scenarios (GRD) | 4 |
| Canonicalizer scenarios (WSC) | 3 (3-consumer byte-identity + cross-platform) |
| Snapshot scenarios (SNP) | 3 (promote happy + non-uplift Rule 1 + drain timeout) |
| URI rejection scenarios (WSP) | 3 (traversal, drive-letter, symlink-escape) |

## Test plan

### Local-run (captured in evidence sidecar)

- [x] `npm run build` — all 11 packages build clean
- [x] `cd devtools/repo-ops && vitest run` — 27/27
- [x] `vitest run tools/atoms-oracle/` — 9/9
- [x] `vitest run tools/doc-sync/` — 6/6
- [x] `vitest run tools/guide-deploy/` — 18/18
- [x] `tsx tools/atoms-oracle/bidirectional-sweep.ts --docs-dir docs/` — 94 atoms, 0 orphans
- [x] `tsx tools/doc-sync/verify-indexes.ts --docs-dir docs/` — 0 drift findings

### CI matrix (runs on push)

Workflows wired into `.github/workflows/`:

- [ ] **`ci.yml`** — build + `npm test` + per-package `tsc --noEmit` + CLI boot smoke (ubuntu + windows)
- [ ] **`acceptance.yml`** — L3 gate: build + tsc + unit/integration/e2e/accept on `packages/claws` + residue-grep (ubuntu/windows/macos × node 20/22)
- [ ] **`canonicalizer-ci.yml`** — 3-consumer byte-identity + parallel-canonicalizer guard (ubuntu/windows/macos); canonical-bytes uploaded as artifact for byte-diff forensics
- [ ] **`no-craftworks.yml`** — 3-pass residue-grep (CL-13 v1.7) with auto-comment on violation
- [ ] **`test-e2e.yml`** — full test/e2e suite: unit + integration + scenario + accept (ubuntu/windows/macos)
- [ ] **`repo-ops.yml`** (new this PR) — CP-8 tooling gates:
  - **`tests`** (hard): 60 tests across devtools/repo-ops + tools/atoms-oracle + tools/doc-sync + tools/guide-deploy on ubuntu + windows
  - **`live-gate-hard`**: `atoms-oracle` sweep (94 atoms, 0 orphans) + `doc-sync verify-indexes` (0 drift) — both clean against the shipped tree; artifact upload on every run
  - **`live-gate-informational`**: `repo-ops check` + `verify-links` against full `docs/` tree (continue-on-error) — surfaces ~1,100 pre-existing BLOCK findings in legacy content (`fleet-*`, `traces/`, `proposals/openclaw-upstream/`) that are **out of scope** per pulse 74 §Key Constraints; follow-on wave promotes to hard gate once legacy is reconciled

## Evidence (`.audit/migrations/horus/close/`)

- `spec-merge-evidence.json` (pulse 73)
- `guide-rewrite-evidence.json` (pulse 74)
- `doctor-check-docs-output.txt` (pulse 74)
- `atoms-oracle-sweep-evidence.json` (pulse 75)
- `index-reconciliation-evidence.json` (pulse 76)
- `l3-acceptance-evidence.json` (pulse 77)

## Reviewers — CP-8 panel

Selected cross-cluster for tension:

- `clawc-repo-steward` — cross-repo state consistency; every Horus
  touchpoint reflected in the right index; FLAIR counts match
  evidence sidecars
- `clawc-release-eng` — L3 gate correctness; CI matrix alignment;
  coverage threshold compliance (per-file 95/90/95/95)
- `architect` — sub-spec boundaries (GRG/GRF/GRA/GRH/GRD/GRT/GRR
  partition guardrails without gaps); ATOMS.md parent/sub-atom
  relationships valid; no orphan parents
- `compliance` — SM captures all CL-02 R1-R5 rules; UG captures
  R5 pre-merge guard; RB captures CL-13 v1.8 oracle invariants;
  every evidence sidecar complete
- `testing` — manifest completeness; every scenario exercised;
  scenario count in manifest matches runner execution count; no
  `describe.skip` / `it.skip` in the migrated tree

## Hand-off

**Next wave: Wepwawet (XCVII)** consumes the E2E sim contract this PR
locks in. Its CP-1 is `claws-sim-host-presets` (moved from Horus CP-7)
— scope reduced to 2 adapters (AetherAdapter + ClawsServiceAdapter),
wiring real integrations.

**Later upstream wave (TBD, gated on Peter greenlight)** scope-flips
`@bic/openclaw-*` → `@openclaw/*`. The incubating packages are
Alpha-stable and ready for external review; `upstream/specs/UG-upstream.md`
captures the graduation roadmap + R5 pre-merge guard.

## What this PR does NOT include

Per pulse 74 §Key Constraints, this PR is not the place for:
- Legacy `docs/concepts/fleet-*`, `docs/traces/*`,
  `docs/proposals/openclaw-upstream/*` reconciliation (~200 pre-existing
  BLOCK findings from the pre-Horus monolithic tree; future waves)
- Real aether / lobster / openclaw integration (Wepwawet's charter)
- Public scope flip to `@openclaw/*` (future upstream wave)

The wave stays closed once this lands. Follow-on work happens in
Wepwawet or later, never by re-opening Horus.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
