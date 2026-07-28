## Superseded OpenClaw Incubator

This body records the proof from OpenClaw draft #113836. Product direction now
places the portable reference parser and CLI in the separate private repository
`C:\src\standalone-claw-cli-prototype`; OpenClaw remains a host adapter target
through its public JSON CLI. Do not reopen this as a monorepo package proposal.

## Summary

- extract the portable Claw v1 schema into a private workspace package while keeping OpenClaw policy in `src/claws`
- add a private standalone CLI incubator with local-package inspection and `--agent openclaw --dry-run`
- delegate planning to the canonical experimental `openclaw claws add --dry-run --json` lifecycle through an immutable verified snapshot
- keep publication, remote resolution, mutation, and the final npm/binary identity out of this slice

This incubates the future command shape described in [Claws RFC #27](https://github.com/openclaw/rfcs/pull/27) and [portable-settings addendum #48](https://github.com/openclaw/rfcs/pull/48) inside the OpenClaw monorepo so it can be tested before a standalone repository or npm identity is selected.

The package is `private`, versioned `0.0.0-private`, excluded from release selection, and exposes only the temporary `claws-dev` binary. The entire command remains gated by `OPENCLAW_EXPERIMENTAL_CLAWS=1`.

Current incubation scope:

- local package directories only
- portable validation and content-free inspection
- OpenClaw adapter only
- dry-run preview only
- prompt-bearing `CLAW.md` packages remain inspectable but fail closed in the OpenClaw adapter until the host maps the portable body to `SOUL.md`

OpenClaw continues to own capability policy, consent, mutation, provenance, update, status, doctor, and removal.

## Validation

- `79` focused tests passed with `2` intentional skips across the standalone CLI and Claws schema suites
- targeted TypeScript compilation passed for `claw-spec` and `claw-cli`
- targeted Oxlint passed with no findings
- repository-pinned Oxfmt `0.60.0` passed
- unified OpenClaw production bundle completed and contains no bare `@openclaw/claw-spec` import
- private CLI tarball installed and inspected a fixture outside the repository with no workspace runtime dependencies
- `codex --dangerously-bypass-approvals-and-sandbox review --commit HEAD` reported no actionable defects after three accepted compatibility findings were fixed

Full repository typecheck was not available in this partially hydrated worktree because ambient `@agentclientprotocol/sdk` and `@earendil-works/pi-tui` dependencies are absent; CI should run the complete repository gates.

## Real behavior proof

Behavior or issue addressed:
Prove that a private standalone Claw CLI can validate a local portable package and delegate an exact, non-mutating preview to OpenClaw without reimplementing OpenClaw lifecycle policy.

Real environment tested:
Windows 11 checkout at signed head `5a1dd4da6c6e8b83d7e967f59852e658e3fbf816`; CLI and OpenClaw unified artifacts built from that checkout; WSL2 Ubuntu with Node.js `24.15.0`; real OpenClaw CLI planner; no mocked adapter or package metadata.

Exact steps or command run after this patch:

1. `node node_modules\tsdown\dist\run.mjs --config packages\claw-cli\tsdown.config.ts`
2. `OPENCLAW_RUN_NODE_SKIP_DTS_BUILD=1 node node_modules\tsdown\dist\run.mjs --config tsdown.config.ts --filter openclaw-unified`
3. From WSL2 `/tmp`, run `OPENCLAW_EXPERIMENTAL_CLAWS=1 OPENCLAW_CLI_ENTRY=/mnt/c/src/openclaw-claws-standalone-incubator/openclaw.mjs node /mnt/c/src/openclaw-claws-standalone-incubator/packages/claw-cli/dist/cli.mjs /mnt/c/src/openclaw-claws-standalone-incubator/packages/claw-cli/test/fixtures/valid --agent openclaw --dry-run --json`.

Evidence after fix:
The terminal returned `schemaVersion: claw.cliOutcome.v0`, `operation: preview`, and `ok: true`. The nested OpenClaw outcome returned `schemaVersion: openclaw.clawAddPlan.v1`, `dryRun: true`, `mutationAllowed: false`, `readiness.ready: true`, no blockers or diagnostics, and four planned actions: create the agent, create its workspace, write `AGENTS.md`, and write `SOUL.md`. The delegated package root was a private `/tmp/claws-preview-*` snapshot and the plan included an exact integrity digest.

Observed result after fix:
The standalone CLI inspected five declared package files, preserved the package identity and OpenClaw profile, delegated verified snapshot bytes to the native planner, surfaced the complete harness plan, and performed no mutation.

What was not tested:
npm publication or name ownership, remote ClawHub coordinates, archive download/extraction, mutation/apply, macOS, or a Hermes adapter. Prompt-bearing `CLAW.md` preview intentionally remains blocked until OpenClaw body-to-`SOUL.md` support is available.
