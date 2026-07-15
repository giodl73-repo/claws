# Host Provider Comparison Matrix

## Internal Analogues

| Analogue | Useful property | Decision |
| --- | --- | --- |
| SecretRef env/file/exec providers | Capability-specific contract with multiple bindings, strict resolution, limits, and plugin integration | Reuse |
| Provider request policy and guarded fetch | Central policy remains independent from proxy/TLS/dispatcher implementation | Adapt with a host-supplied dispatcher binding |
| Channel plugin adapters | Separate inbound, outbound, security, lifecycle, status, and capability surfaces | Reuse; do not flatten into host RPC |
| AgentHarness registry | Runtime-specific execution interface with core-owned policy inputs | Reuse; remote transport remains an implementation |
| `node.invoke` | Correlation, timeout, disconnect, connection binding, late-result handling | Adapt internally for a remote binding only |
| `OpenClawTransport` | Minimal public SDK client abstraction over Gateway request/events | Preserve; avoid for host capability provision |

## External Comparators

| System | Useful precedent | Negative precedent | ClawBus implication |
| --- | --- | --- | --- |
| Kubernetes CRI/CNI/CSI | Capability-specific interfaces are owned independently from workload application protocols; platform selects implementations and manages lifecycle | Broad node plugins can become privileged operational dependencies | Define separate provider contracts and explicit admission; do not make Gateway the capability catalog |
| WASI Component Model host imports | Guest declares typed imports; host grants only explicit capabilities; bindings are attached to an instance | Static import models can be too rigid for optional runtime services | Treat provider availability as declared capability with clear required/optional behavior |
| Dapr building blocks | Explicit sidecar APIs for secrets, state, invocation, and bindings can support multiple backends | A universal sidecar API adds hops and lowest-common-denominator abstractions | Reuse only the explicit-building-block idea; avoid a generic host API or mandatory sidecar |
| Envoy external processing | Transparent ingress/egress policy and monitoring belong at the network boundary | Interception is opaque and unsuitable for secrets, storage, or semantic application services | Keep transparent mediation separate from explicit host-provider calls |

Primary references:

- <https://kubernetes.io/docs/concepts/containers/container-runtime-interface/>
- <https://github.com/containernetworking/cni/blob/main/SPEC.md>
- <https://github.com/container-storage-interface/spec/blob/master/spec.md>
- <https://github.com/WebAssembly/component-model/blob/main/design/mvp/Explainer.md>
- <https://docs.dapr.io/developing-applications/building-blocks/>
- <https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/ext_proc_filter>

## Result

The stable abstraction is one host integration bundle supplying
owner-defined integration and capability implementations. Owner config selects
typed IDs, Hosting Profiles aggregates owner readiness evidence, and carrier
choice remains owner-local. V1 does not retain a multiplexed ClawBus.

The cheapest first proof is no longer "invent one host RPC." It is:

1. select one existing interface;
2. add a second binding that can live outside the container;
3. run the same conformance fixtures against local and hosted implementations;
4. delete the corresponding ProxyPipe handler and retry/correlation code.

## Provider-Dispatch Comparison

| Comparator | Reuse | Adapt | Avoid |
| --- | --- | --- | --- |
| OpenClaw guarded fetch | Manual redirects, per-hop policy, cross-origin header stripping, deadlines, response limits | Extract the single redirect-disabled exchange as the dispatcher seam | Moving redirect and semantic retry ownership into the host |
| OpenClaw SecretRef | Typed provider aliases, strict missing-provider errors, bounded resolution, provider/ref-scoped diagnostics | Use named credential slots resolved by the selected host binding | Treating arbitrary headers as secret-provider requests |
| OpenClaw capability registries | Manifest-declared IDs, owner-specific provider types, explicit lookup | Add a provider-request dispatcher contribution owned by provider request | A universal host method registry |
| OpenClaw AgentHarness | Typed implementation registry, owner policy separated from runtime execution | Reuse lifecycle and ownership ideas only | Reusing harness execution or reset semantics for HTTP dispatch |
| Lobster ProxyPipe tags 1-5 | Bidirectional streaming, cancellation signal, request correlation | Preserve only the behavior in dispatcher/carrier conformance | Preserving the frame union, pipe-wide queues, or mixed semantic handler |
| Lobster forwarding core | Host-only route reachability and credential materialization | Convert credentials to declared slots and routing to a typed route profile | Importing approvals, product allowlists, quotas, retries, provider selection, or response rewriting into the portable dispatcher |
| Envoy external processing | Bounded streaming and rejected mutation telemetry | Reuse explicit stream accounting concepts | A processor allowed to rewrite arbitrary request/response semantics |
| Dapr secrets | Named backend selection and scoped secret access | Keep capability-specific configuration | One mandatory sidecar API for unrelated capabilities |
| Kubernetes device plugins | Namespaced registration, version negotiation, health separate from workload request | Re-register and re-admit after host generation changes | Privileged generic plugins or resource-allocation semantics |
| WASI component interfaces | Versioned typed imports and explicit host grants | Reuse interface-specific least privilege | Static whole-runtime binding as the only deployment model |

### Comparison decision

The dispatcher is a **single redirect-disabled HTTP exchange**, not a complete
fetch stack and not a generic host callback. OpenClaw keeps the redirect loop,
method rewriting, cross-origin header policy, semantic retry, and response
interpretation. The selected dispatcher owns physical resolution and network
execution for one already-authorized hop under an OpenClaw-defined guard
profile.
