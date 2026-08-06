# Lobster Patch Intake - 2026-08-06

## Decision

Use the clean `promoteclaw/openclaw-2026.6.33` branch as the intake base.
Do not port the conflicted 32-patch PR #6839 queue wholesale.

The working target remains a Lobster-usable OpenClaw image based on signed
`v2026.6.33` with only traceable, deletable downstream carries. Patch count is
not a readiness signal; each patch needs a current Lobster dependency, an
upstream replacement path, and a deletion test.

## Current Queues

| Queue | Worktree | State | Meaning |
| --- | --- | --- | --- |
| Reduced replay | `C:\src\lobster-pr5402-reviewfix` | 26 patch files, dirty, branch behind remote by 98 | Prior reduced queue with local validation; useful as proof history, not the clean intake base. |
| Current promote | `C:\src\lobster-promote-633` | 28 patch files, clean worktree; fork branch `giodl:promoteclaw/openclaw-2026.6.33` at `bf72332b7172e68892bbbfe8724e8e1fc9a962ff` | Preferred `v2026.6.33` intake base. Adds current-main remote-harness carries and replay fixups. |
| Legacy PR #6839 repair | `C:\src\lobster-pr6839-fix` | 32 patch files, unresolved OpenClaw container conflicts | Source of candidate deltas only. Do not resolve or carry wholesale. |

## Intake Classification

| Patch / family | Seen where | Classification | Current action |
| --- | --- | --- | --- |
| `0000-enterpriseclaw-upstream-evidence-slices.patch` | 26 and 28 | Keep | Required metadata/evidence base for readiness and hosting replay on `v2026.6.33`. |
| `0001` through `0013`, `0015` through `0019`, `0022`, `0024`, `0026`, `0028` | 26, 28, and 32 | Keep as current downstream adoption layer | These are the retained Teams, Cron, keyless WebIQ, personality, node, memory, approval, hosted UI, and session-binding carries. |
| `0029-agent-harness-host-adapter.patch` | 28 and 32 | Keep pending validation | Current-main remote-harness carry. Already included in the clean promote branch; validate with the 28-patch queue. |
| `0030-msteams-native-audience-route.patch` | 28 and 32 | Keep pending validation | Current-main Teams routing carry. Already included in the clean promote branch; validate with the 28-patch queue. |
| `0031-hosted-replay-integration.patch` | 28 only | Keep | `v2026.6.33` replay bridge for readiness/hosted UI compile and behavior drift. Delete after equivalent released upstream behavior and Lobster adapter proof. |
| `0032-node-command-policy-structured-commands.patch` | 28 only | Keep | Compatibility bridge for structured node command policy used by hosting readiness evidence. Delete after released upstream profile support or profile rollback to legacy names. |
| `0033-scoped-enterprise-test-stability.patch` | 28 only | Keep | Test/tooling stability for scoped evidence and Cron timer lanes. Delete when equivalent test support exists upstream. |
| `0014-sensitivity-label-session-entry.patch` | 32 only | Hold out | Foundation for older sensitivity stack, but not in the clean 28 queue. Reintroduce only with a current Lobster sensitivity dependency and updated `v2026.6.33` proof. |
| `0020-retry-reply-session-init-conflicts.patch` | 32 only | Hold out | Large session-writer serialization change. Needs current reproduction against `v2026.6.33` or upstream replacement evidence before carrying. |
| `0021-doltlite-sqlite-engine.patch` | 32 only | Hold out | Narrow SQLite engine tweak, but unrelated to the immediate readiness/hosting image path. Keep out unless the image gate proves it is required. |
| `0023-vitest-unit-fast-group-order.patch` | 32 only | Hold out | Test ordering workaround. Do not carry without a current failing test lane that this uniquely fixes. |
| `0025-context-derived-sensitivity.patch` | 32 only | Hold out | Large derived-sensitivity semantic stack. Treat as new/independent work, not an image unblocker. |
| `0027-teams-per-send-sensitivity.patch` | 32 only | Hold out | Depends on the sensitivity stack. Keep out unless the sensitivity family is accepted with current Lobster proof. |
| `0031-cron-wake-only-payload-kind.patch` | 32 only | Investigate now | Small scheduler compatibility patch that admits `payload.kind="wake"` and prevents in-container dispatch. Search did not find `wake`/`payloadKind` coverage in the clean 28 queue. Needs dependency proof from Lobster schedule/wake usage before accepting. |
| `0032-openclaw-6.11-port-corrections.patch` | 32 only | Drop for `v2026.6.33` | Explicitly a 2026.6.11 port-correction patch. Do not carry into the 2026.6.33 image path unless a specific hunk is rediscovered as a current-version bug. |

## Required Proof Before Adding Any 32-Only Patch

1. A current Lobster caller or fixture that depends on the behavior.
2. A clean apply/rederive against signed `v2026.6.33` plus the 28-patch base.
3. Focused OpenClaw patched-source tests for the touched owner area.
4. Lobster adapter or runtime proof that the behavior is observable through
   the fork image.
5. A deletion condition tied to an upstream release, a Lobster-owned
   replacement, or a confirmed no-longer-used path.

## Next Action

Keep the clean 28-patch queue frozen and move back to the package/image gate
for `openclaw@2026.6.33`. The remaining image blocker is external feed
availability, not a missing 32-only patch.

## Current Proof

- `wsl -d Ubuntu-24.04 -- bash -lc 'cd /mnt/c/src/lobster-promote-633 && just openclaw-patches-check --offline'` passed.
- The gate reported all 28 patches documented in `README.md`, applied by
  Dockerfile order, covered by shared scoped Vitest runner registration, and
  pinned consistently to `openclaw 2026.6.33`, tag `v2026.6.33`, sha
  `7af0cfc9c548`.
- `rg` in the clean promote branch found no current `payload.kind`, literal
  `kind: "wake"`, `wake-only`, `CronWake`, or retained-wake caller in `src`,
  `scripts`, `docs`, or `.pipelines`.
- Dockerized OpenClaw JS unit proof passed from the Lobster image worktree:
  msteams patched-source tests, upstream evidence/readiness/hosting scoped
  tests, and vendored m365mail tests all completed green.
- Two local image-build blockers were repaired in the clean promote branch:
  the remote-harness stage now uses an explicit temporary npmrc for `npm ci`
  and prune, and `scripts/build-openclaw.sh` no longer lets stale
  `.env.cargo-auth` values overwrite fresh caller-supplied package/feed tokens.
- After those repairs, `scripts/ensure-openclaw-image.sh` advanced through
  remote-harness npm install/build/prune and the NuGet stage, then failed at
  final runtime dependency materialization with npm `ETARGET` because the
  configured Lobster feed does not expose `openclaw@2026.6.33`.
- The validated local repair set was committed as
  `bf72332b7172e68892bbbfe8724e8e1fc9a962ff` and pushed only to the `giodl`
  fork remote on `promoteclaw/openclaw-2026.6.33`.

Current default: keep the clean 28-patch queue frozen. Do not add the 32-only
`0031-cron-wake-only-payload-kind.patch` unless a current Lobster caller or
failing fixture proves the dependency.
