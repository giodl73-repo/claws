# Official OpenClaw Node Implementation Inventory

Audited 2026-07-29 from OpenClaw-owned repositories and the proposed Rust PR
stack. This inventory distinguishes the language-neutral node contract from
the platform-specific capabilities implemented on top of it.

## Conclusion

OpenClaw already supports a family of node implementations. Rust is not a new
protocol or a Microsoft exception. It is a proposed reusable native/headless
implementation of the same node role.

The implementations are not expected to expose identical tools. They must
conform to the common protocol for every capability and command they advertise.
The capability manifest is therefore a connection-scoped declaration of what
this node can serve now, not a universal checklist every node must implement.

## The Common Standard

| Contract area | Common expectation | Current consolidation |
| --- | --- | --- |
| Admission | Negotiate the Gateway protocol, use `mode=node`, `role=node`, and empty node scopes. | Published protocol and server behavior are authoritative. |
| Identity and auth | Use stable device identity, challenge-bound signing, device pairing, and role-keyed device tokens. | Implemented across TypeScript, Swift/Kotlin, C#, C, and the proposed Rust client. Shared fixtures should remain authoritative. |
| Capability declaration | Send current `caps`, `commands`, permissions, and platform metadata during connect. | Common wire shape; capability names and availability are platform-specific. |
| Invocation | Receive `node.invoke.request`, route by exact advertised command, and return `node.invoke.result` with bounded payloads and structured errors. | Common behavior. Command parameter schemas are not uniformly published in the connect manifest. |
| Duplex lifecycle | Handle invocation input, progress, cancellation, timeout, disconnect, and stale-session cleanup where the command needs them. | Behavior exists in the mature hosts, but publication and cross-language fixtures for all lifecycle frames are still being consolidated. |
| Runtime safety | Do not block the receive loop; bound requests, concurrency, queues, timeouts, and reconnect; reject stale or duplicate work. | Same invariant, with platform-appropriate mechanics. |
| Authority | Device pairing and node capability approval are distinct; advertising a command does not bypass Gateway authorization or local platform policy. | Gateway remains authoritative; local permission and approval policy can further restrict execution. |

## Implementation Matrix

| Implementation | Role and reuse boundary | Capability/tool surface | Lifecycle and security strengths | Intentional limits |
| --- | --- | --- | --- | --- |
| TypeScript `src/node-host` | Generic headless Node.js/Bun node and current executable behavioral reference. Loads built-ins plus plugin-contributed node commands. | `system`: `system.run.prepare`, `system.run`, `system.which`, `system.execApprovals.get`, `system.execApprovals.set`; dynamically adds plugin capabilities and commands. It also resolves skill-provided binaries used by execution policy. | Signed device identity, local/remote auth selection, reconnect classification, exact plugin dispatch, execution approval policy, invocation request/input/cancel handling, timeouts, and result delivery. | Process-oriented; does not provide native camera, screen, canvas, mobile, or IoT adapters by itself. |
| Shared Swift `GatewayNodeSession` | Reusable Apple node-session primitive used by platform apps; it has no fixed capability catalog of its own. | Caller supplies role, scopes, capabilities, commands, permissions, identity, and handlers. | Connection generations, route invalidation, bounded request deadlines, invoke request/input/cancel callbacks, result delivery, and stale-session rejection. | Apple concurrency/transport and Keychain integration; not a standalone headless host. |
| macOS Swift node | Native app node built on the shared Swift session. | Always: canvas/A2UI, screen snapshot/record, notification, `system.which`, `system.run`, exec-approval get/set. Conditional: browser proxy, camera list/snap/clip, and location. | Connection-scoped manifest snapshots, route revalidation before dispatch, TCC permission integration, app/worker coordination, and native approval UX. | macOS app lifecycle and native services; not a portable runtime. |
| iOS Swift node | Native iPhone/iPad node plus a separate operator session. | Canvas/A2UI, screen record, notification, chat push, push-to-talk; conditional camera, location, device info/status, Watch status/notify, photos, contacts, calendar, reminders, motion, and health summary. | Role-separated sessions, permission-derived dynamic manifest, Keychain/device-token storage, signed identity, reconnect control, and native foreground/permission gates. | Mobile lifecycle and foreground restrictions; no generic `system.run`. |
| iOS share extension | Ephemeral, profile-isolated node used only to relay a share. | Advertises empty capabilities and commands. | Proves that a valid node may be commandless; uses a distinct identity profile and one-shot connection lifecycle. | Not a general node host and does not imply ambient capability. |
| watchOS direct Swift node | Small foreground direct node using the Gateway's HTTPS direct-node bridge rather than the normal WebSocket session. | `device.info`, `device.status`, `system.notify`; currently advertises no capability category strings. | Signed device identity, bootstrap-to-device-token handoff, TLS-only setup, polling, connection generations, and stale-work rejection. | Foreground-only, HTTP poll transport, small fixed catalog, and no general duplex WebSocket runtime. |
| Android Kotlin node | Native Android node plus a separately scoped operator session. | Dynamic catalog spanning canvas/A2UI, camera, location, device status/info/permissions/health/apps, notifications, photos, contacts, calendar, motion, SMS, call log, talk, and debug-only diagnostics. Capabilities are filtered by permission, feature, and build state. | V3 challenge-bound signing, role-keyed token storage, bounded credential retry/clear, dynamic manifests, foreground gates, timeouts, structured results, and Android permission integration. | Android UI/service lifecycle; no generic desktop execution host. |
| Windows C# node | Native Windows node library embedded in the official tray/companion suite; also has operator-side product surfaces. Capabilities are registered as handlers. | App control/chat, browser proxy, camera, canvas/A2UI, device info/status, location, screen capture/record, STT, TTS, and system notification/run/which/approval commands. Registration can omit unavailable capabilities. | Separate operator/node connections, signed identity and pairing diagnostics, O(1) exact dispatch, duplicate protection, eight-invocation bound with immediate busy response, cancellation registry, disconnect cleanup, local approval UX, telemetry, and MCP bridging in the surrounding app. | Windows/WinUI product and native service integration; not a portable language-neutral node crate. |
| ESP-IDF C component | Reusable embedded node component; applications register plain-string capabilities and commands before connecting. | No mandatory fixed catalog. Examples provide `device.info/status`, GPIO mode/read/write, ADC read, and display show/status. Defaults allow 16 capabilities and 32 commands. | Ed25519 identity in NVS, setup/shared-token/password/no-auth and saved-session paths, role-keyed sessions, explicit state machine, transport generations, one serialized work queue, bounded RPCs, and ignored retired callbacks. | One connection attempt at a time; application owns network/reconnect policy. No parameter schemas in the advertised manifest and a deliberately small invocation surface. |
| Linux Tauri Rust client | Operator/UI Gateway client, not a node implementation. It is the production Rust source for reusable transport and security behavior. | Quick Chat/operator requests; `mode=ui`, `role=operator`; no node capability catalog. | TLS pinning, device-token persistence/mismatch clearing, challenge signing, request correlation, heartbeat/half-open detection, and server-directed reconnect pause. | App-coupled sequential request loop and Tauri `AppHandle`; cannot stand in for node mode. |
| Proposed OpenClaw Rust stack | Tauri-free `openclaw-gateway-client` plus reusable `openclaw-node-host` session/runtime and headless host profile. Native apps inject identity storage, connection creation, policy, and command handlers. | Handler-defined, customer-neutral manifest. The current slices intentionally prove generic typed commands rather than copying the TypeScript `system.*` or a Microsoft-native catalog. | Role-safe session profiles, challenge-bound identity, issued-token handoff, reconnect lifecycle, bounded correlation and retained/live events, exact invocation routing, input/progress/cancel, UTF-8-safe chunks, deadlines, duplicate rejection, backpressure, disconnect cleanup, and runnable health/readiness. | Draft and not yet official. No built-in Windows, Apple, Android, ESP, MCP, skills, plugins, or full TypeScript execution-policy parity. Those are separately owned capability layers. |

## What Is Actually Standardized Per Implementation

Each implementation owns four things:

1. **Transport adapter:** WebSocket, direct HTTP polling, TLS policy, platform
   networking, and reconnect integration.
2. **Identity adapter:** key storage, device-token storage, setup/bootstrap UX,
   and platform trust prompts.
3. **Capability adapters:** the actual camera, screen, process, GPIO, canvas,
   mobile-data, or other handlers that the platform can serve.
4. **Host lifecycle:** foreground/background rules, tray/service supervision,
   health/readiness, packaging, and local approval UX.

OpenClaw owns the language-neutral contract joining those pieces: admission,
identity proof, pairing, manifest semantics, invocation envelopes, cancellation,
result/error behavior, and conformance evidence.

## Implication for Rust

The Rust proposal should not promise a second copy of every platform catalog.
It should standardize the reusable transport/session/runtime mechanics and make
capability adapters pluggable. Microsoft can then implement Windows Companion
and Scout-specific native adapters without forking the Gateway contract, while
other adopters can provide different Rust handlers.

The strongest follow-up is a cross-language conformance corpus shared by the
TypeScript, Swift/Kotlin, C#, C, and Rust implementations. That converts the
existing behavioral standard into mechanically checked compatibility without
forcing every language to expose the same tools.

## Source Pins

- `openclaw/openclaw` `origin/main`: `b07efcb6dc7e84451b8421637f412df4de4a52ab`
- `openclaw/openclaw-windows-node` `main`: `c04c5fb062385d7185a2e1a8e83d9f8ebe4c6296`
- `openclaw/esp-openclaw-node` `main`: `a1b324adb463dac9e85329a6288934c1f1c3d24a`
- Proposed Rust implementation: OpenClaw PR `#116050` and stacked fork PRs
  `giodl73-repo/openclaw#186` and `#187`.
