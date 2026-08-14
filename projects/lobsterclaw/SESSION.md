# LobsterClaw Session Context

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Check live `bic/LobsterClaw` PR and branch state.
4. Check both WSL worktrees before acting.

## Baseline

- Area: LobsterClaw
- Primary repo: `https://microsoft.ghe.com/bic/LobsterClaw`
- Provenance worktree: `/root/src/lobsterclaw-provenance-v1`
- Patch scratch worktree: `/root/src/openclaw-microsoft-2026.6.33-lobster-7055`
- Upstream base: `v2026.6.33` / `7af0cfc9c5488e03c4e2f528bdc7ac9f7778b35e`
- Patch source: `bic/lobster` PR #7055 head `6bb4b88ee4b2ce0452d0715ffe6aeb33cb7b292c`
- Skill to use: `project-session`

## Current Session

- Last updated: 2026-08-14
- Last agent: GitHub Copilot CLI
- Current focus: validate and review generation `2026.6.33-lobster-7055`.
- Active branches:
  - `lobsterclaw/provenance-v1`, LobsterClaw PR #1.
  - `lobsterclaw/2026.6.33-7055`, generation checkpoint at
    `919c306318b748eb0c3aaedfe874a0d2bb6b127f`.
- Generation worktree: `/root/src/lobsterclaw-2026.6.33-7055`
- Generation state: 38 ordered patch commits plus one final manifest commit.
  The verifier reports patch count 38 and status `valid`. Full build, lint,
  type-check, regression, and reconstructed-tree validation have not run on
  this committed branch yet.
- Known dirty state: `claws-hapi` has unrelated user changes. The separate
  patch scratch worktree remains uncommitted.
- Blocking question: PR #1 still needs human GitHubPop presence and merge
  before the generation branch can be restacked for its final PR.

## Resume Checklist

- Check PR #1 and merge it after human GitHubPop presence.
- In the generation worktree, confirm commit
  `919c306318b748eb0c3aaedfe874a0d2bb6b127f` and run
  `node .lobsterclaw/verify.mjs`.
- Validate that all 38 patch commits retain exact patch bytes, source commit,
  digest, and commit trailers.
- Compare generated source to the known reconstructed tree, then run the
  contract suites, frozen install, build, lint, type checks, and patch-owned
  regressions.
- After PR #1 lands, restack the generation without changing patch content,
  rerun validation, and open the follow-up PR.

## Guardrails

- Keep LobsterClaw private; Lobster #7055 contains private Microsoft adapters.
- Never drop a patch merely because it no longer applies.
- Retain it, rebuild it under the same identity, or remove it only after the
  replacement behavior and recorded validation pass without the patch.
- Never force-update a published generation.
- Do not commit or revert unrelated `claws-hapi` changes.

## Open Threads

- Review and merge `bic/LobsterClaw#1`.
- Finish validation and open generation `2026.6.33-lobster-7055` as a
  follow-up PR.
- Keep the patch import linked to exact Lobster head `6bb4b88ee4`.

## Session Checkpoints

Detailed session handoffs live in `sessions/`.
