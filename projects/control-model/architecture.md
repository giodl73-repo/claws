# OpenClaw Control Model Architecture

## Decision

Name the upstream capability **OpenClaw Control Model** and place it in optional
`@openclaw/gateway-client/model` subpaths.

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
@openclaw/gateway-client/browser
  transport + reconnect
      |
@openclaw/gateway-client/model
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
| OpenClaw core/extensions | Available renderer-neutral view offers and their semantics |
| Host renderer | View selection, product view-model mapping, trust decision, native component registration, action binding, fallback choice |

Installed and enabled OpenClaw extensions determine which artifacts exist.
OpenClaw exposes every applicable renderer-neutral view offer. The client
determines which view it wants, which versions it can render natively, and how
the selected projection maps into its own view model. The Control Model neither
invents extension capabilities nor installs client components.

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
  structuredContent?: JsonValue;
  views: Array<{
    id: string;
    templateUri: string;
    dataVersion: number;
    availability: "inline" | "deferred";
    data?: JsonValue;
    recommended?: boolean;
  }>;
  state: "pending" | "ready" | "failed" | "expired";
  source: {
    sessionKey: string;
    messageId?: string;
    toolCallId?: string;
  };
  fallback?: McpAppArtifact | CanvasArtifact;
}
```

OpenClaw core/extensions may offer calendar, list, table, summary, or other
views over one artifact. `templateUri` is an opaque identifier, not executable
code and not a trust claim. A host selects a compatible offer and may map it to
a native component or its existing product view model. Unknown views render
structured/text output or an explicitly supplied sandboxed fallback.

OpenClaw offers all authorized applicable descriptors, not all computed
payloads. Cheap bounded views may be inline. Expensive or sensitive views are
materialized only after the client selects one. Discovery is authorization
filtered and client renderer advertisement is not exposed verbatim to
extensions.

Artifact identity is independent of presentation placement. Lobster may render
one stable artifact revision inline in chat, in an expanded panel, or in a
dedicated artifact surface. Later turns may publish higher revisions of the
same logical artifact. V1 durability is session-scoped across history reload
and reconnect; permanent document storage and collaborative editing remain
separate product capabilities.

V1 uses full immutable artifact revisions. JSON Patch/JSONL streaming can be an
adopter detail or a later negotiated dialect after real evidence shows it is
needed. A component catalog is host-owned and never supplied as executable
code by a tool result.

A client may advertise exact supported template/data-version pairs as an
optimization. OpenClaw can filter or rank its offered views, but the current
local registry and product preference remain authoritative. Advertisement does
not grant trust, and extensions must preserve structured/text or explicit
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
| OC1: Gateway Client model foundation | Add optional `@openclaw/gateway-client/model` subpaths, connection/session catalog snapshots, host-supplied Gateway binding, and client docs | Node/browser contract tests; no UI imports in the model graph | Duplicate consumer session-list reconciliation |
| OC2: conversation model | Extract history/live merge, stream/tool lifecycle, typed chat commands, approvals/questions | Shared fixtures for reconnect, duplicate/out-of-order events, cancellation, rejection | Lobster chat reducer and selected Control UI reconciliation |
| OC3: UI artifact projection | Preserve renderer-neutral artifact metadata through live events and history; adapt MCP App/Canvas projections | Known native URI, unknown URI, malformed data, history reload, fallback, expiry | Tool-specific native rendering hacks |
| OC4: Control UI adopter | Move one Control UI chat/session slice onto the model without visual changes | Existing Control UI tests plus before/after fixtures | Old internal capability implementation for adopted slice |
| OC5: shared conformance and package hardening | Promote shared fixtures, finite defaults, browser/Node package acceptance, compatibility canaries, performance bounds, and malformed-data/security coverage | Two-consumer fixtures plus package, compatibility, performance, and security gates | Publication uncertainty |
| OC6: supported model subpaths | Publish optional subpaths with compatibility window, migration policy, quickstart, release notes, and support ownership | OC5 on supported release, promised predecessor, and `main` | Fork-only consumption |
| OC7: incumbent-path cleanup | Delete only superseded Control UI paths after a release observation window and rollback proof | Stable model-backed Control UI plus exact deletion ledger | Old internal capability implementation for adopted slice |

### Lobster and M

| PR | Scope | Proof | Deletion unlocked |
| --- | --- | --- | --- |
| LM1: Control Model service adapter | Consume the Gateway Client model behind Lobster's hosted Gateway path and map snapshots into existing M `SessionView` | Existing desktop snapshot fixtures plus hosted Gateway reconnect | Web-specific Gateway chat normalization for the slice |
| LM2: native artifact registry | Register `clawpilot://widgets/table` data version 1 and render a bounded read-only native React table; preserve inert structured/MCP/Canvas fallback metadata | Accepted table, nested/schema rejection, unknown/deferred offer fallback, artifact-only and reopened history, revision replacement, theming/a11y, and a production-shaped Gateway-mode Electron E2E | One bespoke tool-output component path |
| LM3: native refresh action | Bind one host-owned `refresh` affordance for the exact table registry; validate artifact identity/revision/readiness in main and route accepted effects through Control Model `conversation.send` | Exactly one `chat.send`, pre-dispatch stale rejection, visible server denial, connection-epoch invalidation, independent sleep hold, and a Gateway-mode Electron refresh to revision 2 | Direct native component-to-raw-Gateway action calls |
| LM4: ordinary send command cutover | Keep Lobster attachment preprocessing and operational turn tracking, but route ordinary sends through Control Model `conversation.send`; ref-count conversation leases across views and commands | Attachments/context ordering, preprocessing cancellation, supersession, rejection cleanup, reconnect invalidation, view-unsubscribe race, 220 Gateway tests, and live Electron proof | Duplicate raw Lobster `chat.send` request implementation |
| LM5: active abort command cutover | Route owned active-run aborts through Control Model `conversation.abort`; retain Lobster preprocessing cancellation, immediate tracker retirement/idle, exec-approval follow-up run selection, and raw no-run abort-all recovery | Exact active run ID, pending conversation lease, fire-and-forget failure, Stop during preprocessing, follow-up late-final fencing | Duplicate raw active-run `chat.abort` dispatch |
| LM6: history hydration cutover | Route selected-session hydration through an explicitly refreshed Control Model conversation snapshot; preserve the 1,000-message bound and authoritative legacy/idempotency-only rows | Single history request, malformed-response rejection, sign-out-safe explicit refresh, 35 model tests, 226 focused desktop tests, typecheck, lint, and clean independent/Codex reviews | Duplicate raw Lobster `chat.history` normalization for selected-session hydration |

LM6 is the stop point for the bounded Lobster series. The remaining raw lanes
are not equivalent Control Model duplicates: they own operator/security
approvals, no-run abort-all recovery, session catalog and mutation, memory,
automation compatibility, or Lobster's local preprocessing and run lifecycle.

Cross-client user-message correlation is a separate future contract, not LM7
parity cleanup. It would need to carry Lobster `clientMessageId` through
`SendPayload` into Control Model send idempotency, preserve that identity across
retry/reconnect and non-renderer callers, and project canonical user commits
without duplicating optimistic local bubbles.

## Current conclusion and next steps

The bounded evidence phase is complete. OC1-OC4 prove the OpenClaw owner
surface, and LM1-LM6 prove an independent native React host can consume it
through `SessionView` while deleting duplicate send, active-abort, and history
paths. Do not add an LM7 solely to remove remaining raw Gateway calls.

The next phase is RFC review followed by the proposed fork-only OC5-OC7
sequence:

1. review the fork RFC and implementation stack with OpenClaw owners while RFC
   intake remains frozen;
2. prepare OC5 shared conformance and package hardening only after owner
   acceptance;
3. use OC6 for supported publication and OC7 for later incumbent cleanup;
4. replace Lobster's temporary source carry with a released dependency and land
   the bounded adopter stack behind a feature flag and rollback;
5. run live hosted-Gateway proof and add safe telemetry, Fluent quality,
   accessibility, localization, and shareable demo evidence; and
6. preserve BM2, CM1, and CM2 as separate adjacent proposals.

For dashboards/widgets, OpenClaw already owns board identity, widget provider
registration, layout, persistence, focus/docking, and agent tool semantics.
Host the current dashboard routes first. A future native dashboard must project
that board model rather than reinterpret generic artifacts. No stable tag
currently contains the coordinated board stack; `v2026.8.1-beta.2` is the
first fully compatible tag and passes the Board Model extraction proof.
Lobster Board LB1 proves the native-host boundary with a mocked beta protocol,
but BM2 must reconstruct it against an admitted release before support.

For settings, host OpenClaw settings first and default to read-only when the
host lacks secure write authority. A future native settings experience should
consume a sibling Config Model backed by Managed Configuration: descriptors,
effective values, provenance, owner, writability and lock reason, findings,
candidate diff, generation, and transactional activation status. It does not
belong in the conversation Control Model. The LC1 fork proof now includes a
real Electron screenshot of the populated read-only native page. CM1 may
upstream only that read projection; CM2 remains Managed Configuration work.

## Cheapest evidence slice

1. Use the existing hosted Gateway route and authentication seam.
2. Instantiate a framework-neutral model with one session catalog and one
   selected conversation.
3. Adapt its snapshot into M's existing `SessionView`.
4. Render one trusted `clawpilot://widgets/table` artifact natively.
5. Reject nested/malformed table data and keep unknown or deferred offers inert
   behind a visible structured fallback.
6. Preserve artifact-only and reopened history at the canonical timeline
   position across raw and Control Model message identities.
7. Replace artifact revisions without invalidating settled turns or hashing
   unchanged artifact payloads on every streamed token.
8. In LM3, route one exact native refresh through the Control Model, reject a
   stale revision before dispatch, surface server denial, and invalidate an
   in-flight action when the connection epoch changes.

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
