# Cloud Agent Group 2: Approval, Audit, and Policy Contracts

PR: [giodl_microsoft/m#67](https://github.com/giodl_microsoft/m/pull/67)
Branch: `user/giodl/cloud-agent-group2-approval-policy-contracts`
Base: `user/giodl/cloud-agent-group1-foundations`
Replaces: #51, #52, #53

## Objective

Define the governance contract for hosted cloud-to-Desktop capability requests:
approval presentation semantics, replayable audit proof, and Lobster policy
decision evaluation.

## Code Surfaces

- Add approval presentation/result types for hosted Desktop capability requests.
- Map Desktop-local capability requests into user-visible approval copy, risk,
  data movement, identity, node endpoint, policy version, expiry, and
  one-shot-only decision metadata.
- Add audit records for request received, approval presented, and approval
  resolved.
- Add deterministic input summary and digest calculation.
- Add replay proof validation over identity, correlation, capability,
  input summary, digest, and terminal approval status.
- Add Lobster policy request/result contracts and fail-closed validation rules
  for malformed, stale, conflicting, or audit-mismatched policy responses.

## Acceptance Criteria

- Approval copy is generated from canonical request fields, not untrusted UI
  state.
- Audit replay can reconstruct why a hosted request was approved, denied, or
  invalid.
- Policy decisions fail closed when required fields, expiry, or audit proof are
  missing or inconsistent.
- No production approval UI, hosted transport, or execution path is introduced
  in this group.

## Expected Validation

- Focused Vitest coverage for approval presentation/result mapping, audit
  replay, input digest stability, and Lobster policy evaluation.
- Focused type-aware `oxlint`.
- `pnpm exec tsc --noEmit`.
- `git diff --check`.
