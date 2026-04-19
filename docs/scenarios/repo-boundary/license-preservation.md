# license-preservation: LICENSE text unchanged across repo boundary

**Series**: repo-boundary
**Spec**: CL-13
**Type**: migration
**Criticality**: medium

## Setup

- Migration SHA in `bic/claws` recorded — commit immediately before the Horus deletion PR
- Inaugural-release SHA in `bic/claws` recorded — commit `v0.1.0` points to
- Both repos' `LICENSE` files readable at the respective SHAs

## Steps

1. `git -C craftworks show <migration-sha>:LICENSE > /tmp/craftworks-LICENSE.txt`
2. `git -C claws show <inaugural-sha>:LICENSE > /tmp/claws-LICENSE.txt`
3. `diff /tmp/craftworks-LICENSE.txt /tmp/claws-LICENSE.txt`
4. Additionally diff copyright headers across a sample of 10 migrated source files (e.g., `claws-compiler/src/*.ts`) pre- and post-migration
5. Confirm `NOTICES.md` / `THIRD-PARTY.md` (if present) survived the extract

## Expected outcome

- Step 3 returns **zero lines** — `diff` exit 0, LICENSE byte-identical
- Sample source-file headers unchanged (the filter-repo rewrite touches paths, not content)
- Any attribution files listing third-party licenses migrate intact
- License file SHA-256 matches the pre-migration hash bit-for-bit

## Failure modes

- Any byte drift in LICENSE → migration violates §6 R1 (history + content preservation); block `DeletePR` (state 7), return to `PreFlight`
- Copyright header drift in source files → filter-repo misconfiguration touched content unexpectedly; re-run extract with `--refs` scope verified
- Missing `NOTICES.md` post-migration → third-party attribution lost; block release
- Must NOT "re-sync" LICENSE content post-migration as a fix — that would mask a content-preservation bug. Fix the extract upstream and re-run.

## Evidence

`license-preservation-audit.yaml` — captures both SHAs, both file hashes, sample source-header hashes, and the diff result. Signed by `compliance` role. Retained permanently (legal audit trail).

## Related

- CL-13 §Validation #5 (Deletion PR path-mapping completeness — LICENSE is a row)
- CL-13 §6 R1 (History preservation includes content integrity)
- Sibling: `filter-repo-history-preservation`
