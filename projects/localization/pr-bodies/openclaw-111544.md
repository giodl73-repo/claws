<!--
Required PR title:
type: user-facing description
-->

RFC: https://github.com/openclaw/rfcs/pull/42

Related: #28303, #90608, #105266, #88570

## What Problem This Solves

The TUI `/status` summary is a high-value operator surface, but its renderer
previously owned English prose directly. Translating the whole TUI at once would
mix unrelated interaction flows and make it difficult to prove that operational
identifiers remain untouched.

## Why This Change Was Made

This is a bounded TUI slice from RFC 0024:

- add a small locale adapter for TUI-owned messages;
- localize the `/status` summary and its relative-time labels in English and
  Simplified Chinese;
- keep English output byte-for-byte compatible with the existing formatter;
- resolve the process locale at the actual status-rendering edge; and
- preserve paths, provider summaries, model and session IDs, flags, event text,
  channel labels, and other operational values as literal parameters.

This PR is stacked on #111543 head
`0206f97b251450272256d0902ab8e4a9fd22a31d`. Its intended review delta is eight
files, 363 additions, and 38 deletions. Until earlier slices land, GitHub shows
the cumulative localization stack.

The previous cumulative draft attempted to consolidate many product surfaces.
That scope has been removed. Other TUI commands, onboarding, the Control UI,
Gateway errors, channels, approvals, native apps, and metadata remain separate
owner-reviewed tracks.

## User Impact

When `OPENCLAW_LOCALE=zh-CN`, TUI users receive a localized status summary,
including localized relative ages. English users retain the existing output.
Operational data is interpolated without translation or normalization.

## Evidence

Exact head: `1807d009c506b7aaac528b59bd314f0f4b4fe965`

- 61 focused runtime, formatter, and status-summary tests pass.
- 22 fake-backend PTY tests pass.
- `oxfmt` reports the eight-file delta clean.
- Repository typechecking reports only the two unrelated baseline errors in
  `diagnostics-otel` and the missing `libphonenumber-js/min` declaration; it
  reports no TUI or localization error.
- Final `codex review --base 0206f97b...` reports no actionable correctness
  regression after relative-time strings were moved into the locale catalog.

## Real behavior proof

Behavior or issue addressed:
The production status renderer now selects the configured locale and renders
owned prose in that locale while leaving runtime values literal.

Real environment tested:
Ubuntu 24.04 under WSL, Node.js 24.15.0, exact OpenClaw source head
`1807d009c506b7aaac528b59bd314f0f4b4fe965`. The PTY suite used the repository's
fake backend; no live Gateway or external channel was involved.

Exact steps or command run after this patch:

```text
node scripts/run-vitest.mjs src/tui/i18n/runtime.test.ts src/tui/tui-formatters.test.ts src/tui/tui-status-summary.test.ts
node scripts/run-vitest.mjs run --config test/vitest/vitest.tui-pty.config.ts
OPENCLAW_LOCALE=zh-CN ./node_modules/.bin/tsx /tmp/localization-tui-status-proof.mts
```

Evidence after fix:

```text
网关状态
版本：2026.7.21
Discord: 已链接（上次刷新于 1 分钟前）

系统：
  provider=openai

心跳：已禁用（agent-main）
会话存储：/srv/openclaw/sessions.json
默认模型：openai/gpt-5.6（64k 上下文）
活动会话数：1
最近会话：
- agent:main:session-literal [direct] | 1 小时前 | 模型 openai/gpt-5.6 | 令牌数 12k/30k（剩余 18k, 40%） | 标志：flag-literal
排队的系统事件（1）：gateway-event-literal
```

Observed result after fix:
All 61 focused tests and all 22 fake-backend PTY tests pass. The source proof
localizes owned labels and ages while preserving every supplied operational
value exactly.

What was not tested:
No live Gateway, real channel, native app, browser UI, approval flow, or external
service was exercised. Those surfaces are outside this bounded slice.
