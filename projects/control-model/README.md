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

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| `openclaw/rfcs` fork | [RFC 0029 preview](https://github.com/giodl73-repo/rfcs/tree/user/giodl/rfc-0029-control-model) | `user/giodl/rfc-0029-control-model` at `e0b7e3c` | Fork-only draft | Define the OpenClaw-owned headless control model and renderer-neutral UI artifact contracts. |
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
