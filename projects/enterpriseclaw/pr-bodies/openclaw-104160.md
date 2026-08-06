## Summary

Generates a checked-in static public command reference from the command catalog
introduced by [#100960](https://github.com/openclaw/openclaw/pull/100960). This
is the documentation slice of
[Command Catalog RFC #32](https://github.com/openclaw/rfcs/pull/32).

## Contract

- Generates only static public command descriptors and declared effects.
- Omits hidden, plugin-runtime, and deployment-specific node observations from
  the static table.
- Documents the runtime inventory CLI, including opt-in live paired-node query
  flags, without treating the CLI as execution authority.
- Treats unknown effects as missing metadata, not as a safety claim.
- Keeps the existing publish/package docs-map path; this PR does not add a
  second committed docs-map generator.
- Suppresses host shell CLI route guidance in normal and compacted Code Mode
  prompts and caps the aggregate command guidance section.
- Keeps plugin-owned descendants reachable below the core-owned `tools`
  namespace.
- Tracks private QA and experimental Claws descriptor gates in docs freshness.

## Scope

This PR adds generated reference content and freshness enforcement. It also
repairs inherited prompt-surface findings from the command inventory stack so
the docs slice can be reviewed on top of #104158 and #104159.

## Validation

Current head: `42da0fbd0365179ee3ea5c555634ebc186e0007b`.
Parent stack: #104158 `a7ce8e8aaefa3da34b8396c6fd4ed691798241fe`,
#104159 `64d72f94e5db3509a1c4d0ed7f680d9eaa16e1bb`.

WSL validation checkout: `/tmp/openclaw-pr100960-tools-validate`, reset to
#104159 `64d72f94e5db3509a1c4d0ed7f680d9eaa16e1bb` with this PR's diff
applied as temporary validation commit
`869eceb7758b94b28a17298fddb1d05d0c31d505`; the validated tree
`34fd86d3558b10e8f8922f8e4cea2134feed2850` matches the pushed head.

1. `pnpm docs:commands:check` passed.
2. `node scripts/run-vitest.mjs run test/scripts/generate-command-reference-doc.test.ts test/scripts/ci-workflow-guards.test.ts src/cli/command-registration-policy.test.ts src/agents/command-inventory-prompt.test.ts src/agents/system-prompt.test.ts src/agents/embedded-agent-runner/compact.hooks.test.ts --reporter=verbose --maxWorkers=1`
   passed: 3 Vitest shards, including command-policy, docs-guard, generator,
   system prompt, and compaction regressions. The run printed expected negative
   usage output from the generator argument test and install-script audit
   messages, but exited successfully.
3. `git diff --check 64d72f94e5db3509a1c4d0ed7f680d9eaa16e1bb..HEAD`
   passed.
4. `pnpm exec oxfmt --check .github/actions/detect-docs-changes/action.yml docs/AGENTS.md docs/cli/commands.md docs/cli/index.md docs/docs.json package.json scripts/generate-command-reference-doc.ts src/agents/command-inventory-prompt.test.ts src/agents/command-inventory-prompt.ts src/agents/embedded-agent-runner/compact.hooks.test.ts src/agents/embedded-agent-runner/compact.types.ts src/agents/embedded-agent-runner/prepared-compaction-runtime.ts src/agents/system-prompt.test.ts src/agents/system-prompt.ts src/cli/command-registration-policy.test.ts src/cli/command-registration-policy.ts test/scripts/ci-workflow-guards.test.ts test/scripts/generate-command-reference-doc.test.ts`
   passed.
5. `pnpm deadcode:exports` passed with 0 entries.

## Real behavior proof

Behavior or issue addressed:
The checked-in command reference stays synchronized with the command catalog,
documents static public command descriptors and runtime inventory CLI flags, and
does not imply runtime authority, hidden commands, plugin runtime commands, or
deployment-specific node availability.

Real environment tested:
WSL Ubuntu source harness in hydrated checkout
`/tmp/openclaw-pr100960-tools-validate`.

Exact steps or command run after this patch:

1. Reset validation checkout to #104159 head
   `64d72f94e5db3509a1c4d0ed7f680d9eaa16e1bb`.
2. Applied the binary diff from #104159 to #104160 head
   `42da0fbd0365179ee3ea5c555634ebc186e0007b`.
3. Ran the validation commands listed above.

Evidence after fix:
`docs:commands:check` exited successfully. Focused Vitest passed generator,
workflow guard, command-registration policy, prompt-surface, embedded prompt,
compaction, and projection regression tests, including the private
command-gate stability case, descriptor-gate docs freshness coverage, Code Mode
host-route suppression in normal and compacted prompts, generic-node-invoke
filtering, and aggregate prompt cap cases.

Observed result after fix:
The exact restacked head proves the generated command reference is current,
docs-map remains publish/package-owned, command prompt guidance is bounded, and
Code Mode prompts do not advertise host shell command routes after normal or
compacted prompt construction. Plugin-owned descendants below `tools` are no
longer suppressed by core `tools` registration.

What was not tested:
No deployed documentation site was rendered in a browser. This proof is
source-harness proof for generated Markdown, docs navigation freshness, prompt
surface behavior, and CI/docs guard coverage.
