### User signal

[Generative UX #2511](https://github.com/gim-home/m/issues/2511) prefers native
React rendering for first-party experiences, structured tool output, and a
swappable renderer with sandboxed iframe fallback. The One Scout UX decisions
also establish that the shared renderer is passive and consumes
`SessionView` snapshots ([#5427](https://github.com/gim-home/m/issues/5427),
[#5468](https://github.com/gim-home/m/issues/5468)).

### Problem

We want Lobster/M to own the native React experience rather than host or fork
OpenClaw's Lit Control UI. Today the reusable OpenClaw surface stops at the
Gateway client. If each product folds raw Gateway history and live events into
UI state independently, we duplicate reconnect, ordering, tool lifecycle,
approval, and compatibility behavior.

### Possible direction

Use the proposed framework-neutral `@openclaw/gateway-client/model` layer above
the existing browser transport subpath. OpenClaw would own immutable
session/conversation snapshots, typed commands, history/live reconciliation,
and renderer-neutral UI artifacts. Lobster would adapt those snapshots into the
already-selected M `SessionView` vocabulary and retain React composition,
Fluent/M365 theming, tenant integration, telemetry, and rollout.

For GenUX, a tool result can carry structured data plus an opaque template URI.
The host maps allowlisted first-party URIs to native React components. Unknown
or third-party artifacts retain text output or use an explicit sandboxed MCP
App fallback. Components never receive authority directly; actions return
through typed model commands and OpenClaw server authorization.

This does **not** introduce a second M view model, require JSON Render, or move
M/Lobster components into OpenClaw.

```mermaid
flowchart TB
  gateway["OpenClaw Gateway"]
  transport["@openclaw/gateway-client/browser<br/>transport, authentication, reconnect"]
  model["@openclaw/gateway-client/model<br/>sessions, conversations, commands, artifacts"]
  adapter["Lobster adapter"]
  sessionView["M SessionView"]
  react["Lobster React UX<br/>host-owned native renderers"]

  gateway --> transport --> model --> adapter --> sessionView --> react
```

### Capability split

Installed and enabled OpenClaw extensions determine which artifacts and
structured results can be produced. OpenClaw core/extensions expose all
applicable renderer-neutral views for that artifact. The client determines
which view it wants, which native renderers it has installed and trusts, and
how the selected projection maps into its own view model. The Control Model
does not invent either capability; it carries the available views and preserves
native, structured, or MCP App fallback behavior. Client capability
advertisement can filter/rank offers but is not authorization or component
installation.

"All views" means all authorized applicable descriptors, not eager computation
of every payload. Lobster selects one compatible offer; OpenClaw materializes
only that deferred view. Discovery must not reveal hidden extensions or tools,
and extensions do not receive the client's complete renderer inventory.

### Fork implementation evidence

The proposed OpenClaw boundary is available as four stacked fork-only drafts:

1. [OC1: Gateway Client model foundation](https://github.com/giodl73-repo/openclaw/pull/230)
2. [OC2: conversation model and commands](https://github.com/giodl73-repo/openclaw/pull/231)
3. [OC3: renderer-neutral UI artifacts](https://github.com/giodl73-repo/openclaw/pull/232)
4. [OC4: Control UI reference adoption](https://github.com/giodl73-repo/openclaw/pull/238)

```mermaid
flowchart LR
  oc1["OC1<br/>session foundation"]
  oc2["OC2<br/>conversation model"]
  oc3["OC3<br/>artifact contracts"]
  oc4["OC4<br/>Control UI proof"]
  lm1["Lobster LM1<br/>SessionView adapter proof"]

  oc1 --> oc2 --> oc3 --> oc4 --> lm1
```

The drafts demonstrate that the model can live in Gateway Client core without
making it a Gateway plugin or importing Control UI. They remain design evidence,
not accepted upstream surfaces.

### First slice

- Connect through Lobster's existing hosted Gateway seam.
- Project one session list and selected conversation into `SessionView`.
- Render one trusted first-party artifact natively, such as calendar.
- Prove the same tool result falls back safely when no native renderer exists.
- Prove a denied action remains denied server-side.
- Reconnect mid-stream without duplicating messages or artifact revisions.

### Acceptance sketch

- The shared UX imports no OpenClaw Lit component or private Control UI module.
- React components do not parse raw Gateway events.
- M continues to expose `SessionView` to the renderer.
- Lobster can select among OpenClaw-provided views without making its selection
  canonical for other clients.
- Native artifact rendering is host-registered and schema validated.
- Extension presence and client renderer support are tested independently.
- Unselected deferred views are not materialized or charged to the request.
- Third-party executable UI remains sandboxed.
- At least one duplicate Lobster Gateway reducer/projection path is identified
  for deletion after parity.

### Related

- #2511
- #5427
- #5466
- #5468
- #5507
- [Fork-only OpenClaw RFC review](https://github.com/giodl73-repo/rfcs/pull/8)
- [OC1](https://github.com/giodl73-repo/openclaw/pull/230)
- [OC2](https://github.com/giodl73-repo/openclaw/pull/231)
- [OC3](https://github.com/giodl73-repo/openclaw/pull/232)
- [OC4](https://github.com/giodl73-repo/openclaw/pull/238)
