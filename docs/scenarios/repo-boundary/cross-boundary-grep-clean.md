# cross-boundary-grep-clean: Post-migration grep returns zero active-code hits

**Series**: repo-boundary
**Spec**: CL-13
**Type**: audit
**Criticality**: high

## Setup

- Horus migration states 1–8 all reported `done`
- Fresh clone of `bic/claws` at HEAD of `main` post-`DeletePR`
- Fresh clone of `bic/claws` at HEAD of `main` post-`InauguralPublish`
- `rg` (ripgrep) available in both environments

## Steps

1. In `bic/claws`, run `rg "@craftworks/claws-(runtime|lsp|serve|sdk|skill-kit|compiler|cli|test)"` across the full tree, excluding `package-lock.json` and `pnpm-lock.yaml`
2. In `bic/claws`, run `rg "@bic/claws-"` across the full tree
3. In `bic/claws`, run `rg "@craftworks/"` excluding license/attribution files (`LICENSE`, `NOTICES.md`, `THIRD-PARTY.md`)
4. Record the hit-count for each grep in a signed `boundary-audit.yaml` evidence file

## Expected outcome

- Step 1 returns **zero** hits (no legacy `@craftworks/claws-*` references survive the deletion PR)
- Step 2 returns hits **only** in `package.json` dependency declarations and lockfile entries — no source, script, doc, or workflow hits
- Step 3 returns **zero** active-code hits; any hits are confined to license/attribution surfaces
- `boundary-audit.yaml` signature validates against the `claws-repo-steward` role key

## Failure modes

- Any active-code hit in step 1 or step 3 → audit fails; PR required to scrub residue
- Any non-`package.json` hit in step 2 → CODEBASE.md or workflow drift; audit fails
- Unsigned or mis-signed `boundary-audit.yaml` → reject and re-run under a valid steward key
- Must NOT suppress hits via `.rgignore` — the audit scope is the full tree minus lockfiles

## Evidence

`boundary-audit.yaml` — signed by `claws-repo-steward`, retained per quarterly-audit retention (4 quarters minimum), uploaded as the CI-cron artifact.

## Related

- CL-13 §Validation #1
- CL-13 §6 R2 (Residue cleanliness)
- CL-13 §9 (Quarterly audit cadence)
- Sibling: `boundary-violation-detection`
