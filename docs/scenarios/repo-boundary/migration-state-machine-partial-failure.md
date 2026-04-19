# migration-state-machine-partial-failure: Extract fails, rollback, restart from PreFlight

**Series**: repo-boundary
**Spec**: CL-13
**Type**: migration
**Criticality**: high

## Setup

- Horus migration at state 2 (`Freeze`) completed successfully — craftworks claws-* paths frozen, 24h SLA clock started
- State 3 (`Extract`) begins: `tools/migration/claws-extract.sh` invokes `git filter-repo` against a fresh temp clone
- Simulated fault: mid-extract, `git filter-repo` aborts with an unexpected refs/notes rewrite error (e.g., refs/notes/commits encoding mismatch)

## Steps

1. `Extract` state enters; state-machine writes a `state-transition.yaml` signed entry `{from: Freeze, to: Extract, ts: ...}`
2. `git filter-repo` runs; fails at refs/notes rewrite ~60% through
3. State machine transitions to `Extract:Failed` and writes a signed rollback entry `{state: Extract, outcome: Failed, reason: "refs/notes rewrite error", artifacts_to_discard: [<temp-clone-path>]}`
4. Temp clone discarded; no changes published to `bic/claws` (the destination was never written to)
5. Operator inspects the failure, patches `claws-extract.sh` to handle refs/notes (either `--refs refs/heads/* refs/tags/*` scoping or explicit `--preserve-commit-encoding`)
6. State machine transitions back to `PreFlight` with a signed `{from: Extract:Failed, to: PreFlight, reason: restart-after-fix}` entry
7. Re-run: state 1 re-verifies no `@craftworks/` runtime deps, state 2 confirms freeze still active (or re-establishes), state 3 retries with patched extract script
8. Second attempt succeeds; state 4 `Verify` runs the history-preservation checks; state 5 `InauguralPublish` proceeds

## Expected outcome

- State transitions form a complete audit chain: `PreFlight → Freeze → Extract → Extract:Failed → PreFlight → Freeze → Extract → Verify → InauguralPublish → SmokeInstall → DeletePR → Thaw`
- The `Extract:Failed` rollback artifact is retrievable post-migration — it proves that the state machine actually supports rollback rather than just claiming to
- The 24-hour freeze SLA (§6 R5) is tracked across the failure-restart; if total freeze time exceeds 24h, the migration must unfreeze, reschedule, and re-enter `PreFlight` with a fresh plan
- `claws-extract.sh` commits its fix to both repos (§6 R4) — the fixed script is the permanent chain-of-custody artifact

## Failure modes

- Operator attempts to "resume" the failed extract mid-way rather than restart from `PreFlight` → REJECTED; §7 requires rollback to `PreFlight`, not mid-state continuation
- Temp-clone artifact not discarded → contaminated extract state may leak into retry; operator must verify discard before restart
- 24h freeze SLA exceeded silently → violates §6 R5; state machine must surface an SLA-breach alert and force re-entry with fresh freeze
- Must NOT skip state 4 (`Verify`) after a second-attempt `Extract` succeeds — every extract invocation runs the full verify checks, not just the first
- Must NOT publish to `bic/claws` from a partial or failed extract — destination writes only occur after state 4 passes

## Evidence

- `state-transitions.yaml` — append-only log, one signed entry per transition, including the rollback entry
- `extract-failure-<ts>.log` — raw filter-repo stderr, signed by operator
- Patched `claws-extract.sh` committed to both repos (§6 R4)
- Retention: permanent (chain-of-custody + rollback proof)

## Related

- CL-13 §7 (Migration path state machine — all states)
- CL-13 §6 R4 (Extract script permanence)
- CL-13 §6 R5 (Concurrent-PR freeze, 24h SLA)
- Sibling: `filter-repo-history-preservation`, `atomic-release-rollback`
