# Local OpenClaw Group 5: Local Tools and Diagnostics Proof

PR: [giodl_microsoft/m#76](https://github.com/giodl_microsoft/m/pull/76)
Branch: `user/giodl/local-openclaw-group5-local-tools-diagnostics`
Base: `user/giodl/local-openclaw-group4-node-policy-runtime`
Replaces: #43, #44

## Objective

Add the first narrow local execution handlers and diagnostics proof:
workspace-scoped approval-gated `filesystem.read`, approval-required
`shell.exec`, bounded execution behavior, and read-only diagnostics.

## Code Surfaces

- Add `filesystem.read` handler with workspace scoping and approval/audit
  requirements.
- Add `shell.exec` handler with approval requirement, deny-floor policy recheck,
  workspace cwd constraints, sanitized environment, timeout, bounded output, and
  process cleanup.
- Add read-only diagnostics through `backend:capabilities`, `agents:list`, and
  the Agents panel.
- Update local runtime architecture docs for the grouped stack.

## Acceptance Criteria

- Real local tool handlers remain late, narrow, approval-gated, and auditable.
- No filesystem write or broad command surface is introduced.
- Denied, unsupported, invalid, or policy-blocked requests do not execute.
- Diagnostics are read-only and do not grant capability access.

## Expected Validation

- Focused filesystem, shell, diagnostics, node-mode, policy, approval, audit,
  IPC, and Agents panel tests.
- `pnpm exec tsc --noEmit`.
- Focused type-aware `oxlint`.
- Focused `oxfmt --check`.
- `git diff --check`.
