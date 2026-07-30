## Summary

- introduce `INodeRuntimeClient` and an injectable factory at the Windows capability-host boundary
- keep the existing C# `WindowsNodeClient` as the default, with no production behavior change
- make `NodeService` and A2UI consumers depend on the runtime contract
- extract Windows-owned command routing and execution into the transport-independent `NodeCapabilityDispatcher`
- give the current C# runtime and a future Rust adapter one shared path for command indexing, bounded execution, duplicate tracking, cancellation, telemetry, and completion events
- record the ownership boundary, migration sequence, and behavioral architecture guards

This is the consolidated Windows adopter slice for the proposed OpenClaw Rust runtime in [openclaw/openclaw#116050](https://github.com/openclaw/openclaw/pull/116050), its [stacked follow-up #116450](https://github.com/openclaw/openclaw/pull/116450), and [RFC #54](https://github.com/openclaw/rfcs/pull/54). It shows how the existing Windows tray can adopt that runtime without rewriting WinUI, the operator role, MCP, approvals, or Windows-native capability handlers.

## Position in the series

1. [OpenClaw #116050](https://github.com/openclaw/openclaw/pull/116050) creates the reusable Gateway client, bounded node-host foundation, and headless binary, and makes the Linux Tauri app its first consumer.
2. [OpenClaw #116450](https://github.com/openclaw/openclaw/pull/116450) adds the embeddable lifecycle, duplex invocation, admission, connection manifests, and cross-language conformance layer.
3. **This PR** prepares the official Windows tray/node to adopt that runtime through a replaceable client boundary and one shared Windows capability dispatcher.

This PR is independently safe to land because it keeps the existing C# runtime selected. The later authenticated, versioned Rust adapter depends on the OpenClaw runtime series; this refactor itself does not.

## Ownership boundary

`WindowsNodeClient` still owns Gateway wire parsing and response framing. `NodeCapabilityDispatcher` owns Windows capability execution. A future Rust `INodeRuntimeClient` adapter can therefore deliver decoded invocations into the same dispatcher instead of duplicating Windows routing or policy.

Production runtime selection remains unchanged. This PR adds no Rust binary, local IPC, new command, permission, or Gateway policy.

The branch is rebased onto upstream `9acafa60`. The rebase preserves current `main` behavior for signed challenge timestamps, reconnect authorization, and disposal notification through the generic runtime interface.

## Migration path

1. Define authenticated, versioned local IPC against the consolidated OpenClaw embeddable-runtime contract ([Rust follow-up draft #116450](https://github.com/openclaw/openclaw/pull/116450)).
2. Add an opt-in C# adapter implementing `INodeRuntimeClient` over that Rust sidecar protocol and feed decoded invocations into `NodeCapabilityDispatcher`.
3. Run the C# and Rust paths through shared registration and invocation conformance fixtures.
4. Switch behind an explicit rollout gate, then remove duplicated C# Gateway transport only after parity and rollback evidence.

## Validation

- `./build.ps1` (Debug, win-x64): all projects built successfully
- `dotnet test ./tests/OpenClaw.Shared.Tests/OpenClaw.Shared.Tests.csproj --no-restore`: 3,402 passed, 32 existing environment-gated skips
- `dotnet test ./tests/OpenClaw.Tray.Tests/OpenClaw.Tray.Tests.csproj --no-restore`: 2,022 passed
- `dotnet test ./tests/OpenClaw.Connection.Tests/OpenClaw.Connection.Tests.csproj --no-restore`: 516 passed
- `./scripts/validate-mxc-e2e.ps1`: full repository, tray, and E2E builds succeeded with 0 warnings and 0 errors; 2/2 live Gateway MXC tests passed
- `git diff --check upstream/main...HEAD`: passed
- `codex review --base upstream/main`: no actionable correctness regressions identified

## Real behavior proof

Behavior or issue addressed:
The new runtime boundary and shared dispatcher must preserve real Gateway-to-Windows-node execution, including successful contained `system.run` and rejection of writes outside the MXC sandbox, while the C# runtime remains the default.

Real environment tested:
Windows 11 build 26310, commit `194928fdc0c86be1360b79c2f109520ef01959ec`, .NET SDK 10.0.302, WSL 2 with an isolated Ubuntu 24.04 instance, OpenClaw CLI 2026.6.11, a live loopback Gateway, the built Windows tray/node host, and the real MXC/AppContainer executor.

Exact steps or command run after this patch:

1. Run `./scripts/validate-mxc-e2e.ps1` from the consolidated PR checkout.
2. Let the harness build the repository, tray, and E2E host; create and configure a fresh isolated WSL distro; start and pair the live Gateway and Windows node; and invoke both MXC scenarios.
3. Let the harness uninstall the test deployment and unregister the isolated distro.

Evidence after fix:
The retained console/TRX transcript at `TestResults/MxcE2E/OpenClaw.E2ETests.Mxc.trx` reports `Test Run Successful`, `Total tests: 2`, `Passed: 2`. The success invocation returned `OPENCLAW_GATEWAY_SYSTEM_RUN_MXC_OK`, exit code 0, `contained=True`, and `containment=mxc`. The denied-write invocation returned exit code 1 with `Access is denied.`, confirmed `fileExists=False`, and reported `containment=mxc`. Teardown completed successfully and unregistered the generated distro.

Observed result after fix:
Both `RealGateway_SystemRun_ExecutesThroughWindowsNodeMxcSandbox` and `RealGateway_SystemRun_BlocksWritesToTrayDataDirectoryInMxcSandbox` passed through the live Gateway, replaceable runtime boundary, and shared Windows dispatcher. Existing production selection still chose the C# `WindowsNodeClient`.

What was not tested:
The future Rust IPC adapter and runtime-selection rollback are not part of this PR and were not tested. Production runtime selection remains the existing C# client.
