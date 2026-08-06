# Enterprise Needs Framework

## Purpose

This framework evaluates what enterprises require from each OpenClaw design
layer without confusing three separate questions:

1. **Product need**: how important is the capability to enterprise adoption,
   risk, or operation?
2. **Contract coverage**: how explicitly does the current design/source satisfy
   that need?
3. **Implementation maturity**: how complete and well-evidenced is the current
   owner implementation?

The existing area scorecard answers the third question. This framework adds the
first two.

## Falsifiable Thesis

Working OpenClaw owners already provide configuration, execution, messaging,
models, tools, sessions, memory, readiness, and operational behavior.

Enterprises need stronger cross-owner contracts for scoped authority, data
governance, fleet operation, evidence, cost, and compatibility.

The correct contribution is:

```text
working owner systems
+ enterprise authority, governance, and evidence contracts
-> fleet-safe and auditable operation without a shadow runtime
```

The thesis is disproved if enterprise support requires:

- replacing owner-native semantics with one universal object model;
- copying all OpenClaw settings into a second policy/configuration system;
- routing every operation through a mandatory central service;
- making personal/community use depend on enterprise infrastructure; or
- producing compliance claims that cannot be tied to current owner evidence.

## Enterprise Obligation Dimensions

| Code | Dimension | Enterprise question |
| ---- | --------- | ------------------- |
| `A` | Administration and governance | Can tenant/org/workspace administrators express bounded intent, delegate administration, detect drift, and roll out change safely? |
| `I` | Identity, access, and trust | Are principals, service identities, delegated authority, least privilege, approval, revocation, and isolation explicit? |
| `D` | Data governance and privacy | Are classification, residency, encryption, retention, legal hold, export, deletion, and disclosure boundaries owner-defined? |
| `O` | Operations, fleet, and reliability | Can operators deploy, compare, upgrade, roll back, drain, recover, and support a mixed-version fleet? |
| `N` | Network and isolation | Are ingress, egress, private connectivity, service boundaries, tenant isolation, and data movement explicit and enforceable? |
| `E` | Evidence, compliance, and support | Are decisions and state attributable, fresh, redacted, exportable, tamper-evident where required, and useful for audit or incident response? |
| `R` | Resource and financial governance | Are quotas, concurrency, rate limits, tokens, cost, storage, and capacity observable and controllable? |
| `X` | Integration, portability, and evolution | Are APIs, protocols, versions, extension contracts, import/export, and replacement boundaries explicit? |
| `U` | User and administrator experience | Are controls understandable, role-appropriate, accessible, localizable, automatable, and removable without breaking the owner system? |

These dimensions are review obligations. They do not imply one shared
administration, identity, data, telemetry, or resource service.

## Enterprise Need Scale

Score enterprise criticality independently from implementation maturity:

| Score | Meaning |
| ----- | ------- |
| `E0` | No distinct enterprise requirement beyond normal correctness. |
| `E1` | Convenience or adoption aid; absence is tolerable. |
| `E2` | Important for repeatable team use or integration. |
| `E3` | Required for reliable fleet operation or governed production use. |
| `E4` | Security, regulatory, legal, or mission-critical adoption blocker. |

## Contract Coverage Scale

| Score | Meaning |
| ----- | ------- |
| `C0` | No relevant contract or evidence found. |
| `C1` | Implicit, local, or ad hoc behavior only. |
| `C2` | Partial owner-specific behavior; major enterprise semantics are unstated. |
| `C3` | Explicit owner contracts exist, but fleet, policy, evidence, or lifecycle gaps remain. |
| `C4` | Complete source-backed contract including authority, failure, evidence, compatibility, and fleet operation. |

An enterprise priority is the gap between criticality and coverage. It is not a
new letter grade and should not replace the source-maturity rubric.

## Layer Requirements

### 1. Owner domain

An enterprise-grade owner domain must define:

- tenant/org/project/workspace scope where applicable;
- authoritative administrators and delegated roles;
- create, activate, update, disable, drain, restore, archive, and delete;
- data classification, persistence, residency, retention, and encryption;
- quotas, capacity, and cost attribution;
- policy enforcement points and emergency stop/rollback;
- migration and mixed-version behavior; and
- owner-native evidence for state and mutation.

**Enterprise need**: enterprises must know who controls the object, where its
data lives, what survives, what it costs, and how it is stopped or deleted.

**Non-goal**: one `EnterpriseResource` base type or shared database for every
owner.

### 2. Runtime relationship

An enterprise-grade runtime relationship must define:

- both endpoint identities and the binding identity;
- selecting authority and delegated authority;
- credential/auth generation and least-privilege scope;
- policy/approval decision and fail-open/fail-closed posture;
- version/capability negotiation;
- network path, egress policy, and data-movement boundary;
- renewal, revocation, expiry, and loss;
- tenant and data-boundary propagation;
- retries, idempotency, cancellation, and handoff; and
- correlation evidence without leaking secret material.

**Enterprise need**: most enterprise incidents happen between healthy owners:
the wrong principal, credential, tenant, route, target, version, or stale
binding is used.

**Non-goal**: a universal service bus or globally stable identifier for every
relationship.

### 3. Evidence contract

An enterprise-grade evidence contract must define:

- subject and generation;
- producing owner and policy/config version;
- observed/evaluated time, freshness, and expiry;
- result, unknown/degraded semantics, and omitted scope;
- integrity and provenance;
- redaction and disclosure policy;
- retention, legal hold, deletion, and export;
- correlation to the decision or mutation it supports; and
- fleet aggregation without treating missing/stale evidence as success.

**Enterprise need**: an operator, auditor, incident responder, or support
engineer must be able to prove what happened and which state governed it.

**Non-goal**: treating lossy telemetry as authoritative audit evidence or
claiming all evidence must use one storage/format.

### 4. Projection

An enterprise-grade projection must define:

- intended role and authorization scope;
- redaction and tenant boundary;
- stable machine meaning independent of rendering;
- role-appropriate detail and remediation guidance;
- accessibility and localization;
- bulk/fleet and automation surfaces;
- export/SIEM/support integration where relevant;
- version compatibility and partial-capability rendering; and
- explicit statement that the projection is not the semantic owner.

**Enterprise need**: controls and evidence must reach administrators, operators,
auditors, end users, automation, and support without diverging in meaning.

**Non-goal**: one enterprise UI or CLI becoming the only usable interface.

## Enterprise Gates by Consequence

### Security-sensitive action gate

Required for tools, delegated execution, messaging, credentials, nodes, and
host bindings:

- authenticated principal;
- authorized target and action;
- credential generation;
- policy/approval result;
- fail-closed behavior where required;
- bounded side effect;
- cancellation/kill path; and
- durable redacted decision evidence.

### Regulated-data gate

Required for sessions, memory, messages, attachments, audit, checkpoints, and
support artifacts:

- data owner and classification;
- storage location and encryption;
- residency and transfer;
- retention/legal hold;
- export/eDiscovery;
- deletion and backup interaction;
- access logging; and
- redaction before projection.

### Fleet-change gate

Required for config, extensions, models, policy, hosting, and upgrades:

- desired generation;
- validated candidate;
- targeted scope;
- staged rollout;
- drift and partial failure;
- rollback/recovery;
- mixed-version compatibility; and
- accepted-generation evidence.

## Internal Analogues

| Analogue | Decision | Enterprise reuse |
| -------- | -------- | ---------------- |
| Configuration runtime/source snapshots and accepted hashes | Reuse | Generation, candidate, acceptance, conflict, rollback, and drift vocabulary. |
| Readiness subjects and conditions | Reuse | Freshness, unknown, required/advisory, and bounded owner evidence. |
| Doctor findings and repair plans | Reuse | Explainable findings, explicit effects, preview, and owner-shaped remediation. |
| Policy requirements and attestations | Adapt | Authored requirements should consume owner evidence rather than mirror owner settings. |
| State-continuity fencing and recovery | Reuse | Handoff, generation fencing, dirty/synced state, quarantine, and restore evidence. |
| Identity/lifetime matrix | Adapt | Compare owner-native identities; add tenant, principal, credential, policy, and retention relationships. |
| Universal resource ID, event bus, policy engine, or enterprise store | Avoid | Hides renewal and authority differences and creates parallel ownership. |

## Role Validation

### Platform engineer

Accepted enterprise need:

- fleet is a first-class comparison and rollout scope;
- partial failure must be isolated and recoverable;
- drift, mixed versions, and accepted generations must be inspectable; and
- automation/CI must not depend on interactive local workflows.

Rejected overreach:

- fleet consistency does not authorize rewriting owner semantics or forcing all
  workspaces through one control plane.

### CISO

Accepted enterprise need:

- least privilege, default-deny cross-agent/action boundaries, revocation, kill
  paths, incident evidence, and SIEM export;
- security claims must survive compromised-agent and degraded-hook scenarios.

Rejected overreach:

- a signed artifact or central gate is not automatically required for every
  low-risk local action. Enforcement strength follows consequence and policy.

### Compliance

Accepted enterprise need:

- evidence must identify subject, time, policy/config generation, result,
  scope, provenance, retention, and integrity;
- auditor-facing packages should be generated from owner evidence rather than
  assembled manually.

Rejected overreach:

- the notebook must not claim SOC2, HIPAA, or EU AI Act compliance merely
  because an audit event or report exists.

### Policy steward

Accepted enterprise need:

- policy expresses requirements and consumes stable owner evidence;
- every runtime gate must map to a real enforcement point and explicit
  fail-open/fail-closed semantics.

Rejected overreach:

- policy must not become a second OpenClaw settings hierarchy or a catalog of
  customer-specific bans.

### Founder and power user

Accepted enterprise need:

- stronger owner contracts should also improve ordinary safety,
  inspectability, upgrades, and recovery;
- enterprise integrations must be optional, removable, and automatable;
- controls should replace scripts and manual evidence work.

Rejected overreach:

- enterprise defaults, mandatory hosted services, or generated abstractions
  that make a simple local agent harder to understand.

## Facility Review Template

For each facility record:

| Field | Question |
| ----- | -------- |
| Enterprise criticality | `E0-E4`: what business, security, legal, or operational consequence makes this necessary? |
| Primary enterprise actors | Which admin, operator, security, compliance, support, developer, or end-user roles depend on it? |
| Applicable obligations | Which of `A I D O N E R X U` apply? |
| Current coverage | `C0-C4`: what is source-backed today? |
| Blocking gap | What prevents governed enterprise adoption? |
| Retained owner | Which OpenClaw owner remains authoritative? |
| Enterprise extension | What narrow shared contract, projection, or host binding is missing? |
| Disproof condition | What evidence would show the extension is unnecessary or wrongly scoped? |
