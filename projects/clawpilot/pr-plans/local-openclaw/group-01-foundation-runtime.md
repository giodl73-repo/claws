# Local OpenClaw Group 1: Foundation Runtime Contracts

PR: [giodl_microsoft/m#72](https://github.com/giodl_microsoft/m/pull/72)
Branch: `user/giodl/local-openclaw-group1-foundation-runtime`
Base: `user/giodl/scout-cloud-brain-architecture`
Replaces: #35, #36

## Objective

Create the foundation for representing Local OpenClaw as a governed Desktop
runtime provider: provider/discovery contracts, runtime core, sidecar/client
contracts, and read-only Agents inventory.

## Code Surfaces

- Extend backend capability snapshots with Local OpenClaw provider status,
  artifact/discovery vocabulary, trust/health fields, and safe disabled defaults.
- Add read-only discovery and local provider status plumbing without launching
  or installing anything.
- Add runtime core types, sidecar manager/client adapter contracts, and
  provider-derived hosted/local agent inventory.
- Thread status through IPC/preload and Agents fixtures while preserving normal
  Copilot/Gateway behavior.

## Acceptance Criteria

- Feature-off behavior remains unchanged.
- Discovery is diagnostic/read-only and never launches or executes local code.
- Local OpenClaw can be described as a provider without becoming the selected
  runtime or receiving local capability access.
- Agents inventory can represent hosted and local agents with separate provider
  and runtime identity.

## Expected Validation

- Focused IPC/conformance, discovery, sidecar/client contract, agent inventory,
  and Agents panel tests.
- `pnpm exec tsc --noEmit`.
- Focused type-aware `oxlint`.
- Focused `oxfmt --check`.
- `git diff --check`.
