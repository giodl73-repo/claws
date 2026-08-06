## What problem this solves

The new Copilot app system tray needs a native Rust node runtime, but placing
that runtime in Edge/Chromium would duplicate OpenClaw's protocol, lifecycle,
policy, and security behavior. OpenClaw also needs a clear boundary between its
reusable runtime and product-specific shells.

## Why this change was made

This RFC proposes that OpenClaw own a reusable, headless Rust node runtime in
the OpenClaw monorepo, while Microsoft keeps product shells, native tools,
packaging, and deployment in Microsoft-owned repositories. The first proposed
host is the Copilot app system tray in Edge/Chromium.

Windows Companion and `openclaw-windows-node` are a separate adopter. They can
reuse the same crates to simplify their native stack and, independently, act as
authorized Gateway controllers for the tray node. Scout Cloud and other
authorized clients use the same Gateway-mediated path. Controller authority
stays in the Gateway; no controller connects directly to the local runtime.

The bounded decision is whether the two unpublished workspace crates should
incubate as an OpenClaw core surface beside the TypeScript reference. It does
not publish crates, make the proof host an official binary, promise platform
support, or accept broader node-mode parity. Those remain follow-on decisions.
During incubation, public Rust visibility is only an unstable workspace seam:
it carries no SemVer promise and may change atomically with reviewed in-tree
consumers. This RFC does not select a cross-repository distribution mechanism.

The RFC also makes the native trust boundary explicit. Product adapters are
trusted product code, not sandboxed plugins. The runtime authenticates,
authorizes, bounds, correlates, and cancels dispatch; the product retains OS
permissions, least privilege, containment, and any stronger isolation.

The RFC deliberately does not assign individual maintainers or ask for a
staffing decision. Implementation, review, and CODEOWNERS can follow normal
OpenClaw practice, and any later publication or official-binary proposal can
define the additional operational commitments it introduces.

Microsoft is the anchor adopter, not the exclusive audience. The runtime and
every accepted capability surface remain customer-neutral for native,
embedded, appliance, and headless adopters. Microsoft is willing to seed the
implementation and maintenance.

This is a convergence refactor, not the introduction of an unrelated Rust
stack. OpenClaw's Linux Tauri app already contains a production Rust Gateway
client for TLS trust, device authentication, reconnect, heartbeat, and request
handling. The foundation implementation extracts that app-local behavior into
the Tauri-free `openclaw-gateway-client` crate and refactors the existing Tauri
app to consume it as the first adopter. The separate `openclaw-node-host` crate
then layers the reusable node role, lifecycle, and bounded runtime on that same
client. Tauri remains the application shell; native desktop and headless hosts
reuse the common Gateway substrate without taking a dependency on Tauri.

It is also consistent with OpenClaw's existing multi-language node model. The
generic TypeScript host, Apple Swift nodes, Android Kotlin node, official C#
Windows node, and official C ESP-IDF component all implement the same node role
while advertising different platform capabilities. Rust is another conforming
implementation, not a second protocol. The RFC proposes shared cross-language
fixtures so admission, identity, invocation, cancellation, lifecycle, and
errors converge even when tool catalogs legitimately differ.

The proposal is intentionally draft and leaves publication, production
sidecar adoption, broader command parity, and release support as explicit
follow-on decisions.

The hosting and management paths are deliberately separate:

- a product shell hosts the runtime in-process or through an authenticated
  sidecar adapter; and
- authorized controllers manage the node only through the Gateway.

## Architecture sketch

![Proposed OpenClaw Rust node runtime topology](https://raw.githubusercontent.com/giodl73-repo/rfcs/refs/heads/user/giodl/rfc-0028-openclaw-rust-runtime/rfcs/0028/rust-node-runtime-topology.svg)

## Proposed implementation series

The RFC governs three OpenClaw implementation layers plus the Windows adopter
with distinct jobs:

1. [OpenClaw #116050](https://github.com/openclaw/openclaw/pull/116050)
   extracts Tauri's Gateway transport into `openclaw-gateway-client`, adds the
   bounded `openclaw-node-host` foundation and headless binary, and makes the
   Linux Tauri app the first consumer of the shared client.
2. [OpenClaw #116450](https://github.com/openclaw/openclaw/pull/116450)
   follows #116050 with the embeddable lifecycle: platform signing and typed
   issued-device-token delivery, reconnect, duplex invocation, local
   admission, connection-scoped manifests, and shared TypeScript/Rust
   conformance fixtures. It must not land before #116050.
3. [OpenClaw #116863](https://github.com/openclaw/openclaw/pull/116863)
   consolidates reviewed fork evidence #193-#195 into authenticated bounded
   sidecar framing, the independently negotiated handshake, immutable
   configuration, and the ordinary-command runtime/product-adapter bridge.
   It is logically stacked on #116450 and preserves the reviewed commits.
4. [Windows node #1068](https://github.com/openclaw/openclaw-windows-node/pull/1068)
   combines the replaceable runtime boundary, shared Windows capability
   dispatcher, and independent C# reproduction of all three Rust corpora. It
   routes ordinary native commands through that dispatcher while keeping C# as
   the production default. The adapter is a non-selectable source proof;
   production packaging/signing, Gateway lifecycle, supervision, rollout, and
   rollback remain. Fork-only [Rust #12](https://github.com/giodl73-repo/openclaw-rust-node/pull/12)
   plus [Windows #4](https://github.com/giodl73-repo/openclaw-windows-node/pull/4)
   prove exact-hash launch with reparse-safe path locks through process
   creation, private-pipe bootstrap, and handshake artifact binding without
   enabling runtime selection.

The RFC now also specifies the next, not-yet-filed OpenClaw slice: a negotiated
sidecar Gateway connection-control exchange for per-attempt material,
supervisor-owned signing, durable issued-token acknowledgement, bounded
recovery, and authority retirement. The immutable capability configuration
stays secret-free. A later adopter slice can consume that contract over the
protected process channel and replace the current environment-based live proof.

Fork PRs #186-#192 remain evidence history. Fork PRs #193-#195 are closed as
superseded by upstream #116863; their reviewed commits remain in the cumulative
branch rather than becoming a permanent three-PR upstream stack.

## User impact

No immediate user-facing behavior changes. The existing Linux Tauri app keeps
its product role while sharing its Rust Gateway implementation. If accepted,
other native products can reuse the same substrate and node runtime instead of
carrying a Node.js wrapper or a separate protocol implementation.

## Implementation and evidence

- [RFC 0028 companion specifications](https://github.com/openclaw/rfcs/pull/54/files) define the Gateway client, bounded node runtime, sidecar hosting and Gateway connection-control contracts, conformance/adoption gates, and implementation/evidence inventory.
- [Foundation implementation and Tauri refactor](https://github.com/openclaw/openclaw/pull/116050)
- [Embeddable runtime follow-up](https://github.com/openclaw/openclaw/pull/116450)
- [Authenticated sidecar bridge](https://github.com/openclaw/openclaw/pull/116863)
- [Consolidated Windows adopter](https://github.com/openclaw/openclaw-windows-node/pull/1068)
- [Protected process-launch evidence](https://github.com/giodl73-repo/openclaw-rust-node/pull/12)
  with the [Windows verified launcher](https://github.com/giodl73-repo/openclaw-windows-node/pull/4)

The RFC has also been reviewed through Gateway reliability, sidecar lifecycle,
enterprise security, and maintainer-correctness lenses. That review added
explicit fail-closed authority, audit, readiness, crash recovery, reconnect,
resource, and release gates. Current-head Rust evidence is green at #116050
`41f4e705887` (56 tests) and #116450 `894d125ee76` (73 tests plus strict static
gates). The final TypeScript UTF-8 fixture-validator run remains explicitly
pending after a local package-registry TLS failure; earlier hosted TypeScript
fixture lanes passed.

The consolidated sidecar head `8d0a1b013ea` in #116863 has 110 passing Rust workspace
tests plus strict Clippy, Rustdoc, formatting, and three clean sequential manual
reviews. It proves the generic protocol/handshake/configuration/ordinary-command
bridge, not production readiness. Fork evidence now proves anonymous-pipe IPC,
protected credential handoff, reparse-safe exact artifact identity through
launch, and authenticated self-identity. Platform signing and
packaging, duplex input/progress, product audit, crash supervision, resource
proof, rollout, and rollback remain explicit adopter gates.

The consolidated Windows #1068 head `3ca913a43a62` reproduces the protocol,
handshake, and runtime corpora byte-for-byte; passes 60 focused, 3,462 Shared,
and 2,023 Tray tests; and has clean built-in Codex, correctness, architecture/API,
and security reviews. It closes the independent-consumer promotion gate for
the generic #116863 subset. Fork #4 then adds a non-selectable verified launcher;
the exact pinned aggregate passes 122 shared Rust and 64 focused Windows tests
plus all three fixture blobs. It does not close platform signing/package delivery,
Gateway/pairing/token, `system.*` authorization, audit, crash/resource,
selection, rollout, or rollback gates.

The sidecar connection-control contract includes a deterministic Ed25519
fixture and explicit races for timeout/cancellation, denial, authorization,
runtime closure, and supervisor retirement. Gateway, platform, and CISO role
review is recorded with the RFC. A final Codex review found the documents and
fixture internally consistent with no actionable correctness issue. This is a
reviewed implementation boundary, not a claim that either consumer exists yet.
