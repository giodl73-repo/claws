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
| `openclaw/rfcs` fork | [Draft PR #8](https://github.com/giodl73-repo/rfcs/pull/8) | `user/giodl/rfc-0029-control-model` at `97d6bfc` | Fork-local review | Define the Gateway Client Control Model, client-selectable views, inline/durable artifact identity, the four OpenClaw PRs, and Lobster L0/LM1/LM2 evidence. |
| `openclaw/openclaw` fork | [Draft PR #230](https://github.com/giodl73-repo/openclaw/pull/230) | `user/giodl/control-model-oc1` at `68d3165bab` | Fork-local review | OC1 adds the optional Gateway Client model foundation with immutable session snapshots and the shared Control UI event-refresh policy. |
| `openclaw/openclaw` fork | [Draft PR #231](https://github.com/giodl73-repo/openclaw/pull/231) | `user/giodl/control-model-oc2` at `8654e0f7d1` | Fork-local stacked review | OC2 adds lazy conversations, bounded history/live projections, tools and interactions, targeted subscriptions, typed commands, and review-hardened reconnect/retention behavior. |
| `openclaw/openclaw` fork | [Draft PR #232](https://github.com/giodl73-repo/openclaw/pull/232) | `user/giodl/control-model-oc3` at `fc07cc0630` | Fork-local stacked review | OC3 adds bounded renderer-neutral artifacts, sanitized history, MCP App/Canvas fallback, and selected-only deferred materialization. |
| `openclaw/openclaw` fork | [Draft PR #238](https://github.com/giodl73-repo/openclaw/pull/238) | `user/giodl/control-model-oc4` at `72206b801f` | Fork-local stacked review | OC4 proves Control UI can adopt canonical active-session and selected-chat state without visual changes or startup-budget regression. |
| `bic/lobster` | [Draft PR #8165](https://microsoft.ghe.com/bic/lobster/pull/8165) | `user/giodl/control-model-carry` at `80fe70b13f` | Draft L0; Proof of Presence failing and required runtime contexts absent | Carries OC1-OC3 as a temporary source-resolved Gateway Client package and patches the pinned OpenClaw runtime to preserve sanitized UI artifacts. |
| `giodl/lobster` fork | [Draft PR #63](https://microsoft.ghe.com/giodl/lobster/pull/63) | `user/giodl/control-model-lm1` at `696e9f8d39` stacked on L0 | Fork-local stacked review | Adapts canonical Control Model conversation snapshots into Lobster's existing main-process `SessionView` while preserving raw-event operational lanes and passive React. |
| `giodl/lobster` fork | [Draft PR #64](https://microsoft.ghe.com/giodl/lobster/pull/64) | `user/giodl/control-model-lm2` at `9ca4b7d6d6` stacked on LM1 | Fork-local stacked review | Renders one exact allowlisted read-only table artifact in Lobster React, with durable history association, revision-safe identity, and visible structured fallback. |
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

## Related Areas

- `projects/control-ui/README.md` for the earlier shipped-Control-UI hosting
  approach and reusable hosting/auth evidence.
- `projects/hosted-integration/README.md` for host-runtime boundaries.
- `projects/config-admin/README.md` for managed settings UX.
- `projects/lobster/README.md` for Lobster worktrees and PR operations.
- `projects/clawpilot/README.md` for `gim-home/m` issue-loop work.
