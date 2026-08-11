# OpenClaw Control Model Role Review

Reviewed 2026-08-11 against:

- `.craft/roles/claws/gateway-eng.md`
- `.craft/roles/claws/cowork-ux-eng.md`
- `.craft/roles/claws/ciso.md`
- `.craft/roles/claws/founder.md`
- `.craft/roles/claws/lobster-container-eng.md`

## Findings

| Role | Finding | Disposition |
| --- | --- | --- |
| Gateway engineer | Reconciliation or subscriber callbacks must not execute in the Gateway receive stack. A slow/throwing renderer and queued event burst need explicit isolation and bounds. | Added receive-stack isolation, bounded reconciliation queue, lag/refresh behavior, and conformance cases. |
| Cowork UX engineer | A generic model can erase actionable governance context. Approval/action projections must preserve safe denial reason, policy source/owner, and the exact server-provided allowed actions. | Added preservation requirements and prohibited adapters from widening/replacing allowed actions. |
| CISO | A native renderer registry is a code supply-chain boundary. Tool output must not register code, select imports, or bypass action authorization; action attempts need audit correlation without payload disclosure. | Added registration provenance, `dataVersion`, local schema/migration ownership, server authorization, and safe correlation tuple. |
| Founder | The package must be useful outside Lobster and must not turn OpenClaw into a product-specific UI framework or mandatory JSON-render dialect. | Kept the package framework/product neutral, JSON Render optional, MCP Apps intact, V1 narrow, and expansion gated by an independent consumer plus deletion case. |
| Lobster container engineer | A headless model could be mistaken for another sidecar, adding startup and health cost. | Made the Control Model explicitly in-process over the existing Gateway client; no new service or process boundary. |

## Team clarification

Tom asked whether in-chat UX depends on installed OpenClaw extensions and client
support. The answer is yes, with split authority:

- installed/enabled extensions determine what artifacts and view offers can be
  produced;
- OpenClaw exposes all applicable renderer-neutral views;
- the client registry and product choose the compatible view and local view
  model;
- the Control Model only normalizes, reconciles, and carries those offers; and
- absent or mismatched native support uses structured/text or explicit
  sandboxed fallback.

Capability advertisement can reduce wasted work but cannot install code, grant
trust, or authorize actions.

## Blocking gates before implementation

- Prove a browser-safe package graph with no Control UI, framework, route,
  localization, DOM component, or product imports.
- Choose finite defaults for reconciliation queue, retained conversations,
  messages, progress, and artifacts.
- Build one shared history/live/reconnect corpus before moving implementation.
- Identify the exact M/Lobster reducer deleted by the first adopter.
- Review the native renderer registry as product code and prove an action
  denied by OpenClaw remains denied.

## Simplifications retained

- Do not inject into Control UI bootstrap.
- Do not create another M view-model vocabulary.
- Do not standardize JSON Patch or JSON Render in V1.
- Do not publish until OpenClaw Control UI and an independent host consume the
  same contract.
- Do not add a sidecar, renderer marketplace, or dynamic component loader.

## Review verdict

The direction is coherent after the revisions. The cheapest falsifiable slice
remains one session catalog, one selected conversation mapped into M
`SessionView`, one allowlisted native artifact, one sandboxed fallback, one
server-denied action, and one mid-stream reconnect.
