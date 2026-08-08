## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read the linked player-line matchup plan.
4. Check the ICELINES worktree and live PR state before acting.

## Baseline

- Area: Icelines
- Primary repo: `giodl73-repo/ICELINES`
- Local worktree: None; the completed Matchup discovery worktree was released.
- Current branch: None.
- Main tracking file: `design/plans/2026-08-01-player-line-matchup-forecast.md`
- Skill to use: `faces-development-loop`

## Current Session

- Last updated: 2026-08-08
- Last agent: GitHub Copilot CLI
- Current focus: Automate the game-morning producer-to-publisher handoff now that dynamic Matchup publication and discovery are merged.
- Active branch / PR: ICELINES PR #42 merged at `848b6bb3`; TRACKER PR #47 merged at `9f8cb9a8`; no active worktree.
- Known dirty state: The completed ICELINES publication and TRACKER pointer worktrees were released. The primary `claws-hapi` and TRACKER checkouts retain unrelated user changes and must not be cleaned.
- Blocking question: None.

## Resume Checklist

- Choose the bounded scheduled producer/publisher seam for eligible game-morning Matchup cards.
- Allocate: create fresh worktrees through the laptop-aware allocator.
- Preserve: prediction-edge ownership of probability arithmetic and Matchup ownership of player/unit semantics.
- Verify: start from ICELINES `master` at or after `848b6bb3` and TRACKER `main` at or after `9f8cb9a8`.

## Guardrails

- Keep ICELINES implementation in the isolated ICELINES worktree.
- The prediction edge owns all probability arithmetic.
- The Matchup owns player/unit semantics and must not infer official lineups.
- Keep Web/TUI renderers read-only over sealed `CardDocumentView` inputs.
- Update this file at the end of a meaningful session.

## Open Threads

- Historical observation harvesting is implemented through sealed prediction joins and `line-matchup-observe`.
- Dynamic publication is implemented through `line-matchup-publish`, immutable fingerprinted blobs, and an atomic catalog.
- Web and explicit TUI season/game/team discovery resolve the same published document; the bundled pilot remains only as a missing-publication compatibility fallback.
- Delete the bundled fallback after automated publication coverage and operational failure handling are proven.

## Session Checkpoints

Detailed session handoffs live in `sessions/`.
