# RFC Scope: Hosting Lifecycle and Readiness

- ID: EC-032
- Lane: Operations, assurance, and fleet
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Host controller owns start, drain, stop, restart, and recovery
  orchestration. Runtime owners retain readiness meaning and contribute
  generation-bound conditions.

## Scope

- Define hosting profile, start, initialization ordering, ready, drain, stop,
  restart, recovery, resource budget, and owner-contributed conditions.

## Explicit Exclusions

- Process existence as readiness.
- Host ownership of runtime semantics.
- Runtime resource admission and usage reconciliation, owned by EC-031.

## Required Outcomes

- Deployment profiles declare startup, memory, CPU, network, and recovery.
- Deployment budgets are accounted within the containing service/container.
- Readiness reflects owner-contributed ability to serve requests for the active
  generation, not process existence or cargo-cult probes.
- Sidecar/supervisor failure degrades transparently where safe.
- Reconnect and retry of in-flight host requests are idempotent.
- Start, drain, stop, restart, and recovery commands persist authoritative
  acceptance before acknowledgement and reconcile idempotently across
  host/controller restart before retry.
- Deployment profiles declare supported host/runtime/sidecar version
  combinations, upgrade order, and explicit unsupported/degraded results.
- Start, ready, drain, stop, restart, and recovery transitions emit
  owner/generation/time/reason/outcome evidence.
- Failed, partial, timed-out, and unknown lifecycle transitions preserve the
  last authoritative state and remain diagnosable.
- Existing host scripts migrate behind the lifecycle contract before deletion;
  unsupported or unknown lifecycle state remains explicit.

## Dependencies

- EC-007 and EC-022.

Release activation consumes this hosting lifecycle contract.

## Proof and Deletion Gate

- Cold-start and recover a mixed-process Scout deployment.
- Delete host scripts that guess component readiness/order.
- Disprove the separate contract if existing hosting/runtime owners already
  express start/ready/drain/recovery, owner-contributed conditions, budgets,
  version compatibility, and restart reconciliation without readiness-by-script
  inference or a separate lifecycle owner.
