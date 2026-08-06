# Microsoft Scout Hosting OpenClaw

## Executive Position

```text
OpenClaw supplies the autonomous work runtime
+ Scout supplies the enterprise operating environment
= a governed Microsoft work-agent capability
```

Scout can turn OpenClaw from a powerful personal agent into a safely hosted
enterprise capability. OpenClaw gives Scout a complete work-agent runtime and
ecosystem that Scout would otherwise need to build.

## The Complementary Ownership Model

### OpenClaw contributes the work-agent runtime

- agent loop, prompts, models, and tool execution;
- skills, plugins, and capability discovery;
- sessions, memory, context, and workspaces;
- channels, providers, nodes, and local-device actions;
- broad model and provider flexibility;
- personal-assistant ergonomics; and
- a community-driven extension ecosystem.

### Scout contributes the enterprise operating environment

- Microsoft tenant, employee, service, and delegated identity;
- managed hosting, isolation, networking, and secrets;
- policy, approval, delegated authority, and compliance controls;
- deployment versions, staged rollout, rollback, and repair;
- fleet convergence, quarantine, and containment;
- Microsoft 365 context and enterprise connectors;
- administration, budgets, support, and reliability; and
- durable evidence and enterprise reporting.

## Architectural Boundary

> Scout hosts and governs OpenClaw. It does not become the canonical owner of
> OpenClaw sessions, memory, tools, channels, provider effects, or workspace
> state.

```text
SCOUT EXPERIENCE AND ADMINISTRATION
employee experience / admin / diagnostics / approvals / recovery
                           |
                           v
SCOUT ENTERPRISE CONTROL AND EVIDENCE
identity / policy / hosting / rollout / budgets / compliance / fleet
                           |
                           v
ENTERPRISECLAW RELATIONSHIP CONTRACTS
authority / activation / invocation / effect / lifecycle / convergence
                           |
                           v
OPENCLAW RUNTIME CELLS
agents / sessions / memory / tools / channels / providers / nodes / workspaces
                           |
                           v
OWNER-NATIVE STATE AND EXTERNAL SYSTEMS
files / SQLite / Microsoft 365 / provider APIs / devices / services / packages
```

The contracts connect Scout and OpenClaw without transferring healthy
OpenClaw owner semantics into a central Scout database.

## Strategic Advantages for Microsoft

### Start with a complete agent harness

Scout gains an existing autonomous runtime with tools, memory, skills,
channels, workspaces, providers, and local execution instead of assembling
these facilities independently.

### Extend from personal productivity to governed work

The same basic agent experience can begin with one employee and grow into
team, department, or organization operation through additive identity, policy,
evidence, hosting, and fleet controls.

### Bind Microsoft identity to real agent actions

Microsoft identity and policy can govern consequential tool calls, delegated
employee actions, messages, files, connectors, and administrative changes—not
only access to the model endpoint.

### Place community capabilities behind enterprise admission

OpenClaw skills, plugins, models, and providers can remain extensible while
Scout adds artifact trust, capability admission, approval, rollout, and
containment.

### Isolate failures into replaceable runtime cells

Scout can host independent OpenClaw cells by tenant, team, agent, workload, or
risk profile. A failed or compromised cell can be quarantined, repaired,
upgraded, or replaced without one global runtime becoming the failure domain.

### Preserve provider and deployment flexibility

OpenClaw's owner model allows Scout to support multiple models, tools,
channels, nodes, and storage owners without forcing all behavior into one
lowest-common-denominator service.

### Create evidence from owner-native facts

Scout can project authority, generation, settlement, effect certainty,
retained-copy, and fleet facts into Microsoft administration and compliance
surfaces without treating logs or dashboards as canonical runtime state.

## Product Position

Scout plus OpenClaw is broader than a hosted agent SDK:

> **A managed employee work agent with local capabilities, Microsoft identity,
> organizational governance, and truthful operational evidence.**

The differentiation combines:

- Hermes-like personal-agent usability;
- OpenClaw's tool, channel, workspace, and ecosystem breadth;
- Microsoft identity, administration, connectors, and hosting;
- EnterpriseClaw authority-to-effect and retained-copy semantics; and
- durable recovery and fleet operations.

## Five-Box Mapping

| EnterpriseClaw box | OpenClaw contribution | Scout contribution |
| --- | --- | --- |
| **See and control** | Local activity, agent state, tools, channels, diagnostics | Employee/admin experiences, attention queues, fleet diagnostics, repair |
| **Govern** | Capability and owner-native runtime facts | Tenant identity, policy, approval, delegated authority, budgets, admission |
| **Think and act** | Agent loop, models, tools, providers, channels, nodes | Microsoft 365 context, enterprise connectors, governed effect paths |
| **Remember and connect** | Sessions, memory, context, workspaces, protocols | Managed persistence profiles, tenant boundaries, recovery, connector continuity |
| **Operate at scale** | Runtime cells and owner-specific lifecycle | Hosting, rollout, evidence, compliance, fleet convergence, containment |

## Deployment Principle

Scout should manage OpenClaw through versioned hosting profiles and runtime
contracts rather than direct assumptions about internal files or process
layout.

A Scout-hosted OpenClaw cell should declare:

- exact OpenClaw artifact and contract versions;
- supported capability and extension profile;
- identity and credential bindings;
- storage and workspace ownership;
- network and connector boundaries;
- readiness and resource expectations;
- evidence and retention profile;
- update, rollback, and restore behavior; and
- containment and deletion obligations.

This allows Scout to upgrade or replace the runtime while preserving stable
enterprise contracts.

## Risks to Avoid

### Scout becomes a second owner

Avoid copying canonical sessions, memory, channel state, or effect state into a
Scout database and treating the copy as more authoritative than OpenClaw
owners.

### Enterprise hosting breaks local completeness

OpenClaw must remain functional without a remote Scout control plane. Managed
policy may fail closed for explicitly protected operations, but ordinary local
runtime health must not depend on a central dashboard.

### One global runtime creates excessive blast radius

Use isolated runtime cells and bounded shared services. Do not place unrelated
tenants, agents, credentials, or channel effects into one failure domain.

### Microsoft identity is mistaken for approval

Authentication and tenant membership do not authorize every agent action.
Protected effects still require bounded policy, scope, risk, and approval
decisions.

### Hosted status is mistaken for owner truth

Process health, container readiness, logs, and traces do not prove message
delivery, tool effects, deletion, restore, or convergence.

### Target architecture is presented as shipped capability

This material describes the recommended product and architecture direction.
Current Scout and OpenClaw behavior must be audited before claiming that a
specific identity, lifecycle, evidence, restore, or fleet guarantee exists.

## Slide-Ready Summary

### Slide title

**Scout + OpenClaw: A governed Microsoft work-agent capability**

### Headline

Scout provides the enterprise environment. OpenClaw provides the autonomous
work runtime.

### Three supporting points

1. **Faster capability:** start from a mature agent, tool, memory, channel, and
   workspace ecosystem.
2. **Enterprise trust:** bind Microsoft identity, policy, approval, evidence,
   and containment to real agent actions.
3. **Architectural flexibility:** host isolated, replaceable OpenClaw runtime
   cells without centralizing owner-native state.

### Closing line

> Scout makes OpenClaw enterprise-ready; OpenClaw makes Scout a complete work
> agent.

