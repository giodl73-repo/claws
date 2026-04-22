# two-provider-host fixture — SOUL

Shared fixture for the OC-7 envelope-stickiness trio (SC-08 / SC-09 / SC-10).
Registers two independent providers — `security-review` and
`compliance-review` — so the merger surface can exercise the
`deny > review > modify > allow` ladder end-to-end:

- **SC-08 single-latch.** One provider's `review` latches the envelope on
  first emission; a second provider returning `allow` cannot downgrade it.
- **SC-09 conjunctive.** Both providers return `review` with distinct
  `approvalHandle`s; both handles' `contentHash` MUST equal
  `ctx.canonicalInvocationHash` (CL-07 amendment §1a P-02 mitigation).
- **SC-10 partial approval.** Two reviews open; one companion approves,
  the other stalls; the decision stays `pending-conjunctive` and the
  tool is never executed until every companion resolves.

## Policy

Both providers are registered for the same tool (`records.export`) and
both observe the P-02 host-supplied canonical invocation hash. The
merger honors the OC-7 precedence; `requireApproval` stickiness crosses
providers.
