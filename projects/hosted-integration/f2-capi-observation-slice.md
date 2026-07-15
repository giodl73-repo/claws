# F2 CAPI Mixed-Version Observation Slice

## Frame

### Thesis

Before retiring CAPI's legacy ProxyPipe path, Lobster needs one redacted,
side-effect-free observation that proves a promoted OpenClaw artifact and the
host-provider candidate produce the same recorded request/response bytes while
showing every remaining removal blocker.

The first slice is exact to CAPI. It does not introduce a generic rollout
framework and cannot change request authority.

### V1 boundaries

- Compare recorded fixtures, synthetic probes, or explicitly replay-safe input.
- Record only versions, generations, SHA-256 fingerprints, rollout phase,
  old-path-use count, and compatibility-window state.
- Keep `CapiCanaryAuthority` as the only single-writer authority controller.
- Do not mirror live side-effecting provider traffic.
- Do not declare removal-ready while the compatibility expiry is absent, the
  rollback window remains open, old-path use is nonzero, or parity mismatches.

### Deletion target

Unlock F3 removal of CAPI's obsolete ProxyPipe framing, buffering, inflight
correlation, refresh compatibility, and old provider-selection fallback.

### Disproof

Reject this shape if useful parity requires retaining request/response content,
if the observation can accidentally grant authority, or if a mismatch cannot
identify the exact version/generation pair without secrets.

## Audit

Source-backed facts:

- D2b already has one single-writer `CapiCanaryAuthority`, explicit rollback,
  redacted transition correlation, composition/bundle/policy generations, and
  structured readiness findings.
- D2b's prepared canary is not production-wired; F2 can observe synthetic
  evidence without duplicating a live provider call.
- Lobster remains pinned to OpenClaw `v2026.5.28`; D2a requires the later
  `2026.6.11` owner contract.
- F1 alone cannot host F2 because it has no adopted binding. D2b is the first
  honest branch base.

Hypothesis:

- One immutable CAPI observation snapshot can cover parity plus removal gates
  without adding a runtime service, persistence layer, or generic carrier.

## Compare

| Comparator | Classification | Lesson |
| --- | --- | --- |
| Host composition status and Doctor findings | Reuse | Keep deterministic structured status and stable blocker reasons. |
| CAPI canary authority and rollback | Reuse | Observation reports authority but never owns it. |
| Carrier owner/bundle generation fencing | Adapt | Include both generations in each fingerprint and reject malformed values. |
| Kubernetes rollout revisions/status/rollback | Adapt | Expose versioned progress and explicit rollback/expiry gates rather than silently aging out compatibility. |
| Istio request mirroring | Avoid for writes | Mirroring is fire-and-forget and duplicates side effects; use recorded or synthetic probes only. |
| Generic fleet rollout framework | Avoid in V1 | One CAPI slice is enough to test the deletion gate. |

Primary references:

- Kubernetes Deployments and rollout status:
  <https://kubernetes.io/docs/concepts/workloads/controllers/deployment/>
- Istio traffic mirroring:
  <https://istio.io/latest/docs/tasks/traffic-management/mirroring/>

## Evaluate

- Runtime-owner finding: observation must be a pure value comparison with no
  dispatcher, token resolver, network client, or background task.
- Container-operator finding: one snapshot must state phase, versions,
  generations, parity, old-path count, rollback-window state, expiry state, and
  the exact reason removal remains blocked.
- Security finding: serialize only normalized identifiers and digests; reject
  malformed fingerprints and never retain request/response bytes.
- Simplicity finding: keep the contract named for CAPI. Generalize only after a
  second binding proves identical rollout evidence.

## Slice

1. Add one CAPI observation fixture contract to `lobster-host-provider`.
2. Compare legacy and candidate request/response SHA-256 fingerprints.
3. Emit matched or mismatched structured status with deterministic blockers.
4. Prove the observer cannot change `CapiCanaryAuthority`.
5. Keep compatibility expiry unconfigured until OpenClaw promotion chooses the
   real fleet deadline; this must remain a visible removal blocker.
