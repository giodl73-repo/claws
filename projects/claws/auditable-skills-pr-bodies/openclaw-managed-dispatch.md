## What Problem This Solves

OpenClaw has one correct path for managed skill execution today: `sessions_spawn` resolves a skill from the parent run's effective snapshot, applies managed-run restrictions, creates exact invocation identity, and enters the native subagent lifecycle.

That logic was embedded inside the model-facing tool. A future TaskFlow controller could not request the same managed run without either invoking a broad tool surface or copying admission and identity rules. Copying those rules would create two security and lifecycle paths.

## Why This Change Was Made

This slice extracts one host-owned `spawnManagedSkillDirect` boundary and makes `sessions_spawn` use it.

The boundary:

- resolves exactly one model-invocable skill from the trusted effective parent snapshot;
- keeps managed execution on the current agent and in one background native subagent run;
- constructs the existing immutable skill invocation descriptor, including digest, execution hints, and parent run ID; and
- delegates policy, depth, child limits, sandbox, model authorization, tool inheritance, session creation, cancellation, and run registration to the existing `spawnSubagentDirect` lifecycle.

The old inline managed path is deleted. This is not a second executor or plugin escape hatch.

This PR deliberately does not expose a workflow API, create workflow state, add storage, or claim restart-safe dispatch. Host-derived idempotency for workflow step attempts is the next bounded prerequisite before a TaskFlow runner.

## User Impact

There is no new command or configuration. Existing `sessions_spawn(skill=...)` behavior continues through the same native child-run lifecycle.

The architectural benefit is that a later core controller has one admission function to reuse. Skill authors keep writing ordinary `SKILL.md` files, operators keep seeing ordinary managed child runs, and future orchestration does not need a parallel policy or accounting system.

## Evidence

- `node scripts/run-vitest.mjs src/agents/managed-skill-spawn.test.ts` — 4 tests passed.
- `node scripts/run-vitest.mjs src/agents/tools/sessions-spawn-tool.test.ts -t "managed"` — 4 relevant tests passed; 134 unrelated tests skipped across the selected agent projects.
- `oxfmt --check` passed for all four changed files.
- Direct scoped `oxlint` passed for all four changed files.
- `git diff --check` passed.
- Structured Codex autoreview returned no findings and judged the patch correct at 0.94 confidence.

The full unfiltered `sessions-spawn-tool.test.ts` command exceeded the local 180-second window without emitting a test result. The focused managed cases passed and are the changed behavior surface.

## Real behavior proof

Behavior or issue addressed:
Managed skill requests from `sessions_spawn` and direct host code use one trusted admission and native dispatch boundary.

Real environment tested:
Windows 11, Node-based OpenClaw source harness, fork branch `agent/auditable-skills-managed-dispatch` at `fc77504d`, using the prepared dependencies from the exact parent stack checkout. No live Gateway or provider credentials were used.

Exact steps or command run after this patch:

1. `node scripts/run-vitest.mjs src/agents/managed-skill-spawn.test.ts`
2. `node scripts/run-vitest.mjs src/agents/tools/sessions-spawn-tool.test.ts -t "managed"`
3. Run scoped `oxfmt --check`, direct scoped `oxlint`, and `git diff --check` over the four changed files.

Evidence after fix:
The direct seam suite reported `4 passed`. The managed `sessions_spawn` selection reported `4 passed | 134 skipped`. Formatting, lint, and whitespace checks exited successfully. Autoreview reported `findings: []`.

Observed result after fix:
An available skill produces the same native subagent request with its managed invocation ID, skill name, source, digest, declared outcomes, parent run ID, task, and allowed model. Missing skills, cross-agent targets, and non-background execution are rejected before native spawn.

What was not tested:
No live model/provider run, Gateway restart, durable TaskFlow controller, or workflow-attempt idempotency was tested. The unfiltered sessions-spawn suite exceeded the local time window; the focused managed selection passed.

## Stack

- Base: [OpenClaw #113 — check exact-run token budgets](https://github.com/giodl73-repo/openclaw/pull/113)
- Design: [RFC 0022 — Auditable Skills](https://github.com/giodl73-repo/rfcs/pull/6)

Fork-only draft proof. Nothing is proposed upstream.
