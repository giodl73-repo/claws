# Lobster Live Doctor Adopter Review

## Thesis And Deletion Target

Prove that the real packaged Lobster plugin can feed OpenClaw's registered
Doctor health contribution through a live Gateway without adding product
behavior. The slice deletes the need for a synthetic adopter or a second
Doctor-specific readiness schema.

## Source Audit And Internal Analogue

The Lobster plugin naturally reports three `Unknown` and two `True` readiness
states in validation mode; it has no honest live `False` state. The proof
therefore covers real `Unknown` warnings and ready-state silence, while the
OpenClaw unit suite retains `False`-to-error coverage. No test-only readiness
override was added.

The implementation extends the existing PR 44 live status harness rather than
copying its packaged-plugin staging, Gateway startup, and authenticated status
query. A child-process readiness message now fences the first status RPC from
cold Gateway startup.

## Stakeholder Review

- Gateway engineering: the proof uses the CLI-scoped operator client, performs
  one bounded read-only inventory call, and waits for the real server startup
  promise before querying it.
- Power users: the three unavailable owner-reported services produce stable,
  actionable warning targets; the two ready services produce no noise.
- Security: plugin identity, raw owner reason codes, and raw owner messages are
  asserted absent from Doctor findings. The harness adds no activation,
  deployment, repair, or credential authority.

## Evidence Slice

- OpenClaw fork draft PR 170: `b728840dcea`
- Lobster fork draft PR 48: `55a9c033028d38b88dad3e83c280895dc9984b7a`
- Packaged plugin discovery: one `lobster/host` bundle with five contributions
- Doctor result: three redacted `Unknown` warnings for CAPI, CAPI token, and
  reverse provider; enterprise egress and egress remain silent
- Reliability: two consecutive cold-start runs and one committed exact-head run
  passed
- Local gates: 12 Lobster plugin tests, OpenClaw focused tests/type/lint gates,
  diff hygiene, and clean Codex reviews

## Promotion Boundary

PR 48 is a fork-only draft stacked on Lobster PR 44. No OpenClaw upstream issue
or PR is authorized by this proof, and Lobster's required GitOps/Azure contexts
remain promotion-time gates rather than manually queued checks.

## Canonical recomposition

Fork draft PR 52, branch `user/giodl/lobster-profile-doctor-inventory`, head
`0cf67c2d050104e57ec5b3eb67a331a50260dc88`, is now stacked directly on live
Status proof PR 50. Against exact OpenClaw PR 178 head `2921def00df`, the real
packaged plugin publishes five honest inactive `Unknown` states and Doctor
projects exactly five redacted warnings. No ADO run was manually queued and no
upstream issue or PR was opened.
