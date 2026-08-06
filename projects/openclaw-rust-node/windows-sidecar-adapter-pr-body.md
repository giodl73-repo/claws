> Superseded by and fast-forwarded into upstream draft Windows PR
> [#1068](https://github.com/openclaw/openclaw-windows-node/pull/1068). This fork
> PR is merged; the text below is retained as review history.

## Summary

Proves that the Windows node can independently consume the three OpenClaw Rust sidecar contracts from fork PRs [#193](https://github.com/giodl73-repo/openclaw/pull/193), [#194](https://github.com/giodl73-repo/openclaw/pull/194), and [#195](https://github.com/giodl73-repo/openclaw/pull/195) while keeping Windows capability execution in the shared `NodeCapabilityDispatcher` introduced by upstream draft [#1068](https://github.com/openclaw/openclaw-windows-node/pull/1068).

This slice adds:

- an independent C# implementation of the authenticated, versioned, directional, replay-resistant sidecar frame contract;
- the exact supervisor offer/accept handshake with local negotiation, channel-role binding, terminal retirement, and negotiated limit lowering;
- immutable configuration/manifest acknowledgement and strict typed runtime messages;
- admission, invocation, cancellation, status, and result routing through the existing Windows-owned dispatcher;
- bounded admission and outbound queues, concurrent invocation processing with one serialized inbound reader, bounded success/error serialization, exact envelope preflight, and fail-closed retirement; and
- byte-exact copies of all three language-neutral Rust fixtures plus a focused adapter/supervisor regression corpus covering framing, bounds, lifecycle, cancellation, timing, and serde-compatible value semantics.

The C# runtime remains the default. This branch does not implement `INodeRuntimeClient`, launch a Rust process, choose an OS transport, or change production selection.

## Position in the stack

1. [OpenClaw #116050](https://github.com/openclaw/openclaw/pull/116050) establishes the shared Rust Gateway client and node-host foundation.
2. [OpenClaw #116450](https://github.com/openclaw/openclaw/pull/116450) adds the embeddable lifecycle, duplex invocation, admission, and conformance layer.
3. Fork evidence [#193](https://github.com/giodl73-repo/openclaw/pull/193), [#194](https://github.com/giodl73-repo/openclaw/pull/194), and [#195](https://github.com/giodl73-repo/openclaw/pull/195) defines the candidate authenticated sidecar subset.
4. Windows draft [#1068](https://github.com/openclaw/openclaw-windows-node/pull/1068) adds the replaceable runtime seam and transport-independent Windows dispatcher while retaining C#.
5. **This fork PR**, stacked on #1068's exact head, independently reproduces the Rust vectors and proves ordinary native commands can cross the adapter without creating a second Windows policy or execution path.

This evidence is the promotion gate for consolidating OpenClaw fork PRs #193-#195 into one candidate upstream Rust-sidecar PR. The adapter itself stays in `openclaw-windows-node`.

## Ownership and deliberate gaps

OpenClaw owns the reusable protocol, Gateway authority, node-runtime semantics, and conformance corpus. Windows owns process/artifact verification, protected bootstrap, concrete local IPC, WinUI/operator/MCP/approval behavior, native capability handlers, audit export, rollout, and rollback.

This PR deliberately does not provide the verified Rust artifact/process owner, protected key and credential handoff, concrete named-pipe/socket transport, Gateway connection, pairing/issued-token lifecycle, crash/restart supervision, production health integration, resource proof, audit sink, rollout switch, rollback proof, or default-runtime selection. Those remain required before the adapter can become selectable.

The current Rust `CommandRuntime` also rejects the reserved `system.*` namespace. The existing Windows `system.run` family therefore remains on C# until OpenClaw defines an explicit authorized system-command mechanism; this slice does not weaken that boundary.

## Validation

- `./build.ps1` — all Debug `win-x64` projects built successfully
- `dotnet test tests/OpenClaw.Shared.Tests/OpenClaw.Shared.Tests.csproj --no-restore --filter "FullyQualifiedName~RustSidecar"` — 60 passed
- `OPENCLAW_REPO_ROOT=<checkout> dotnet test tests/OpenClaw.Shared.Tests/OpenClaw.Shared.Tests.csproj --no-restore` — 3,462 passed, 32 existing environment-gated skips
- `dotnet test tests/OpenClaw.Tray.Tests/OpenClaw.Tray.Tests.csproj --no-restore` — 2,023 passed
- `git diff --check` — passed
- built-in Codex review plus independent correctness, architecture/API, and security reviews — all findings resolved; exact-head final passes clean

Iterative review runs twice hit the existing telemetry listener test intermittently; each isolated rerun passed immediately. One final Shared run omitted its required `OPENCLAW_REPO_ROOT`; the correctly configured rerun passed all 3,462 non-skipped tests.

## Real behavior proof

Behavior or issue addressed:
The generic Rust sidecar proposal needed an independent non-Rust consumer proving that framing, handshake, configuration, admission, cancellation, bounds, and product ownership compose without bypassing the Windows dispatcher.

Real environment tested:
Windows 11, .NET SDK 10.0.302, commit `3ca913a43a62957b8aca0448667facff3290fbc6`, the Windows capability dispatcher at upstream #1068 head `c0cfa8ba66802e601de23875b07caf941209e554`, and byte-exact fixtures copied from OpenClaw Rust sidecar head `5bab2c9ecf6`. This is an in-process source harness, not an external Rust process or production IPC test.

Exact steps or command run after this patch:

1. Reproduce the Rust frame and handshake vectors byte-for-byte in C#.
2. Complete authentication and immutable manifest acknowledgement.
3. Admit and invoke an ordinary Windows capability only through `NodeCapabilityDispatcher`.
4. Process cancellation concurrently with a blocked invocation through one serialized inbound reader.
5. Exercise wrong-node, undeclared-command, changed-after-admission, duplicate, saturation, serialization, logical-output, exact-envelope, authentication, role, version, queue-retirement, and terminal-cancellation failures.
6. Run the focused and complete Shared/Tray suites above.

Evidence after fix:
Sixty focused tests pass, including exact Rust protocol/handshake/runtime corpora, successful dispatcher routing, cancellation while work is blocked, admission lifetime, handler/result deadline separation, typed and untyped serde-compatible number normalization, bounded canonicalization work across `JsonElement`, `JsonNode`, and `JsonDocument`, serialization failure recovery, bounded success and failure outputs, exact envelope fallback, and suppression of buffered frames after terminal authentication failure.

Observed result after fix:
The independent C# consumer accepts the exact Rust contracts, routes admitted ordinary commands through the existing Windows execution path, and fails closed on authentication, ordering, identity, admission, cancellation, and output-bound violations. No production runtime choice changes.

What was not tested:
No Rust binary was launched; no concrete IPC, protected bootstrap, real Gateway/pairing/token session, `system.*` invocation, crash recovery, production audit, resource measurement, packaged artifact, rollout, or rollback was exercised. Those remain explicit adoption gates rather than implied capabilities of this PR.
