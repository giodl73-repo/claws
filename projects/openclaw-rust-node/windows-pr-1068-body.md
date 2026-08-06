## Summary

Adds one replaceable Windows node-runtime boundary, one shared Windows capability
dispatcher, and a non-selectable C# conformance consumer of OpenClaw's proposed
authenticated Rust sidecar contract. It is independent contract proof, not a
second production runtime.

This consolidated Windows adopter PR now:

- introduces `INodeRuntimeClient` and an injectable factory while keeping
  `WindowsNodeClient` selected by default;
- moves `NodeService` and A2UI consumers behind that runtime contract;
- extracts command indexing, bounded execution, duplicate tracking,
  cancellation, telemetry, and completion into the transport-independent
  `NodeCapabilityDispatcher`;
- requires substitute runtimes to honor connection cancellation and retire
  cancelled candidates without blocking later reconnects;
- independently implements the authenticated framing, handshake, immutable
  configuration, admission, invocation, cancellation, result, and status
  contracts proposed by OpenClaw PR3; and
- routes admitted ordinary native invocations through the same
  `NodeCapabilityDispatcher`, without adding a second Windows policy or
  execution path.

The former stacked fork proof
[#2](https://github.com/giodl73-repo/openclaw-windows-node/pull/2) has been
fast-forwarded into this branch. The C# runtime remains the production default.

## Position in the series

1. [OpenClaw #116050](https://github.com/openclaw/openclaw/pull/116050) — shared
   Gateway client, bounded node-host foundation, headless binary, and Linux
   Tauri convergence.
2. [OpenClaw #116450](https://github.com/openclaw/openclaw/pull/116450) — signing,
   lifecycle/reconnect, duplex invocation, admission, Gateway authority,
   connection manifests, and shared conformance.
3. [OpenClaw #116863](https://github.com/openclaw/openclaw/pull/116863) —
   authenticated/versioned sidecar framing, handshake, immutable configuration,
   and the bounded ordinary-command runtime bridge.
4. **This PR** — the Windows runtime seam, shared capability dispatcher, and
   independent C# adopter proof.

OpenClaw and `openclaw-windows-node` are separate repositories, so this PR
cannot be Git-rebased onto #116863. The dependency is contractual: this branch
pins and reproduces #116863's three fixture corpora at OpenClaw head
`8d0a1b013ea83b1726e284d71791002260eac3c6`. Production Rust selection remains
blocked until that contract is accepted and the remaining adoption gates close.

## Ownership boundary

RFC #54 proposes that OpenClaw own the reusable protocol, Gateway authority
semantics, Rust runtime, and conformance corpora. Under that boundary, Windows
retains WinUI, operator behavior, MCP, approvals, native capability handlers,
process/artifact verification, protected bootstrap, concrete IPC, audit,
packaging, rollout, and rollback.

`WindowsNodeClient` still owns production Gateway wire parsing and response
framing. `NodeCapabilityDispatcher` owns Windows capability execution. The
sidecar adapter can only deliver authenticated, admitted ordinary invocations
into that dispatcher; it is not an `INodeRuntimeClient`, launches no process,
chooses no transport, and cannot be selected.

The generic Rust runtime still rejects the reserved `system.*` namespace. The
existing Windows `system.run` family therefore stays on C# until OpenClaw owns
an explicit authorization mechanism.

## Remaining adoption gates

Before Rust can become selectable, Windows still needs verified artifact/process
launch, protected credential handoff, concrete local IPC, live Gateway pairing
and issued-token lifecycle, duplex sidecar input/progress/heartbeat transport,
process/crash supervision, health and resource proof, product audit export,
packaging, rollout, and rollback.

## Validation

- `./build.ps1` — all Debug `win-x64` projects built successfully
- `dotnet test tests/OpenClaw.Shared.Tests/OpenClaw.Shared.Tests.csproj --no-restore --filter "FullyQualifiedName~RustSidecar"` — 60 passed
- `OPENCLAW_REPO_ROOT=<checkout> dotnet test tests/OpenClaw.Shared.Tests/OpenClaw.Shared.Tests.csproj --no-restore` — 3,462 passed, 32 existing environment-gated skips
- `dotnet test tests/OpenClaw.Tray.Tests/OpenClaw.Tray.Tests.csproj --no-restore` — 2,023 passed
- `dotnet test tests/OpenClaw.Connection.Tests/OpenClaw.Connection.Tests.csproj --no-restore` — 519 passed
- `./scripts/validate-mxc-e2e.ps1` on the runtime-seam head — 2/2 live Gateway MXC tests passed
- `git diff --check` — passed
- built-in Codex review plus independent correctness, architecture/API, and
  security reviews — all findings resolved; exact combined-head passes clean

The combined Windows head is
`3ca913a43a62957b8aca0448667facff3290fbc6`. The adapter review fixed
cancellation/registration races, response ordering, admission lifetime,
handshake role/version binding, result/envelope bounds, serde-compatible typed
and untyped number handling, and bounded canonicalization across `JsonElement`,
`JsonNode`, and `JsonDocument`.

## Real behavior proof

Behavior or issue addressed:
Windows needs one migration-safe execution boundary that preserves current
Gateway-to-native behavior while proving that the OpenClaw sidecar contract can
be consumed independently without bypassing Windows policy or handlers.

Real environment tested:
Windows 11, .NET SDK 10.0.302, combined head
`3ca913a43a62957b8aca0448667facff3290fbc6`, OpenClaw sidecar fixtures from
`8d0a1b013ea83b1726e284d71791002260eac3c6`, and the existing live Gateway/MXC
proof collected on runtime-seam head
`c0cfa8ba66802e601de23875b07caf941209e554`. The sidecar proof is an in-process
source harness; it does not launch an external Rust binary.

Exact steps or command run after this patch:

1. Build every Windows project at the combined head.
2. Reproduce all three Rust sidecar corpora byte-for-byte in C#.
3. Complete authentication, immutable configuration, admission, invocation,
   cancellation, result, and status flows.
4. Route admitted ordinary commands only through `NodeCapabilityDispatcher`.
5. Exercise authentication, ordering, identity, admission, serialization,
   cancellation, and resource-bound failures.
6. Run the focused and complete Shared/Tray suites.
7. On the unchanged production C# selection, run the live Gateway MXC harness
   for successful contained `system.run` and denied tray-data writes.

Evidence after fix:
The combined head passes 60 focused sidecar tests, 3,462 Shared tests, and 2,023
Tray tests. The retained live MXC transcript reports 2/2 passed: contained
`system.run` returned `OPENCLAW_GATEWAY_SYSTEM_RUN_MXC_OK`, and a write outside
the sandbox failed with `Access is denied` and `fileExists=False`.

Observed result after fix:
The incumbent C# runtime still executes real Gateway commands through the shared
dispatcher. Independently, the non-selectable adapter accepts the exact
OpenClaw sidecar contracts, routes ordinary admitted commands into that same
dispatcher, and fails closed on authentication, ordering, identity, admission,
cancellation, serialization, and output/work-bound violations.

What was not tested:
No Rust process was launched; no concrete IPC or protected bootstrap was used;
no live Gateway session selected the Rust runtime; and no `system.*` sidecar
command, crash recovery, production audit, resource measurement, packaged
artifact, rollout, or rollback was exercised. Production selection remains the
existing C# `WindowsNodeClient`.
