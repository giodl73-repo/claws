# EnterpriseClaw Technology Fit Framework

## Purpose

Use this framework after a swim lane's architectural goal and ownership
boundary are stable. It helps determine whether an existing OpenClaw
capability, adjacent project, external technology, or new component belongs in
the target architecture.

It is not a product comparison scorecard. Architectural fit comes before
feature count.

## Evaluation Order

1. **Owner fit** - does the candidate preserve the lane's semantic owner?
2. **Contract fit** - can it express required inputs, outputs, lifecycle,
   failure, compatibility, and evidence?
3. **Trust fit** - are identity, authority, secrets, isolation, and revocation
   explicit?
4. **Operational fit** - can it be observed, upgraded, recovered, and removed?
5. **Profile fit** - does it support local mode without managed dependencies?
6. **Evolution fit** - can owners and protocols evolve independently?
7. **Simplification fit** - what inference, adapter, script, or duplicate state
   does it delete?

A candidate that fails owner fit should normally be rejected even if it has
strong features.

## Scoring

Score each dimension from `0` to `3`.

| Score | Meaning |
| ----- | ------- |
| 0 | Contradicts the architecture or transfers ownership incorrectly |
| 1 | Major gaps; viable only with invasive adaptation |
| 2 | Partial fit; bounded adaptation required |
| 3 | Natural fit with clear owner and lifecycle alignment |

| Dimension | Question |
| --------- | -------- |
| Ownership | Does canonical state remain with the correct owner? |
| Contract completeness | Are lifecycle, failure, compatibility, and evidence explicit? |
| Trust | Are authority, isolation, secret handling, and revocation adequate? |
| Local profile | Can personal/local operation remain complete and understandable? |
| Managed profile | Can policy, fleet, audit, and lifecycle obligations compose around it? |
| Operability | Are readiness, diagnostics, upgrade, recovery, and deletion supported? |
| Evolution | Can mixed versions and independent owner changes be handled? |
| Simplification | Does adoption remove more complexity than it adds? |

Maximum score: `24`.

Scores support comparison but do not override a blocking ownership or security
contradiction.

## Dispositions

### Reuse

Use the existing owner and substantially existing contract.

### Adapt

Keep the existing owner or technology, but add or separate bounded contracts.

### New

Introduce a missing component only when no current owner can provide the
capability without becoming incoherent.

### Avoid

Reject candidates that centralize canonical state, flatten owner semantics,
make enterprise infrastructure mandatory, or create more coordination than
they remove.

### Assess

Record an unresolved candidate without implying architectural preference.

## Candidate Worksheet

| Field | Entry |
| ----- | ----- |
| Lane and architectural need | |
| Candidate | |
| Candidate owner | |
| Canonical state introduced | |
| Existing owner state affected | |
| Required adapters | |
| Lifecycle and deletion | |
| Trust and authority | |
| Failure and recovery | |
| Compatibility and upgrade | |
| Local-mode behavior | |
| Managed-mode behavior | |
| Simplification/deletion target | |
| Blocking contradictions | |
| Scores | |
| Disposition | |
| Evidence still required | |

## Portfolio Starting Point

| Lane | Existing foundation | Likely architectural work | New technology threshold |
| ---- | ------------------- | ------------------------- | ------------------------ |
| Experience and administration | CLI, Control UI, Doctor, catalog, localization | Consistent owner/generation/certainty projection | Only for a missing presentation capability, never canonical runtime state |
| Identity, authority, and trust | Credentials, policies, approvals, pairing | Bind authority generations to consumed invocations | Federation or assurance capability cannot be expressed by owner adapters |
| Configuration and activation | Config owner, managed-config work, readiness | Accepted/active/ready/converged generations | Fleet coordination cannot remain a projection |
| Agent runtime and orchestration | Runs and delegated execution | Durable bindings, settlement, scheduling boundaries | Independent scheduling lifecycle proves a distinct owner |
| Models, providers, and compute | Provider routing and call diagnostics | Candidate-attempt identity and usage reconciliation | Required brokerage cannot preserve provider/request identity |
| Actions, tools, and integrations | Tools, MCP, approvals, host bindings | Authority-to-effect correlation | Missing effect-owner protocol cannot be adapted safely |
| Conversations, channels, and delivery | Messaging core and channel owners | Delivery certainty and lifecycle correlation | New channel class requires genuinely different owner semantics |
| Knowledge, context, and continuity | Sessions, context engine, memory, workspace, snapshots | Copy/lifecycle and recovery composition | Cross-owner recovery cannot be achieved through owner checkpoints |
| Runtime fabric and protocols | Gateway, ACP, MCP transports | Negotiation, replay, cancellation, and evolution contracts | Existing transports cannot meet trust or compatibility requirements |
| Nodes, devices, and edge | Node gateway, pairing, Rust-node exploration | Public invocation trust and settlement | New edge runtime class has independent lifecycle constraints |
| Extensibility, artifacts, and release | Plugins, skills, catalogs, installers, update paths | Trust, compatibility, activation, and recovery composition | Missing artifact or promotion capability cannot remain owner-neutral |
| Data governance and resource control | Owner cleanup and local resource guards | Obligations, per-owner settlement, admission and usage correlation | Required policy capability has no coherent existing owner |
| Operations, assurance, and fleet | Hosting, readiness, Doctor, signals concepts | Fleet posture, containment, audit, and partial convergence | Scale or assurance needs cannot be met through owner projections |

## Decision Rule

Prefer:

```text
reuse an owner
+ adapt one bounded contract
+ delete inference or workaround code
```

over:

```text
introduce a platform
+ mirror owner state
+ add synchronization and migration
```
