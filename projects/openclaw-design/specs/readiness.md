# Readiness Facility

## Purpose and Boundary

Readiness publishes canonical, current, bounded evidence about whether named
OpenClaw subjects satisfy required and advisory conditions. Operator facilities
may inspect, watch, wait for, explain, and package this evidence.

Readiness is observational. It does not own configuration, repair, deployment,
restart, policy enforcement, state restoration, or platform orchestration.

## Status and Sources

- **Proposed**: RFC 0018 readiness conditions and providers.
- **Proposed**: RFC 0023 Standard Hosting Profiles as a separate composition
  and release-support contract over readiness.
- **Partially implemented**: active OpenClaw and fork PR stacks tracked in
  `projects/hosting-profiles/README.md`.
- **Facility roadmap**: `projects/hosting-profiles/readiness-facilities.md`.

This page is an index and conceptual summary; the RFCs remain normative.

## Objects

| Object | Ownership and role |
| ------ | ------------------ |
| Criterion | A named kind of evidence that may be selected for evaluation. Its semantic owner defines what it means. |
| Provider | An activation-scoped producer that evaluates one or more criteria without becoming the owner of unrelated state. |
| Subject | The concrete entity described by a condition, with explicit identity and replacement boundaries. |
| Condition | One criterion's current required or advisory status, reason, detail, and subject references. |
| Readiness result | The canonical bounded snapshot of producer identity, subjects, conditions, and aggregate readiness. |
| Hosting profile | An immutable standard preset that selects a supported condition set; it does not own the underlying evidence. |
| Transition event | A semantic change between canonical results, excluding evaluation-time churn. |
| Conformance artifact | Versioned evidence that a selected hosting profile and live readiness result structurally agree. |

## Core Readiness Capabilities

| Capability | Contract intent |
| ---------- | --------------- |
| Evaluate | Produce one canonical result from one activation-pinned owner snapshot. |
| Project | Expose the same result through health, HTTP, RPC, status, and CLI surfaces without separate evaluators. |
| Catalog criteria | List and inspect readiness criteria without invoking providers. |

## Readiness Operator Facilities

| Capability | Contract intent |
| ---------- | --------------- |
| Watch | Emit initial state and bounded semantic transitions while surviving unavailable and recovery states. |
| Wait | Repeatedly evaluate within one total deadline and return the final canonical observation. |
| Explain | Render non-passing conditions with subject lifetime and generation context. |

These facilities consume the canonical result. They must not create another
evaluator, identity model, or deadline semantic.

## Profile and Evidence Facilities

| Capability | Contract intent |
| ---------- | --------------- |
| Catalog profiles | List and inspect immutable standard-profile definitions without invoking readiness providers. |
| Validate | Compare a standard profile with one live canonical result and fail closed on structural mismatch. |
| Package evidence | Retain versioned, secret-safe readiness and conformance artifacts for release and support use. |

Profile validation depends on the separate Standard Hosting Profiles contract.
Artifact integrity, signing, disclosure, and retention are not implied by the
core readiness contract.

## Contract Summary

### Identity

- Conditions are keyed by subject and type.
- Subject IDs and generations expose replacement and revision boundaries.
- Producer, primary subject, and related subjects remain distinguishable.
- Evaluation timestamps do not create semantic transitions.

### Lifecycle and Consistency

- Provider selection and evaluation bind to one active configuration/plugin
  registry snapshot.
- Enumeration is inert and never invokes providers.
- Watch polling is sequential and non-overlapping.
- Hosting profiles consume owner-produced conditions rather than copying owner
  configuration or state.

### Failure

- Required false or unknown conditions make the aggregate not ready.
- Advisory conditions remain visible without silently becoming required.
- Gateway unavailability and recovery are observable.
- Malformed results, profile mismatch, and missing or duplicate required
  profile conditions fail conformance closed.
- Waiting has one total startup budget, including setup and request work.

### Trust and Compatibility

- Live readiness surfaces inherit existing Gateway authentication where they
  are exposed through the Gateway. Exact authorization and disclosure rules
  must be source-audited before being marked **Current** here.
- Machine formats and conformance artifacts are versioned.
- Human rendering may evolve without changing canonical machine meaning.
- Platforms decide what to do with readiness; OpenClaw owns the hostee evidence
  contract.
- Secret-safe serialization does not by itself provide artifact integrity,
  signing, retention, or legal/audit trust.

### Fleet and Evolution

- Consumers must distinguish an unreachable instance, an unsupported contract
  version, stale evidence, a malformed result, and a valid not-ready result.
- Mixed-version comparison must use declared schema and profile versions rather
  than assuming every instance exposes the same criteria.
- A retained result must carry enough producer, subject, generation, and
  evaluation identity to avoid presenting old evidence as current.

## Relationships

- Configuration and activation publish generations and selected providers.
- Capability owners publish their own readiness criteria and conditions.
- Hosting profiles compose conditions into a release-tested support promise.
- Doctor may translate stable reasons into findings or explicit remediation.
- Signals and support tooling may project readiness snapshots and transitions.
- State continuity may publish restore-related conditions but owns restore.

## Open Questions

- Which readiness contracts have been accepted upstream versus remain active
  proposals as of the next audit?
- Which core owners still lack bounded activation-scoped observations?
- What artifact retention and signature rules are needed for support or release
  evidence after the runtime exits?
- Which compatibility guarantees apply during mixed-version host and plugin
  deployments?
- Which authorization scopes may inspect detailed reasons, related subjects, or
  retained readiness artifacts?
