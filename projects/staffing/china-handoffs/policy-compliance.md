# Policy and Compliance: Collaboration and Ownership Opportunities

> **Omar's Admin & Governance vision:** Own tenant/global settings, policy,
> permissions, approvals, audit/override state, Partner Center, marketplace
> governance, and M365 auth decisions.

## High-level vision

Every managed OpenClaw instance should have a centrally visible, attributable,
and actionable compliance state. Administrators should know which policy is
effective, whether the instance evaluated that exact policy, which warnings or
violations exist, what is enforced, and how to remediate or grant a bounded
exception.

The intended boundary is:

- OpenClaw owns the generic policy engine, conformance checks, evidence format,
  doctor findings, and repair classifications.
- Lobster and the Microsoft control plane select and materialize effective
  enterprise policy, ingest verified evidence, enforce hosted outcomes, and
  provide fleet/tenant compliance, warning, exception, and audit experiences.
- MOS3/MAC contribute authoritative catalog, feed, package-defense, tenant,
  and availability decisions.

This is not a strict assignment. It describes related opportunities that the
Admin & Governance, Security, Infrastructure, or Data teams could own or
co-own depending on expertise and capacity.

The first useful conversation is which seam fits best: effective-policy
composition, evidence ingestion, central compliance state, lifecycle
enforcement, admin UX, or fleet signals and operations. A coordinating DRI
does not need to implement every seam.

### Guardrails and non-goals

- Keep OpenClaw as the generic policy and conformance owner; do not fork its
  finding or repair semantics into a Microsoft-only engine.
- Keep one authoritative effective-policy revision and one attributable
  evidence chain per evaluation.
- Missing identity, policy, evidence, or a mandatory enforcement dependency
  must not silently produce a pass or permit a protected action.
- Preserve previous-good state only when it is explicit, fresh enough for the
  approved failure posture, and cannot widen access.
- Do not centralize secrets, prompts, arbitrary config values, or raw user data
  merely to make reporting easier.
- Keep evidence generation and fleet reporting off latency-sensitive runtime
  paths where possible. Enforcement hooks need measured budgets, bounded
  timeouts, cancellation, and isolation so a governance error cannot crash or
  starve the OpenClaw Gateway.

## Questions the product must answer

For every managed instance:

- Which deployment, tenant, feed, and personal policy revisions are effective?
- Did OpenClaw evaluate that exact effective policy and configuration?
- Is the instance compliant, compliant with warnings, noncompliant, stale,
  unknown, or intentionally excepted?
- Which findings caused the state, when were they observed, and are they local
  drift, missing evidence, config violations, package-defense outcomes, or
  unavailable dependencies?
- What is blocked, warning-only, automatically repairable, review-required, or
  manual?
- Can administrators see, audit, trend, acknowledge, override, expire, and
  remediate the state centrally?

## Areas and major pieces

### Effective policy and evidence

- Precedence across deployment/global, tenant, selected-feed, and personal
  policy.
- Equal-or-stricter constraints beneath the global floor.
- Policy artifact identity, revision, content hash, provenance, comparison,
  attestation, and binding to an instance/config revision.
- Explicit missing, invalid, stale, and failed evidence states.

### Enforcement and remediation

- Lifecycle-specific blocking for startup, activation, discovery, install, or
  individual operations.
- Warning-only versus hard-violation behavior.
- Automatic, review-required, manual, validate-only, and unsupported repairs.
- Previous-good materialization on transient failure without access widening.

### Central compliance and governance

- Durable per-instance compliance state and fleet/tenant rollups.
- Finding details, freshness, drift, trends, and remediation history.
- Acknowledgement, exception, override, expiry, reversal, and audit.
- Package-defense, quarantine, feed governance, and runtime configuration
  findings without losing their distinct remediation paths.

### Signals and operations

- Low-cardinality state-transition and finding-class telemetry.
- Dashboards, alerts, retention, privacy boundaries, runbooks, and support.
- Real E2E scenarios for pass, warning, violation, stale evidence, invalid
  attestation, exception, repair, rollback, and recovery.

## Partners and dependencies

| Partner | Contribution and decisions needed |
| --- | --- |
| OpenClaw Policy maintainers | Generic policy evaluation, evidence schemas, finding IDs, repair classes, doctor behavior, and upstream compatibility. |
| Lobster/Scout | Effective-policy materialization, evidence ingestion, hosted enforcement, central state, admin UX, E2E, rollout, and operations. |
| Admin & Governance | Global/tenant authority, permissions, exception/override lifecycle, audit, and effective-state UX. |
| MOS3/MAC | Feed/catalog policy sources, package-defense/quarantine, title availability, tenant decisions, provenance, and revisions. |
| Extensibility | Feed policy sources, trust, signing, exact-version acquisition, revocation, and extension remediation. |
| Security | Severity and enforcement decisions, exceptions, privacy, threat model, break-glass, and security-only visibility. |
| Infrastructure & Engineering Systems | Evidence transport, freshness, E2E, reliability, dashboards, alerts, and recovery exercises. |
| Data Science & Insights | Fleet trends, warning/violation patterns, remediation effectiveness, exception trends, and product insight. |
| Frontend Product Engineering | Fleet/tenant status, explain, preview, warning, violation, repair, exception, and audit UX. |
| Operations & TPM | Decision closure, cross-team rollout, escalation, launch readiness, and operational ownership. |

### Terms used in this brief

- **Effective policy:** the resolved deployment/global, tenant, feed, and
  personal policy actually applied to an instance.
- **Conformance evidence:** attributable output proving what was evaluated,
  against which policy/config revision, when, and with what findings.
- **Package defense:** malware, vulnerability, trust, scanning, quarantine, and
  revocation outcomes associated with an extension package.
- **Previous-good:** the last successfully resolved and validated state retained
  during a bounded transient failure; it is not permission to widen access.
- **SIEM:** the enterprise security event system used for monitoring,
  investigation, and incident response.

## Work completed to date

### Lobster foundations already landed

- #2275: policy baseline state with optional MOS3 artifact metadata.
- #2270: OpenClaw policy bootstrap and materialization foundation.
- #3355/#3383: Scout policy preview and package-defense/MOS3 block-state
  interpretation.
- #3388/#3391: MOS3-backed equal-or-stricter personal policy state and gated
  Policy UX preview.
- #3585/#3586/#3588/#3590/#3603: authenticated personal policy acceptance,
  UX save, MOS3 publish, projection into OpenClaw starts, trusted comparison
  evidence, and durable persistence hardening.
- #3623: baked OpenClaw config aligned with default policy posture.
- #3693/#3695: effective-policy read UX and tenant feed-source selection UX.

### Generic OpenClaw foundations already available

OpenClaw has conformance and doctor primitives, recommendation metadata,
guarded automatic narrowing, required-deny repairs, channel-ingress repairs,
Gateway HTTP repairs, and review-required repair previews. These generic
contracts should be reused instead of reimplemented with different Lobster
semantics.

The completed foundations establish policy creation and materialization, but
they do not yet provide a complete centrally managed compliance product.

## Work currently in flight or worth restoring

### Replace the missing feed-policy-source backend contract

Old Lobster PR [#3607](https://microsoft.ghe.com/bic/lobster/pull/3607), branch
`user/giodl/lobster-feed-policy-sources`, ended closed and conflicting at
`e4132e04ed` with stale requested changes.

Its goal was to record tenant-admin-selected, attested tenant-approved feed
policy sources in durable policy state. Later PR #3695 landed part of the user
experience, so #3607 should not be reopened wholesale. The useful next step is
to audit current `main` and create the smallest clean backend contract still
needed.

That contract should preserve only policy-source identity and evidence:

- store or authority;
- feed ID and source revision;
- content hash and attestation;
- tenant scope;
- selection actor and time.

Registering a source must not itself grant install authority.

This PR information is a dated snapshot. Recheck current `main`, live PR state,
and later merged behavior before deciding that any old code should be reused.

## Work still to be done

### 1. Effective policy source and evidence contract

- Resolve deployment/global, tenant, selected-feed, and personal baselines
  with explicit precedence and equal-or-stricter constraints.
- Record policy artifact ID, revision, hash, provenance, comparison, and
  attestation hashes.
- Verify instance/workspace/config bindings and timestamps.
- Treat missing or invalid evidence as an explicit state, never a policy pass.

### 2. Quarantine and package-defense enforcement

- Block new discovery/install for `quarantined` and `failed` packages unless
  an explicit tenant or Microsoft exception exists.
- Preserve warning, unscanned, scanning, recheck-required, stale-scan,
  publisher-trust, source-revocation, vulnerability, and malware reasons.
- Keep active-session termination a separate explicit policy decision; feed
  revocation should not silently kill a process without an approved contract.

### 3. OpenClaw conformance ingestion

- Run or receive generic OpenClaw conformance evidence for the exact
  materialized policy and effective config.
- Verify evidence identity, hash, schema, timestamp, instance/workspace
  binding, and policy revision before accepting it.
- Normalize finding ID, severity, scope, affected config/evidence path, repair
  class, and a bounded reason without copying sensitive config or user data.

### 4. Durable central compliance state

Define a per-instance state machine with at least:

- `compliant`
- `compliantWithWarnings`
- `noncompliant`
- `stale`
- `unknown`
- `excepted`

Store the last successful evaluation, last attempt, policy/config revision,
finding summary, evidence hashes, exception/override reference, and freshness
deadline. Unknown, missing, invalid, stale, and evaluator-failure states must
never appear green.

### 5. Enforcement and warning behavior

- Decide which findings block startup, activation, discovery, install, or a
  specific operation, and which findings only warn.
- Define severity-specific dependency behavior: mandatory high-risk gates fail
  closed, while low-risk reporting failures degrade visibly without taking down
  otherwise safe runtime work.
- Reuse OpenClaw repair classes: automatic, review-required, manual,
  validate-only, and unsupported.
- Limit automatic repair to deterministic narrowing.
- Show review-required previews without mutating configuration.
- Preserve previous-good materialization on transient failure, mark compliance
  stale, and do not widen access.

### 6. Admin UX, explainability, and audit

Provide fleet and tenant views for:

- compliance counts and trends;
- new, repeated, stale, or suppressed findings;
- policy revision and last evaluation per instance;
- finding source, scope, reason, evidence freshness, and repair class;
- acknowledgement, exception, expiry, owner, ticket/reason, and reversal;
- before/after policy preview and remediation result;
- policy selection, publish, materialization, evaluation, exception, repair,
  rollback, and recovery history.

### 7. Signals and operations

- Emit low-cardinality telemetry for state transitions and finding classes.
- Alert on noncompliance, stale/unknown evidence, evaluator failures,
  materialization drift, and expiring exceptions.
- Define retention and privacy boundaries. Do not centralize raw policy
  secrets, tokens, prompts, or arbitrary config values.
- Produce signed or otherwise tamper-evident, timestamped evidence exports that
  identify what was checked, by which policy revision, and with what result.
- Export stable, bounded governance events to the enterprise SIEM while
  retaining precise sensitive diagnostics only in the appropriate trust zone.
- Define incident-response workflows and a fleet emergency-disable path with
  non-overridable security floors and attributable break-glass use.
- Support fleet/ring rollout with visible partial evaluation failures,
  per-instance retry, isolation, rollback, and recovery without disrupting
  already-healthy instances.
- Exercise compliant, warning, hard violation, stale evidence, invalid
  attestation, exception, repair, rollback, and recovery scenarios end to end.

## Areas teams could take on

These can be divided across Admin & Governance, Security, Infrastructure, Data,
and Frontend rather than owned by one team:

- Rebuild the narrow backend contract that remains from Lobster #3607.
- Own effective-policy composition and evidence identity in Lobster.
- Own verified OpenClaw conformance ingestion and freshness semantics.
- Own the central compliance state model and durable authority.
- Own lifecycle enforcement and warning policy with Security partnership.
- Own quarantine/package-defense enforcement with Extensibility and MOS3.
- Own fleet/tenant compliance, explain, exception, audit, and remediation UX.
- Own telemetry, dashboards, alerts, retention, privacy, and operational
  runbooks.
- Own E2E scenarios and release gates across OpenClaw, Lobster, and MOS3.
- Provide a cross-area DRI who closes decisions while implementation remains
  distributed among the appropriate partner teams.

## Decisions where partnership would be especially valuable

- Which findings block each lifecycle point?
- How long is evidence fresh, and what happens when it expires?
- What may tenant admins override beneath a global floor, and for how long?
- Which system is authoritative for central compliance and each evidence field?
- How do feed/package and runtime-config findings roll up without conflating
  remediation?
- What are the fleet, tenant, user, workspace, agent, and session scopes?
- Which signals are customer-visible, support-only, or security-only?

## Suggested success outcomes

- A current backend policy-source contract replaces the missing part of #3607.
- Package-defense and quarantine outcomes are enforced consistently with
  explicit exceptions and reasons.
- Each managed instance reports verified evidence for its exact effective
  policy/config revision.
- Missing, stale, invalid, or failed evidence never appears compliant.
- Administrators can see and explain compliance, warnings, violations, drift,
  exceptions, freshness, and remediation history.
- Compliance evidence is tamper-evident, exportable, and usable for audit and
  incident investigation rather than requiring manual reconstruction.
- Repair behavior matches generic OpenClaw semantics.
- E2E, telemetry, dashboards, runbooks, privacy/security review, and long-term
  operational ownership are explicit.
