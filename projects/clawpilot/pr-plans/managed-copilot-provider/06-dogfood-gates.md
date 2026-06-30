# Managed Provider 6: Dogfood and Gates

Base: managed-provider step 5
Planned head: managed-provider grouped PR

## Objective

Add the proof lane and gates that make the managed-provider path reviewable
before any default-provider or billing-routing decision.

## Code Surfaces

- Add a flagged source-harness or GUI dogfood scenario for managed-provider
  chat.
- Add scenarios for unavailable capacity, quota-limited capacity, policy denial,
  entitlement missing, provider transport failure, and fallback to current
  Desktop provider.
- Add a no-secret proof summary that reports provider kind, model label,
  provider source, metering availability, capability request status, fallback
  status, and redaction checks.
- Wire the focused tests into a named script or documented validation command.
- Update architecture docs and PR body with the proof matrix and remaining
  live blockers.

## Acceptance Criteria

- The managed-provider path can be dogfooded behind a flag without affecting
  normal Desktop-provider behavior.
- Fallback/degraded behavior is visible in source-harness or GUI proof.
- Provider attestation and metering proof are present or explicitly marked
  blocked with a concrete reason.
- No token, provider credential, cookie, or secret appears in proof output.
- The current Desktop provider still passes the preservation tests introduced
  for #3953.

## Expected Validation

- Named managed-provider proof script or focused dogfood test.
- Routing preservation tests for Desktop-provider fallback.
- Adapter, metering, attestation, and capability-composition focused tests.
- `pnpm run typecheck`, focused lint/format, `git diff --check`, and PR-body
  proof section update.

## Non-goals

- No production default flip.
- No committed real provider credential.
- No claim that billing is complete unless the managed capacity team confirms
  the metering contract.
