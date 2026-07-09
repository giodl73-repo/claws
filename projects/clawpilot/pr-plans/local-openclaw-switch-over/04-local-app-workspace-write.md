# Local OpenClaw Switch-Over PR81: Local App and Workspace Write Capabilities

PR: [giodl_microsoft/m#81](https://github.com/giodl_microsoft/m/pull/81)
Branch: `user/giodl/local-openclaw-switch-pr81-app-write`
Base: PR80

## Objective

Add local action capabilities that make dogfood work practical: intent-based
local app/file/URL opening and workspace-scoped write/patch with diff preview,
approval, rollback evidence, and audit.

## Code Surfaces

- Add `app.open`, `file.openWithDefaultApp`, and `url.openExternal` intent
  contracts with allowlisted target classes.
- Add `filesystem.write` and `filesystem.patch` contracts with workspace scope,
  file size/path limits, diff preview, and result digests.
- Add approval cards, executor seams, rollback metadata, and audit events.
- Add no-bypass tests for arbitrary executable launch and recursive destructive
  file operations.

## Acceptance Criteria

- Local app actions are intent-based and allowlisted; arbitrary executable path
  launch is denied.
- Workspace write/patch requires diff preview and explicit approval.
- Recursive delete/move, write outside workspace, and hidden broad grants fail
  closed.
- Audit captures target, digest, diff summary, approval id, and rollback hint.

## Expected Validation

- Focused contract, policy, approval, executor, rollback, and audit tests.
- GUI proof for approved patch/write and denied out-of-scope write.
- `pnpm run typecheck`.
- Focused type-aware `oxlint`.
- Focused `oxfmt --check`.
- `git diff --check`.

## Non-Goals

No arbitrary app automation, no recursive destructive operations, and no M365
actions.
