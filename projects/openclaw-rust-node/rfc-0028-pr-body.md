## What problem this solves

Microsoft's Windows Companion/system-tray work needs a native Rust node runtime,
but placing that runtime in Edge/Chromium would duplicate OpenClaw's protocol,
lifecycle, policy, and security behavior. OpenClaw also needs a clear ownership
boundary between its reusable runtime and product-specific shells.

## Why this change was made

This RFC proposes that OpenClaw own a reusable, headless Rust node runtime in
the OpenClaw monorepo, while Microsoft keeps the Windows shell, native tools,
packaging, and deployment in Microsoft-owned repositories. It also defines how
Windows Companion and Scout Cloud can manage the same canonical node without a
Microsoft-specific protocol or runtime fork.

Scout's alignment with the main Copilot app—and the long-lived Windows
Companion/system-tray process becoming the local controller—now makes that
shared dependency practical. Microsoft's requested model is for Windows Companion
to depend on the OpenClaw-owned Rust runtime, simplifying the Companion
architecture and avoiding a second node implementation, while its shell and
native adapters remain in Edge/Chromium.

The RFC now distinguishes local hosting from management: Companion can embed or
supervise the system-tray runtime while Companion and Scout Cloud manage that
same node through the Gateway. Controller authority stays in the Gateway; the
runtime does not gain separate Windows and Scout control planes. It also
clarifies that this is one canonical node-mode contract with a bounded Rust
implementation for native/headless hosts—not an uncontrolled product fork.
Microsoft is willing to seed implementation and maintenance. The bounded
technical decision requested here is whether the two unpublished workspace
crates should incubate as an OpenClaw core surface in the monorepo, with
Gateway/security authority and shared conformance beside the TypeScript
reference. It does not publish crates, make
the proof host an official binary, promise platform support, or accept broader
node-mode parity; those remain explicit follow-on decisions. This PR is the
acceptance discussion and decision record.

The RFC deliberately does not assign individual maintainers or ask for a
staffing decision. Implementation, review, and CODEOWNERS can follow normal
OpenClaw practice, and any later publication or official-binary proposal can
define the additional operational commitments it introduces.

Microsoft is the anchor adopter, not the exclusive audience. The runtime and
every accepted capability surface remain customer-neutral so other native,
embedded, appliance, and headless OpenClaw adopters can reuse them. OpenClaw
maintainers can therefore choose the scope based on what is right for the
broader customer base, with Microsoft willing to seed implementation and
maintenance.

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

The proposal is intentionally draft. In particular, it asks the maintainers to
confirm long-term ownership and leaves embedding topology, multi-manager
authority, approval integration, and release support as explicit decisions.

## Proposed implementation series

The RFC governs three implementation PRs with distinct jobs:

1. [OpenClaw #116050](https://github.com/openclaw/openclaw/pull/116050)
   extracts Tauri's Gateway transport into `openclaw-gateway-client`, adds the
   bounded `openclaw-node-host` foundation and headless binary, and makes the
   Linux Tauri app the first consumer of the shared client.
2. [OpenClaw #116450](https://github.com/openclaw/openclaw/pull/116450)
   follows #116050 with the embeddable lifecycle: platform signing and typed
   issued-device-token delivery, reconnect, duplex invocation, local
   admission, connection-scoped manifests, and shared TypeScript/Rust
   conformance fixtures. It must not land before #116050.
3. [Windows node #1068](https://github.com/openclaw/openclaw-windows-node/pull/1068)
   creates a replaceable runtime boundary and shared Windows capability
   dispatcher. It keeps C# as the production default and adds no Rust sidecar
   or runtime-selection change yet.

Fork PRs #186-#192 remain evidence history, not part of the proposed public
review stack.

## User impact

No immediate user-facing behavior changes. The existing Linux Tauri app keeps
its product role while sharing its Rust Gateway implementation. If accepted,
other native products can use that same supported substrate and node runtime
instead of carrying a Node.js wrapper or a separate protocol implementation.

## Implementation and evidence

- [RFC 0028 companion specifications](https://github.com/openclaw/rfcs/pull/54/files) define the Gateway client, bounded node runtime, future sidecar-hosting contract, conformance/adoption gates, and implementation/evidence inventory.
- [Foundation implementation and Tauri refactor](https://github.com/openclaw/openclaw/pull/116050)
- [Embeddable runtime follow-up](https://github.com/openclaw/openclaw/pull/116450)
- [Windows adopter seam](https://github.com/openclaw/openclaw-windows-node/pull/1068)

The RFC has also been reviewed through Gateway reliability, sidecar lifecycle,
enterprise security, and maintainer-correctness lenses. That review added
explicit fail-closed authority, audit, readiness, crash recovery, reconnect,
resource, and release gates. Current-head Rust evidence is green at #116050
`41f4e705887` (56 tests) and #116450 `894d125ee76` (73 tests plus strict static
gates). The final TypeScript UTF-8 fixture-validator run remains explicitly
pending after a local package-registry TLS failure; earlier hosted TypeScript
fixture lanes passed.
