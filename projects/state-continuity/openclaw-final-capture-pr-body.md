Related RFC: https://github.com/openclaw/rfcs/pull/46

Depends on: https://github.com/openclaw/openclaw/pull/112385

> This is a stacked draft. GitHub cannot use the lower fork branch as an
> upstream PR base, so the temporary `main...head` view includes #112385. The
> final-capture-only review delta is six files, 806 added lines, and one commit:
> https://github.com/giodl73-repo/openclaw/compare/user/giodl/rfc-0013-recovery-points...user/giodl/rfc-0013-final-capture

## What Problem This Solves

PR #112385 composes already-created RFC 0013 SQLite snapshots, but a planned
handoff still has no single OpenClaw-owned operation that captures the final
closed global and selected-agent state, persists the exact aggregate bytes,
and replays a lost response without creating a second recovery point.

That owner-side proof is required before a host can safely retire one Gateway
generation or use its own stop-to-zero lifecycle primitives. It does not by
itself implement retained ingress, wake, host acceptance, or compute removal.

## Why This Change Was Made

This draft adds one hidden `openclaw backup capture-final` owner operation. A
strict stdin request binds runtime lineage, source generation, handoff identity,
canonical capture time, the exact selected-agent inventory, and host-supplied
closure evidence.

The operation:

- creates RFC 0013 global and per-agent snapshots through the existing local
  provider;
- composes and re-verifies #112385's host-protected aggregate recovery point;
- writes the canonical aggregate-manifest bytes and full logical acceptance
  inventory;
- uses a deterministic lineage/generation/handoff directory with durable
  intent;
- returns the same verified committed result on exact replay; and
- quarantines changed requests, partial prior attempts, conflicting component
  sets, and tampered committed bytes.

The command does not call `gateway.suspend.*`, stop Gateway, fence external
ingress, publish bytes, accept host durability, or authorize source
destruction. The host must prove its closure evidence before invoking this
offline owner operation. Interrupted attempts without a committed result
quarantine instead of recapturing.

## User Impact

No ordinary user flow changes. The command is hidden and intended only for a
future RFC 0013 host adapter. Ordinary SQLite backup commands and Gateway
shutdown remain unchanged.

## Validation

- Final synchronized WSL checkout: Ubuntu 24.04, Node 24.15.0, pnpm 11.2.2.
- Focused routed Vitest: four files, 22 tests passed across three shards.
- Core production tsgo: passed.
- Targeted Oxlint: zero warnings and zero errors.
- Targeted Oxfmt: all six files matched.
- `codex review --uncommitted`: accepted one P2 about oversized stdin bypassing
  the structured result, moved stdin acquisition inside the handled command,
  added a regression test, reran proof, and the final review reported no
  actionable correctness issues.
- Core test tsgo was attempted twice but did not complete within bounded six-
  and ten-minute windows. Focused test compilation and execution passed.

## Real behavior proof

Behavior or issue addressed:
A host-fenced final handoff can capture real global and selected-agent SQLite
databases into one immutable host-protected recovery point, replay the exact
committed result, and reject conflicting, partial, or tampered state.

Real environment tested:
Ubuntu 24.04 WSL checkout stacked on commit
`b483d8089160fedcda4e3ce193fbb154e434698c`, Node 24.15.0, pnpm 11.2.2, real
Node SQLite databases using current OpenClaw global and agent schemas, local
filesystem only; no live Gateway, Lobster, storage provider, or credential-free
projection.

Exact steps or command run after this patch:

1. `node scripts/run-vitest.mjs src/snapshot/final-recovery-point.test.ts src/snapshot/recovery-point.test.ts src/commands/backup-capture-final.test.ts src/cli/program/register.backup.test.ts`
2. `node scripts/run-tsgo.mjs -p tsconfig.core.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/core.tsbuildinfo`
3. `./node_modules/.bin/oxlint --deny-warnings src/snapshot/final-recovery-point.ts src/snapshot/final-recovery-point.test.ts src/commands/backup-capture-final.ts src/commands/backup-capture-final.test.ts src/cli/program/register.backup.ts src/cli/program/register.backup.test.ts`
4. `./node_modules/.bin/oxfmt --check src/snapshot/final-recovery-point.ts src/snapshot/final-recovery-point.test.ts src/commands/backup-capture-final.ts src/commands/backup-capture-final.test.ts src/cli/program/register.backup.ts src/cli/program/register.backup.test.ts`

Evidence after fix:
Vitest reported 12 recovery-point tests, nine CLI registration tests, and one
command-boundary test passing. The fixture created current-schema global and
agent databases, captured both through the real RFC 0013 provider, re-verified
the aggregate, replayed the committed result, and rejected changed intent,
partial intent, and modified SQLite bytes. Core tsgo exited zero; Oxlint
reported zero warnings/errors; Oxfmt reported all files matched.

Observed result after fix:
One exact runtime-lineage/source-generation/handoff request produced one
verified host-protected recovery point and complete acceptance inventory. Exact
replay returned the same result and paths without a second snapshot.
Conflicting closure evidence, an interrupted durable intent, and modified
committed bytes failed closed. Oversized stdin returned the structured
`final-capture.request-invalid` envelope.

What was not tested:
No live Gateway stop/suspension, external ingress fence, Lobster caller, host
durability acceptance, publication, credential-free portability receipt, or
source destruction. Core test tsgo did not finish within the bounded validation
windows; focused routed tests passed.

## Draft Review Gate

Keep this PR draft until RFC #46's portable-handoff ownership split and
#112385's recovery-point inventory and acceptance contract receive owner
review. A later host integration must supply real `gateway.suspend.*`, ingress
fencing, clean stop, and provider-generation evidence; this command must not
grow those host responsibilities.

