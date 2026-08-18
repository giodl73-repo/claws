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

## Round 2: multi-view review

The corrected "OpenClaw offers all views; Lobster chooses" design was reviewed
again with the same roles.

| Role | Finding | Revision |
| --- | --- | --- |
| Gateway engineer | Eagerly computing every calendar/list/table/app payload would multiply tool latency, memory, and event pressure. | OpenClaw now enumerates bounded descriptors and materializes only the client-selected deferred view. |
| Cowork UX engineer | A recommendation must not silently override a user's valid selected view after reconnect or streaming revision. | Selection stays client-owned and stable while compatible; fallback or switching is observable. |
| CISO | View enumeration can reveal installed extensions or denied tools, while renderer advertisement can fingerprint the client. | Discovery is caller/session/policy filtered; the Gateway does not expose the full renderer inventory verbatim to extensions. |
| Founder | "OpenClaw offers all views" could imply core must implement every presentation and become a universal UI platform. | Core defines the catalog contract; core and installed extensions contribute views. Products remain free to ignore every view and use structured content. |
| Lobster container engineer | Unselected view generation would add cold-start and per-turn cost. | Deferred materialization is read-only, bounded, selected-only, and separately measurable. |

### Round 2 blocking gates

- Prove descriptor enumeration performs no deferred external work.
- Prove only the selected deferred view materializes.
- Prove discovery does not reveal an unauthorized extension, tool, or view.
- Prove renderer advertisement is bounded and not forwarded verbatim.
- Prove a compatible user-selected view survives reconnect and later artifact
  revisions.

### Round 2 verdict

Proceed with the descriptor-plus-selected-materialization model. Do not proceed
with an artifact envelope that eagerly includes data for every offered view.

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

## Round 3: filing readiness

Reviewed 2026-08-16 after OC1-OC4, Lobster LM1-LM6, Config LC1, Board LB1, and
the proposed OC5-OC7 publication sequence.

| Tension cluster | Filing finding | Disposition |
| --- | --- | --- |
| Gateway/runtime owner | V1 named session create, rename, archive, and delete even though the independent adopter intentionally left session administration host-owned. That contradicted the RFC rule that added capabilities need an independent consumer and deletion case. | Removed session administration from required v1 conformance. V1 now covers catalog/history refresh and the proven conversation commands; future session mutation needs separate authorization, reconciliation, rollback, adopter, and deletion evidence. |
| Independent host/operator | The host-supplied binding is the correct reuse seam only if it cannot become an escape hatch back to arbitrary Gateway calls from React, artifacts, or adapters. | Made the binding construction-only and explicitly unreachable through public snapshots, conversation handles, artifacts, renderer registrations, and framework adapters. |
| Security | Renderer trust remains auditable because registrations are exact host code, artifacts cannot select imports, deferred materialization is selected-only, actions re-enter typed commands, and the Gateway independently authorizes them. The remaining risk was accidental exposure of the generic request binding. | Addressed by the construction-only binding rule. Existing malformed data, denied action, stale revision, discovery filtering, sandbox fallback, and audit-correlation gates remain blocking for publication. |
| Founder/simplicity | OC5 hardening, OC6 publication, and OC7 cleanup are the right split. Combining them would make acceptance imply support or make deletion precede observation. | Retained the split. OC7 remains optional, post-release, and limited to an exact deletion ledger with rollback proof. |
| Repository steward | Board and Config evidence helps prove the owner-first pattern but can distract from the normative conversation/artifact proposal. `CM1`/`CM2` also reads as Control Model numbering. | Kept both as one explicitly non-normative adjacent table and renamed the Config candidates `CFG1`/`CFG2`. They do not gate RFC acceptance or create upstream work. |
| Release engineer | Workspace tests do not prove that package exports, declarations, and dependencies are present in the shipped artifact. Support ownership can remain an RFC decision, but publication cannot. | Added a packed-release clean-consumer gate for browser and Node, every supported subpath, and declarations. OC6 remains blocked on named package, protocol, Control UI, security, and release owners. |
| Cowork UX owner | The proposal still preserves product-owned React/Fluent composition and does not introduce a generic generated-layout system, framework adapter, or native component marketplace. Board and settings remain separately governed surfaces. | No normative expansion. Keep accessibility, localization, responsive behavior, and renderer quality in adopter gates rather than the core model. |

### Filing blockers

No architectural contradiction remains that should block filing the RFC for
maintainer review.

### Publication blockers

- Named package, protocol, Control UI, security, and release support owners.
- Measurable performance and retained-memory thresholds for the now-documented
  finite defaults.
- Shared history/live/reconnect and authorization conformance promoted from the
  first OC5 catalog fixture slice.
- Compatibility canaries for the supported release, promised predecessor, and
  `main`.
- Live hosted-Gateway proof, Lobster CI, telemetry, rollout, and rollback before
  product shipment.

### Round 3 verdict

RFC 0029 is filing-ready as a bounded proposal. Acceptance should authorize
OC5 hardening, not imply that the subpaths are already supported or released.
BM2, CFG1, and CFG2 should remain adjacent fork-only proposals until their own
owner and release gates are satisfied.

## Round 4: ownership and support

Reviewed 2026-08-16 after the OC5 fixture, performance, compatibility,
lifecycle, and security gates completed in fork-only PRs #244-#248.

| Tension cluster | Ownership finding | Disposition |
| --- | --- | --- |
| Gateway/runtime owner | Publication ownership must not add a runtime committee or move Gateway authority into an adopter. The accountable package/protocol team needs an explicit DRI, deputy, compatibility window, and escalation path. | Nominated the existing `@openclaw/maintainer` team with individual primary and deputy candidates. Kept the Control Model optional and in-process; existing performance and lifecycle thresholds remain release gates. |
| Release operator | A named maintainer is insufficient unless someone owns exact packed-artifact proof, partial-publication failure, rollback, release notes, and the supported version window. | Nominated the existing release team, required a separate acceptance record, retained clean Node/browser consumers and predecessor/main canaries, and added explicit bad-artifact deprecation or rollback responsibility. |
| Security | CODEOWNERS presence does not prove incident ownership. Security acceptance must cover trust-boundary changes, private reporting, blocking findings, and replacement when a DRI leaves. | Nominated the existing secops team, required a named DRI and deputy, and made security response and ownership transfer part of recorded acceptance. |
| Founder/simplicity | Ownership must not become a new governance layer or silently assign permanent support to the RFC author and adopters. | Kept one compact plan over existing teams, made silence non-acceptance, and blocked release rather than defaulting ownership to Lobster or the proposal author. |

### Round 4 verdict

The technical OC5 gate is complete enough to request ownership acceptance.
OC6 remains blocked until every accountable team accepts or replaces the
nominees and records the support window, response path, and rollback authority.

## Round 5: whole-series implementation review

Reviewed 2026-08-17 across OC1-OC5 and CU4-CU5 with independent GPT-5.6 Terra,
Claude Opus 5, and Gemini 3.1 Pro Preview passes, followed by Codex branch
review.

| Review lens | Accepted findings and disposition |
| --- | --- |
| Lifecycle and concurrency | Preserved retryable observer cleanup, prevented models sharing one Gateway client from retiring each other's coordinator, protected reconnect replacement, and coalesced concurrent history work. |
| Security and compatibility | Rejected prototype-chain run identifiers, bounded metadata DAGs without misclassifying shared references as cycles, fenced canonical session aliases, and made package acceptance self-contained. |
| Control UI ownership and parity | Preserved direct-Gateway ownership for large rosters, made model promotion atomic and retryable, unified route-agent identity, retained unscoped questions, and filtered scoped prompts by route and agent. |

Final focused proof passed 59 Gateway lifecycle/model tests, 61 integrated
Control UI tests, 6 prompt tests, packed-package acceptance, type-aware lint,
and Control UI TSGo. The final Codex branch review reported no accepted or
actionable findings.

### Round 5 verdict

The fork-only technical series is review-clean. This closes the implementation
review gate only; it does not claim support-owner consent, authorize
publication, or begin OC6.
