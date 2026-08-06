# Fleet Rollout and Recovery Simulation Evidence - 2026-08-02

## Result

The standalone dependency-free simulation passes ten cases:

1. partial rollout projects only the restored unit as repairable;
2. healthy units cannot be added to targeted repair;
3. lost child acknowledgement reconciles after controller restart without
   replay;
4. accepted target membership remains immutable during membership churn;
5. incompatible units are rejected before mutation;
6. stale readiness cannot commit the candidate;
7. incompatible previous code/checkpoint state quarantines the unit;
8. operational convergence remains separate from assurance completeness;
9. containment does not hide unknown remote effects; and
10. fan-out is rejected when parent durable acceptance is unknown.

Command:

```powershell
node --test experiments\fleet-rollout-recovery-simulation\test\simulation.test.mjs
```

Result:

```text
tests 10
pass 10
fail 0
```

## Safety

- no OpenClaw runtime imports;
- no Lobster code;
- no network;
- no cloud or container provider;
- no credentials;
- no real deployment units; and
- deterministic fake owner state only.

## Design Defect Found

The first implementation shared one mutable array between:

- the generated repair target; and
- the prior-result eligibility receipt.

Adding a healthy unit to the repair target also changed the evidence that
supposedly authorized it, so validation accepted the widened request.

The correction creates independent immutable values. The contract consequence
is broader: authorization evidence must not share mutable identity with the
request it constrains.

## Contract Corrections

### EC-021

- Checkpoints bind source artifact/runtime schema and owner generation.
- Reinstalling previous code is not restored state.
- Incompatible restore becomes `recovery_blocked` and quarantine.

### EC-029

- Compatibility is checked before mutation.
- Candidate readiness must match the candidate generation.
- `rolled_back` requires compatible previous code and state.
- Operational activation and assurance completeness are separate.

### EC-032

- Per-unit lifecycle children are durably accepted before mutation.
- Lost acknowledgement reconciles by child identity.
- Stale readiness cannot complete host handoff.

### EC-033

- Evidence failure blocks attestation without rewriting runtime state.
- Repair evidence binds immutable prior settlements and eligible units.

### EC-034

- Repair eligibility is immutable and independent from the requested target.
- Child acceptance precedes mutation.
- Incompatibility fails before mutation.
- Operational convergence and assurance completeness are distinct.
- Recovery blocked and containment uncertainty remain explicit.

## Limits

The simulation does not prove:

- current OpenClaw source implements the target contract;
- Lobster can durably coordinate a production fleet;
- real container recovery or checkpoint compatibility;
- real artifact publication and downgrade;
- real audit integrity or SIEM export;
- real Rust supervisor lifecycle; or
- production latency, cold-start, memory, and availability budgets.

## Cheapest Next Proof

Implement the area package's bounded fork slice against three disposable
OpenClaw Fleet cells:

1. stable parent and child operation identities;
2. two successful upgrades and one failed health gate;
3. previous-cell restoration for the failed unit;
4. controller restart and child reconciliation;
5. repair of only the failed unit; and
6. separate operational and assurance projection.

