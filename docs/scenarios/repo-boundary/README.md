# repo-boundary — Scenario Series

**Spec**: CL-13 (`design/claws/specs/CL-13-repo-boundary.md`)
**Atom**: `atom:claws-repo-boundary` (C117)
**Source**: Horus wave (`260416+horus-the-heir+claws-migration`)

## What these scenarios validate

End-to-end validation of the two-repo architecture between `bic/claws` (monorepo) and `bic/claws` (extracted product repo). Each scenario maps to at least one CL-13 §Validation gate and exercises:

- The migration state machine (§7) and its rollback semantics
- Cross-boundary cleanliness (§2, §6 R2) — no `@craftworks/*` in claws, no active-code `@bic/claws-*` in craftworks
- History preservation across `git filter-repo --mailmap` (§6 R1)
- Atomic multi-package release coordination (§4)
- GPR auth lifecycle (§5) — token rotation and least-privilege scopes
- Signed evidence artifacts (§6 R3, R4) — deletion-manifest, extract-script chain-of-custody
- Runtime boundary enforcement (§2) — exact version pinning and boundary-violation detection

## Relationship to CL-13

Each scenario cites the CL-13 sub-section it validates in the `Related` block. The series is designed to be executable as integration tests once the Horus wave lands — scenario names correspond to evidence artifacts the migration pipeline must produce and audit.

## Scenarios

| # | Slug | Type | Criticality | §Validation gate |
|---|------|------|-------------|------------------|
| 1 | `cross-boundary-grep-clean` | audit | high | §Validation #1, §6 R2 |
| 2 | `filter-repo-history-preservation` | migration | high | §6 R1, §7 Verify |
| 3 | `scratch-dir-cli-install` | release | high | §Validation #3, §4 |
| 4 | `atomic-release-rollback` | release | high | §4, §7 InauguralPublish |
| 5 | `license-preservation` | migration | medium | §6 R1, §Validation #5 |
| 6 | `boundary-violation-detection` | audit | high | §2, §9 quarterly audit |
| 7 | `migration-state-machine-partial-failure` | migration | high | §7 (all states) |

## Format

Each scenario is a standalone `.md` file following the template in the series-seed brief. `.md` (not `.yaml` subdirectory) is intentional — these are narrative validation gates against the CL-13 spec, not parameterized compiler test fixtures like the other series. When the Horus wave lands, these may be promoted to YAML harness scenarios with concrete fixtures.

## Related

- `design/claws/specs/CL-13-repo-boundary.md` — governing spec
- `.craft/plans/claws-repo-migration.md` — executing plan
- `.craft/waves/260416+horus-the-heir+claws-migration/contract-seams.md` — cross-plan seam authority
