# Local OpenClaw Group 6: GUI and Lobster Package Dogfood Proof

PR: [giodl_microsoft/m#77](https://github.com/giodl_microsoft/m/pull/77)
Branch: `user/giodl/local-openclaw-group6-gui-lobster-dogfood`
Base: `user/giodl/local-openclaw-group5-local-tools-diagnostics`
Replaces: #57, #58

## Objective

Prove the Local OpenClaw dogfood path through the GUI and through the
Lobster-packaged Gateway path without making Scout own production container
build, launch, or credential policy.

## Code Surfaces

- Add Electron E2E proof for Agents diagnostics, Start chat, approval cards,
  approved `filesystem.read`, approved `shell.exec`, and unsupported capability
  fail-closed behavior.
- Add `scripts/local-openclaw-lobster-stdio-adapter.mjs`.
- Add fake-Gateway `node:test` coverage for challenge, session creation,
  `chat.send`, assistant event translation, and final turn completion.
- Document the Lobster package-path dogfood setup and repeatability caveats.

## Acceptance Criteria

- GUI proof exercises the user-facing Desktop surface, not only source helpers.
- Lobster Gateway adapter can bridge Scout stdio frames to Gateway websocket
  traffic and return assistant output.
- Live proof can use the desktop-relevant GitHub Copilot entitlement path via a
  local compatible proxy without injecting an Anthropic key into the runtime.
- Remaining repeatability caveats are explicit and assigned to Lobster
  dev-validation work.

## Expected Validation

- `pnpm exec playwright test e2e/local-openclaw-dogfood.test.ts --workers=1 --retries=0`.
- `node --test scripts/local-openclaw-lobster-stdio-adapter.test.cjs`.
- `pnpm run test:scripts`.
- `pnpm run typecheck`.
- Focused type-aware `oxlint`.
- Focused `oxfmt --check`.
- `git diff --check`.
- Live Lobster package-path proof with Gateway session/run ids,
  `assistant.delta`, `turn.complete`, and `Lobster OpenClaw end`.
