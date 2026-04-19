# filter-repo-history-preservation: git log --follow walks across flatten-rename

**Series**: repo-boundary
**Spec**: CL-13
**Type**: migration
**Criticality**: high

## Setup

- `bic/claws` post-`Extract` state (state 3 of §7 state machine)
- Pre-migration manifest `pre-extract-log.txt` captured: `git log --oneline --all` against craftworks claws-touching paths
- Post-migration manifest `post-extract-log.txt` captured: `git log --oneline --all` against the new claws repo
- `tools/migration/claws-extract.sh` invocation recorded with its exact `--mailmap` and path-rewrite args

## Steps

1. In `bic/claws`, run `git log --follow --oneline design/ATOMS.md`
2. Assert the output includes commits from the pre-flatten path `design/claws/ATOMS.md` (commits predating the filter-repo rewrite)
3. Diff `pre-extract-log.txt` against `post-extract-log.txt` after normalizing for the known path rewrites — every craftworks commit touching a migrated path must appear in the claws history (by subject + author + date)
4. Spot-check author attribution on 3 sample commits across Ptah, Anubis, Thoth waves — `git show --format="%an <%ae>"` must match the craftworks original (via `--mailmap` rewrites)
5. Confirm signed-tag commits retain their GPG signatures (`git verify-commit`)

## Expected outcome

- `git log --follow` on `design/ATOMS.md` produces commits from both the flattened path and the pre-flatten `design/claws/ATOMS.md` path — the rename is walkable
- Manifest diff shows **zero unexpected commit losses** (only losses are the paths explicitly excluded from the filter-repo invocation, pre-approved)
- All 3 sample commits retain correct author attribution
- Signed commits remain verifiable post-extract

## Failure modes

- `git log --follow` stops at the rename (rewrite dropped the rename-follow graph) → re-run filter-repo with `--preserve-commit-encoding` and correct path args
- Any Ptah/Anubis/Thoth commit missing from post-extract manifest without an explicit exclusion entry → block migration, return state to `PreFlight`
- Author attribution drift → mailmap entries missing or incorrect; patch mailmap and re-extract
- Signed-commit signatures invalidated → expected for filter-repo rewrites; record in audit as "signatures re-issued on extract" and re-sign with `claws-release-eng` key

## Evidence

- `pre-extract-log.txt` + `post-extract-log.txt` — committed to both repos via `tools/migration/claws-extract.sh` run log
- `history-preservation-audit.yaml` — signed by `claws-release-eng`, enumerates sample-commit checks with expected/actual author attribution
- Retention: permanent (chain-of-custody; co-located with the extract script per §6 R4)

## Related

- CL-13 §6 R1 (History preservation)
- CL-13 §6 R4 (Extract script permanence)
- CL-13 §7 state 4 (Verify)
- Sibling: `migration-state-machine-partial-failure`
