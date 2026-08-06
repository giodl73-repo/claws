# FLAIR — Horus the Heir (XCVI)

## Wave Identity

| Field       | Value                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------ |
| **Deity**   | Horus                                                                                                        |
| **Epithet** | the Heir                                                                                                     |
| **Number**  | XCVI                                                                                                         |
| **Branch**  | feature/horus-the-heir                                                                                       |
| **Started** | 2026-04-16                                                                                                   |
| **Closed**  | 2026-04-22                                                                                                   |
| **Theme**   | extract clawc → bic/claws + simulate governance E2E across host shapes + reboot specs into per-package trees |

## What Shipped

### Extraction & migration (CP-1 through CP-4)

- **Filter-repo lift** from `c:\src\craftworks\` into
  `c:\src\claws\` — 11 packages tracked at `packages/*/`:
  `openclaw-workspace`, `openclaw-guardrails`, `openclaw-policy`,
  `openclaw-snap`, `openclaw-lsp`, `claws`, `claws-sdk`,
  `claws-serve`, `claws-skill-kit`, `claws-test`, `claws-action`.
- **clawc → claws binary rename** completed post-filter-repo. Every
  reference to `clawc` (and the homoglyph variants) purged from the
  new repo via the 3-pass residue-grep. Craftworks retains its
  `clawc` references as its authoritative design source.
- **bic operations scaffolded**: CI matrix, CODEOWNERS, release
  playbook, branch protection — CP-3 gates active on every PR.

### E2E sim harness (CP-5 through CP-6)

- **Hybrid-fidelity test harness** at `/c/src/claws/test/e2e/`:
  real `snap serve`, real generated plugin, real `claws` CLI;
  in-process host + companion mocks.
- **Approval-flow scenarios** for tools-at-risk (R5/RESTRICTED)
  and file-ingest (RESTRICTED) — the 8-field `approvalHandle`
  binding properties stress-tested across `correlationId`,
  content-hash, sequence, nonce scope.
- **4 HostAdapter shapes** proven against the in-process harness:
  `OpenClawAdapter`, `LobsterAdapter`, `AetherAdapter`,
  `ClawsServiceAdapter`.

### Per-package spec reboot (CP-8 pulses 73 + 74.5 + 74.6)

- **14 per-package doc trees** seeded at `/c/src/claws/docs/`:
  5 incubating openclaw-* (workspace, guardrails, policy, snap, lsp)
  - 6 internal claws-* (cli, action, sdk, serve, skill-kit, test)
  - 3 cross-cutting domains (security, upstream, repo).
- Every package carries the standard 3-file root (`README.md` +
  `ATOMS.md` + `CHANGELOG.md`) and typed subdirs (`specs/`,
  `guides/`, `pitfalls/`, `scenarios/`, optional `how-tos/` and
  `tutorials/`).
- **8 monolithic CL-NN specs retired** (CL-03, CL-04, CL-06, CL-07,
  CL-08, CL-09, CL-12, CL-14) with successor pointers to per-package
  locations; CL-15 (canonicalizer) + CL-16 (oc-uri-canonical)
  promoted from pulse-73 drafts to canonical v1.0 specs.

### Repo-ops oracle (CP-8 pulses 73.7 + 73.8 + 75)

- `devtools/repo-ops/src/check.ts` — 4 validators:
  `doc-structure`, `atom-coverage`, `readme-reachability`,
  `accept-runner`. Runs from CI + local via `tsx`.
- `tools/atoms-oracle/` — 4-way bidirectional sweep enforcing
  CL-13 v1.8 §N.1 oracle invariants:
  atom→need-file, atom→scenario-series, covers→atom, series→atom.
- `tools/doc-sync/verify-indexes.ts` on both sides — drift
  detection across index surfaces (PLANS.md, WAVES.md, SPECS.md,
  docs/README.md, docs/specs/README.md).

## Stats

| Metric                                    | Count                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| Plans                                     | 7 (6 Implemented + 1 Superseded to Wepwawet)                                             |
| Checkpoints                               | 7 landed (CP-1..6 + CP-8; CP-7 moved to Wepwawet)                                        |
| Pulses                                    | 77 committed                                                                             |
| Per-package doc dirs seeded               | 14                                                                                       |
| Atoms in registry                         | 94                                                                                       |
| Orphans (all 4 oracle invariants)         | 0                                                                                        |
| Scenarios landed this wave                | 17 (WSP×3, WSC×3, GRD×4, SNP×3, approval-flow scenarios + audit-chain×3 + conformance×2) |
| CL-NN specs retired                       | 8                                                                                        |
| CL-NN specs promoted                      | 2 (CL-15, CL-16)                                                                         |
| Amendments merged (pulse 73)              | 5 drafts → 3 canonical specs                                                             |
| Lines of doc authored (pulse 74.5 + 74.6) | ~12k across 90+ files                                                                    |
| Unit tests added                          | 27 (repo-ops + atoms-oracle + guide-deploy + doc-sync)                                   |

## Review panels

Per-CP review panels signed off at each gate; panel rosters archived
under `panels/cp-N/`:

| CP   | Reviewers                                                             |
| ---- | --------------------------------------------------------------------- |
| CP-1 | clawc-repo-steward, clawc-release-eng, platform-eng                   |
| CP-2 | clawc-repo-steward, clawc-release-eng, compliance                     |
| CP-3 | clawc-repo-steward, testing, compliance                               |
| CP-4 | clawc-repo-steward, clawc-release-eng, ciso                           |
| CP-5 | gateway-eng, testing, architect                                       |
| CP-6 | gateway-eng, testing, architect, compliance                           |
| CP-8 | clawc-repo-steward, clawc-release-eng, architect, compliance, testing |

(CP-7 moved to Wepwawet 2026-04-22; host-preset adapters straddle
sim/real boundary and belong in Wepwawet's real-integration charter.)

## Hand-offs

### To Wepwawet (XCVII)

- **CP-7 deliverable moved**: `claws-sim-host-presets` plan becomes
  Wepwawet's CP-1 opener (scope reduced to 2 adapters:
  `AetherAdapter` + `ClawsServiceAdapter`; OpenClawVanilla +
  Lobster deferred indefinitely).
- **Real-integration charter**: Wepwawet consumes the Horus E2E
  sim contract and wires real aether / lobster / openclaw
  integrations using `@bic/openclaw-*` packages.

### To later upstream wave (TBD, triggered on Peter greenlight)

- Scope-flip from `@bic/openclaw-*` to `@openclaw/*` is deferred
  to a future wave. The incubating packages are stable within
  Alpha and ready for external review when the greenlight lands.
- `upstream/specs/UG-upstream.md` captures the graduation roadmap
  - R5 pre-merge guard that will gate contribution PRs.

### Blockers cleared for downstream waves

- The canonicalizer contract (CL-15 → `workspace/specs/WSC-canonicalize.md`)
  ships byte-identical cross-platform output; any downstream consumer
  hashing canonical bytes gets the 3-consumer byte-identity
  guarantee out of the box.
- The atoms oracle + per-package doc structure lets future waves add
  packages + atoms without reshuffling a monolithic tree — add a
  package dir with ATOMS.md, and the oracle picks it up.

## Sign-off

Wave XCVI closed 2026-04-22 by the CP-8 review panel
(clawc-repo-steward, clawc-release-eng, architect, compliance,
testing). All 36 DOC-UPDATES.md checklist rows checked. Zero stale
gap acknowledgements at close. Evidence sidecars archived under
`.craft/waves/260416+horus-the-heir+clawc-migration/audit/cp-8/`
(craftworks) and `.audit/migrations/horus/close/` (bic/claws).

The wave stays closed. Follow-on work happens in Wepwawet (next
wave) or later — never by re-opening Horus.
