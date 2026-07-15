# D5c: OpenClaw Graph Owner Adoption

## Outcome

Move agentic-user Graph preparation and response semantics to the Graph owner.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: D5a

## Change

- Define Graph-owned request preparation and typed bearer selection.
- Preserve Graph retry and result semantics.
- Reuse policy and physical dispatch only when needed.

## FACES Frame

- The current Graph owner is Lobster's vendored `m365mail` OpenClaw extension,
  not an upstream OpenClaw package. D5c promotes that semantic owner into the
  OpenClaw fork instead of creating a core-level generic Graph adapter.
- The owner must prepare only explicit
  `/users/{trustedAgentId}/sendMail` and
  `/users/{trustedAgentId}/messages/{messageId}/reply` requests.
- `trustedAgentId` comes from owner configuration projected by the trusted
  runtime. Inbound activity fields may confirm it but may not override it.
- V1 accepts only the four production Microsoft Graph cloud origins and one
  exact `lobster/graph-token` header slot.
- Graph mail POSTs are not generically replayed. Exact `202 Accepted` is the
  success contract; explicit throttling may surface bounded `Retry-After`
  advice, but timeout/disconnect/5xx outcomes remain uncertain and fail closed.
- The deletion target is Lobster's vendored
  `src/openclaw_container/m365mail-extension` source overlay.
- Disproof: if the promoted owner cannot preserve the existing webhook-to-one-
  email reply semantics, or if local and hosted preparation differ in URL,
  bytes, identity, or response classification, the slice is invalid.

## FACES Audit And Evaluation

- Reuse the existing channel package, account resolution, webhook/session
  ownership, one-email buffered reply behavior, and Graph body shapes.
- Adapt direct `fetch` into an owner-prepared request plus D2a physical
  dispatcher binding.
- Reject the existing preference for inbound `recipient.agenticUserId` over the
  trusted configured mailbox ID; a mismatch must fail before dispatch.
- Reject generic automatic retry guidance for side-effecting sends because an
  accepted request with a lost response can duplicate mail.
- Keep HTML bodies, delivery-status polling, additional Graph operations, and
  process activation out of D5c.
- Runtime/operator/security/simplicity review requires exact identity, exact
  origins, no bearer in the container, no Graph semantics in the dispatcher,
  and no second parallel Graph transport abstraction.

## Proof And Exit

- Local and hosted owner fixtures agree.
- Identity absence and incompatible resolver fail before dispatch.
- The complete promoted extension passes 104 owner tests; combined owner,
  traffic-policy, hosted-dispatch, bundle, manifest, and config proof passes
  162 tests.
- OpenClaw extension source and extension-test typechecks pass.
- Generated bundled-channel metadata and docs-map checks pass.
- Plugin SDK export, raw-channel-fetch, and channel-agnostic boundary checks
  pass for D5c. The repository-wide monolithic plugin-SDK guard still reports
  the pre-existing D5a-stack `extensions/lobster-host/index.ts` import.
- The promoted legacy local transport now uses `fetchWithSsrFGuard` with HTTPS,
  a 30-second timeout, and zero redirects; hosted transport remains the D5a
  generic provider-request runtime.
- Final Codex review is clean with no accepted/actionable findings.
- Published fork-only as commit `5cce30fce01` and draft
  [OpenClaw PR 65](https://github.com/giodl73-repo/openclaw/pull/65),
  stacked on D5a PR 63. No matching PR exists in `openclaw/openclaw`.
