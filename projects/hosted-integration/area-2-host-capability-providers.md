# Area 2: Host Capability Providers

## Frame

### Problem

An isolated runtime may be unable or unauthorized to directly access network,
secret, storage, publication, or telemetry backends. OpenClaw still needs a
portable interface to those capabilities.

### Thesis

OpenClaw subsystems consume typed capability interfaces. Deployments select a
local or hosted binding without changing consumers. Interface ownership stays
with the subsystem that understands the semantics.

### Invariant

The provider location is not observable to ordinary consumers except through
portable availability, result, and failure semantics.

The semantic owner defines the capability. A deployment selects an
owner-supported binding such as environment, file, process, direct network,
proxy, plugin, or hosted provider. These are binding profiles, not one shared
provider protocol.

### V1 Boundaries

Leading capabilities:

- secret resolution;
- provider-request dispatch;
- publication after continuity semantics exist; and
- telemetry export where current sinks are insufficient.

These are evidence-backed capability families, not a closed global catalog.
New capabilities require a semantic owner, an existing consumption seam, a
portable local binding, conformance evidence, and a concrete workaround
deletion target.

Do not reclassify:

- Gateway approvals;
- Channel ingress or outbound delivery;
- AgentHarness execution;
- lifecycle administration; or
- arbitrary plugin product services.

### Deletion Target

The first deletion-bearing provider should replace ProxyPipe brokered egress
tags 1-5 and duplicate request correlation, cancellation, retry
classification, and transport code.

### Disproof

No new provider interface is justified when an existing OpenClaw seam can be
bound through environment, file, exec, proxy, socket, or plugin configuration
with less machinery.

## Audit

### Secret providers

OpenClaw already supports `env`, `file`, and `exec` SecretRef providers with:

- stable references;
- configured provider aliases;
- path and command security;
- timeouts and byte limits;
- batching and concurrency bounds;
- plugin-managed exec integrations; and
- strict unresolved-secret failures.

This is the strongest internal precedent. A hosted secret implementation should
extend this model, not introduce a Gateway `host.secrets.resolve` API.

### Provider requests

OpenClaw already owns:

- request authentication;
- headers;
- proxy and TLS configuration;
- SSRF policy;
- guarded fetch;
- response limits;
- retry hints; and
- stream normalization.

The plausible missing interface is the final dispatch operation beneath that
policy. OpenClaw owns the logical destination, allowed origins, credentials
policy, and semantic request. Host governance may only further restrict it.
The provider binding owns physical route/backend selection and execution within
the authorized destination.

The current ProxyPipe egress path is not merely transport. Lobster also performs
runtime identity lookup, destination allowlisting, approval checks, provider
selection, credential injection, quota enforcement, selected retries,
telemetry, and response-stream transformations. A hosted dispatcher must not
inherit that entire handler. Each concern remains with its semantic owner or
becomes an explicit host policy/capability contract.

The portable dispatcher shape is:

```text
OpenClaw semantic request
  -> Area 1 traffic-policy intersection
  -> prepared final-dispatch request
  -> selected local or hosted dispatcher
  -> response or structured dispatch failure
  -> OpenClaw semantic response handling
```

A provider HTTP status remains a response, not a dispatcher failure.
Dispatcher failures distinguish denied, unavailable, overloaded, stale,
cancelled, timed out, failed-before-send, possibly-sent/unconfirmed, bounded
response violation, and protocol violation.

An ordinary HTTP proxy or service mesh is preferred when it can preserve the
existing guarded-fetch behavior. A hosted dispatcher is justified only when
the host must physically execute the request, materialize a declared
host-owned credential, reach a host-only network, or select an approved
host-owned backend.

### AgentHarness

AgentHarness proves that OpenClaw can define a typed execution interface while
allowing different runtimes. It also demonstrates the importance of keeping
core-owned policy inputs separate from implementation-owned execution.

### Channels

Channel adapters demonstrate that one "provider" should not absorb every
external integration. Messaging has enough domain behavior to retain its own
contract.

## Compare

| Comparator                  | Reuse                                                                                     | Avoid                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| WASI component host imports | Explicit requested capabilities, host-granted implementation, versioned typed interface   | Binding everything statically when optional runtime changes are needed |
| Kubernetes CSI/CNI/CRI      | Independent capability specifications, plugin conformance, orchestrator-selected provider | Highly privileged plugins with weak tenant isolation                   |
| Dapr building blocks        | Simple per-capability APIs and configurable backends                                      | One sidecar becoming the mandatory lowest-common-denominator runtime   |
| OpenClaw SecretRef          | Multiple provider bindings behind one consumer model                                      | Treating all capabilities as secret-shaped key/value lookup            |
| OpenClaw AgentHarness       | Core policy plus implementation-specific execution                                        | Letting implementations silently change provider or delivery semantics |

## Evaluate

### Runtime owner

Provider calls must be bounded, async, and isolated. A slow provider cannot
starve Gateway or agent execution control traffic.

### Host operator

Providers require explicit configuration, required/optional posture, health,
generation, and actionable failures.

### Security

Permissions are per capability and operation. Subject context is derived from
trusted runtime state. Secrets and request bodies use interface-specific
redaction.

Ordinary consumers receive portable domain failures such as unavailable,
denied, or timed out. Carrier, credential, incarnation, and generation causes
remain available to operators through status and provenance rather than
leaking provider location into consumer logic.

### Simplicity

Add providers only at existing seams. Do not introduce a universal host method
registry.

## Slice

`area-2-provider-dispatch-contract.md` defines the completed paper evidence
slice. The dispatcher performs one redirect-disabled exchange beneath the
guarded-fetch loop. Streaming is part of V1, DNS/SSRF enforcement occurs where
the selected dispatcher physically resolves and connects, and host credentials
use declared header slots rather than arbitrary mutation.

No implementation is authorized by this design slice.

## Resolved Exact Boundary

- OpenClaw keeps the redirect loop, cross-origin header rewriting, semantic
  retry, and response interpretation.
- The dispatcher executes one redirect-disabled hop.
- OpenClaw defines the network guard profile; the dispatcher enforces it where
  DNS resolution and connection occur.
- Managed host-only destinations require explicitly authorized private
  origins/CIDRs in that binding's guard profile; equivalence is measured using
  the same profile, not by forcing every binding to reach the same network.
- Host credentials use origin-scoped declared header slots.
- Request and response streaming, bounds, credit, half-close, cancellation, and
  dispatch certainty are V1 conformance requirements.
- One-shot request streams are not silently buffered for body-preserving
  redirects.
- Approval, quota, product allowlists, provider selection, retries, and
  semantic telemetry do not enter the portable dispatcher.
