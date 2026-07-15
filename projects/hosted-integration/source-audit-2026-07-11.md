# ClawBus And Host Provider Source Audit

## Corrected Question

OpenClaw has two related but independent hosted problems:

1. a host wires, governs, and observes canonical ingress and egress points; and
2. an isolated OpenClaw runtime consumes explicit capabilities supplied by its
   host.

The previous ClawBus draft blurred those boundaries by extending
`OpenClawTransport` into a general hosted session. The source does not support
that ownership model.

## `OpenClawTransport` Intent

`packages/sdk/src/types.ts` defines `OpenClawTransport` as the minimal transport
consumed by the public app SDK:

```ts
request(method, params, options)
events(filter)
close?()
```

`packages/sdk/src/client.ts` uses it behind the high-level `OpenClaw` client.
`packages/sdk/src/transport.ts` adapts the lower-level Gateway WebSocket client
to that interface. Tests substitute a fake transport to exercise SDK behavior
without a real Gateway.

The introducing commit, `43f6c8b01aa` (`feat: add OpenClaw SDK package`),
describes a public app SDK layered over a generated Gateway client. Its stated
boundary is:

- Gateway owns the public protocol;
- the plugin SDK owns in-process extensions;
- ACP owns external harness interop; and
- managed environments are a separate provider layer.

Therefore `OpenClawTransport` is a **client-to-Gateway abstraction**. It is not
the runtime's host capability interface and should not acquire provider
registration, reverse callbacks, Channel ingress, or AgentHarness streams.

## Existing Host-Capability Analogues

### Secrets

`src/config/types.secrets.ts` already defines explicit secret provider
configuration for `env`, `file`, and `exec` sources. `src/secrets/resolve.ts`
selects a configured provider, applies source-specific validation and bounds,
and resolves requested references. Plugin integrations can materialize an exec
provider without changing the consuming secret contract.

Classification: **reuse**. A managed host binding should implement or extend
the existing secret-provider seam rather than add `host.secrets.resolve` as an
unrelated Gateway method.

### Provider egress

`src/config/types.provider-request.ts`,
`src/agents/provider-request-config.ts`, and
`src/agents/provider-transport-fetch.ts` already centralize provider request
auth, headers, proxy, TLS, SSRF policy, timeouts, bounded response handling, and
stream normalization.

Classification: **adapt**. The missing host seam is a transport/dispatcher
binding beneath the existing provider request policy, not a generic arbitrary
HTTP RPC method.

### Channels

`src/channels/plugins/types.plugin.ts` and
`src/channels/plugins/outbound.types.ts` define capability-specific adapters
for configuration, security, inbound conversation semantics, outbound
delivery, acknowledgements, presentation limits, lifecycle, and status.

Classification: **reuse**. Hosted ingress and egress should bind Channel
adapters; they should not become generic host-provider methods.

### Agent harnesses

`docs/plugins/sdk-agent-harness.md` explicitly distinguishes native execution
runtimes from ordinary model-provider transport and keeps provider selection,
workspace policy, transcript behavior, and delivery ownership in core.

Classification: **reuse and keep separate**. A remote carrier may implement an
AgentHarness binding, but ClawBus must not own harness payload semantics.

### Peer invocation

`src/gateway/node-registry.ts` proves correlated Gateway-to-peer unary
invocation, timeout, disconnect cleanup, route-change rejection, and late
result handling.

Classification: **adapt only as transport machinery**. It may help implement a
remote host-provider binding, but it does not prove that host providers belong
to Gateway or `OpenClawTransport`.

## Corrected Ownership Model

```text
Host integration and traffic governance
  OpenClaw SDK
    OpenClawTransport
      Gateway request + event protocol
  Channel adapters
  provider request policy and transport
  lifecycle, identity, readiness, and audit

Host capability provision
  capability-specific interfaces
    SecretProvider
    ProviderRequestTransport / EgressProvider
    ChannelAdapter
    PublicationProvider
    TelemetrySink
    EnvironmentProvider
  bindings
    in-process plugin
    env/file/exec
    mounted socket or loopback sidecar
    capability-specific hosted binding
      selected carrier
```

The integration plane says **where a host may attach policy, routing,
monitoring, and adapters**. A provider interface says **what capability
OpenClaw consumes**. A binding says **where the implementation lives**.
The composition root provides shared wiring ergonomics. A ClawBus-style
multiplexed session is only one optional carrier for hosted bindings.

## ProxyPipe Consequence

ProxyPipe currently combines semantic interfaces and transport mechanics. The
migration must first map each frame to a canonical capability interface. Only
then may a ClawBus adapter carry the subset implemented outside the container.

This means:

- brokered provider egress maps beneath provider request transport;
- secret resolution maps to the existing secret provider contract;
- Teams maps to Channel adapters;
- approvals map to Gateway methods and events;
- AgentHarness maps to its own protocol;
- lifecycle and publication map to their owning contracts; and
- product-specific calls remain plugin-owned.

ProxyPipe is not the listener for all ClawBus traffic. During migration it may
implement a remote binding for several independently owned interfaces.

## Falsifiable Thesis

The combined design is justified only if:

- the host integration plane migrates at least one ProxyPipe family to an
  existing canonical OpenClaw contract; and
- the same typed host-provider interface works with at least two bindings, one
  of which is not Lobster, while the hosted binding deletes meaningful
  ProxyPipe transport code without changing OpenClaw consumers.

The thesis is disproved if:

- each provider requires bespoke central-bus methods;
- `OpenClawTransport` must become bidirectional to make the model work;
- canonical Channel, approval, lifecycle, or harness schemas are copied into a
  carrier-owned envelope; or
- a local socket, exec provider, or ordinary proxy satisfies the need with less
  machinery.
