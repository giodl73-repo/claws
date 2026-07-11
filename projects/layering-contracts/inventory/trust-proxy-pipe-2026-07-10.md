# Trusted Identity And Proxy-Pipe Audit - Pass 4

## Baseline

- Lobster revision: `0a9514c1ce`
- Worktree: `C:\src\lobster-layering-audit`
- Scope: Gateway trusted-proxy headers, local caller fallbacks, proxy-pipe
  advertisement/readiness, and first failure taxonomy
- Status: end-to-end boundary and ownership classification complete; protocol
  frame inventory remains open

## Two Different Trust Boundaries

Lobster's Gateway path carries two independent authentication layers:

```text
client -> Lobster runtime
  Lobster authenticates the user and derives trusted identity

runtime -> Plex/worker
  Authorization bearer authenticates the extension-worker hop
  Island Gateway validates and drops that bearer

runtime/relay -> OpenClaw Gateway
  x-forwarded-user + x-forwarded-proto carry trusted-proxy identity
```

The Plex bearer must not be confused with OpenClaw user identity. It authorizes
the infrastructure hop; `x-forwarded-user` is the Gateway principal selected by
the authenticated Lobster runtime.

## Trusted Identity Path

| Hop | Behavior | Source |
| --- | --- | --- |
| SPA/runtime relay | Overwrites any route/client `x-forwarded-user`; stamps validated user id and `x-forwarded-proto=https` | `lobster_runtime/src/gateway_proxy/handler.rs::build_upstream_request` |
| Teams runtime client | Applies the same overwrite after route headers | `lobster_runtime/src/teams_bridge/container_client.rs::build_ws_request` |
| Plex mock/worker proxy | Explicitly forwards trusted user/proto plus origin and network headers; does not forward infrastructure Authorization | `lobster_plex_mock/src/ws_proxy.rs` |
| Adapter Gateway WS proxy | Knows the same forwarded-header names and relays to Gateway | `openclaw_container/src/gateway_ws_proxy.rs` |
| Adapter internal Gateway client | Stamps synthetic `x-forwarded-user=lobster-openclaw-adapter` plus HTTPS proto | `openclaw_container/src/openclaw_client/client.rs` |
| OpenClaw Gateway | Baked config trusts loopback proxies and reads `x-forwarded-user` | `openclaw_container/config/openclaw.gateway.json` |

Invalid user ids that cannot be encoded as a header cause the runtime client to
dial without the identity header. The intended safety property is fail-closed at
OpenClaw trusted-proxy authentication; this should be verified end to end rather
than inferred from individual writers.

## Current Gateway Posture

Lobster's managed Gateway config currently requires:

- local Gateway mode and loopback bind;
- trusted proxies `127.0.0.1` and `::1`;
- `auth.mode=trusted-proxy`;
- `userHeader=x-forwarded-user`;
- loopback allowance;
- a local password fallback for bundled OpenClaw CLI/backend direct callers;
- disabled Control UI device authentication;
- insecure local-hop allowance;
- host-selected allowed origins;
- exact rate-limit and direct endpoint posture.

Origin is also semantic: an Origin-bearing request is treated as remote/browser
traffic, while origin-less local test/CLI flows rely on OpenClaw loopback pairing
behavior. Multiple relays must preserve the selected Origin consistently.

## Trusted Identity Ownership

### OpenClaw contract

- Trusted-proxy auth mode and accepted identity header schema.
- Which proxy addresses are trusted.
- Header sanitization and missing/invalid identity failure behavior.
- Direct local caller fallback semantics.
- Origin classification and allowed-origin enforcement.
- Device-auth and local Control UI behavior.
- Stable authentication failure reasons and tests.

### Lobster responsibility

- Authenticate users through Microsoft identity systems.
- Choose the OpenClaw principal value.
- Strip/overwrite caller-controlled trusted headers.
- Route through Plex and preserve required headers across host-owned relays.
- Select and lock the Gateway posture through Managed Configuration.
- Operate tenant policy, audit, and incident response.

### Current workaround pressure

The password fallback, synthetic adapter principal, disabled device auth, local
scope handling, and multiple header-forwarding fixes show that Lobster has more
than a simple `trusted-proxy` selection. Each workaround needs a named upstream
Gateway behavior or an explicit Lobster-local removal condition.

## Proxy-Pipe Path

```text
OpenClaw/provider HTTPS
  -> iptables/Kestrel MITM
  -> adapter loopback HTTP bridge
  -> ProxyPipe/Open gRPC bidi stream through Plex
  -> Lobster runtime dispatcher
  -> governed provider upstream
```

The start DTO advertises the canonical v1 gRPC path:

```text
/plex/extension/aether.openclaw.proxy_pipe.v1.ProxyPipe/Open
```

Git-backed starts may preconnect the pipe before Gateway start because workspace
rehydration itself needs brokered Graph/SPO egress. Other paths ensure or refresh
the pipe after a successful start.

## Current Readiness Contract

The adapter start response exposes two independent optional string fields:

```text
proxy_pipe_status
  up | absent | not-ready | unsupported

proxy_pipe_forwarding_status
  ready | disabled | unsupported | not-ready
```

Their meanings differ:

- pipe status describes current stream occupancy;
- forwarding status says the adapter loopback bridge can dispatch HTTP to the
  gRPC stream.

Runtime behavior is fail closed:

- forwarding must be exactly `ready`;
- pipe status must be `up` or `absent` before ensure/dial logic proceeds;
- missing, unsupported, not-ready, disabled, and unknown values fail closed;
- stale cached registrations are dropped in most non-ready cases;
- a short two-second grace preserves a very recent concurrent pipe;
- concrete-worker and metadata-route identity differences affect redial logic.

This is a real readiness-condition family implemented outside OpenClaw today.

## Proxy-Pipe Failure Classes

The runtime has typed internal failures for:

- manager/dialer not configured;
- strict no-steal ownership refusal;
- channel construction;
- invalid route target;
- provider dial preparation;
- Open RPC failure;
- bearer acquisition;
- cached identity mismatch;
- invalid authorization metadata;
- closed writer requiring redial.

Gateway upgrade retry logic also distinguishes transient versus hard failures,
including allocator 400 compatibility cases and structured gRPC status. Some
classification is flattened through display strings before being recovered by
callers. The boundary needs stable machine-readable reason codes rather than
string matching as it evolves.

## Ownership Classification

### Lobster compatibility layer

- ProxyPipe advertisement and gRPC protocol.
- Plex routing metadata and bearer handling.
- Runtime ownership leases, no-steal policy, and reactivation sweeper.
- Provider credential injection and governed upstream routing.
- Loopback Kestrel/adapter bridge.
- Current start-response status strings and retry taxonomy.

### Portable OpenClaw need

OpenClaw should support brokered provider access without requiring usable
provider secrets in the runtime and should be able to expose whether required
provider routing is operational. OpenClaw does not need to own Lobster's
ProxyPipe protocol to satisfy that need.

A Lobster host/plugin readiness provider could contribute a condition such as
`BrokeredEgressReady` using adapter/runtime evidence. A hosting profile can make
that condition required. Core OpenClaw should consume the condition, not embed
Plex, leases, or ProxyPipe frames.

## AgentHarness Overlap Risk

ProxyPipe began as brokered provider egress but now also carries or is adjacent
to feedback, approval, lifecycle, and remote-harness capabilities. The next
protocol audit must classify every frame as:

- brokered egress request/response;
- host control or approval;
- lifecycle/supervision;
- diagnostics/feedback;
- remote AgentHarness execution event;
- Lobster-only compatibility extension.

Execution frames that belong to the remote AgentHarness contract should not be
grown independently in ProxyPipe. Brokered egress and host supervision may
remain separate data-plane facilities.

## Managed Configuration Fit

Managed Configuration can replace the baked/mutated Gateway posture:

- bind and trusted proxies;
- auth mode and user header;
- direct local fallback posture;
- Control UI/device-auth posture;
- allowed origins and rate limits.

It cannot replace authenticated header projection, Plex bearer handling,
ProxyPipe establishment, secret brokering, ownership leases, or transport
failures.

## Immediate Proof

1. Build a header matrix for SPA, Teams, adapter-internal, CLI, and test callers,
   including spoof overwrite and missing-header rejection.
2. Verify OpenClaw stable failure reasons for missing identity, untrusted proxy,
   bad origin, bad local fallback, and disabled device auth.
3. Inventory every ProxyPipe proto frame and map it to brokered egress,
   AgentHarness, lifecycle, approval, or Lobster-only ownership.
4. Replace string-derived retry/failure recovery with stable typed reason codes
   at the Lobster runtime/adapter boundary where feasible.
5. Model proxy-pipe status as reusable readiness conditions and compare with RFC
   33 provider semantics without adding Lobster concepts to OpenClaw core.
6. Record removal conditions for local password, device-auth, synthetic
   principal, and relay-header workarounds.

