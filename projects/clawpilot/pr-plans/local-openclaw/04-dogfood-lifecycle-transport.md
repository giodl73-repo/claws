# Local OpenClaw PR4: Dogfood Lifecycle and Transport

PR: https://github.com/giodl_microsoft/m/pull/38  
Branch: `user/giodl/local-openclaw-submit-pr4-dogfood-lifecycle-transport`  
Base: PR3

## Goal

Add the process lifecycle and stdio transport primitives required to dogfood a
local OpenClaw sidecar, while keeping actual runtime use gated.

## Code Surfaces

- Add `common/local-openclaw-runtime-compatibility.ts`.
- Add `electron/local-openclaw-lifecycle.ts`.
- Add `electron/local-openclaw-stdio-transport.ts`.
- Extend local discovery and backend IPC status with compatibility/lifecycle
  details.
- Wire main-process construction only enough to instantiate lifecycle holders.

## Behavioral Contract

Lifecycle and transport objects must be explicit, observable, restartable, and
safe on unsupported platforms. Compatibility checks must explain why a runtime
is unavailable instead of attempting launch.

## Acceptance Tests

Cover runtime compatibility, lifecycle transitions, stdio message framing,
backend IPC status, and discovery diagnostics.

## Non-Goals

No GUI chat routing, no Desktop capability execution, no Lobster package path,
and no default launch outside explicit dogfood flags.
