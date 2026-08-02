# RFC Scope: Run and Attempt Bindings

- ID: EC-008
- Lane: Agent runtime and orchestration
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Agent execution runtime

## Scope

- Bind each run attempt to the exact normalized intent digest,
  risk-classifier generation, context, model, credential, policy decision,
  tool, runtime, and configuration generations.
- Consume the EC-004 decision reference; do not re-evaluate authorization.

## Explicit Exclusions

- Provider-call and external-effect semantics.
- Universal workflow orchestration.
- Owning policy/approval staleness or pre-effect dispatch fencing, which remain
  EC-004 and EC-014 responsibilities.

## Required Outcomes

- Retries create distinguishable attempts.
- Superseded non-authority bindings are fenced.
- Terminal results link owner-native child operations.
- Attempt evidence stores credential/policy generation references, never
  secret material or prohibited parameters.
- Accepted attempts are durably recoverable by run/attempt identity; restart
  or reconnect reconciles prior settlement before replay and never
  reconstructs authoritative bindings from aggregate logs.
- Existing aggregate-log reconstruction remains read-compatible only during
  migration and is deleted after authoritative bindings are proven.

## Dependencies

- EC-003, EC-004, EC-006.

## Proof and Deletion Gate

- Retry after a binding generation change.
- Delete reconstruction of attempt context from aggregate logs.
- Disprove the separate contract if the agent runtime already persists
  attempt-scoped intent/generation bindings and replay-safe recovery without
  reconstructing them from aggregate logs.
