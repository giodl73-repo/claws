Related RFC: https://github.com/openclaw/rfcs/pull/46

Umbrella outcome: https://github.com/openclaw/openclaw/issues/114145

Non-normative host follow-on evidence (Microsoft access): https://microsoft.ghe.com/giodl/lobster/pull/51

Stacked on: https://github.com/openclaw/openclaw/pull/112385

Stacked follow-up: https://github.com/openclaw/openclaw/pull/112896

Current head: `32cd8e68b2d539dc0d6c9b3ef2821c3275961a20`

## What problem this solves

After the host has fenced ingress and stopped authoritative writers, it needs one exact final recovery point before retiring a Gateway generation. This PR adds a private, stdin-only `openclaw backup capture-final` command that binds host-supplied closure evidence, captures the complete owner inventory through the existing SQLite provider, verifies the aggregate, and durably journals one committed result for exact replay in an operation-scoped SQLite database.

The request carries the same canonical, generation-bound owner inventory receipt used by aggregate composition and replay verification. The journal lives under OpenClaw state rather than the caller-selected artifact repository, so changing a repository path cannot recapture the same handoff. The final capture path now derives agent database paths from OpenClaw's registered state-owner inventory instead of deriving default paths from caller-supplied agent IDs, pins the recovery-point repository before publication, syncs the journal directory on every open, and rejects aggregate manifest byte rewrites during replay.

This is the final-capture slice of the host-neutral scale-to-zero contract tracked in #114145. It is motivated by unified backup/restore (#13616) and the need for an owner-safe SQLite snapshot boundary (#101290); adjacent snapshot hardening remains tracked separately in #113306. It does not claim to close those broader issues by itself. It builds on Vincent's snapshot primitive (#105718), Peter's suspension fence (#103618), Vincent's validation repair (#103925), and Josh Lehman's SQLite session/transcript runtime (#98236).

The result is `host-protected`, not credential-free portable. The host still owns ingress fencing, clean shutdown, acceptance, encryption, upload, retention, wake, placement, and source destruction.

## Decisions requested

1. Final capture may trust explicit host closure evidence only after the host has actually stopped authoritative writers.
2. The selected-agent inventory must be canonical and exact.
3. Once durable intent exists, capture or verification failure quarantines; retry cannot silently recapture under the same operation identity.
4. The hidden command remains private until the RFC ownership split is accepted.

## Real behavior proof

Behavior or issue addressed:
Final capture now uses the state owner's exact registered agent database paths, includes incompatible registered agent database rows in its inventory conflict check instead of silently omitting them, keeps recovery-point publication behind a pinned repository directory, requires a crash-durable parent edge when creating recovery-root directories, revalidates recovery-journal directory durability on every open, rejects recovery-journal pathname replacement before SQLite DDL, keeps the hidden stdin command's stdout owned by the JSON protocol from startup, and rejects aggregate manifest byte rewrites on replay.

Real environment tested:
Ubuntu 24.04 WSL worktree `/root/src/openclaw-112865-restack`, Node `v24.15.0`, pnpm `11.15.1`, exact head `32cd8e68b2d539dc0d6c9b3ef2821c3275961a20`. The final-capture tests use real current-schema SQLite global and agent databases, the real OpenClaw state registry, the local SQLite snapshot provider, the dedicated SQLite recovery journal, and a real source CLI process for hidden stdin/stdout behavior.

Exact steps or command run after this patch:

1. `node scripts/run-vitest.mjs run src/cli/command-startup-policy.test.ts src/snapshot/recovery-journal.test.ts src/commands/backup-capture-final.test.ts test/cli-json-stdout.e2e.test.ts --reporter=verbose --maxWorkers=1`
2. `node scripts/run-tsgo.mjs -p test/tsconfig/tsconfig.test.src.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/test-src-pr112865-repair.tsbuildinfo`
3. `pnpm deadcode:exports`
4. `pnpm exec oxfmt --check src/cli/command-catalog.ts src/cli/command-startup-policy.test.ts src/snapshot/recovery-journal.ts src/snapshot/recovery-journal.test.ts test/cli-json-stdout.e2e.test.ts src/commands/backup-capture-final.test.ts`
5. `git diff --check`
6. `node scripts/run-vitest.mjs run --config test/vitest/vitest.cli.config.ts src/cli/program/root-command-descriptions.test.ts --reporter=verbose --maxWorkers=1`
7. `node scripts/run-vitest.mjs run --config test/vitest/vitest.unit-src.config.ts src/snapshot/recovery-journal.test.ts --reporter=verbose --maxWorkers=1`
8. `pnpm exec oxlint src/snapshot/recovery-journal.test.ts src/cli/program/root-command-descriptions.test.ts`
9. `node scripts/run-tsgo.mjs -p test/tsconfig/tsconfig.test.src.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/test-src-pr112865-ci-repair.tsbuildinfo`

Evidence after fix:
Formatter, diff whitespace, tsgo, oxlint, and deadcode export checks passed. The focused WSL Vitest run passed 4 final-capture shards: `src/snapshot/recovery-journal.test.ts` 1/1, `src/cli/command-startup-policy.test.ts` 12/12, `src/commands/backup-capture-final.test.ts` 1/1, and `test/cli-json-stdout.e2e.test.ts` 4/4. The exact-head CI repair also passed the CLI root-command JSON decision test and the recovery-journal unit test that GitHub had failed. The final-capture suite includes relocated registered agent database capture, incompatible registered agent schema quarantine, unsupported recovery-root parent-sync hold, component byte tamper quarantine, aggregate manifest byte tamper quarantine, durable-intent quarantine, exact replay, recovery-journal pathname replacement rejection, and hidden command stdout parseability from a real stdin process.

Observed result after fix:
The final-capture source harness captured a recovery point from registered SQLite owner state, replayed the exact committed result, refused a different repository path for the same operation identity, quarantined post-intent failures, rejected both component-byte and aggregate-manifest byte changes, rejected a journal replacement race before SQLite DDL, and kept hidden command stdout to one JSON document with no startup banner/progress text.

What was not tested:
A production host supervisor supplying closure evidence, external durable acceptance, upload/encryption, source destruction, full CLI happy-path capture against live host state, crash injection at every fsync boundary, or cross-OS proof.

## Merge gate

Ready for code review of the repaired head. Merge remains gated on owner acceptance of closure evidence, inventory ownership, and host-protected versus portable semantics in openclaw/rfcs#46. This PR is one bounded implementation of #114145, not a mandate for this exact seam; retained ingress, wake, placement, and compute lifecycle remain host-owned.
