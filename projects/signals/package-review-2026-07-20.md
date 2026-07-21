# RFC 0025 Package Review

## Frame

### Falsifiable thesis

OpenClaw can reduce operational ambiguity if each semantic owner preserves its
known result, outcome, status, finding, decision, or usage observation in
bounded structured fields before prose rendering, while reusing current
diagnostic, trace, finding, readiness, hook, and exporter infrastructure.

The thesis is disproved if two independent repairs:

- cannot identify an authoritative owner boundary;
- require a universal event or owner taxonomy;
- require a new Signals runtime package, registry, configuration surface, or
  dispatcher;
- add more duplicate classification than they delete; or
- cannot demonstrate value when diagnostics or localization is disabled.

### V1 boundary

V1 remains the Telegram active-generation missing-message-id path. It must use
existing `message.delivery.error`, `deliveryKind: "text"`, required
`durationMs`, the existing dispatch `sessionKey`, OpenClaw-created diagnostic
trace context through the trusted bundled-extension emitter, current
trust/private-data boundaries, and a bounded owner category.

The second foundation slice follows only after Telegram proves the convention.

### Deletion target

Every slice deletes one semantic-loss mechanism:

- verbose-only failure;
- flattened structured result;
- timestamp or prose correlation;
- false success;
- silence;
- JSONL polling;
- false zero;
- log-only health; or
- exporter-acceptance-only tests.

## Audit

### Package state

RFC 0025 currently provides:

- source-aligned terminology;
- the structured operational ownership standard;
- explicit goals and non-goals;
- ownership, correlation, privacy, rendering, compatibility, and performance
  rules;
- one exact V1 projection;
- a ten-PR implementation forecast; and
- stop conditions against platform creep.

The package does not yet separate implementer-facing normative rules from the
decision narrative.

### Source-backed owner contracts

Current OpenClaw source already distinguishes:

- `DiagnosticEventPayload` events with `type`, `ts`, `seq`, and optional
  `trace`;
- owner-specific `outcome`, `status`, `reason`, `errorCategory`,
  `errorCode`, `failureKind`, `terminalReason`, and classification fields;
- `HealthFinding` and `SecurityAuditFinding` with `checkId`;
- `InstallPolicyFinding` with `ruleId`;
- `ReadinessResult` with `ready`, `failing`, `suppressed`, `uptimeMs`, and
  event-loop health;
- `DiagnosticUsageEvent` with `type: "model.usage"`;
- `DiagnosticTraceContext` using W3C trace identity;
- `DiagnosticEventMetadata` for trust and provenance; and
- `DiagnosticEventPrivateData` for raw error, model, skill, and tool content.

The package must preserve those roles. "Signals" cannot become a source field
because `DiagnosticTelemetryExporterEvent.signal` already means traces,
metrics, or logs.

### Missing normative separation

Three contracts need implementer-facing detail:

1. how an owner contract reaches the structured operational ownership bar;
2. how an authoritative owner fact projects through existing consumers without
   ownership transfer, privacy leaks, or duplicate lifecycle events; and
3. what evidence proves a repair and prevents regression.

No source evidence justifies:

- a shared runtime owner-outcome interface;
- a global code or outcome registry;
- a new diagnostic event family;
- a Signals configuration section;
- a centralized scanner of every subsystem;
- a resource-economics schema; or
- a public plugin Signals API.

## Compare

### Internal analogues

| Analogue | Disposition | Package implication |
| --- | --- | --- |
| `DiagnosticEventPayload` | Reuse | Projection spec must use current dispatcher, trace, trust, private-data, queue, and exporter behavior. |
| `HealthFinding` | Reuse | Owner spec must allow findings to remain findings rather than force events. |
| Security/install-policy findings | Reuse | Preserve `checkId` and `ruleId` ownership instead of normalizing IDs. |
| `ReadinessResult` | Reuse | Current readiness vocabulary remains authoritative; richer conditions remain separate work. |
| `PluginHookAfterToolCallEvent` | Adapt | Preserve the owner result and current hook compatibility rather than introduce a new hook family. |
| `DiagnosticUsageEvent` | Adapt through owner | Usage and unknown-cost changes remain resource-owner decisions. |
| Localization descriptors | Project into | Stable owner fields and typed parameters feed rendering; Localization owns catalogs and fallback. |
| Universal Signals envelope | Avoid | Duplicates existing event, result, finding, readiness, and usage contracts. |

### RFC 0024 package

RFC 0024 demonstrates useful package structure:

- decision RFC;
- normative runtime specification;
- separate coverage/conformance specification;
- issue-to-delivery catalog; and
- dependency-ordered implementation plan.

Signals should copy the separation discipline, not Localization's kernel,
surface matrix, or completion model. Signals has no bounded product-wide
migration universe comparable to 315 locale/surface cells.

### External comparators

| Comparator | Reuse | Avoid |
| --- | --- | --- |
| RFC 9457 | Stable machine problem identity alongside human detail. | One HTTP problem shape for every runtime fact. |
| Kubernetes Conditions | Machine reason separate from human message and stale-generation awareness. | Condition arrays for ephemeral events. |
| W3C Trace Context | Standard trace ancestry and parentage. | Proprietary replacement correlation IDs. |
| OpenTelemetry | Interoperable exporter projection. | Exporter conventions as canonical OpenClaw semantics. |

## Evaluate

### Gateway runtime owner

- **Block:** synchronous exporter, localization, filesystem, network, or
  pricing work on owner paths.
- **Block:** mandatory wrapper around all errors, logs, or tool calls.
- Require disabled-consumer behavior and asynchronous diagnostic projection.
- Preserve one authoritative lifecycle boundary to prevent duplicate events.

### Fleet operator

- Require stable machine identity, unknown-value behavior, and mixed-version
  compatibility.
- Prefer existing run, call, session, tool-call, and trace identity over
  timestamp joins.
- Exporter health must be inspectable without enabling verbose logging.
- Do not claim fleet completeness; report adopted and unresolved seams.

### User and Localization surface

- Codes alone are insufficient; human output needs an actionable next step.
- Machine identity and typed parameters must remain separate from translated
  text.
- A generic "something went wrong" projection is non-conforming when the owner
  knows a more specific fact.
- Localization failure must not replace or suppress the owner contract.

### Security and CISO

- Trust provenance and private-data separation are part of the owner contract,
  not exporter cleanup.
- Public diagnostic fields must exclude secrets, prompts, raw provider
  payloads, user content, and sensitive identifiers unless explicitly
  classified.
- Signals conformance is engineering review evidence, not a tamper-proof audit
  ledger or legal attestation.
- Security and policy decisions must not branch on rendered prose.

### Policy steward

- Each area extracts and reports its own evidence.
- Signals must not become a central scanner reaching into private owner state.
- Policy remains authored requirements plus evidence; Signals conformance does
  not become a second policy system.
- Existing findings, Doctor, and runtime hooks remain the preferred surfaces.

### Contributor, skill author, and new-hire

- A contributor must be able to adopt the standard from one short checklist.
- No mandatory package, annotation language, generated manifest, or new config.
- A repair PR must look like an ordinary owner fix with stronger tests.
- The conformance record belongs in review material or focused tests, not
  runtime boilerplate.

### Founder and skeptical simplicity

- **Block:** `packages/signals`, a Signals SDK, daemon, event bus, registry, or
  global taxonomy.
- The project must replace manual work rather than add parallel observability.
- If repeated slices do not converge, retain owner-local fixes and retire the
  shared initiative machinery.

### Maintainer-grade reviewer

- Require current-source proof of the exact owner boundary.
- Test every branch that could regress to false success, duplicate emission,
  raw-error leakage, or missing terminal evidence.
- A test that asserts only message text or exporter acceptance is insufficient.
- Narrowed scope must be swept through RFC, sidecars, issue maps, and PR bodies.

### Repo boundary steward

- RFC and coordination artifacts remain in the RFC and `claws-hapi` repos.
- OpenClaw implementation must not import or depend on either repository.
- Any reusable code must live at an existing OpenClaw owner seam and be useful
  without the Signals project.

## Slice

### Representative input

A plain-text Telegram draft `sendMessage` returns without a finite numeric
`message_id` for the active generation.

### Narrow seam

The draft owner classifies the terminal condition before formatting warning
text and projects it through existing `message.delivery.error`.

### Accepted result

- successful preview behavior remains unchanged;
- no error event or warning is emitted; and
- no exporter or localization work runs synchronously.

### Structured failure

- event type: `message.delivery.error`;
- channel: `telegram`;
- delivery kind: `text`;
- error category: `telegram_draft_missing_message_id`;
- finite duration from attempted send to classification;
- existing dispatch `sessionKey` when present;
- OpenClaw-created active trace context preserved through the existing trusted
  plugin SDK emitter; and
- no sensitive public content.

The delivery family is attempt-level, not turn-level. Current Prometheus and
OTel consumers record terminal events independently and do not join them to a
`message.delivery.started` event. A fallback or final success after the preview
failure is therefore a separate attempt, not double accounting for one attempt.

Core outbound delivery currently emits this family with internal dispatcher
provenance, while bundled Telegram would use trusted owner-instrumentation
provenance. The difference is metadata only: it does not define a new event
subtype or promote Telegram-supplied data to trusted input.

### Observable proof

- exactly one event inside the active-generation missing-message-id branch;
- default actionable operator warning;
- existing `sessionKey` correlation when present;
- trusted ancestry without promoting Telegram-supplied context;
- current exporters and stability consumers accept the bounded category;
- diagnostics-disabled behavior remains unchanged; and
- no event for a superseded generation;
- no contradictory terminal result for the failed preview attempt.

### Deletion

Verbose logging ceases to be the sole owner-failure surface.

## Package Decision

Create three normative sidecars:

1. `structured-operational-ownership-v1-spec.md`;
2. `diagnostic-projection-v1-spec.md`; and
3. `signals-conformance-v1-spec.md`.

Do not create a runtime schema, resource-economics spec, public plugin spec, or
global coverage manifest before owner slices provide evidence.

## Reciprocal Localization Learning

Localization's strongest transferable pattern is not its product-wide maturity
matrix. It is revision-bound, fail-closed evidence.

Signals adopts that discipline narrowly:

- conformance records bind to implementation, owner-contract, fixture, and
  projection-consumer revisions;
- changed reviewed boundaries make an `adopted` repair `stale` until refreshed;
- public, persisted, replayed, and plugin-facing changes include mixed-version
  proof;
- lossy consumers are disclosed as projection constraints rather than given
  false approximations, but a constraint cannot hide the motivating repair
  surface or a projection claimed as delivered;
- security, authorization, privacy, destructive-action, audit, and cost facts
  require their named specialist owners; and
- owner-local tests enforce claims without a central scanner or release matrix.

Signals does not import Localization's manifest, locale/surface cells, maturity
states, translation workflow, or product completion claim.
