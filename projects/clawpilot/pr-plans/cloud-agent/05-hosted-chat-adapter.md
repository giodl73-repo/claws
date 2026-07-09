# Cloud Agent PR5: Hosted OpenClaw Chat Adapter

PR: https://github.com/giodl_microsoft/m/pull/49
Branch: `user/giodl/cloud-agent-pr5-hosted-chat-adapter`
Base: PR4

## Goal

Define a hosted OpenClaw chat adapter contract that translates hosted runtime
events into the existing backend event vocabulary.

## Code Surfaces

- Add `electron/backend/hosted-openclaw/chat-adapter.ts`.
- Add `electron/backend/hosted-openclaw/chat-adapter.test.ts`.

## Behavioral Contract

The adapter accepts send requests with session id, runtime binding, and payload.
It tracks run ids, normalizes hosted text/tool/status/error/usage/idle events
into `BackendEvent`, routes events only to matching session/run subscribers, and
passes the active run id to abort.

## Acceptance Tests

Cover send payload preservation, event normalization, run correlation, stale
event dropping, unsubscribe, idle/error terminal cleanup, and abort behavior.

## Non-Goals

No production transport, SessionManager routing, hosted allocation, UI, or cloud
service call.
