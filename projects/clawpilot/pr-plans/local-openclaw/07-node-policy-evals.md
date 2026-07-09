# Local OpenClaw PR7: Node-Mode Policy and Eval Framework

PR: https://github.com/giodl_microsoft/m/pull/41
Branch: `user/giodl/local-openclaw-submit-pr7-node-policy-evals`
Base: PR6

## Goal

Create the Desktop node-mode capability policy, approval, executor, and eval
framework without binding real filesystem/shell handlers yet.

## Code Surfaces

- Add `common/local-openclaw-node-capability.ts`.
- Add `common/desktop-node-capability-policy.ts`.
- Add `electron/desktop-node-capability-approval.ts`.
- Add `electron/desktop-node-capability-executor.ts`.
- Add `electron/desktop-node-capability-evals.ts`.
- Extend `electron/desktop-node-capability-bridge.ts`.

## Behavioral Contract

Capability requests must be classified, policy-checked, approval-aware, and
auditable before any handler dispatch. Missing handlers and denied policy must
fail closed with structured reasons.

## Acceptance Tests

Cover policy classification, approval mapping, bridge validation, executor
fail-closed behavior, and eval cases for allowed/denied/missing handlers.

## Non-Goals

No concrete filesystem or shell handlers, no GUI approval cards, and no hosted
cloud request bridge.
