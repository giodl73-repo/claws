## Summary

Adds an explicitly requested, bounded command-inventory projection for agent
system prompts. It consumes the normalized catalog output from
[#100960](https://github.com/openclaw/openclaw/pull/100960) and can include
validated live-node records from
[#104158](https://github.com/openclaw/openclaw/pull/104158).

## Contract

- No command inventory is injected unless the caller supplies
  `commandInventory`.
- Projection uses normalized catalog records rather than a parallel command
  registry.
- Tool and scope filters bound what enters a prompt.
- Unsafe command or node identifiers are rejected.
- Node records must be explicitly prompt-visible before becoming model
  guidance; audit/operator-only observations stay out of the prompt.
- Node argument hints are validated one by one and hostile hints are omitted.
- The complete model-visible projection is capped after all sources are
  combined.
- Unknown source semantics are presented conservatively as unknown risk with
  confirmation guidance; source records remain unknown.
- Plugin descriptor commands do not supply effect/risk semantics, so plugin
  prompt rows remain unknown/user-confirmed instead of reading absent fields.
- Compaction prompt rebuilds receive the same run-scoped command inventory as
  normal attempts.
- Node guidance uses the existing `nodes action=invoke` route and does not
  invent `{}` parameters when no schema exists.
- `node-operator` is an explicit run scope, not a global prompt mode.
- Projection visibility is guidance only; it neither grants command authority
  nor extends a source registration lifetime.

## Scope

This PR renders scoped guidance only. It does not dispatch commands, change
authorization, enable node access, or add default prompt content.

## Validation

Current head: `64d72f94e5db3509a1c4d0ed7f680d9eaa16e1bb`.
Parent stack: #100960 `8e72d20247b3adbd447fd738338ab3a93319ca5f`,
#104158 `a7ce8e8aaefa3da34b8396c6fd4ed691798241fe`.

WSL Ubuntu hydrated checkout at `/tmp/openclaw-pr100960-tools-validate`:

1. `node scripts/run-vitest.mjs run src/cli-catalog-overlay/prompt-projection.test.ts src/agents/command-inventory-prompt.test.ts src/agents/system-prompt.test.ts src/agents/embedded-agent-runner/system-prompt.test.ts src/agents/embedded-agent-runner/compact.hooks.test.ts --reporter=verbose --maxWorkers=1`
   passed: 137 prompt projection, system prompt, embedded prompt, and compaction
   tests across 3 Vitest shards.
2. `pnpm exec oxfmt --check src/agents/command-inventory-prompt.test.ts src/agents/command-inventory-prompt.ts src/agents/embedded-agent-runner/compact.hooks.test.ts src/agents/embedded-agent-runner/compact.types.ts src/agents/embedded-agent-runner/prepared-compaction-runtime.ts src/agents/embedded-agent-runner/run/attempt-system-prompt-prepare.ts src/agents/embedded-agent-runner/run/params.ts src/agents/embedded-agent-runner/system-prompt.test.ts src/agents/embedded-agent-runner/system-prompt.ts src/agents/system-prompt.test.ts src/agents/system-prompt.ts src/cli-catalog-overlay/prompt-projection.test.ts src/cli-catalog-overlay/prompt-projection.ts src/cli/catalog-metadata.ts`
   passed.
3. `git diff --check a7ce8e8aaefa3da34b8396c6fd4ed691798241fe..HEAD`
   passed.
4. `pnpm deadcode:exports` passed with 0 entries.
5. `node scripts/run-tsgo.mjs -p test/tsconfig/tsconfig.test.src.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/test-src-pr104159-restack.tsbuildinfo`
   exceeded the local 180s timeout without a diagnostic; GitHub CI remains the
   broad test-source typecheck signal for this head.

Windows note: this worktree lacks installed dependencies, so the local commit
hook and Windows Vitest could not run. The same changed files were validated in
the hydrated WSL checkout above.

## Real behavior proof

Behavior or issue addressed:
When a trusted runtime caller supplies command inventory, the agent prompt
receives only bounded, scope-filtered command guidance. The projection does not
grant command authority, does not make node commands globally visible, does not
include plugin commands unless they are prompt-enabled, and does not invent
source-owned semantics.

Real environment tested:
WSL Ubuntu source harness in hydrated checkout
`/tmp/openclaw-pr100960-tools-validate` at exact head
`64d72f94e5db3509a1c4d0ed7f680d9eaa16e1bb`, represented locally as temporary
validation commit `69b24acb1bf559d5356e5e636d72620dc6e2d6cd` on top of #104158
`a7ce8e8aaefa3da34b8396c6fd4ed691798241fe`, with the same tree
`1e2b2d93d5fcd545f6f53dbcc0f5582205b28083`, using the repository prompt
projection, agent system prompt, embedded-agent prompt, and compaction prompt
harnesses.

Exact steps or command run after this patch:

1. Reset WSL checkout to #104158
   `a7ce8e8aaefa3da34b8396c6fd4ed691798241fe`.
2. Apply the cumulative #104159 diff from the Windows worktree.
3. `node scripts/run-vitest.mjs run src/cli-catalog-overlay/prompt-projection.test.ts src/agents/command-inventory-prompt.test.ts src/agents/system-prompt.test.ts src/agents/embedded-agent-runner/system-prompt.test.ts src/agents/embedded-agent-runner/compact.hooks.test.ts --reporter=verbose --maxWorkers=1`
4. `pnpm exec oxfmt --check src/agents/command-inventory-prompt.test.ts src/agents/command-inventory-prompt.ts src/agents/embedded-agent-runner/compact.hooks.test.ts src/agents/embedded-agent-runner/compact.types.ts src/agents/embedded-agent-runner/prepared-compaction-runtime.ts src/agents/embedded-agent-runner/run/attempt-system-prompt-prepare.ts src/agents/embedded-agent-runner/run/params.ts src/agents/embedded-agent-runner/system-prompt.test.ts src/agents/embedded-agent-runner/system-prompt.ts src/agents/system-prompt.test.ts src/agents/system-prompt.ts src/cli-catalog-overlay/prompt-projection.test.ts src/cli-catalog-overlay/prompt-projection.ts src/cli/catalog-metadata.ts`
5. `git diff --check a7ce8e8aaefa3da34b8396c6fd4ed691798241fe..HEAD`
6. `pnpm deadcode:exports`
7. `node scripts/run-tsgo.mjs -p test/tsconfig/tsconfig.test.src.json --incremental --tsBuildInfoFile .artifacts/tsgo-cache/test-src-pr104159-restack.tsbuildinfo`

Evidence after fix:
The exact-head focused proof passed the command catalog, prompt/projection, and
compaction regressions. The passing cases included:

- `command prompt projection > includes callable node commands only in node-operator scope`
- `command prompt projection > rejects node-controlled identifiers that are not safe prompt literals`
- `command prompt projection > requires node commands to be prompt-visible before rendering model guidance`
- `command prompt projection > omits hostile node argument hints instead of rendering prompt text`
- `command prompt projection > caps the complete model-visible projection after adding routed operations`
- `buildCommandInventoryPromptSection > renders selected node commands in node-operator scope without host exec`
- `buildCommandInventoryPromptSection > omits node commands when the nodes tool is unavailable`
- `buildAgentSystemPrompt > includes run-scoped node commands only for node-operator prompts`
- `buildAgentSystemPrompt > omits host command routes from sandboxed prompts`
- `buildEmbeddedSystemPrompt > forwards node-operator command inventory into the embedded prompt`
- `compactEmbeddedAgentSessionDirect hooks > carries command inventory into compacted system prompt rebuilds`
- `buildCommandInventoryPromptSection > caps the fully rendered prompt section after formatting maximum-size node rows`
- `command prompt projection > advertises only commands the generic node invoke action can execute by default`

The run also retained the upstream command catalog and live-node harnesses from
the parent stack: `catalog-cli.test.ts`, `list.test.ts`, and
`live-node-commands.test.ts` all passed in the same exact-head validation.

Observed result after fix:
The prompt projection appears only when command inventory is supplied, remains
scope-filtered, omits unsafe or unavailable command surfaces, forwards
node-operator inventory into the main, embedded, and compaction prompt builders,
keeps the projection as guidance rather than authority, caps the final rendered
prompt section, and no longer advertises node/media/dedicated-tool commands
through the generic node invoke route.

What was not tested:
No live provider/model conversation was run on this exact head. This proof is
exact-head source-harness proof for prompt construction and gating. A later
live model/session proof should still be run before marking this draft ready.
