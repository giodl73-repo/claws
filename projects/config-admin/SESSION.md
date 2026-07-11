# Config Admin Session Context

## Agent Start

1. Read this file.
2. Read `projects/config-admin/README.md`.
3. Read related context as needed:
   - `projects/admin/README.md`
   - `projects/ux-state/README.md`
   - `projects/policy/policy-settings-config-bindings.md`
   - `projects/feeds/README.md`
   - `projects/lobster/feeds-scout.md`
4. Check live Lobster and OpenClaw worktree state before acting.

## Baseline

- Area: Shared Lobster/OpenClaw admin-config UX framework.
- Primary repo: `bic/lobster`.
- Related repo: `openclaw/openclaw`.
- Local worktree: choose or create a Lobster worktree when implementation starts.
- Current branch: none yet.
- Main tracking file: `projects/config-admin/README.md`.
- Skill to use: `lobster-pr-ops` for Lobster PR state; use policy/feed skills when work touches those stacks.

## Current Session

- Last updated: 2026-07-10.
- Last agent: Copilot CLI.
- Current focus: Create the project area for a thin shared admin/config UX spine that reuses OpenClaw patterns in Lobster/Scout: descriptor-driven settings, preview-first validation, doctor-style findings, OpenClaw schema/policy bridges, governed save, and Scout CLI dry-run/JSON parity.
- Active branch / PR: none.
- Known dirty state: `claws-hapi` has this new project area and index updates; `C:\src\lobster` was already on unrelated dirty branch `user/giodl/openclaw-copilot-dev-validation`.
- Blocking question: none.

## Resume Checklist

- Run: inspect current Lobster Policy UX and Scout feeds admin surfaces before choosing a branch.
- Verify: which PR stack should receive the first descriptor-registry slice.
- Review: OpenClaw `openclaw config schema`, `config.schema.lookup`, `doctor --lint`, policy strictness, and Scout CLI contracts for reusable UX language.
- Update: this session file after a branch or PR is created.

## Guardrails

- Do not build implementation prototypes in `claws-hapi`.
- Keep this area focused on the shared admin/config UX framework; feature-specific policy, feed, and Partner Center work stays in their existing project areas.
- Preserve the boundary: `/policy` authors and previews policy, `/feeds` governs feed/source selection, Scout provides CLI/feed tooling, Lobster persists governed state, and OpenClaw evaluates local conformance.
- Prefer small PR slices over a universal settings-console rewrite.

## Open Threads

- Decide whether the first Lobster slice starts from Policy UX control registry or a shared admin settings package.
- Define the descriptor contract: setting id, section, scope, OpenClaw policy/config path, generated value/state, doctor/check id, exposure, apply mode, owner surface, and save contract.
- Decide how much OpenClaw schema metadata Lobster should consume directly versus snapshot into a Lobster registry.
- Shape a common findings model for validation errors, strictness failures, repair previews, and blocked saves.
- Align hosted Scout mutations with CLI-style `--dry-run`, `--json`, and `verify` semantics.
