# OpenClaw Control Model Architecture

## Decision

Name the upstream capability **OpenClaw Control Model** and the candidate
package `@openclaw/control-model`.

The Gateway client is transport and wire behavior. The Control Model is the
framework-neutral state, reconciliation, projection, and command boundary that
a product-owned UI consumes. Lobster can call its adapter `OpenClawModelAdapter`
or `GatewaySessionViewAdapter`, but it should not introduce a second shared
view-model vocabulary in M.

## Frame

### Falsifiable thesis

OpenClaw's working Gateway client plus a missing headless control-model
capability can support Lobster's native React UX while preserving OpenClaw
semantics and deleting duplicate Gateway reconciliation. The thesis is
disproved if a representative chat/session/native-artifact slice still needs
Control UI DOM, Lit state, private modules, or Lobster-owned protocol
interpretation.

### Affected users

- Lobster and Scout users who need a native M365 React experience.
- OpenClaw integrators who want a custom shell without forking Control UI.
- OpenClaw maintainers who currently carry semantic logic inside a specific UI.

### Existing owner system

OpenClaw already owns the Gateway protocol, `@openclaw/gateway-client`, session
and chat semantics, tool-result projection, MCP App materialization, and
server-side authorization. Those remain authoritative.

### Current workaround and cost

The earlier hosted-UX plan mounted OpenClaw's version-matched Lit Control UI in
Lobster. That maximizes reuse but prevents Lobster from owning native React
composition and product UX. Building Lobster UI directly against raw Gateway
events instead creates duplicate reconciliation, retry, history/live merge,
approval, and compatibility logic.

### Proposed shared capability

Publish a framework-neutral observable model over the Gateway client:

```text
OpenClaw Gateway
      |
@openclaw/gateway-client
      |
@openclaw/control-model
  snapshots + commands + UI artifacts
      |
Lobster adapter -> existing SessionView
      |
Lobster React UX + trusted renderer registry
```

### Ownership retained

| Owner | Retains |
| --- | --- |
| OpenClaw | Protocol, request/event semantics, history/live reconciliation, stable projections, commands, error classes, server authorization, compatibility, conformance |
| Lobster/M | React composition, `SessionView`, component catalog, Fluent/M365 theming, tenant auth/routing, telemetry, rollout |
| Tool or MCP server | Structured domain output and optional UI resource/template reference |
| Host renderer | Trust decision, native component registration, action binding, fallback choice |

Installed and enabled OpenClaw extensions determine which artifacts exist.
The client determines which artifact versions it can render natively. The
Control Model neither invents extension capabilities nor installs client
components; it normalizes the artifact and exposes the safe native,
structured, or MCP App rendering choice.

### V1 boundaries

V1 covers connection state, session catalog, one selected conversation,
messages, streaming/tool state, approvals/questions required by chat, chat
commands, and renderer-neutral UI artifacts.

V1 does not include routes, DOM, Lit, React, CSS, theme, localization,
browser credential storage, product auth, config forms, settings navigation,
generic model-authored dashboards, or arbitrary executable components.

### Deletion target

- Lobster's duplicate Gateway history/live reconciliation for the adopted
  conversation slice.
- Any need to host the full OpenClaw Control UI solely to reuse chat/session
  behavior.
- OpenClaw Control UI copies of projection logic after it adopts the package.

## Audit

### Source-backed facts

| Surface | Current behavior | Classification |
| --- | --- | --- |
| `packages/gateway-client` | Public calendar-versioned package with browser-safe protocol client, auth helpers, request correlation, event delivery, sequence gaps, and reconnect primitives | Reuse |
| `ui/src/app/context.ts` | Internal capability graph for gateway, sessions, agents, channels, config, workboard, navigation, theme, and overlays | Adapt; evidence that the model boundary works |
| `ui/src/app/bootstrap.ts` | Constructs those capabilities inside the Lit application bootstrap | Avoid as a public injection seam |
| `ui/src/lib/sessions` | Reconciles lists, history, live events, retries, mutations, and connection epochs | Extract chat/session-neutral logic |
| `ui/src/lib/config` | Mixes useful config semantics with form state, i18n, clipboard, and UI modes | Exclude from V1; split before reuse |
| `src/chat/canvas-render.ts` | Normalizes only Canvas/MCP App preview shapes | Adapt into a more general UI-artifact projection |
| `ui/src/pages/chat/components/widget-card.ts` | Dispatches known previews to Canvas iframe or MCP App view | Preserve as a Control UI adapter, not core model behavior |
| `gim-home/m#5468` | Chose `SessionView` snapshots as the shared passive-renderer vocabulary | Reuse; adapter target |
| `gim-home/m#2511` | Prefers native React/JSON rendering and a renderer-neutral tool envelope, with iframe fallback for third parties | Align without making JSON Render mandatory |

### Missing shared primitive

OpenClaw publishes transport but not the stable state and command projection
its own UI consumes. It also narrows tool UI metadata into Canvas/MCP App
presentation before another host can select a native renderer.

## Compare

### Internal analogues

| Analogue | Use |
| --- | --- |
| `@openclaw/gateway-client` browser entry | Reuse the framework-free package and host-supplied transport pattern |
| Control UI capability graph | Adapt the snapshot/subscribe/command shape |
| M `SessionView` | Reuse as Lobster's renderer-facing vocabulary |
| MCP App bridge | Reuse as sandboxed third-party fallback |
| Host policy preflight | Reuse presentation hints, but require server enforcement |
| Control UI Canvas preview | Adapt stable IDs, bounded dimensions, and lifecycle; avoid URL-only rendering as the universal contract |

### External comparators

| Comparator | Reuse | Avoid |
| --- | --- | --- |
| MCP Apps | Opaque `ui://` resources, sandboxed fallback, explicit host bridge and lifecycle | Treating an iframe implementation as the only semantic artifact |
| JSON Render | Host-owned component catalog, schema validation, named actions, streaming patches | Making one renderer library or JSON dialect part of OpenClaw V1 |
| React external stores | Immutable snapshots plus subscribe/unsubscribe | Framework hooks in the core package |

## Proposed model

### Root contract

```ts
export interface ControlModel {
  getSnapshot(): ControlSnapshot;
  subscribe(listener: () => void): () => void;
  sessions: SessionCommands;
  conversation(sessionKey: string): ConversationModel;
  dispose(): void;
}
```

Snapshots are immutable, serializable, and safe to read repeatedly. A
subscription indicates that callers should read the latest snapshot; it does
not expose raw Gateway event ordering as public UI state.

### Conversation projection

The selected conversation snapshot contains:

- stable session identity and connection epoch;
- canonical ordered messages;
- active run and stream state;
- tool invocations with stable IDs and structured outcomes;
- approval/question requests with allowed actions;
- reconnect, stale, partial, and terminal status;
- zero or more UI artifacts associated with a message or tool invocation.

Raw protocol payloads may be available through an explicitly unstable
diagnostic field, but UI correctness must not depend on them.

### Commands

Commands are typed intents such as send, abort, answer, approve, deny, retry,
rename, and delete. The model performs availability checks for presentation,
but the Gateway remains authoritative. Every rejected command returns a typed
error; the package must not silently convert rejection into success.

### UI artifact projection

```ts
export interface UiArtifact {
  id: string;
  revision: number;
  templateUri: string;
  dataVersion: number;
  data: JsonValue;
  structuredContent?: JsonValue;
  state: "pending" | "ready" | "failed" | "expired";
  source: {
    sessionKey: string;
    messageId?: string;
    toolCallId?: string;
  };
  fallback?: McpAppArtifact | CanvasArtifact;
}
```

`templateUri` is an opaque identifier, not executable code and not a trust
claim. A host may map a registered URI to a native component. Unknown URIs
render structured/text output or an explicitly supplied sandboxed fallback.
`dataVersion` selects an accepted schema in that exact reviewed host
registration.

V1 uses full immutable artifact revisions. JSON Patch/JSONL streaming can be an
adopter detail or a later negotiated dialect after real evidence shows it is
needed. A component catalog is host-owned and never supplied as executable
code by a tool result.

A client may advertise exact supported template/data-version pairs as an
optimization. The current local registry remains authoritative, advertisement
does not grant trust, and extensions must preserve structured/text or explicit
sandboxed fallback behavior when native support is absent.

### Security invariants

- Native rendering is allowlist-only and host-registered.
- Tool results cannot select a React import, module URL, or privileged action.
- Artifact data is untrusted and schema-validated by the registered renderer.
- UI visibility and disabled state are not authorization.
- Every action re-enters a typed model command and server authorization.
- Sandboxed MCP Apps remain the fallback for third-party executable UI.
- Unknown versions, invalid data, stale revisions, and expired artifacts fail
  visibly without executing fallback code implicitly.

## PR series

### OpenClaw

| PR | Scope | Proof | Deletion unlocked |
| --- | --- | --- | --- |
| OC1: package and session snapshots | Add workspace `@openclaw/control-model`, connection/session catalog snapshots, host-supplied Gateway binding, package docs | Node/browser contract tests; no UI imports in package graph | Duplicate consumer session-list reconciliation |
| OC2: conversation model | Extract history/live merge, stream/tool lifecycle, typed chat commands, approvals/questions | Shared fixtures for reconnect, duplicate/out-of-order events, cancellation, rejection | Lobster chat reducer and selected Control UI reconciliation |
| OC3: UI artifact projection | Preserve renderer-neutral artifact metadata through live events and history; adapt MCP App/Canvas projections | Known native URI, unknown URI, malformed data, history reload, fallback, expiry | Tool-specific native rendering hacks |
| OC4: Control UI adopter | Move one Control UI chat/session slice onto the package without visual changes | Existing Control UI tests plus before/after fixtures | Old internal capability implementation for adopted slice |
| OC5: package publication | Publish only after two consumers and compatibility evidence | Package acceptance, calendar-version compatibility, examples | Workspace-only consumption |

### Lobster and M

| PR | Scope | Proof | Deletion unlocked |
| --- | --- | --- | --- |
| LM1: Control Model service adapter | Consume the package behind Lobster's hosted Gateway path and map snapshots into existing M `SessionView` | Existing desktop snapshot fixtures plus hosted Gateway reconnect | Web-specific Gateway chat normalization for the slice |
| LM2: native artifact registry | Register one first-party URI and render a native React component; preserve text/MCP fallback | Calendar or similarly bounded golden scenario, schema rejection, theming/a11y | One bespoke tool-output component path |
| LM3: actions and streaming | Bind named host actions, artifact revisions, cancellation, reconnect, and telemetry | Allowed/denied actions, stale revision, mid-stream reconnect, fallback | Direct component-to-transport calls |
| LM4: parity and cutover | Expand only after parity; remove superseded Lobster reducer/hosted-Control-UI route where no longer needed | Cohort rollout, rollback, performance, accessibility, production telemetry | Duplicated Lobster/OpenClaw UX and reconciliation |

## Cheapest evidence slice

1. Use the existing hosted Gateway route and authentication seam.
2. Instantiate a framework-neutral model with one session catalog and one
   selected conversation.
3. Adapt its snapshot into M's existing `SessionView`.
4. Render one trusted `clawpilot://widgets/calendar` artifact natively.
5. Render the same tool result through MCP App fallback when the native
   registration is absent.
6. Deny one action server-side and surface the structured denial.
7. Reconnect mid-stream without duplicating a message or artifact revision.

The slice fails if it imports Control UI Lit components, parses raw Gateway
events in a React component, or needs a second M view-model vocabulary.

## Disproof and promotion gates

Do not promote the package if:

- consumers still require private Control UI modules;
- stable projections cannot survive history reload and reconnect;
- two consumers require incompatible snapshot semantics;
- native rendering weakens action authorization or artifact isolation;
- the model adds material latency or unbounded retained state; or
- no duplicate implementation can be deleted.

Publish only after OpenClaw Control UI and one independent host consume the
same contract.
