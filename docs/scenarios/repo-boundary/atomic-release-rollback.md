# atomic-release-rollback: Partial publish failure rolls back and retries cleanly

**Series**: repo-boundary
**Spec**: CL-13
**Type**: release
**Criticality**: high

## Setup

- `bic/claws` at a signed tag `v0.1.0` — all pre-tag gates passed (smoke, dogfood, TS compile on 3 OS)
- Release workflow begins publishing 7 packages in deterministic dependency order
- Simulated fault injected: step 5 of 7 fails with GPR 502 (transient GPR outage mid-publish)

## Steps

1. Release workflow triggers on `git push origin v0.1.0`
2. Packages 1–4 publish successfully to GPR at `0.1.0`
3. Package 5 publish fails (injected 502)
4. Workflow enters rollback path:
   - `npm deprecate @bic/claws-<pkg1>@0.1.0 "partial release — see v0.1.1"` for each of the 4 already-published packages
   - Records a `release-rollback.yaml` audit entry with tag, failed package, reason, and the 4 deprecated coordinates
5. Maintainer investigates GPR health, confirms green, prepares corrective release
6. New signed tag `v0.1.1` pushed; workflow re-runs all 7 publishes atomically
7. All 7 publish successfully at `0.1.1`

## Expected outcome

- After step 4, `npm view @bic/claws-sdk@0.1.0` reports the deprecation message; consumers installing `0.1.0` see the deprecation warning
- No consumer can end up with a split-version tree (some pkgs at `0.1.0`, others at `0.1.0` undeployed) because the 4 published `0.1.0` packages are deprecation-flagged and the missing 3 were never published
- `0.1.1` tag goes green atomically — all 7 or none
- `release-rollback.yaml` signed by `claws-release-eng` references both the failed `v0.1.0` attempt and the successful `v0.1.1` corrective

## Failure modes

- Rollback workflow attempts `npm unpublish` → REJECTED; GPR does not support same-semantics unpublish per §4. Must use `npm deprecate` + corrective publish only.
- A consumer repo pins `@bic/claws-sdk@0.1.0` without deprecation awareness → mitigated by the deprecation warning surfacing on install; CL-13 §3 exact-pinning expectation means consumers bump to `0.1.1` promptly
- The `v0.1.1` re-run reuses any `0.1.0` artifact → REJECTED; atomic-release means full republish at the new version
- Must NOT re-use tag `v0.1.0` (tag re-signing is a signature-invalidation event)

## Evidence

- `release-rollback.yaml` — both failed and recovery cycle entries, signed
- GPR deprecation records (server-side, queryable via `npm view`)
- Retention: permanent for failed-release audit trail

## Related

- CL-13 §4 (Release coordination, rollback policy)
- CL-13 §7 state 5 (InauguralPublish)
- Sibling: `scratch-dir-cli-install`, `migration-state-machine-partial-failure`
