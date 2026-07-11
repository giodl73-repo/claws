# Proxy-Pipe Frame Ownership Audit - Pass 5

## Baseline

- Lobster revision: `0a9514c1ce`
- Canonical proto: `src/proto/proxy_pipe.proto`
- Mirrored adapter proto: `src/openclaw_container/proto/proxy_pipe.proto`
- Scope: all `PipeFrame.payload` variants and their architectural owner

## Finding

ProxyPipe is no longer only a provider-egress bridge. Its one multiplexed stream
now carries seven distinct protocol families:

```text
brokered HTTP egress
product/runtime services
channel ingress
diagnostics and evidence
lifecycle supervision
interactive approvals
remote AgentHarness execution
```

Sharing one transport can be reasonable in Lobster's constrained network
topology. Sharing a transport must not imply shared semantic ownership or allow
the `proxy_pipe.proto` oneof to become the canonical definition of unrelated
OpenClaw contracts.

## Frame Inventory

| Tags | Frames | Family | Target ownership |
| --- | --- | --- | --- |
| 1-5 | `BeginRequest`, `RequestChunk`, `BeginResponse`, `ResponseChunk`, `RequestCancelled` | Brokered HTTP egress | Lobster host transport implementing portable brokered-provider behavior |
| 6 | `CronSchedule` | Legacy cron hint | Compatibility-only; retained for rolling decode, then delete when safe |
| 7-10 | Judge dedup check/write request/response | Product runtime service | Code-mode/plugin-owned capability using Lobster Redis service |
| 11 | `UserTurnPush` | Product runtime hint | Code-mode/plugin-owned; verify whether existing OpenClaw session events can replace it |
| 12-13 | `DeliverActivity`, `DeliverActivityAck` | Native Teams channel ingress | Runtime data-plane/channel contract; Lobster owns Teams delivery and routing |
| 14 | `ContainerHello` | Runtime/build evidence | Generic identity concept; current frame is Lobster transport projection |
| 15-16 | Feedback request/response | Diagnostics/product feedback | Plugin/host service; not brokered provider egress |
| 17 | `LifecycleSignal` | Runtime lifecycle observation | Portable lifecycle semantics projected over Lobster transport |
| 20-23 | Remote harness open, agent frame, brain frame, close | AgentHarness execution | Must converge on remote AgentHarness RFC; do not independently define a second canonical protocol |
| 24-26 | Lifecycle command capability, command, result | Runtime lifecycle control | Portable supervision semantics projected over Lobster transport |
| 27-28 | Node-pair approval request/response | Interactive approval | OpenClaw node approval protocol plus Lobster user surface |
| 29-30 | Exec approval request/response | Interactive approval | OpenClaw command approval protocol plus Lobster user surface |
| 31-32 | Cron creation approval request/response | Product/plugin approval | WorkIQ plugin approval plus Lobster user surface |

Tags 18 and 19 are reserved. The remote-harness family uses 20-23, lifecycle
capability/control uses 24-26, and approval families continue through 32.

## Architectural Classification

### Legitimate Lobster transport

The following can remain Lobster-specific wire behavior while implementing
portable runtime needs:

- HTTP-equivalent brokered egress;
- Plex routing and pinned tenant/user/container identity;
- Redis-backed product services;
- Teams delivery from Lobster-owned channel ingress;
- transport of generic lifecycle/approval/evidence messages.

### Should be upstream semantic contracts

The transport should adapt to, not define, these semantics:

- AgentHarness execution events and terminal behavior;
- node pairing and command approval;
- lifecycle drain, idle, checkpoint, and shutdown preparation;
- runtime/build identity;
- channel ingress acceptance/acknowledgement where OpenClaw already has a
  channel contract;
- stable readiness and failure reasons.

### Plugin-owned product capabilities

- judge dedup service;
- user-turn cache hints if still required;
- WorkIQ cron approval intent and marker handling;
- self-diagnosis feedback submission.

These may use a host-service bridge, but adding each product feature directly to
the central pipe proto creates coupling between Lobster runtime releases and
plugin evolution.

## AgentHarness Alignment

The four remote-harness frames are opaque byte substreams with Lobster-specific
open metadata and sequence fields. RFC 31 should be the canonical definition of
execution semantics, including event ordering, cancellation, terminal state,
approval/tool events, and conformance.

The preferred relationship is:

```text
AgentHarness canonical protocol/events
  -> Lobster ProxyPipe transport adapter
  -> runtime/cell implementation
```

Not:

```text
ProxyPipe remote-harness frames
  -> become a second AgentHarness semantic contract
```

Whether the four frames remain as a transport envelope is an implementation
decision; their payload semantics must not diverge from the upstream contract.

## Lifecycle And `/synced`

Lifecycle control already has a generation-fenced shape:

- capability binds to adapter `boot_id` and runtime owner/binding generation;
- command carries expected boot/binding generation and deadline;
- actions include retire, pause, and delete;
- `workspace_action` includes `checkpoint_unmount`;
- result outcomes include `shutdown_ready`, failure, cancellation, and stale
  rejection.

This is direct evidence for the State/Continuity hypothesis. Current lifecycle
frames combine supervision with a Lobster workspace action, but they do not yet
prove that all required OpenClaw state is synchronized through a declared final
state generation. The audit should map `checkpoint_unmount` and
`shutdown_ready` to actual workspace/snapshot durability before introducing
`/synced`.

## Approval Contract Signal

Three separate approval request/response pairs share the same architectural
pattern:

```text
OpenClaw/plugin requests approval
  -> host pins runtime identity
  -> Lobster presents user UI
  -> host returns bounded decision/outcome
  -> OpenClaw resolves the pending operation
```

This repeated shape suggests a generic upstream host-approval protocol with
typed intent/provenance and plugin namespacing. Lobster should own the approval
surface and tenant gating, not separate core approval semantics for each
feature. Node and exec approval should first map to existing OpenClaw approval
concepts; WorkIQ remains plugin-owned.

## Compatibility And Versioning

The proto comments claim cross-copy compile-time protection, but separate tonic
builds do not by themselves prove the two source files are byte-identical. More
importantly, older peers decode unknown oneof tags as empty payload and may tear
down the pipe, so capabilities gate many newer frame families.

Required compatibility evidence:

- exact source/proto parity check or one generated/shared package;
- capability advertisement for every optional family;
- unknown-frame and rolling-version behavior;
- per-family conformance tests independent of the shared transport;
- stable frame-family telemetry and bounded failure reasons.

## Recommended Boundary Shape

Keep one physical connection if operationally valuable, but document logical
subprotocols:

```text
ProxyPipe transport
  egress.v1
  channel.msteams.v1
  lifecycle.v1
  approvals.v1
  diagnostics.v1
  agentharness.v1
  plugin.<name>.v1
```

This is a classification goal, not a proposal to rewrite the proto immediately.
It allows each family to map to an upstream contract, plugin owner, or Lobster
host service and to evolve under explicit capability/version rules.

## Next Proof

1. Compare the two proto source files directly and inspect build-time parity
   enforcement.
2. Inventory Open-dial capabilities and map every optional frame family.
3. Compare remote-harness frames to RFC 31 event and conformance semantics.
4. Trace lifecycle `checkpoint_unmount` through actual state persistence and
   shutdown readiness.
5. Map node/exec approval frames to existing OpenClaw approval APIs.
6. Identify product frames that can move behind plugin-owned host-service
   declarations instead of central proto growth.

