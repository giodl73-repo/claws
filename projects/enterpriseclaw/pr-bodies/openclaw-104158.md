## Summary

Adds opt-in live paired-node command observation to the `openclaw tools commands`
inventory from [#100960](https://github.com/openclaw/openclaw/pull/100960).

## Contract

- Live node collection runs only when the caller supplies `--node`.
- The selected node must be connected and paired through Gateway diagnostics.
- Node command records are observation-only and do not grant invoke authority.
- Unknown node command semantics remain unknown; the inventory does not infer
  effect, risk, or confirmation policy.
- Collection status is reported at both the overall inventory level and the CLI
  node-command scope.
- CLI failures for missing, disconnected, unpaired, or mismatched nodes fail
  without emitting partial JSON.

## Scope

This PR adds live Gateway node command collection for the command inventory only.
It does not change node invocation, pairing policy, authorization, or agent
prompt behavior.

## Validation

Current head: `a7ce8e8aaefa3da34b8396c6fd4ed691798241fe`.
Parent stack: #100960 current repaired head
`8e72d20247b3adbd447fd738338ab3a93319ca5f`; this child branch now carries the
same `tools` core-owned namespace repair content plus only the live-node
inventory commits.

Windows worktree `C:\src\openclaw-pr104158-node-rebuild`:

1. Repaired the two exact-head ClawSweeper findings from the August 5 review:
   `tools` remains a reserved/core-owned CLI root, and explicit blank `--node`
   values now fail before Gateway query or JSON output.
2. Restacked the child branch on the exact #100960 parent head after the
   reserved plugin-root filtering repair and dropped duplicate parent repair
   commits already present in #100960.
3. `oxfmt --check src/cli-catalog-overlay/live-node-commands.ts src/cli-catalog-overlay/live-node-commands.test.ts src/cli-catalog-overlay/list.ts src/cli-catalog-overlay/list.test.ts src/cli/catalog-cli.ts src/cli/catalog-cli.test.ts docs/cli/commands.md`
   passed after the parent restack.
4. `git diff --check origin/user/giodl/cli-catalog-review-hardening..HEAD`
   passed.
5. Focused Vitest in this Windows-mounted worktree is still blocked before
   tests execute by existing local dependency skew:
   `TypeError: configureFsSafeNative is not a function` from
   `src/infra/fs-safe-defaults.ts`.

WSL Ubuntu hydrated checkout at `/tmp/openclaw-pr100960-tools-validate`:

1. `node scripts/run-vitest.mjs run src/cli/catalog-cli.test.ts src/cli-catalog-overlay/list.test.ts src/cli-catalog-overlay/live-node-commands.test.ts --reporter=verbose --maxWorkers=1`
   passed: 28 focused catalog/list/live-node/CLI tests across 2 Vitest shards.
2. `node scripts/run-vitest.mjs run src/cli/catalog-cli.test.ts src/cli-catalog-overlay/list.test.ts src/cli-catalog-overlay/inspect.test.ts src/cli-catalog-overlay/plugin-commands.test.ts src/cli-catalog-overlay/live-node-commands.test.ts --reporter=verbose --maxWorkers=1`
   passed: 39 catalog, CLI, plugin descriptor, inspect, and live-node tests
   across 2 Vitest shards.
3. `pnpm deadcode:exports` passed with 0 entries.
4. `pnpm exec oxfmt --check docs/cli/commands.md src/cli-catalog-overlay/list.test.ts src/cli-catalog-overlay/list.ts src/cli-catalog-overlay/live-node-commands.test.ts src/cli-catalog-overlay/live-node-commands.ts src/cli-catalog-overlay/node-commands.ts src/cli/catalog-cli.test.ts src/cli/catalog-cli.ts`
   passed.
5. `git diff --check 8e72d20247b3adbd447fd738338ab3a93319ca5f..HEAD` passed.

## Real behavior proof

Behavior or issue addressed:
`openclaw tools commands list --json --node <node-id>` can observe command
identifiers from a selected connected paired Gateway node and expose them as
audit/operator catalog entries without granting invoke authority or inventing
effect metadata.

Real environment tested:
WSL Ubuntu source harness in hydrated checkout
`/tmp/openclaw-pr100960-tools-validate` at exact head
`a7ce8e8aaefa3da34b8396c6fd4ed691798241fe`, represented locally as temporary
validation commit `2d09cc413440cab02d8aaef032f9f09ab488376c` on top of #100960
`8e72d20247b3adbd447fd738338ab3a93319ca5f`, with the same tree
`2ad8553f0b11796c4707aa4eb6ffe705f88be747`, using the repository Gateway and
CLI catalog test harnesses.

Exact steps or command run after this patch:

1. `node scripts/run-vitest.mjs run src/cli/catalog-cli.test.ts src/cli-catalog-overlay/list.test.ts src/cli-catalog-overlay/live-node-commands.test.ts --reporter=verbose --maxWorkers=1`
2. `node scripts/run-vitest.mjs run src/cli/catalog-cli.test.ts src/cli-catalog-overlay/list.test.ts src/cli-catalog-overlay/inspect.test.ts src/cli-catalog-overlay/plugin-commands.test.ts src/cli-catalog-overlay/live-node-commands.test.ts --reporter=verbose --maxWorkers=1`
3. `pnpm deadcode:exports`

Evidence after fix:
Step 1 passed 28 focused CLI/list/live-node tests proving the repaired review
findings: Gateway-valid strings such as `vendor/foo` are preserved, connected
but unpaired nodes fail before JSON output, blank `--node` fails before Gateway
query or JSON output, empty live Gateway results keep `nodeCommandScope:
"live-gateway-query"`, and node labels, command IDs, and invocation hints are
kept inside Markdown table cells before terminal output. The main CLI
projection still asserts
`callNodeDiagnosticsGatewayCli("node.describe", ..., { nodeId: "node-1" })`,
`counts.nodeCommands === 1`, `cli.nodeCommandScope === "live-gateway-query"`,
and a projected node command with `command: "system.run"` and `discoveryMode:
"runtime-node-query"`.

Step 2 passed 39 catalog, CLI, plugin descriptor, inspect, and live-node tests
across 2 Vitest shards. Step 3 passed with 0 unused-export entries.

Observed result after fix:
The exact restacked head still proves the two runtime halves required by this
slice: Gateway diagnostics responses from a selected paired node are projected
into the command inventory's live node-command collection without granting
invoke authority, and Markdown output no longer lets node-supplied metadata
break table rows.

What was not tested:
A spawned child-process CLI proof against the in-process Gateway server was
attempted in the hydrated WSL checkout, but the temporary one-off gateway test
harness hung before setup markers printed. No diagnostic harness code is
included in this PR. Maintainers should treat the proof above as exact-head
source-harness proof, not as an exact spawned-process CLI transcript.
