# RFC Scope: Provider Candidate Attempts

- ID: EC-011
- Lane: Models, providers, and compute
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Provider routing

## Scope

- Add candidate-attempt identity between run and actual model calls.
- Bind candidate order, model/provider, credential/runtime generation, timing,
  result, and linked calls.
- Own candidate-to-model-call links; EC-012 derives per-candidate usage.

## Current Owner Baseline

Current provider routing records ordered fallback behavior and run-local
`model.call` identities. Tests preserve transient cooldown, prove fallback
after an overloaded primary, and expose bounded failure when every candidate
is overloaded. The target keeps `model.call` as the child object and adds a
durable parent candidate-attempt identity with restart-safe settlement.

Existing `model.call` lifecycle diagnostics already provide run-local call
identity, provider/model/API/transport, timing, status, error category,
per-call usage, and a hashed upstream request ID. The candidate attempt must
parent these calls rather than replace them or be reconstructed from
provider/model/time.

## Implementation Disposition

- Build one primary-failure/fallback-success fixture before proposing a public
  candidate identity.
- Allocate candidate identity in the fallback owner before dispatch.
- Keep run execution attempts, provider candidates, and model calls as three
  different lifetimes.
- Add restart settlement fields only if current records cannot reconcile late
  results and retries without duplication.

## Explicit Exclusions

- Replacing provider-native call identity.
- A universal model abstraction.
- Owning run-total, cost, or allocation accounting.

## Required Outcomes

- Fallback and retry candidates remain distinguishable.
- Failed candidates remain accountable.
- A candidate fenced before first dispatch receives zero model calls and zero
  usage; post-dispatch provider timeout is a distinct outcome that may carry
  usage and unknown upstream settlement.
- Candidate attempts are durably recoverable by run-attempt/candidate-attempt
  identity so late results and retries cannot create duplicate candidates or
  duplicate usage attribution after restart.
- Existing fallback reconstruction from call ordering remains read-compatible
  only during migration and cannot remain an authoritative candidate source.

## Dependencies

- EC-003 and EC-008.

## Proof and Deletion Gate

- Run one failed candidate followed by success.
- Delete fallback reconstruction from call ordering.
- Disprove the separate contract if existing run/model-call records already
  expose durable candidate identity, ordering, and post-timeout settlement
  without call-order reconstruction.
