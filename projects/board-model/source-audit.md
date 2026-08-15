# Board Model Source Audit

## Frame

OpenClaw's session dashboard already works. The missing reusable capability is
the client-side board state and command model currently owned inside Control
UI. Extraction succeeds if Control UI and a second host can consume the same
board snapshot without moving persistence, sandbox, grant, or tool semantics
out of OpenClaw.

## Source-Backed Facts

| Surface | Current behavior | Decision |
| ------- | ---------------- | -------- |
| `packages/gateway-protocol/src/schema/board.ts` | Defines board snapshots, tabs, widgets, layout operations, widget put/grant/app-view requests, capabilities, and focus/dock commands. | Reuse unchanged as the wire contract. |
| `src/gateway/server-methods/board.ts` | Owns persistence, validation, Canvas/MCP materialization, view tickets, grants, data bindings, actions, and `board.changed`. | Keep authoritative in Gateway. |
| `ui/src/lib/board/gateway-provider.ts` | Reconciles `board.get`, `board.changed`, reconnects, mutations, ticket lifetimes, and MCP App view leases. | Extract the framework-neutral core. |
| `ui/src/lib/board/provider-signals.ts` | Provides framework-independent value and event signals. | Reuse or adapt to immutable snapshot/subscribe. |
| `ui/src/lib/board/builtin-dashboard.ts` | Adds a localized Control UI-only observer widget. | Keep in the Control UI adapter. |
| `docs/web/dashboards.md` | Defines user-visible board ownership, persistence, tabs, chat dock, agent parity, grants, and cross-device behavior. | Treat as product behavior that extraction must preserve. |

## Version Finding

LobsterClaw `release/2026.6.33` has config protocol support but no board schema,
Gateway board handlers, or Control UI board provider. The board domain begins
in upstream commit `2f00a417ed` (PR #110960) and is stitched end-to-end by
`06480d767c` (PR #111218), followed by MCP App, capability, sandbox, plugin,
layout, performance, and lifecycle hardening.

This is not a small missing route. It is a coordinated runtime feature stack.

## Disproof

Reject the extraction shape if it:

- imports Lit, localization, routes, or DOM code;
- weakens revision-bound widget grants or view-ticket expiry;
- requires Lobster to interpret raw `board.changed` ordering;
- changes standalone Control UI behavior; or
- requires a partial 6.33 backport to demonstrate the client boundary.

