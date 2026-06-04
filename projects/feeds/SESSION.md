# Feeds Session Context

## Agent Start

1. Read this file.
2. Read `projects/feeds/README.md`.
3. Check both OpenClaw and Lobster PR state before changing anything.
4. Keep OpenClaw feed primitives separate from Lobster Scout publishing choices.

## Baseline

- Area: OpenClaw native feed support and Lobster Scout feed integration.
- Primary repos: `openclaw/openclaw`, `bic/lobster`.
- Main tracking file: `projects/feeds/README.md`.
- Source archive: `.craft/waves/260528+hapi-the-bringer+openclaw-feeds/`.

## Current Session

- Last updated: 2026-06-04.
- Last agent: Codex.
- Current focus: Track draft OpenClaw feed stack and Lobster Scout feed stack.
- Active branch / PR: see `projects/feeds/README.md`.
- Known dirty state: check target worktrees before edits.
- Blocking question: whether the unfiled Scout publishing workflow branch still
  needs to be filed or retired.

## Resume Checklist

- Run: query OpenClaw PRs #87824-#87827 and #88732.
- Run: query Lobster PRs #1939, #1941, #1944, #1946.
- Verify: identify which stack layer is current before restacking.
- Update: this file and README when PR statuses change.

## Guardrails

- Do not put feed implementation prototypes in `claws-hapi`.
- Keep install/discovery/policy/lifecycle/feed-search concerns separated.
- Do not mix Lobster Scout publishing policy into OpenClaw primitive PRs.

## Open Threads

- Decide whether Scout catalog publishing still needs a separate PR.
