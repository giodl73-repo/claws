# Local OpenClaw Switch-Over PR83: CI and Full Switch-Over Dogfood Proof

PR: [giodl_microsoft/m#83](https://github.com/giodl_microsoft/m/pull/83)
Branch: `user/giodl/local-openclaw-switch-pr83-ci-dogfood`
Base: PR82

## Objective

Tie the switch-over stack together with repeatable CI and dogfood proof:
non-Copilot model completion, managed package launch, browser/clipboard/local
app/write/M365 capability gates, token isolation, GUI validation, and rollback.

## Code Surfaces

- Add CI/source-harness lanes for package launch, provider completion,
  capability no-bypass tests, and switch-over rollback.
- Add cross-platform guards for Windows-required flows and explicit unsupported
  behavior on other platforms.
- Add a full dogfood scenario that performs useful work through OpenClaw without
  GitHub Copilot CLI.
- Update docs/runbooks for setup, proof capture, failure triage, and rollback.

## Acceptance Criteria

- The full switch-over path can complete without Copilot CLI.
- CI or repeatable source-harness proof covers provider completion, package
  lifecycle, GUI dogfood, capability no-bypass tests, token isolation, and
  rollback.
- Windows proof is explicit; macOS/Linux behavior is either validated or
  deliberately reported unsupported.
- PR body includes exact commands, environment shape, artifacts, and remaining
  rollout gaps.

## Expected Validation

- CI/source-harness lane for switch-over proof.
- GUI dogfood proof on Windows.
- Non-Copilot provider completion proof.
- Capability no-bypass suite across filesystem, shell, browser, clipboard,
  local app, workspace write, and M365 broker actions.
- `pnpm run typecheck`.
- Focused type-aware `oxlint`.
- Focused `oxfmt --check`.
- `git diff --check`.

## Non-Goals

No broad production rollout, no removal of Copilot fallback, and no unsupported
platform claims without proof.
