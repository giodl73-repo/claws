# Layering RFC Portfolio Review - 2026-07-10

## Shared Model

The portfolio has four foundational host/runtime contracts, not four isolated
frameworks:

| Contract                            | Host decision                             | OpenClaw authority                                               | Lobster authority                                               |
| ----------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------------- |
| Readiness and Hosting Profiles      | May this instance receive work?           | Conditions, aggregation, profiles, packaged profile evidence     | Selected/expected profile and artifact, rollout, fleet response |
| Managed Configuration               | What configuration governs this runtime?  | Schema, authority, composition, validation, effective generation | Managed values, tenant/operator inputs, rollout                 |
| Duplex Transport and Host Providers | How may the runtime call its host?        | Peer role, typed providers, permissions, bounds, failures        | Provider implementations, tenant routing, service backends      |
| Runtime State Continuity            | Can this state continue safely elsewhere? | State ownership, consistency, manifests, fencing, restore        | Storage, encryption, retention, placement, retry policy         |

OCC may produce desired state for these contracts. AgentHarness remains the
execution-event protocol. Neither belongs in the runtime hot path created by
this portfolio.

## Review Changes

### Readiness

- Reconciled startup activation into explicit conditions for effective config,
  required plugins, secrets, and model routing.
- Added artifact identity, selected-profile conformance, and expected-artifact
  conditions instead of creating a compatibility framework.
- Added the minimal packaged conformance record and clarified that readiness
  reads immutable metadata rather than rerunning tests.
- Kept restore compatibility in Runtime State Continuity.

### Managed Configuration

- Defined one explicit managed-source reference with immutable identity and
  optional digest.
- Added transactional effective generations and stale-write rejection.
- Added equivalence and rollback conformance.
- Added a host deletion gate for fragment generators and config rewrites.

### Duplex Transport

- Kept the proposal as an extension of OpenClawTransport/Gateway peer
  invocation, not a second transport.
- Added deterministic route selection, overload/backpressure bounds, and retry
  constraints.
- Added a semantic ProxyPipe decomposition and deletion gate; private envelopes
  are never tunneled wholesale through host.invoke.

### Runtime State Continuity

- Reframed the RFC around the complete state contract rather than shutdown.
- Added a mandatory component descriptor and writer-accounting rules.
- Bound checkpoint, publication, restore, and destruction to runtime generation
  plus manifest/watermark identity.
- Added host persistence deletion proof and dual-publication limits.

## Remaining Evidence Gates

1. Execute the readiness package-installed Docker matrix and produce a real
   conformance record.
2. Complete the Lobster baked-leaf inventory and Managed Configuration
   equivalence prototype.
3. Select the first portable unary host provider and prove it through the
   existing OpenClaw transport in TypeScript and Rust.
4. Complete the state path/writer inventory before selecting one global
   generation or component watermarks.
5. Turn every mapped workaround into a concrete Lobster removal PR tied to a
   minimum OpenClaw release.
