# EnterpriseClaw Contract Portfolio

These are non-normative architectural contract scopes. Focused OpenClaw RFCs
are the intended review and adoption mechanism. The contracts are the durable
design artifacts; RFCs propose them upstream.

The portfolio contains **34 RFC scopes**, consolidated from 48 raw contract
candidates.

All scopes follow the shared commandments and review grammar in
`../contract-principles.md` and the common interface/state-machine mechanics in
`../contract-interface-patterns.md`. Recurring anti-patterns are cataloged in
`../contract-pitfalls.md`.

The portfolio-wide evidence inventory and evidence-ready gate live in
`../evidence-base/`. Contract quality, evidence maturity, specialist depth,
and implementation readiness are tracked separately.

## Scope Rules

Each RFC should:

- have one primary owner or relationship;
- improve ordinary OpenClaw independently of EnterpriseClaw;
- define explicit exclusions;
- include failure, compatibility, migration, and evidence expectations;
- identify an existing workaround, inference, patch, or implementation to
  delete; and
- remain implementable by TypeScript, Rust, or another conforming runtime
  where language neutrality matters.

## Portfolio

| ID | RFC scope | Lane | Initial posture |
| -- | --------- | ---- | --------------- |
| EC-001 | Owner State Projection | Experience | Fork + RFC |
| EC-002 | Diagnostic and Repair Plans | Experience | Fork + RFC |
| EC-003 | Credential Runtime Binding | Identity/trust | Fork + RFC |
| EC-004 | Authorization and Approval Decisions | Identity/trust | Fork + RFC |
| EC-005 | Trust Revocation and Federation | Identity/trust | Fork + RFC |
| EC-006 | Effective Configuration Generations | Configuration | Fork + RFC |
| EC-007 | Owner Readiness Observations | Configuration | Fork + RFC |
| EC-008 | Run and Attempt Bindings | Agent runtime | Fork + RFC |
| EC-009 | Delegated Execution Lifecycle | Agent runtime | Fork + RFC |
| EC-010 | Scheduled Activation Lifecycle | Agent runtime | Assess/Fork + RFC |
| EC-011 | Provider Candidate Attempts | Models/providers | Fork + RFC |
| EC-012 | Usage and Cost Reconciliation | Models/providers | Fork + RFC |
| EC-013 | Capability Surface Negotiation | Actions/tools | Fork + RFC |
| EC-014 | Authorized External Effects | Actions/tools | Fork + RFC |
| EC-015 | Conversation Identity | Messaging/channels | Fork + RFC |
| EC-016 | Delivery Settlement | Messaging/channels | Fork + RFC |
| EC-017 | Session Continuity and Export | Knowledge/continuity | Fork + RFC |
| EC-018 | Context Assembly Contract | Knowledge/continuity | Fork + RFC |
| EC-019 | Memory Scope and ACL | Knowledge/continuity | Fork + RFC |
| EC-020 | Memory Corpus Lifecycle | Knowledge/continuity | Fork + RFC |
| EC-021 | Owner Checkpoints and Restore | Knowledge/continuity | New composition contract |
| EC-022 | Protocol Negotiation and Evolution | Runtime protocols | Fork + RFC |
| EC-023 | Streaming, Cancellation, and Replay | Runtime protocols | Fork + RFC |
| EC-024 | Node Pairing and Trust | Nodes/edge | Fork + RFC |
| EC-025 | Remote Node Invocation | Nodes/edge | Fork + RFC |
| EC-026 | Rust Node Runtime Profile | Nodes/edge | New component contract |
| EC-027 | Extension Capability Metadata | Extensibility/release | Fork + RFC |
| EC-028 | Artifact Trust and Provenance | Extensibility/release | Fork + RFC |
| EC-029 | Release Activation and Recovery | Extensibility/release | Fork + RFC |
| EC-030 | Data Lifecycle Obligations | Governance/resources | Fork + RFC |
| EC-031 | Resource Admission and Usage | Governance/resources | Fork + RFC |
| EC-032 | Hosting Lifecycle and Readiness | Operations/fleet | Fork + RFC |
| EC-033 | Evidence, Audit, and Attestation | Operations/fleet | Fork + RFC |
| EC-034 | Fleet Convergence and Containment | Operations/fleet | New projection/relationship |

## Suggested Waves

### Wave 1: September and replacement foundations

- EC-006 Effective Configuration Generations
- EC-007 Owner Readiness Observations
- EC-014 Authorized External Effects
- EC-019 Memory Scope and ACL
- EC-020 Memory Corpus Lifecycle
- EC-022 Protocol Negotiation and Evolution
- EC-023 Streaming, Cancellation, and Replay
- EC-024 Node Pairing and Trust
- EC-025 Remote Node Invocation
- EC-026 Rust Node Runtime Profile
- EC-029 Release Activation and Recovery

### Wave 2: runtime and ecosystem hardening

- EC-003 Credential Runtime Binding
- EC-004 Authorization and Approval Decisions
- EC-008 Run and Attempt Bindings
- EC-009 Delegated Execution Lifecycle
- EC-011 Provider Candidate Attempts
- EC-012 Usage and Cost Reconciliation
- EC-013 Capability Surface Negotiation
- EC-016 Delivery Settlement
- EC-027 Extension Capability Metadata
- EC-028 Artifact Trust and Provenance
- EC-032 Hosting Lifecycle and Readiness

### Wave 3: managed composition and remaining foundations

- EC-001 Owner State Projection
- EC-002 Diagnostic and Repair Plans
- EC-005 Trust Revocation and Federation
- EC-010 Scheduled Activation Lifecycle
- EC-015 Conversation Identity
- EC-017 Session Continuity and Export
- EC-018 Context Assembly Contract
- EC-021 Owner Checkpoints and Restore
- EC-030 Data Lifecycle Obligations
- EC-031 Resource Admission and Usage
- EC-033 Evidence, Audit, and Attestation
- EC-034 Fleet Convergence and Containment

## Reviews

- `wave-1-role-review-2026-08-01.md`
- `wave-1-meta-alignment-2026-08-01.md`
- `wave-2-role-review-2026-08-01.md`
- `wave-2-meta-alignment-2026-08-01.md`
- `wave-3-role-review-2026-08-01.md`
- `wave-3-meta-alignment-2026-08-01.md`
- `portfolio-meta-alignment-2026-08-01.md`
- `portfolio-review-2026-08-01.md`
