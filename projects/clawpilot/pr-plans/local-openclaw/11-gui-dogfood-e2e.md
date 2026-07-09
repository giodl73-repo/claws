# Local OpenClaw PR11: GUI Dogfood E2E Proof

PR: https://github.com/giodl_microsoft/m/pull/57
Branch: `user/giodl/local-openclaw-submit-pr11-gui-dogfood-e2e`
Base: PR10

## Goal

Add an Electron/Playwright dogfood proof that exercises the Local OpenClaw path
from GUI launch through chat, permission cards, node capabilities, and
fail-closed unsupported capability behavior.

## Code Surfaces

- Add `e2e/local-openclaw-dogfood.test.ts`.

## Behavioral Contract

The E2E should launch Scout with local OpenClaw flags and a source-harness
stdio sidecar, verify Agents diagnostics, start chat from the GUI, approve
filesystem and shell capability cards, and assert unsupported capabilities fail
closed.

## Acceptance Tests

Run the Playwright E2E with one worker and no retries. Capture GUI-visible proof
for diagnostics, approvals, successful node capability execution, and
unsupported capability denial.

## Non-Goals

No live Lobster package, no production install/update, and no hosted cloud
runtime.
