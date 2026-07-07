# Bugs Project

Use this area for cross-cutting bugfix work that is not clearly owned by a
single feature project yet. Once a bugfix belongs to policy, doctor, feeds,
context-budget, oc-path, or ClawPilot, move the durable notes into that project
area and keep this file as the triage index.

## Purpose

- Track bug reports, reproduction notes, fix branches, and verification proof.
- Keep bugfixes small and tied to concrete failures.
- Avoid mixing bugfix work with feature stacks unless the PR is explicitly a
  follow-up to that stack.

## Bug Note Shape

```text
Bug:
Repo:
Issue / PR:
Local worktree:
Branch:
Observed failure:
Reproduction:
Fix scope:
Tests / proof:
Status:
Next action:
```

## Active Bugs

| Bug | Repo | Issue / PR | Status | Next action |
| --- | --- | --- | --- | --- |
| Gateway `multiple_gateways` false positive for one gateway over two transports | openclaw/openclaw | PR #85791 | Merged 2026-06-05 at `b3eba2ff38b4` | No further bugfix action |
| Declared MCP allowlist false warnings with exact tool denies | openclaw/openclaw | PR #89596 | Merged 2026-06-18 at `fadbcf8a4e43` | No further bugfix action |
| Doctor health core ID collision guard after contribution ordering | openclaw/openclaw | PR #86627 | Live head `e0955797c1`; old CI has stale failures, but current `main` already contains the ordered contribution health path, reserved core-ID rejection, and plugin SDK health budget coverage. Rebase attempt on 2026-07-03 conflicted across obsolete doctor conversion-plan surfaces and was aborted | Treat as superseded/obsolete unless maintainers still want the historical branch rewritten |
| Maintainer prepare broad-test baseline failures | openclaw/openclaw | PR #90708 | Updated 2026-06-16 at `6c77020296`; Slack timeout change removed; proof sufficient, ready for maintainer review, and all non-skipped checks passing as of 2026-07-03 | Maintainer review / merge gate |
| WebChat replay visible `sessions_yield` status | openclaw/openclaw | PR #87471 | Rebased 2026-06-16 at `6f37b508808`; proof sufficient, ready for maintainer review, all non-skipped checks passing as of 2026-07-03; draft | Maintainer canonical-fix decision |
| Fresh agent-prefixed session key loses agent id | openclaw/openclaw | PR #90062 | Live head `9906a4fe24`; draft, maintainer-editable, proof sufficient, ready for maintainer review, and all non-skipped checks passing as of 2026-07-03 | Maintainer canonical-fix / draft decision |
| Google Vertex rejects thinking payloads | openclaw/openclaw | PR #83991 | Rebased 2026-06-19 at `3df494680c6d`; maintainer-editable; local provider-stream proof passed; CI green; label still needs proof | Live Vertex/Gemini proof or maintainer proof override |
| OpenAI realtime voice-call double greeting | openclaw/openclaw | PR #86285 | Rebased 2026-06-19 at `0641d1fdb5ab`; maintainer-editable; local OpenAI/voice-call proof passed; live CI clean and mergeable/CLEAN; label still needs proof | Live Twilio/OpenAI outbound-call proof or maintainer proof override |
| Shared PR CI architecture/tooling noise | openclaw/openclaw | PR #93738 | Merged 2026-06-16; #83991 and #86285 were rebased onto post-merge main and the prior shared architecture/tooling failures cleared | No further bugfix action |
| `non_deliverable_terminal_turn` generic `/new` fallback | openclaw/openclaw | Issue #94176 / PR #94187 | Contributor PR is closed as of live 2026-07-03 check; last head `87351bedd45f8`; Real behavior proof was failing and maintainer edits were false | No active PR update available |
| Doctor lint misses model/runtime-policy drift | openclaw/openclaw | Issue #84212 / PR #99619 | Draft PR rebased 2026-07-03 and force-pushed at `eccd735f3e`; partial mitigation only: adds warning-only `core/doctor/agent-model-runtime-policies` lint for active refs without matching `agentRuntime` policy and stale policy keys, but does not block config save/reload. Local doctor/lint/contribution proof passed; live PR is `CLEAN` with all non-skipped checks passing | Keep PR framed as a doctor-lint slice that helps diagnose #84212, not as a full fix |

## Recent Verification

PR #85791 (`fix(gateway): dedupe probe warnings by gateway identity`) is narrow:
gateway presence/status code, gateway docs, and focused tests only. It adds no
config, plugin, policy, provider, channel, or public CLI surface.

Verification on 2026-06-04:

- Live GitHub state: open, not draft, `MERGEABLE`, merge state `CLEAN`, all
  checks passing, ClawSweeper `proof: sufficient`, `rating: diamond lobster`,
  `status: ready for maintainer look`.
- Local review artifacts validated through the OpenClaw wrapper in
  `/root/src/openclaw-workflow/.worktrees/pr-85791`.
- Focused validation passed: gateway presence/status Vitest files, `oxfmt`,
  `oxlint`, and `git diff --check`.
- `scripts/pr-prepare run 85791` initially stopped on broad `pnpm build`
  because local `node_modules/protobufjs/google/protobuf/descriptor.json` was
  missing. The npm tarball includes that file; restoring the missing tarball
  contents made local `pnpm build` pass.
- Full prepare then reached broad `pnpm test` and failed on files outside the
  PR surface. `src/infra/browser-open.test.ts` passes when WSLg display env is
  cleared (`env -u DISPLAY -u WAYLAND_DISPLAY ...`). A fresh `origin/main`
  worktree still fails `src/node-host/invoke.test.ts`, confirming unrelated
  baseline/mainline noise.

PR #90708 (`test: stabilize maintainer prepare baseline`) was opened on
2026-06-05 to fix those unrelated prepare blockers on current `main`.

Verification on 2026-06-05 from WSL root in
`/root/src/openclaw-workflow/.worktrees/baseline-prepare-gates-20260605c`:

- Focused failed files passed:
  `test/scripts/e2e-temp-state-dir.test.ts`,
  `test/scripts/package-mac-app.test.ts`,
  `extensions/telegram/src/bot.create-telegram-bot.channel-post-media.test.ts`,
  `src/plugins/plugin-registry.test.ts`, `src/node-host/invoke.test.ts`, and
  `extensions/slack/src/monitor/message-handler/prepare.test.ts`.
- Previously failing shard configs passed: tooling, extension-telegram,
  plugins, unit-src, and extension-slack.
- `oxfmt`, `oxlint`, and `git diff --check` passed.
- `pnpm build`, `pnpm check`, and full `env -u DISPLAY -u WAYLAND_DISPLAY pnpm
  test` passed. Full test result: 88 Vitest shards in 1197.64s.
- Machine-local note: `protobufjs@8.4.0` installed without its full
  `google/` payload in this WSL worktree; restoring the package payload from
  the published tarball was required before `pnpm build` could prove source.
- Maintainer update: #90708 no longer changes Slack dropped-history media
  resolution timeout. The branch was updated on 2026-06-16 to restore 1s/3s
  defaults, so current proof review should focus on the test-stabilization
  surface rather than Slack runtime behavior.

## Rules

- Reproduce or identify the exact failing behavior before changing code.
- Prefer one bug per branch and PR.
- Keep unrelated refactors out of bugfix PRs.
- Update `SESSION.md` after filing, fixing, reviewing, or closing a bug.
