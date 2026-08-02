# OpenClaw Conceptual Model

## Purpose

This page defines a shared vocabulary for describing OpenClaw across RFCs. It is
deliberately more stable and abstract than the current module layout, while
remaining grounded in objects and contracts that can be verified in source.

## System Shape

OpenClaw can be described as an owner-composed runtime:

```text
operator intent + installed extensions + host bindings
                         |
                         v
                effective activation
                         |
                         v
request/event -> agent execution -> tools/providers -> effects and delivery
                         |
                         v
              state, signals, and readiness
```

The model does not imply one central framework. Each semantic owner should
publish the smallest stable contract needed by other facilities.

## Design Layers

Use four layers to avoid treating every concept as a peer subsystem:

| Layer | Meaning | Examples |
| ----- | ------- | -------- |
| Owner domain | Owns semantic objects, mutation, and lifecycle. | Configuration activation, agent execution, messaging, scheduling. |
| Runtime relationship | Connects owner objects without taking over their semantics. | Selection, binding, parent identity, handoff, provider route. |
| Evidence contract | Reports bounded facts about owner objects. | Readiness condition, Doctor finding, conformance result. |
| Projection | Renders or transports owner facts for a consumer. | CLI output, telemetry, audit export, localized message, support bundle. |

An area may span layers, but its spec must say which role it plays. A
cross-cutting concern does not automatically justify shared storage, a shared
event bus, a shared base type, or Gateway hot-path conversion.

## Core Object Classes

| Object class | Meaning | Typical lifetime question |
| ------------ | ------- | ------------------------- |
| Definition | Installed or declared possibility, such as a plugin, tool, skill, model route, channel type, or hosting profile. | When does a changed definition become visible? |
| Selection | Operator or owner intent choosing definitions and settings. | Which config or policy generation selected it? |
| Activation | A resolved, validated runtime snapshot ready for use. | What causes replacement, reload, or rejection? |
| Subject | A concrete entity whose state or condition is described. | What identity remains stable, and what event renews it? |
| Capability | An operation or behavior made available by an owner. | Is it available, authorized, healthy, and compatible? |
| Binding | A resolved relationship to a provider, credential, host service, node, route, or other dependency. | Who selects it, and how is loss represented? |
| Execution | A bounded attempt to perform agent, tool, model, hook, or delivery work. | What is the attempt identity and terminal outcome? |
| Session | A continuity scope that relates turns, messages, runs, and retained context. | What survives restart, handoff, or export? |
| Artifact | Durable or inspectable output such as config, transcript, checkpoint, catalog, report, or conformance evidence. | Which revision produced it, and can it be trusted later? |
| Condition | Current bounded evidence about a subject, such as readiness, policy conformance, or health. | Who evaluates it, how fresh is it, and what does unknown mean? |
| Signal | Structured operational fact projected by an owner for diagnostics, audit, telemetry, or support. | Is it an event, current state, or derived observation? |

These classes are descriptive, not a demand for shared base interfaces.
Facilities should keep owner-native names and semantics unless multiple owners
have proven the need for an interoperable contract. Similar-looking objects
with different renewal, consistency, trust, or failure rules must not be
collapsed merely to make the diagram uniform.

## Contract Dimensions

Every facility specification should make these dimensions explicit:

| Dimension | Questions |
| --------- | --------- |
| Ownership | Which component is authoritative for meaning and mutation? |
| Identity | What identifiers exist, and which replacement boundaries renew them? |
| Inputs | What definitions, selections, bindings, or prior state are consumed? |
| Outputs | What objects, effects, artifacts, conditions, or signals are produced? |
| Lifecycle | How do create, activate, reload, drain, stop, replace, and restore work? |
| Failure | Which failures are stable, retryable, terminal, degraded, or unknown? |
| Consistency | Which snapshot or generation binds an operation and its evidence? |
| Trust | Who may invoke, inspect, mutate, approve, or project the contract? |
| Compatibility | How are versions, optional capabilities, and mixed deployments handled? |
| Evidence | Which tests, reports, conditions, or signals prove the contract? |
| Fleet and evolution | How are partial rollout, stale evidence, mixed versions, and comparison across instances represented? |

Enterprise criticality and coverage are evaluated separately through
`enterprise-needs-framework.md`. Every layer is reviewed for administration,
identity/trust, data governance, operations, network/isolation, evidence,
resources, integration/evolution, and user/admin experience. These are
obligations on owner contracts and relationships, not a demand for one
enterprise runtime.

## Relationship Rules

The source-audited cross-facility graph and relationship vocabulary are in
`relationship-model.md`.

- A catalog describes possibilities; it does not prove activation or health.
- Configuration expresses intent; activation owns the accepted effective
  snapshot.
- A capability describes available behavior; policy and authorization decide
  whether a caller may use it.
- Readiness reports current owner evidence; it does not repair or reconfigure.
- Signals project owner facts; they do not become a second semantic owner.
- Hosting profiles compose a support promise; they do not own configuration,
  credentials, state, or platform orchestration.
- State continuity preserves owner state and handoff semantics; it does not
  redefine the objects being preserved.

## Status Vocabulary

Use these labels consistently:

- **Current**: verified in current OpenClaw source or accepted documentation.
- **Proposed**: specified by an active RFC or concrete design proposal.
- **Hypothesis**: plausible facility boundary awaiting source audit.
- **Deferred**: intentionally outside the current contract.
- **Rejected**: considered and explicitly ruled out.
