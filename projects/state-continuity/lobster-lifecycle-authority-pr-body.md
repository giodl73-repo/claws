## Summary

- add permanent revoked and destruction-finalized terminal states to RFC 0013
  final-handoff acceptance
- race retained-work/operator revocation against source-generation finalization
  with Azure Blob ETag compare-and-swap
- return one deterministic, generation-scoped destruction authorization while
  preserving exact acceptance replay

## Stack

This fork-only PR 3C draft is stacked on PR 3B
[giodl/lobster#25](https://microsoft.ghe.com/giodl/lobster/pull/25), branch
`user/giodl/rfc-0013-permanent-acceptance`. Its focused diff is one commit:
`9a1a72ab76`.

## Boundary

This PR owns only the permanent lifecycle commit point. It does not call
OpenClaw, invoke `gateway.suspend.*`, fence ingress, stop a process, call a
provider, or delete anything.

`DestructionFinalized` authorizes removal of only the exact source compute
generation named by the accepted handoff. It does not authorize deletion of
recovery points, persistent tenant data, credentials, registry records, or a
different generation.

## Evidence

- finalization wins from accepted state and exact replay returns the same
  authorization
- revocation wins from accepted state and later finalization remains revoked
- two journal instances racing finalization/revocation converge on one terminal
  result
- acceptance remains replayable after either terminal transition
- durable timestamps preceding acceptance fail closed
- deterministic authorization binds contract version, accepted fingerprint,
  source generation, lifecycle revision, recovery point, and acceptance set
- `just rust-fmt-check` passed
- `git diff --check` passed
- final Codex commit review found no actionable correctness issue

`just cargo test final_handoff --no-fail-fast` compiles this change but remains
blocked on Windows by the five existing unresolved `windows_sys` imports in
`mip/engine/staging.rs`. Linux CI is still required to execute the focused
tests.

## Autoreview fixes

- preserve acceptance replay after lifecycle state becomes terminal
- reject corrupt terminal timestamps that predate the accepted receipt

## Review focus

- Is terminal ETag CAS the correct atomic boundary for retained-work versus
  destruction-finalization races?
- Is the authorization sufficiently narrow for the later provider-wiring PR?
- Should any additional closed revocation reason be frozen before PR 3D?
