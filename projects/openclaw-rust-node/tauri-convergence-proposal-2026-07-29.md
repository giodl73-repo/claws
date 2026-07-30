# OpenClaw Rust Gateway and Node Convergence Proposal

Status: source-audited proposal for maintainer discussion; no upstream code or
issue changes are authorized by this document.

Implementation checkpoint: PR 1 has a local evidence slice in
`C:\src\openclaw-rust-gateway-core` on branch `agent/rust-gateway-core`, based
on OpenClaw `59640bad267da103666d69bc7aad4e0639f41300`. The exact five-file
patch is committed as `12659125fc716d16e624c259a06771129959b063` and pushed to
`giodl73-repo/openclaw`. It introduces a Tauri-free
`openclaw-gateway-core` path dependency, moves TLS pinning and bounded
connect/reconnect policy into it, and makes the existing Linux app consume the
new APIs directly. Format, diff check, focused tests, Clippy with warnings
denied for the new crate, and Linux/Tauri all-target compilation pass. The full
app suite passes 69 of 70 tests; the sole failure is an unchanged current-main
test that expects pinned connections to advertise no capabilities while the
unchanged `connect_params` implementation always advertises `agent-kind`.

## Decision

Do not replace the experimental Rust node implementation with the Linux Tauri
code wholesale, and do not upstream the experimental transport wholesale.

The Linux app has the stronger production implementation of several generic
Gateway concerns: TLS pinning, gateway-bound device-token persistence,
connect-error handling, retry suppression, and half-open connection detection.
We should extract and reuse those behaviors.

The experimental repository has the parts the Linux app does not implement:
the node profile, concurrent request correlation, general event delivery,
node invocation/result handling, activation, a bounded command runtime, and a
headless embeddable host. We should retain and port those parts onto the shared
transport.

The common primitive is therefore a **role-safe Rust Gateway session**, not a
node host and not a Tauri client.

## Thesis and deletion target

Thesis: OpenClaw should have one in-tree Rust Gateway session implementation
that can be configured through closed operator and node profiles, while product
code supplies storage, signing, credentials, connection details, and UI or
command behavior.

The work is successful only if it deletes duplicated protocol mechanics:

- Linux deletes signing, framing, TLS, request, and reconnect mechanics from
  the monolithic `gateway_ws.rs` in favor of the shared session.
- The experimental node implementation deletes its parallel WebSocket,
  challenge, response-correlation, and reconnect implementation in favor of
  that same session.
- Scout deletes its product-local node transport/runtime mechanics while
  retaining AAD, Keychain, Swift/FFI, process lifecycle, and product commands.

If extraction only adds an abstraction beside the existing implementations,
it has failed.

## What the current source actually proves

### OpenClaw Linux Tauri app

The Linux app is a Rust **operator/UI Gateway client**, not a Rust node host.
Its client identity is `openclaw-linux`, mode `ui`, role `operator`, with
operator scopes. It advertises no commands and has no `node.invoke` handling.
The app README says its Canvas WebView is made available to the separate
headless `openclaw node run` process through a local socket.

Its `gateway_ws.rs` driver is production-shaped but application-specific:

- protocol v4 only;
- challenge-before-connect and canonical v3 device signing;
- custom rustls certificate-fingerprint validation;
- gateway-URL-bound issued-device-token storage and mismatch clearing;
- server-authoritative `pauseReconnect` and `retryable` handling;
- capped reconnect backoff and a two-missed-tick half-open watchdog;
- a fixed request enum for `agents.list`, `chat.send`, and Canvas refresh;
- Tauri `AppHandle`, Quick Chat window state, event emission, and agent caching;
- one request processed at a time by the driver.

That last shape is appropriate for Quick Chat, but it is not a generic node
session. A node may receive invocations while several result requests are in
flight and must not serialize the entire socket behind one application request.

Source baseline audited: `openclaw/openclaw` worktree commit
`5abc1eb5733defe91ee53342f4722a4d64222eb9`, especially:

- `apps/linux/README.md`
- `apps/linux/src-tauri/src/gateway_device_identity.rs`
- `apps/linux/src-tauri/src/gateway_ws.rs`
- `apps/linux/src-tauri/Cargo.toml`

### Experimental Rust node repository

The experimental repository implements a genuine node client and runtime:

- closed node defaults: client `node-host`, mode `node`, role `node`, empty
  scopes, protocol v3-v4;
- challenge-time identity callback, including externally produced device proof;
- opt-in activation before declared commands become live;
- bounded concurrent request correlation and timeouts;
- retained and subscribable event streams;
- typed `node.invoke.request` receipt and `node.invoke.result` completion;
- bounded command dispatch, receipt-relative deadlines, byte limits, overload
  behavior, panic containment, and disconnect cleanup;
- reusable library plus a foreground headless host;
- real-Gateway behavior proof and native package evidence.

Its important current gap is transport injection. `NodeClientConfig` accepts a
static Gateway URL and connects directly. Scout needs per-attempt acquisition of
the URL, WebSocket upgrade headers/AAD credential, and TLS policy. The headless
host also retains an issued device token only in memory.

Source baseline audited: `giodl73-repo/openclaw-rust-node` commit
`9654b94f2af8fa5179acfb1bdc5e4376fe0da5e0`, especially:

- `src/client.rs`
- `src/identity.rs`
- `src/runtime.rs`
- `src/host.rs`
- `tests/client.rs`, `tests/runtime.rs`, and `tests/live_gateway.rs`

## Take, adapt, keep, and reject

| Concern | Decision | Source of truth | Reason |
| --- | --- | --- | --- |
| TLS system roots and certificate pinning | Take | Tauri | Production in-tree behavior with platform-oriented tests. |
| Connect error details, retryability, and pause | Take | Tauri + Gateway schema | Correctly treats server retry policy as authoritative. |
| Half-open/tick watchdog | Take | Tauri | Missing from the experimental client and operationally important. |
| Gateway-bound token mismatch clearing | Take | Tauri | Safer than the experimental host's process-only token retention. |
| Canonical device-signing bytes | Adapt | OpenClaw protocol fixtures and Tauri | Keep the proven algorithm; parameterize it with a validated profile and external signer. |
| Identity/token persistence | Adapt | Host adapter | Tauri filesystem, Scout Keychain, and headless stores cannot share one mandatory backend. |
| Reconnect supervisor | Adapt | Tauri | Preserve server semantics but remove window state and refresh connection material per attempt. |
| Node identity/profile and activation | Keep | Experimental node repo + OpenClaw node contract | Tauri has no node role or capability lifecycle. |
| Concurrent request correlation | Keep | Experimental node repo | Tauri's serialized request loop is insufficient for a reusable session. |
| General event delivery | Keep | Experimental node repo | Tauri only forwards product-selected chat events. |
| Node invocation/result lifecycle | Keep | Experimental node repo | This is the actual node-host behavior. |
| Bounded command runtime | Keep | Experimental node repo | Tauri has no command execution surface. |
| Headless embedding boundary | Keep | Experimental node repo | Required by non-Tauri adopters and service-style hosts. |
| Tauri `AppHandle`, Quick Chat events/cache | Keep local | Linux app | Product behavior, not protocol infrastructure. |
| Fixed arbitrary role/scopes builder | Reject | N/A | It would make privilege/profile mixing easy. Use closed profiles. |
| `system.run` in the shared library | Reject | N/A | Execution policy is a separate OpenClaw-owned security contract. |
| Rust-owned wire dialect/schema | Reject | N/A | TypeScript Gateway protocol/schema and cross-language fixtures remain authoritative. |

## Proposed architecture

```text
OpenClaw protocol schemas + cross-language fixtures
                         |
                Rust Gateway session
       framing, correlation, events, TLS, reconnect
          /                              \
 operator-ui profile                 node profile
          |                              |
 Linux/Tauri adapter             node invocation client
 AppHandle + Quick Chat                    |
                                  bounded command runtime
                                     /             \
                              headless host      Scout adapter
                                                AAD/Keychain/FFI
```

### Shared session contract

The transport/session crate should own:

- challenge ordering and handshake deadlines;
- frame validation and size bounds;
- multiple in-flight request correlation and cancellation on close;
- retained/broadcast event delivery with explicit lag behavior;
- hello and connect-error parsing;
- TLS roots/fingerprint policy;
- server-directed reconnect classification and half-open detection.

It should accept host dependencies rather than product settings:

1. `ConnectionProvider`: produces the URL, WebSocket upgrade headers/outer
   credential, and TLS policy for **each** connection attempt.
2. `ChallengeSigner`: signs the validated profile plus challenge without
   exposing the private key to the session.
3. `DeviceTokenStore`: loads, persists, and clears issued tokens under a
   normalized Gateway identity.
4. Narrow clock/random/log hooks only where deterministic testing requires
   them.

The public API should expose closed constructors such as `OperatorUiProfile`
and `NodeHostProfile`. Product code may fill allowed metadata and declared
capabilities, but may not freely combine a client ID, mode, role, and scopes.
Protocol ranges may differ by profile: current-only for the Linux UI can remain
v4, while the established node compatibility window remains v3-v4.

### Node layer

The node layer should own only:

- validated node connect metadata and explicit surface activation;
- typed invocation/input/cancel/result mapping after those contracts ship;
- command/capability/permission advertisement;
- bounded handler scheduling and result delivery;
- headless lifecycle and health/readiness policy.

It should not own TLS, persistent key storage, OAuth/AAD, product commands, or
service installation.

## Repository placement

Start in `openclaw/openclaw`, because the strongest current Rust transport is
already shipped there and OpenClaw owns the wire and security behavior. Do not
start by importing the experimental repository as a parallel official codebase.

Create an in-tree Rust crate boundary adjacent to, but independent of, the
Linux Tauri application. The exact directory is a maintainer layout decision;
the architectural requirement is that it has no Tauri dependency and that the
Linux app consumes it by a path dependency. A registry package or separate
OpenClaw-owned repository can be considered only after a second real consumer
proves the API and release owner.

The experimental repository remains the evidence and donor implementation
during migration. Archive or redirect it only after OpenClaw contains the node
vertical slice and the same real-Gateway tests pass.

## Independently mergeable PR plan

No deep stack is required. Each PR changes one ownership boundary and must be
mergeable or revertible on its own.

### PR 1: extract pure Gateway security and policy helpers

- Move canonical signing payload construction, TLS pin parsing/verification,
  connect-error details, token mismatch classification, and reconnect decision
  helpers behind a Tauri-free crate/module boundary.
- Keep the Linux app as the only consumer.
- Preserve all Linux behavior and tests.
- Delete the corresponding copies from the app modules.

Exit: net-neutral or negative production logic, no node API, no UI behavior
change.

Local implementation status: the first half of this slice is proved. TLS
pinning, bounded connect-error parsing, issued-device-token invalidation,
server-directed reconnect pause, and capped backoff now live in the shared
crate and are consumed by Tauri. Canonical signing extraction remains out of
this first patch so reviewers can judge the crate/dependency boundary before
moving key-sensitive identity code.

### PR 2: extract the concurrent Gateway session

- Move socket handshake, frame loop, request correlation, event delivery,
  timeouts, reconnect classification, and heartbeat supervision into the shared
  crate.
- Add the provider interfaces above.
- Adapt Quick Chat to the generic session while retaining its local request
  enum, cache, and Tauri events.
- Prove multiple in-flight requests and events while requests are pending.
- Delete the superseded transport loop from `gateway_ws.rs`.

Exit: Linux Quick Chat behavior is unchanged; the shared crate has no Tauri or
node dependency.

### PR 3: add the node profile and invocation client

- Port the experimental node defaults, activation gate, typed invocation
  receipt, and result completion onto the shared session.
- Import conformance fixtures from the OpenClaw-owned protocol source rather
  than treating Rust fixtures as authoritative.
- Run the existing isolated real-Gateway `example.status` proof.
- Do not add `system.run`, unpublished cancellation shapes, services, or
  packaging.

Exit: OpenClaw has an in-tree embeddable Rust node session, independently of
Tauri.

### PR 4: port the bounded node runtime and headless host

- Port bounded concurrency, deadlines, byte limits, overload behavior, panic
  containment, result-delivery policy, disconnect cleanup, and foreground host.
- Supply filesystem/in-memory persistence only as an adapter, not as the shared
  storage API.
- Reuse the existing deterministic and real-Gateway proofs.

Exit: feature parity with the useful generic experimental implementation; still
no claim of published/supported Rust artifacts.

### PR 5: first external adopter proof

- Scout implements `ConnectionProvider` with per-attempt AAD/upgrade material,
  `ChallengeSigner`/`DeviceTokenStore` with Keychain, and its Swift/FFI bridge.
- Keep CopilotAppHost lifecycle and product commands in Scout.
- Converge Lobster's endpoint on OpenClaw v4 before deleting its v2 transport.

Exit: one real downstream implementation deletes its duplicate client/runtime.
This is the evidence for stabilizing/publishing the Rust API.

### PR 6: release and repository decision

- Name OpenClaw code, security, and release owners.
- Decide crate names, registry, signing, compatibility matrix, and support
  policy.
- Reuse the experimental repository's package/SBOM/provenance evidence where
  still applicable.

Exit: only then call the Rust node host officially distributed or supported.

## Cheapest decisive evidence slice

PR 2 and PR 3 are the decision point:

1. The existing Linux Tauri Quick Chat connects, pairs, handles a token
   mismatch, obeys `pauseReconnect`, survives a half-open connection, lists
   agents, and sends chat through the extracted session.
2. A node profile using the same session connects to an isolated real Gateway,
   advertises only `example.status`, receives one invocation, and sends the
   typed result.
3. A negative test proves operator scopes cannot be constructed with the node
   profile and node commands cannot be constructed with the operator profile.
4. A concurrency test proves an event and a second response are processed while
   the first request is pending.
5. The diff removes the replaced session mechanics from both donor
   implementations.

If the shared session needs Tauri types, serializes every request, or permits
free-form privilege mixing, stop extraction and keep the node implementation
separate until the boundary is corrected.

## Role evaluation

### Gateway runtime owner

Accept if extraction leaves the TypeScript Gateway untouched, adds no sync or
blocking work to it, bounds client queues/timeouts, and preserves graceful
failure/reconnect behavior. Reject a shared Rust client that can create
unbounded in-flight work or reconnect against an explicit server pause.

### Platform/adopter owner

Accept if every connection attempt can refresh endpoint credentials and TLS
policy, storage is replaceable, failures are observable, and upgrading one
consumer does not require a coordinated deep PR stack. Reject app-global state
or a Linux filesystem store embedded in the common API.

### Repository steward

Accept an in-tree extraction when OpenClaw is the unambiguous protocol owner and
the second consumer deletes a private copy. Reject a second official-looking
repository before ownership and release policy exist, or a permanent mirror of
the same session code in Tauri, the experimental repo, and Scout.

## Questions for Peter and maintainers

1. Do you agree the reusable unit is a role-safe Rust Gateway session, with
   operator UI and node host as separate profiles?
2. May the first PR extract Tauri's pure security/reconnect helpers without
   proposing a node API yet?
3. Which in-tree location and Rust owner should govern the Tauri-free crate?
4. Is an isolated real-Gateway node invocation sufficient for accepting the
   second profile before a public crate/release decision?

## Short maintainer pitch

Peter was right that OpenClaw already contains a serious Rust Gateway client in
the Linux Tauri app. It is not currently a node host: it connects as an
operator UI and delegates Canvas node behavior to `openclaw node run`. Rather
than introduce a second transport, we propose extracting Tauri's production
TLS, device-auth, token, reconnect, and heartbeat behavior into a Tauri-free,
role-safe Gateway session. The existing Rust node work then contributes only
the missing node profile, concurrent event/invocation lifecycle, bounded
runtime, and headless host. Tauri remains the first consumer, the node host is
the second, and Scout becomes the external proof. Each PR deletes duplicated
code and is independently reviewable; packaging and official support remain a
later owner decision.
