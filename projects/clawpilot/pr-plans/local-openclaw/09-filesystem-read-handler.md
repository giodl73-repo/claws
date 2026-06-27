# Local OpenClaw PR9: Filesystem Read Handler

PR: https://github.com/giodl_microsoft/m/pull/43  
Branch: `user/giodl/local-openclaw-submit-pr9-filesystem-read`  
Base: PR8

## Goal

Add the first concrete Desktop node capability handler: workspace-scoped
filesystem read.

## Code Surfaces

- Add `electron/desktop-node-filesystem-read-handler.ts`.
- Register the handler in `electron/main.ts`.

## Behavioral Contract

The handler may read only files allowed by the workspace/path policy and must
return structured success/error payloads. Outside-workspace or missing-file
requests fail closed. The handler must not expose arbitrary local paths.

## Acceptance Tests

Cover allowed workspace file reads, outside-workspace denial, missing path,
directory/non-file handling, result shape, and registration.

## Non-Goals

No filesystem write, shell execution, browser control, or hosted cloud request
gateway.
