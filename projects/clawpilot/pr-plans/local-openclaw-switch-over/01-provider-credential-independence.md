# Local OpenClaw Switch-Over PR78: Provider and Credential Independence

PR: [giodl_microsoft/m#78](https://github.com/giodl_microsoft/m/pull/78)
Branch: `user/giodl/local-openclaw-switch-pr78-provider-credentials`
Base: `user/giodl/local-openclaw-group6-gui-lobster-dogfood`

## Objective

Prove the Local OpenClaw/Lobster package path can complete without GitHub
Copilot CLI, `cccproxy`, or hidden Copilot entitlement dependency, while making
credential and policy ownership explicit.

## Code Surfaces

- Add a non-Copilot model provider configuration contract for Local OpenClaw
  package-path validation.
- Add credential source metadata, model allowlist, redaction, and missing-key
  fail-closed status.
- Add local-dev override guards for provider endpoint/model only when explicitly
  enabled.
- Surface provider independence in diagnostics and audit proof without exposing
  secrets.

## Acceptance Criteria

- Live or source-harness proof returns `assistant.delta` and `turn.complete`
  through the Lobster Gateway/package path without Copilot CLI or `cccproxy`.
- OpenClaw never receives raw credential values through Scout diagnostics,
  audit, PR proof, or result frames.
- Missing, disallowed, or stale provider credentials fail closed with actionable
  diagnostics.
- The PR body records redacted environment shape, provider kind, model id,
  Gateway session/run id, and exact output proof.

## Expected Validation

- Focused provider config and credential redaction tests.
- Gateway adapter proof with a non-Copilot provider.
- `pnpm run typecheck`.
- Focused type-aware `oxlint`.
- Focused `oxfmt --check`.
- `git diff --check`.

## Non-Goals

No new browser, clipboard, local app, workspace write, or M365 capability.
