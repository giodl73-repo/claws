# OpenClaw Control Model Project

Use this area for a framework-neutral OpenClaw client model that exposes
authoritative state, normalized projections, commands, and UI artifacts to
product-owned experiences such as Lobster's React UX.

The durable name is **OpenClaw Control Model**. `Gateway` names the transport;
`Control Model` names the headless state and command boundary above it.
`ClawModel` is avoided because it does not communicate ownership or scope.

## Active Notes

| Area | File |
| --- | --- |
| Current session and resume state | `SESSION.md` |
| Architecture, evidence, and PR series | `architecture.md` |
| Draft `gim-home/m` design issue | `m-issue-draft.md` |
| Role-review findings | `role-review.md` |
| Complete team review packet | `review-packet.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| `openclaw/rfcs` fork | [PR #8](https://github.com/giodl73-repo/rfcs/pull/8) | `user/giodl/rfc-0029-control-model` at `ec85014093e` | Fork-local owner review requested; acceptance pending | Define the Gateway Client Control Model, client-selectable views, inline/durable artifact identity, OC1-OC5, CU4-CU5 Control UI adoption, completed Lobster L0/LM1-LM6 evidence, and the publication/productization plan. The RFC records the final whole-series review and provides an explicit owner acceptance record without claiming consent. |
| `openclaw/openclaw` fork | [Draft PR #230](https://github.com/giodl73-repo/openclaw/pull/230) | `user/giodl/control-model-oc1` at `68d3165bab` | Fork-local review | OC1 adds the optional Gateway Client model foundation with immutable session snapshots and the shared Control UI event-refresh policy. |
| `openclaw/openclaw` fork | [Draft PR #231](https://github.com/giodl73-repo/openclaw/pull/231) | `user/giodl/control-model-oc2` at `8654e0f7d1` | Fork-local stacked review | OC2 adds lazy conversations, bounded history/live projections, tools and interactions, targeted subscriptions, typed commands, and review-hardened reconnect/retention behavior. |
| `openclaw/openclaw` fork | [Draft PR #232](https://github.com/giodl73-repo/openclaw/pull/232) | `user/giodl/control-model-oc3` at `fc07cc0630` | Fork-local stacked review | OC3 adds bounded renderer-neutral artifacts, sanitized history, MCP App/Canvas fallback, and selected-only deferred materialization. |
| `openclaw/openclaw` fork | [Draft PR #238](https://github.com/giodl73-repo/openclaw/pull/238) | `user/giodl/control-model-oc4` at `72206b801f` | Fork-local stacked review | OC4 proves Control UI can adopt canonical active-session and selected-chat state without visual changes or startup-budget regression. |
| `openclaw/openclaw` fork | [Draft PR #241](https://github.com/giodl73-repo/openclaw/pull/241) | `user/giodl/control-model-oc5` at `bb6da3c58d` | Fork-local OC5 hardening | Centralizes finite defaults, adds reusable catalog/history/reconnect/authorization fixtures, proves packed Node/declaration/browser consumption, and fixes the package-only browser timeout-export failure found by that proof. |
| `openclaw/openclaw` fork | [Draft PR #244](https://github.com/giodl73-repo/openclaw/pull/244) | `user/giodl/control-model-oc5-fixtures` at `0b55290e90` | Fork-local test-only OC5 continuation stacked on PR #241 | Completes representative shared run, tool, question, artifact, and retained-bounds fixture families without changing production code. |
| `openclaw/openclaw` fork | [Draft PR #245](https://github.com/giodl73-repo/openclaw/pull/245) | `user/giodl/control-model-oc5-performance` at `df12d64d3c` | Fork-local test-only OC5 performance continuation stacked on PR #244 | Adds an asserted artifact-heavy projection benchmark with Testbox-oriented latency and retained-memory thresholds plus exact finite-snapshot enforcement. |
| `openclaw/openclaw` fork | [Draft PR #246](https://github.com/giodl73-repo/openclaw/pull/246) | `user/giodl/control-model-oc5-compatibility` at `409459025c` | Fork-local test-only OC5 compatibility continuation stacked on PR #245 | Adds an asserted candidate/published-predecessor/current-main wire matrix and records run-fenced send as a candidate-era capability. |
| `openclaw/openclaw` fork | [Draft PR #247](https://github.com/giodl73-repo/openclaw/pull/247) | `user/giodl/control-model-oc5-lifecycle-performance` at `57a7859574e` | Fork-local test-only OC5 lifecycle continuation stacked on PR #246 | Asserts initial projection, selected deferred-view materialization, bounded inactive eviction, and authoritative reconnect/resync latency with exact lifecycle invariants. |
| `openclaw/openclaw` fork | [Draft PR #248](https://github.com/giodl73-repo/openclaw/pull/248) | `user/giodl/control-model-oc5-security` at `a158436f085` | Fork-local OC5 security continuation stacked on PR #247; whole-series review clean | Records the full-stack security review, retires materialized deferred-view payloads across disconnect and connection-epoch replacement, and carries the accepted core fixes from the final GPT/Claude/Gemini/Codex review. |
| `openclaw/openclaw` fork | [Draft PR #242](https://github.com/giodl73-repo/openclaw/pull/242) | `user/giodl/control-model-cu4` at `07afbfde81` | Fork-local CU4 stacked on OC5 | Routes selected ordinary sends and connected exact-run aborts through the existing Control Model conversation while preserving reconnect-resume, steer/inject, background, replay, realtime, skill-workshop, and session-wide operational paths. |
| `openclaw/openclaw` fork | [Draft PR #243](https://github.com/giodl73-repo/openclaw/pull/243) | `user/giodl/control-model-cu5` at `0a8ad4188a6` | Fork-local CU5 stacked on CU4; whole-series review clean | Routes exact selected-session question decisions through the cached Control Model conversation, feeds validated artifact snapshots into existing Canvas/MCP adapters, and carries the accepted Control UI routing, ownership, roster, history, and prompt fixes from the final review. |
| `bic/lobster` | [Draft PR #8165](https://microsoft.ghe.com/bic/lobster/pull/8165) | `user/giodl/control-model-carry` at `bf8b9b2785` | Draft L0; feed admission, Proof of Presence, and runtime contexts remain | Consumes the immutable LobsterClaw 6.33 Candidate Gateway Client and Protocol packages through `@lobster/source`; copied source and Docker-time patch replay are removed. |
| `giodl/lobster` fork | [Draft PR #63](https://microsoft.ghe.com/giodl/lobster/pull/63) | `user/giodl/control-model-lm1` at `f008fa7bc6` stacked on L0 | Fork-local stacked review | Adapts canonical Control Model conversation snapshots into Lobster's existing main-process `SessionView` while preserving raw-event operational lanes and passive React. |
| `giodl/lobster` fork | [Draft PR #64](https://microsoft.ghe.com/giodl/lobster/pull/64) | `user/giodl/control-model-lm2` at `73f4cf6e9f` stacked on LM1 | Fork-local stacked review | Renders one exact allowlisted read-only table artifact in Lobster React, with durable history association, revision-safe identity, visible structured fallback, and a real Gateway-mode Electron proof. |
| `giodl/lobster` fork | [Draft PR #65](https://microsoft.ghe.com/giodl/lobster/pull/65) | `user/giodl/control-model-lm3` at `7fdf1f227c` stacked on LM2 | Fork-local stacked review | Adds one host-owned native table refresh action, validates canonical artifact identity/revision in main, routes accepted effects through Control Model `chat.send`, and visibly rejects stale, denied, or reconnected actions. |
| `giodl/lobster` fork | [Draft PR #66](https://microsoft.ghe.com/giodl/lobster/pull/66) | `user/giodl/control-model-lm4` at `9c27693088` stacked on LM3 | Fork-local stacked review | Deletes Lobster's duplicate raw ordinary-send request by routing assembled prompts and image attachments through `ControlModelConversation.send`, while retaining Lobster preprocessing and operational run tracking. |
| `giodl/lobster` fork | [Draft PR #67](https://microsoft.ghe.com/giodl/lobster/pull/67) | `user/giodl/control-model-lm5` at `c45e3a714e` stacked on LM4 | Fork-local stacked review | Routes active foreground aborts through `ControlModelConversation.abort` while preserving synchronous preprocessing cancellation, immediate turn retirement/idle, exec-approval follow-up ownership, and raw no-run abort-all recovery. |
| `giodl/lobster` fork | [Draft PR #68](https://microsoft.ghe.com/giodl/lobster/pull/68) | `user/giodl/control-model-lm6` at `c1d4d3ecf2` stacked on LM5 | Draft; gated on three Candidate history fixes | Deletes Lobster's duplicate selected-session history hydration through an explicitly refreshed Control Model snapshot. The app-only restack is ready, but malformed-history and authoritative-history semantics must first land in the immutable generation. |
| `gim-home/m` | [#5675](https://github.com/gim-home/m/issues/5675) | n/a | Open design issue | Consume the Control Model through Lobster's hosted Gateway seam, adapt into `SessionView`, and render trusted native artifacts. |
| `gim-home/m` | [#2511](https://github.com/gim-home/m/issues/2511) | n/a | Related open direction | Native React/JSON-render GenUX direction and swappable renderer discussion. |
| `gim-home/m` | [#5427](https://github.com/gim-home/m/issues/5427) | n/a | Existing architecture map | One Scout UX package and SuperApp integration decisions. |
| `gim-home/m` | [#5468](https://github.com/gim-home/m/issues/5468) | n/a | Closed decision | `SessionView` remains the shared passive-renderer vocabulary. |

## Working Thesis

OpenClaw already owns a working Gateway protocol client and the behavioral
semantics used by Control UI. Publishing the missing framework-neutral state,
command, and UI-artifact projections lets Lobster build a native React
experience without forking OpenClaw's Lit application or reimplementing
Gateway behavior.

The final code placement is optional core client infrastructure:
`@openclaw/gateway-client/model`, `@openclaw/gateway-client/model/catalog`, and
`@openclaw/gateway-client/model/session-event-refresh`. It is not a Gateway
plugin or a standalone package.

OpenClaw retains protocol, lifecycle, normalization, authorization, and
compatibility ownership. Lobster retains product composition, React
components, theming, tenant integration, and rollout. M's existing
`SessionView` remains its UX vocabulary; a Lobster adapter maps the OpenClaw
Control Model into that shape.

The bounded Lobster evidence series ends at LM6. Remaining raw paths are
host-owned operational/security protocols, session-management operations, or
compatibility consumers rather than duplicate Control Model behavior.
Cross-client user-message delivery remains a possible separate contract slice:
it must align Lobster `clientMessageId`, Control Model idempotency, retries, and
canonical user-message identity before the adapter can safely emit user commits.

The next phase is owner acceptance and publication rather than another parity
slice. OC5 package, conformance, performance, compatibility, lifecycle, and
security evidence is complete in the fork; OC6 is blocked until the nominated
teams confirm or replace their DRI/deputy and record the support window,
response path, and rollback authority. A released dependency, Lobster
CI/rollout, live hosted-Gateway proof, telemetry, UX quality, and shareable
evidence still follow. Existing OpenClaw dashboards and settings should be
hosted first. Native dashboards require a separate projection of OpenClaw's
board model; native settings require a sibling provenance- and authority-aware
Config Model backed by Managed Configuration.

The complete OC1-OC5 and CU4-CU5 stack has also passed independent whole-series
reviews with GPT-5.6 Terra, Claude Opus 5, and Gemini 3.1 Pro Preview, followed
by a clean Codex branch review. Accepted lifecycle, observer ownership,
canonical-session alias, metadata-bound, history-coalescing, roster, routing,
and question-state defects were fixed on the owning fork branches. Focused
proof passed 59 Gateway lifecycle/model tests, 61 integrated Control UI tests,
6 prompt tests, and packed-package acceptance. This closes technical review;
it does not imply owner acceptance or authorize OC6.

## Related Areas

- `projects/control-ui/README.md` for the earlier shipped-Control-UI hosting
  approach and reusable hosting/auth evidence.
- `projects/hosted-integration/README.md` for host-runtime boundaries.
- `projects/config-admin/README.md` for managed settings UX.
- `projects/config-model/README.md` for the settings projection follow-up.
- `projects/board-model/README.md` for the dashboard/widget projection follow-up.
- `projects/lobster/README.md` for Lobster worktrees and PR operations.
- `projects/clawpilot/README.md` for `gim-home/m` issue-loop work.
