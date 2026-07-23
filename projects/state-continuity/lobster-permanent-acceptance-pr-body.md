## Summary

- back RFC 0013 final-handoff acceptance with permanent Azure Blob state
- use create-if-absent and ETag compare-and-swap for first acceptance, replay,
  and irreversible conflict quarantine
- bound CAS retries and fail closed on backend, corrupt-state, and unknown
  outcomes

## Stack

This fork-only draft is stacked on the PR 3A contract branch
`user/giodl/rfc-0013-host-acceptance-contract`, whose upstream draft is
bic/lobster#5481. The focused diff is one commit: `c12685b5eb`.

## Boundary

This PR only makes PR 3A's acceptance decision permanent across process, pod,
and Redis loss. It adds no runtime caller, configuration, Gateway operation,
provider call, lifecycle revocation/finalization transition, or destruction
authority. Those remain separate follow-on slices.

Redis is deliberately not used as irreversible authority. Storage references
remain opaque and non-secret; Azure Blob credentials and URLs are not written
into handoff receipts.

## Evidence

- first-write acceptance through create-if-absent
- identical replay after journal recreation
- conflicting source-generation quarantine through ETag CAS
- permanent quarantine observed by a third journal instance
- bounded CAS conflict retry and exhaustion
- corrupt durable bytes fail as `CorruptState`
- `just rust-fmt-check` passed
- `git diff --check` passed
- Codex commit review found no actionable defects

`just cargo test final_handoff --no-fail-fast` reaches `lobster-runtime` but is
blocked on Windows by five existing `windows_sys` resolution errors in
`mip/engine/staging.rs`; it reports no errors in this change. Linux CI remains
required for the focused test execution.

## Review focus

- Is Azure Blob ETag CAS the accepted permanent authority boundary for this
  evidence slice?
- Are the accepted/replay/quarantined semantics sufficient before the later
  lifecycle-finalization state machine is introduced?
- Does any caller need to remain private until the RFC owner boundary is
  approved?
