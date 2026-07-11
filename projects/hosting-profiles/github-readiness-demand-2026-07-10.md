# GitHub Readiness Demand Research

Date: 2026-07-10

## Finding

OpenClaw issues do not currently ask for a feature named "hosting profiles" or
for an unrestricted user-authored readiness DSL. They do repeatedly ask for
the underlying contract: readiness must incorporate additional runtime facts,
distinguish core admission from optional capability health, and project one
truthful result into container and service-manager probes.

Profiles are the synthesis that prevents each report from adding another ad
hoc branch to `/readyz`. They select a supported, release-tested composition of
reusable OpenClaw-owned criteria.

## Direct Evidence

| Issue | Operator failure | Contract implication |
| --- | --- | --- |
| [#96084](https://github.com/openclaw/openclaw/issues/96084) | `/readyz` remains healthy when a PVC-backed workspace is full and runtime writes fail with `ENOSPC`. | Add a workspace-writable status fact and criterion with a stable failure reason. This is the clearest direct request to extend readiness. |
| [#78136](https://github.com/openclaw/openclaw/issues/78136) | Docker reports healthy and ready while the command queue remains draining and rejects model work. | A listening process is insufficient; admission/drain state must be a required criterion. |
| [#73652](https://github.com/openclaw/openclaw/issues/73652) | The Gateway accepts connections before internal startup is ready, producing handshake timeouts. | Readiness must represent the startup admission boundary and remain distinct from liveness. |
| [#78954](https://github.com/openclaw/openclaw/issues/78954) | Plugin/channel sidecars can block reaching a usable core Gateway state. | Conditions need required versus advisory classification; optional capabilities must remain visible without always removing the workload from service. |
| [#43886](https://github.com/openclaw/openclaw/issues/43886) | A Docker Gateway configured for LAN still listens on loopback. | The container profile should evaluate effective bind state, not merely configured intent. |
| [#101083](https://github.com/openclaw/openclaw/issues/101083) | IRC is reported healthy while permanently retrying a fatal login failure. | Plugins/channels need truthful status evidence that profiles may expose as advisory or require for a specialized profile. |
| [#66512](https://github.com/openclaw/openclaw/issues/66512) | systemd `Type=simple` declares startup before the Gateway is ready. | Keep one canonical evaluation and add host projections such as `/readyz` or `sd_notify`; do not duplicate host-specific readiness logic. |
| [#91795](https://github.com/openclaw/openclaw/issues/91795) | Multi-tenant operators cannot identify the running version through a stable endpoint. | Operator identity belongs in status/health metadata, not in the boolean readiness calculation. |

Additional reports reinforce the same distinction: Docker cold starts can be
falsely marked unhealthy (#75701), a listening Windows Gateway can be
unresponsive (#86031), and delivery recovery can run before its channel
transport is ready (#91212).

## Extensibility Boundary

The issue evidence supports a reusable built-in criterion registry now. It does
not yet support allowing arbitrary configuration to assert custom criteria as
healthy.

A new OpenClaw-owned criterion should require:

1. A named status fact with explicit ownership.
2. A pure evaluator from that fact to `True`, `False`, or `Unknown`.
3. A stable reason code and required/advisory classification in a profile.
4. Unit tests for every truth state and aggregation behavior.
5. HTTP tests proving `/ready` and `/readyz` status, body, and redaction.
6. A packaged Docker scenario proving the selected profile transitions between
   not-ready and ready for the real failure and recovery.

Later host/plugin/driver criteria need a trusted evidence-provider contract:
provider identity, criterion namespace ownership, observation timestamp,
freshness limit, and fail-closed handling for missing or stale evidence. Until
that exists, custom profile composition may reference only criteria OpenClaw
can evaluate itself.

## How An Operator Knows It Works

The runtime proof chain is:

```text
runtime fact changes
  -> status field changes
  -> named criterion changes
  -> profile aggregation changes
  -> /ready and /readyz return the expected HTTP result
  -> the container/service manager admits or removes the workload
```

Release conformance should execute this chain from an installed package for
every built-in profile. That is stronger than testing a response fixture: it
makes each shipped profile a concrete support and release promise.
