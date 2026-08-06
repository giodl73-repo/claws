Related RFC: https://github.com/openclaw/rfcs/pull/46

Umbrella outcome: https://github.com/openclaw/openclaw/issues/114145

Non-normative host follow-on evidence (Microsoft access): https://microsoft.ghe.com/giodl/lobster/pull/51

Stacked on: https://github.com/openclaw/openclaw/pull/112865

Exact reviewed head: `ebe486dae3cad495c73259c5ee04cc042292fe8b`

## What problem this solves

A replacement Gateway must not accept work merely because SQLite files exist. This PR restores only the exact accepted recovery point into fresh canonical targets, closes work admission before startup, reconciles the scheduler and required owners, commits generation-bound readiness evidence, and only then releases admission.

It also proposes one concrete host-neutral observation seam:

```ts
gateway.restore.status({ restoreOperationId })
  -> { status: "not-restored" }
   | { status: "held", reason, retryAfterMs, ...restoreIdentities }
   | { status: "ready", ...restoreIdentities, schedulerIdentity,
       ownerReadinessIdentity, readinessIdentity }
```

The method follows the shipped `gateway.suspend.status` pattern: closed Gateway Protocol schemas, `operator.read`, exact operation fencing, no mutation, and a typed `UNAVAILABLE` conflict that does not disclose the active operation. It projects the same in-memory restored-start object and operation-scoped SQLite journal that own admission. It adds no status file, config key, public probe, listener, sidecar, or caller-controlled `admit` method.

While restored admission is held, a new supervisor still needs to authenticate before it can inspect this method. The exception is limited to OpenClaw's local, device-less backend probe shape and is tracked as root work for the full handshake. Nodes, browsers, device enrollment, remote clients, ordinary RPCs, and every connection during restart drain remain blocked.

This is the destination slice of the scale-to-zero contract tracked in #114145. It is motivated by skipped recurring work while Gateway is stopped (#104412), unified recovery (#13616), and per-agent restore (#63392). It builds on Josh Lehman's restart-recovery admission work (#111869), Vincent's SQLite snapshot work, and Peter's cooperative suspension/status pattern.

## End-to-end contract

```text
accepted recoveryPointId + acceptanceSetId
  -> exact fresh-target restore
  -> hidden Gateway CLI restore descriptor handoff
  -> held: scheduler-reconciliation
  -> held: owner-readiness
  -> held: ready-commit
  -> durable RestoredAdmissionReadyRecord
  -> release the same admission identity
  -> ready from gateway.restore.status
  -> host may deliver retained owner work
```

The host owns retained ingress, wake, placement, compute generations, and delivery acknowledgement. OpenClaw owns component restore, scheduler/owner readiness, the durable ready record, and opening its own work admission.

## Decisions requested

1. Accept the restored-admission ownership split above.
2. Accept `gateway.restore.status` as the small public observation seam, or ask us to remove/replace it before merge. The implementation is representative proof, not a claim that the public API is already owner-approved.
3. Keep the exact-operation mismatch fail-closed and identity-redacted.
4. Keep corrupt or contradictory durable records quarantined and temporary owner unavailability held.

## Repair after ClawSweeper review

The prior head introduced `OPENCLAW_RFC0013_RESTORED_ADMISSION_FILE` as an ambient startup carrier. That carrier is removed. Restored admission now enters Gateway startup through an explicit internal lifecycle handoff:

- hidden CLI option: `gateway run --restore-admission-descriptor <path>`
- CLI runtime plumbing: `GatewayRunOpts.restoreAdmissionDescriptor`
- server startup option: `GatewayServerOptions.restoredAdmissionDescriptorPath`
- restored startup preparation: validates the descriptor path passed by lifecycle code and no longer reads or deletes an `OPENCLAW_*` environment variable

The checked-in `OPENCLAW_*` budget remains unchanged at `520/520`.

The current head also repairs two review findings from the previous ClawSweeper cycle:

- `gateway.restore.status` now appends after the existing advertised method tail instead of inserting between `gateway.suspend.prepare` and `gateway.suspend.status`; the generated Android method catalog is synchronized.
- restored agent databases are re-registered against the destination runtime after accepted bytes are restored, replacing restored source-path registry rows for the same agent before the committed restore receipt is written.

## Real behavior proof

Behavior or issue addressed:
Remove the unapproved ambient restored-admission `OPENCLAW_*` startup carrier while preserving restored recovery-point admission sequencing behind an explicit lifecycle handoff.

Real environment tested:
Ubuntu 24.04 WSL native checkout at `/root/src/openclaw-112896-restack`, Node `v24.15.0`, pnpm `11.15.1`, exact source head `ebe486dae3cad495c73259c5ee04cc042292fe8b`. The stack contains #112865 exact head `32cd8e68b2d539dc0d6c9b3ef2821c3275961a20` and was rebased onto current `upstream/main` (`874c63318b590a3567a49d36066d79d211f8be08`) to clear the dirty merge state.

Exact steps or command run after this patch:

1. `pnpm exec vitest run src/snapshot/restored-recovery-point.test.ts src/snapshot/final-recovery-point.test.ts src/snapshot/recovery-point.test.ts src/snapshot/recovery-journal.test.ts`
2. `pnpm exec vitest run src/gateway/server-methods-list.test.ts src/gateway/methods/core-descriptors.since.test.ts src/gateway/server-methods/restore.test.ts src/gateway/server-methods.suspension-admission.test.ts src/gateway/restored-admission.test.ts src/gateway/server-startup-post-attach.test.ts src/gateway/server/ws-connection/message-handler.suspension-admission.test.ts`
3. `pnpm exec vitest run src/cli/program/register.backup.test.ts src/cli/program/root-command-descriptions.test.ts src/cli/gateway-cli/run.option-collisions.test.ts packages/gateway-protocol/src/gateway-restore.test.ts`
4. `node scripts/run-tsgo.mjs -p test/tsconfig/tsconfig.test.src.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/test-src-pr112896-restack-874c633.tsbuildinfo`
5. `pnpm deadcode:exports`
6. `PROTOCOL_SINCE_BASE_SHA=b7f9cd0a01671f7be5fc34b4bd4bf6770603f480 pnpm protocol:check`
7. `pnpm exec oxfmt --check src/gateway/methods/core-descriptors.ts src/gateway/server-methods-list.test.ts src/snapshot/restored-recovery-point.ts src/snapshot/restored-recovery-point.test.ts`
8. `pnpm exec oxlint src/snapshot/restored-recovery-point.ts src/gateway/methods/core-descriptors.ts`
9. `git diff --check`

Earlier exact-head repair validation retained in the stack:

1. `node scripts/run-vitest.mjs run --config test/vitest/vitest.unit-src.config.ts src/snapshot/restored-recovery-point.test.ts src/snapshot/recovery-point.test.ts src/snapshot/final-recovery-point.test.ts --reporter=verbose --maxWorkers=1`
2. `node scripts/run-vitest.mjs run --config test/vitest/vitest.gateway.config.ts src/gateway/restored-admission.test.ts src/gateway/server/ws-connection/message-handler.suspension-admission.test.ts src/gateway/server-methods.suspension-admission.test.ts src/gateway/server-methods/restore.test.ts --reporter=verbose --maxWorkers=1`
3. `node scripts/run-vitest.mjs run --config test/vitest/vitest.cli.config.ts src/cli/gateway-cli/run.option-collisions.test.ts src/cli/program/register.backup.test.ts --reporter=verbose --maxWorkers=1`
4. `node scripts/run-vitest.mjs run --config test/vitest/vitest.gateway-client.config.ts packages/gateway-protocol/src/gateway-restore.test.ts --reporter=verbose --maxWorkers=1`
5. `node scripts/run-tsgo.mjs -p test/tsconfig/tsconfig.test.src.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/test-src-pr112896-main-rebase.tsbuildinfo`
6. `pnpm deadcode:exports`
7. `PROTOCOL_SINCE_BASE_SHA=b7f9cd0a01671f7be5fc34b4bd4bf6770603f480 pnpm protocol:check`
8. `pnpm exec oxfmt --check src/gateway/server-start.ts src/gateway/server-startup-finish.ts src/gateway/restored-admission.ts src/gateway/restored-admission.test.ts src/snapshot/restored-recovery-point.ts src/snapshot/restored-recovery-point.test.ts scripts/check-protocol-registry.mjs`
9. `git diff --check upstream/main..HEAD`
10. `node scripts/check-no-conflict-markers.mjs`
11. `git merge --no-commit --no-ff upstream/main` merge probe after rebase returned `Already up to date.`
12. `node scripts/run-vitest.mjs run --config test/vitest/vitest.cli.config.ts src/cli/program/root-command-descriptions.test.ts --reporter=verbose --maxWorkers=1 --testNamePattern "classifies every built-in command as JSON output"`
13. `node scripts/run-vitest.mjs run --config test/vitest/vitest.unit-src.config.ts src/snapshot/recovery-point.test.ts --reporter=verbose --maxWorkers=1`
14. `pnpm exec oxlint src/snapshot/recovery-point.test.ts src/cli/program/root-command-descriptions.test.ts`
15. `pnpm exec oxfmt --check src/snapshot/local-repository.ts`
16. `pnpm exec oxlint src/snapshot/local-repository.ts`
17. `node scripts/run-vitest.mjs run --config test/vitest/vitest.unit-src.config.ts src/snapshot/local-repository.test.ts src/infra/sqlite-snapshot.test.ts --reporter=verbose --maxWorkers=1`
18. `node scripts/run-tsgo.mjs -p tsconfig.core.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/core-pr112896-windows-acl-timeout.tsbuildinfo`

Evidence after fix:

```text
current-restack snapshot/restored/final/recovery-journal tests: 31 passed
current-restack gateway method-list/restored/suspension/restore/startup tests: 146 passed
current-restack CLI/root-command/protocol tests: 90 passed
current-restack test-src tsgo: passed
current-restack deadcode exports: passed with 0 entries
current-restack protocol registry/generation/since/native diff check: passed
current-restack touched oxfmt, oxlint, and diff check: passed
snapshot restored/final/recovery-point tests: 29 passed
gateway restored/suspension/restore method tests: 50 passed
CLI gateway/backup tests: 80 passed
gateway restore protocol tests: 7 passed
test-src tsgo: passed
deadcode exports: passed with 0 entries
protocol registry/generation/since/native diff check: passed
format, diff, conflict-marker checks: passed
CI repair targeted root-command JSON classification test: 1 passed / 2 skipped
CI repair recovery-point test: 8 passed
CI repair touched oxlint: passed with 0 warnings and 0 errors
Windows ACL metadata repair format/lint: passed
local SQLite snapshot repository tests: 63 passed / 3 skipped
core tsgo: passed
```

Observed result after fix:
The restored-admission env carrier remains absent, the hidden CLI handoff reaches `GatewayServerOptions.restoredAdmissionDescriptorPath`, `gateway.restore.status` remains reachable only during a restored hold and not during restart drain, the restore-status method appends after the existing advertised catalog tail, restored fixtures satisfy the registered-agent final-capture invariant from #112865, restored relocated agent registry rows are replaced with destination-runtime ownership before the committed restore receipt, protocol schema/native generated artifacts are current, hidden `backup restore-accepted` has an explicit JSON-output N/A classification, the stale recovery-point test-only owner-inventory alias is removed, and Windows ACL metadata reads now keep their fail-closed verification while allowing slower hosted-runner PowerShell ACL inspection and preserving the underlying cause in errors.

What was not tested:
Full live host-retained ingress delivery remains outside this bounded OpenClaw slice. The Gateway Protocol observation seam plus restored-admission ownership split still need the requested owner decision before merge.

## Merge gate

Ready for owner review, not owner-approved. Merge remains gated on Peter's Gateway Protocol decision and the restored-admission ownership split in openclaw/rfcs#46. This PR is one bounded implementation of #114145, not a mandate for this exact decomposition. Retained ingress, Teams/API payloads, cron wake, placement, and source destruction remain host-owned.
