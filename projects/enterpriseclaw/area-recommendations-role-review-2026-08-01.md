# EnterpriseClaw Area Roadmap Role Review - 2026-08-01

## Scope

Review of `area-recommendations.md` through these `.craft/roles`:

- founder;
- power user;
- new hire;
- platform engineer;
- CISO;
- Gateway engineer;
- Aether runtime engineer;
- policy steward;
- release engineer;
- Lobster container engineer;
- Microsoft 365 connector engineer;
- skill author; and
- compliance.

## Result

The area recommendations are directionally sound:

- preserve mature OpenClaw semantic owners;
- replace bounded process and trust boundaries progressively;
- keep Rust Node Mode first;
- delay the agent kernel;
- keep managed state as projection; and
- avoid forcing the extension ecosystem into Rust.

The review required seven corrections.

## Required Corrections

### 1. Add a Phase 0 operating baseline

**Roles**: release engineer, platform engineer, power user, Lobster container
engineer.

The roadmap began with conformance and Rust Node Mode but omitted the operating
foundation required to sustain a fork:

- current Scout deployment architecture;
- upstream/LTS baseline;
- patch inventory and disposition;
- release ownership;
- install and compatibility smoke tests;
- cold-start, latency, memory, and recovery budgets; and
- rollback runbooks.

**Disposition**: add Phase 0 before component replacement.

### 2. Replace "projections freely" with "reimplement behind stable contracts"

**Roles**: new hire, M365 connector engineer, compliance, skill author.

Presentation implementations can change, but their machine contracts cannot
change casually. Connectors, automation, accessibility, localization,
compliance exports, and operator workflows depend on stable behavior.

**Disposition**: projections are replaceable only behind versioned owner and
consumer contracts.

### 3. Define risk-tiered enforcement posture

**Roles**: Gateway engineer, Aether runtime engineer, CISO, policy steward.

There is a real tension:

- broad fail-closed behavior can destabilize ordinary Gateway operation;
- permissive fallback for high-risk actions creates a security incident.

**Disposition**:

- owner policy classifies the operation risk;
- protected/high-risk effects fail closed when authority is missing,
  malformed, stale, or unverifiable;
- low-risk observations may degrade with explicit evidence;
- unknown tools/actions default to the protected path until classified;
- all allow, deny, review, and modify outcomes are explicit; and
- no fast path bypasses the runtime enforcement point.

### 4. Treat every new Rust process as an operational product

**Roles**: Lobster container engineer, Gateway engineer, platform engineer.

Rust does not make process lifecycle free. Node Mode, supervisor, assurance,
and worker components require:

- startup/readiness budgets;
- memory and CPU accounting;
- loopback/network exposure rules;
- init ordering;
- health semantics;
- crash recovery;
- reconnect/idempotency; and
- deployment-unit failure isolation.

**Disposition**: no Rust sidecar or supervisor advances without an explicit
deployment profile and operational budget.

### 5. Protect ecosystem and connector compatibility

**Roles**: founder, skill author, M365 connector engineer.

The roadmap correctly preserves plugins and skills but needs stronger gates:

- a skill remains a portable workspace asset;
- JavaScript/TypeScript extensions remain supported through compatibility
  hosts or protocols;
- connector writes pass through the same validation as local writes;
- bidirectional synchronization declares conflict, loop, retry, and
  idempotency semantics; and
- governance additions remain removable for ordinary local operation.

**Disposition**: ecosystem and connector conformance becomes a replacement
gate.

### 6. Strengthen release and deletion gates

**Roles**: release engineer, power user, founder.

A replacement is not complete because its source builds. It must prove:

- artifact publication and installability outside the workspace;
- mixed-component version compatibility;
- upgrade and downgrade behavior;
- fresh-environment smoke;
- downstream dogfood;
- security-patch ownership; and
- recovery from partial publication or activation.

**Disposition**: TypeScript deletion follows release proof, not only runtime
conformance.

### 7. Keep policy and compliance as owner evidence loops

**Roles**: policy steward, compliance, CISO.

Policy must not copy OpenClaw settings into a second source of truth.
Compliance reports must not claim more than owner evidence proves.

**Disposition**:

- policy defines durable categories and requirements;
- owners extract evidence from their own state;
- runtime gates use explicit enforcement points;
- attestations identify policy, evidence, workspace, owner generations, time,
  and integrity; and
- compliance projection remains separate from operational telemetry.

## Role Findings by Area

| Area | Strongest role finding |
| ---- | ---------------------- |
| Experience and administration | Progressive disclosure is required; raw local operation remains available. |
| Identity, authority, and trust | Unknown or unverifiable high-risk authority must not become implicit allow. |
| Configuration and activation | Connector and managed writes must traverse the same validation/activation owner. |
| Agent runtime and orchestration | Keep the agent kernel late; correctness and ecosystem compatibility dominate language preference. |
| Models, providers, and compute | Routing evidence must remain useful without adding Gateway hot-path latency. |
| Actions, tools, and integrations | Explicitly handle allow, deny, review, and modify; no fast-path bypass. |
| Conversations, channels, and delivery | Connector retries and bidirectional loops need owner-native idempotency and conflict semantics. |
| Knowledge, context, and continuity | ACL and policy evidence must not duplicate canonical memory/workspace state. |
| Runtime fabric and protocols | Protocol evolution needs latency, crash, replay, and mixed-version budgets. |
| Nodes, devices, and edge | Rust Node Mode remains the best first replacement, with profile and operational constraints. |
| Extensibility, artifacts, and release | Skills/plugins remain portable; publication and fresh-install proof are mandatory. |
| Data governance and resource control | Policy categories and owner evidence precede enterprise-specific enforcement rules. |
| Operations, assurance, and fleet | Fleet results remain per-unit; durable audit and telemetry remain distinct. |

## Simplifications Required

- One risk classification and enforcement relationship instead of scattered
  fail-open/fail-closed decisions.
- One deployment profile per Rust component instead of implicit sidecar costs.
- One compatibility gate covering skills, plugins, connectors, and protocols.
- One release proof definition covering publish, install, activate, recover,
  and downgrade.
- One owner-evidence loop for policy and compliance instead of central
  settings duplication.

## Unresolved Decisions

- Exact Scout deployment and cold-start budgets.
- Which authority classes are protected/high risk.
- Whether mail and M365 writes share an existing validation owner or require a
  new bounded adapter contract.
- Exact compatibility-host model for JavaScript/TypeScript extensions under a
  future Rust-centered runtime.
- Release topology for mixed TypeScript and Rust artifacts.

## Recommendation

Proceed to focused enterprise RFC naming only after adding the corrected Phase
0 and cross-cutting acceptance gates. RFC names should describe the owner
contract, not the technology or managed product.
