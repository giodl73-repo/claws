# B4: CAPI Model-Owner Adapter

## Outcome

Add the CAPI request and response adapter to the model-provider owner surface.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: B1 request shape; may proceed with B2 and B3
- Fork branch: `user/giodl/hosted-integration-b4-capi-owner-adapter`
- Commit: `126adf99c31302ac36651f673d4bb15eb99ad92f`
- Draft fork PR:
  [giodl73-repo/openclaw#43](https://github.com/giodl73-repo/openclaw/pull/43)

## Change

- Prepare the CAPI URL and query.
- Inspect model and stream mode from a bounded request body source.
- Produce non-secret metadata headers.
- Declare the CAPI bearer credential slot.
- Interpret the CAPI streamed response in the model owner.

## Non-Goals

- No universal provider-adapter registry.
- No DNS, transport, token acquisition, or traffic policy in the adapter.

## Proof And Exit

- Recorded fixtures prove request and SSE response parity with current CAPI
  behavior.
- Streaming does not require unbounded buffering.
- Missing or incompatible credential declarations fail before dispatch.

## Completed Proof

- Added `capi-model-provider-adapter/v1` as the concrete `lobster/capi`
  model-owner contribution.
- Requires HTTPS, validates template/tenant/model/body inputs, replaces
  caller-controlled CAPI metadata, and declares only `lobster/capi-token`.
- SSE adaptation supports LF, CRLF, CR-only, and mixed boundaries; preserves
  UTF-8 chunking; removes stale `Content-Length`; drops `[DONE]`; and resumes
  after bounded passthrough of an oversized event.
- Recorded `test/fixtures/capi-model-adapter-v1.json` for later cross-language
  Lobster/OpenClaw conformance.
- 119 focused tests passed: 12 infra and 107 agent/model-transport tests.
- Formatting, focused lint, core TypeScript, and `git diff --check` passed.
- Final Codex request-path wiring finding was rejected because B4 explicitly
  excludes activation; D2a owns model-owner selection after the required
  bundle, status/doctor, carrier, and traffic-policy contracts exist.
