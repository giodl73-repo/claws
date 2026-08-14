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
- Current focus: land provenance PR #1, then open the repaired 39-patch
  generation.
- Active branches:
  - `lobsterclaw/provenance-v1`, LobsterClaw PR #1 at `3bdfd42af8c`.
  - `lobsterclaw/2026.6.33-7055-v2`, repaired generation at
    `3f38843bef3`.
- Generation worktree: `/root/src/lobsterclaw-2026.6.33-7055-v2`
- Generation state: 39 ordered patch commits plus one final manifest commit.
  The verifier reports patch count 39 and status `valid`; independent replay
  matches source tree `d05c8821480b5e24817ea792057423f8b577ae95`.
  Frozen install, full build, 23 provenance/reconstruction tests, and 41
  focused repair tests pass.
- Source PR: `bic/lobster#7055`. Patches 0000-0039 are pinned to
  `8ebc4d84e89e`; repair patch 0040 is pinned to `4fb3a5a7630d`. The live PR
  head advanced to `6ca8346a835d` without patch-bundle drift.
- Known dirty state: `claws-hapi` has unrelated user changes. The separate
  replay worktrees are scratch proof surfaces.
- Blocking question: PR #1 still needs human GitHubPop presence and merge.
  Lobster PR #7055 is also `CHANGES_REQUESTED` with fresh runtime checks queued.

## Resume Checklist

- Check PR #1 and merge it after human GitHubPop presence.
- Check Lobster PR #7055 exact-head runtime results and address only
  branch-owned failures.
- Confirm generation head `3f38843bef3`, run `node .lobsterclaw/verify`, and
  preserve source tree `d05c8821480b5e24817ea792057423f8b577ae95`.
- After PR #1 lands, open the v2 generation PR without changing patch content.
- Treat the `v2026.6.33` `zalouser` shrinkwrap drift as an upstream-base
  exception: both files are byte-identical to the signed base.

## Guardrails

- Keep LobsterClaw private; Lobster #7055 contains private Microsoft adapters.
- Never drop a patch merely because it no longer applies.
- Retain it, rebuild it under the same identity, or remove it only after the
  replacement behavior and recorded validation pass without the patch.
- Never force-update a published generation.
- Do not commit or revert unrelated `claws-hapi` changes.

## Open Threads

- Review and merge `bic/LobsterClaw#1`.
- Drive `bic/lobster#7055` exact-head runtime checks to green.
- Open generation `2026.6.33-lobster-7055-4fb3a5a7` from
  `lobsterclaw/2026.6.33-7055-v2` after PR #1 lands.
- Keep the older `lobsterclaw/2026.6.33-7055` branch as historical evidence;
  do not use it as the final candidate.

## Session Checkpoints

Detailed session handoffs live in `sessions/`.
