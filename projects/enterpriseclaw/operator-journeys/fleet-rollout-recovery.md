# Fleet Rollout and Recovery

## Human Question

```text
Can I update this fleet safely, see exactly what failed, repair only affected
units, and know whether recovery and evidence are actually complete?
```

The operator does not manage upstream, fork, Lobster, or Rust tracks. The
product projects owner truth into one rollout and recovery experience.

## Golden Journey

### 1. Preview

The operator selects a release target. The preview shows:

- exact immutable target set;
- current and desired artifact generations;
- compatible, incompatible, held, and unknown units;
- checkpoint and recovery readiness;
- rollout concurrency and availability policy; and
- evidence/attestation requirements.

Incompatible or stale units are excluded before mutation.

### 2. Accept

The fleet owner durably accepts one parent operation and freezes:

- parent identity;
- target-set identity and generation;
- unit membership;
- expected unit generations;
- desired artifact and protocol versions;
- checkpoint and evidence requirements; and
- operator authority.

The UI does not report `rolling out` before durable acceptance.

### 3. Fan out

Each unit receives one durably accepted child operation. Before mutation, the
unit owner:

1. verifies its expected generation and compatibility;
2. captures a source-artifact and source-generation-bound checkpoint;
3. activates the exact candidate;
4. reports readiness for the candidate generation; and
5. settles the child.

The fleet coordinator records child results but does not own unit runtime state.

### 4. Partial result

Example:

```text
47 targeted
44 updated and ready
2 candidate failures; previous artifact and state restored
1 recovery blocked; quarantined
```

Healthy units are not touched again. The operator can inspect each unit's
artifact, generation, readiness, checkpoint, settlement, and assurance state.

### 5. Controller recovery

If the controller restarts or loses a child acknowledgement, it reconciles by
parent identity, child identity, and settlement revision. It does not replay
the whole target set or create a replacement child against a healthy unit.

### 6. Targeted repair

The product creates a new repair parent containing only failed, restored,
blocked, or unknown units. The eligibility receipt is immutable and separate
from the mutable repair request. Adding a healthy unit invalidates the request.

### 7. Convergence and assurance

The product reports two dimensions:

```text
Operational convergence: complete
Assurance: incomplete - evidence unavailable for 1 unit
```

A healthy runtime is not rewritten as failed because evidence persistence is
unavailable. It also cannot be presented as attested or compliant.

### 8. Containment

Emergency containment reports separate dimensions:

- new authority revoked;
- new work admission halted;
- new routes prevented or drained;
- local in-flight work stopped, completed, fenced, or unknown;
- remote effects stopped, complete, partial, or unknown; and
- recovery authority pending, granted, expired, or denied.

`Prevention complete; remote effect unknown` is not simplified to `contained`.

## Operator States

| State | Meaning | Primary actions |
| --- | --- | --- |
| Ready to roll out | Preview and compatibility are complete | Start, adjust policy, exclude held units |
| Rolling out | Parent and child operations are durably accepted | Pause new fan-out, view units |
| Partial | Some units reached the target and others did not | Repair affected, quarantine, inspect |
| Recovery blocked | Previous code and state cannot be restored together | Keep quarantined, restore manually, replace |
| Operationally converged | Every required unit is active and ready at the target | Verify assurance, close |
| Assurance incomplete | Required evidence is absent or unverifiable | Reconcile evidence, do not attest |
| Prevention complete; effect unknown | New work is blocked but an earlier remote effect is unsettled | Reconcile effect, retain containment |

## Contract Composition

- EC-007: generation-bound readiness.
- EC-021: owner checkpoint and restore.
- EC-022: mixed-version compatibility.
- EC-029: release activation and recovery.
- EC-031: admission halt and resource fencing.
- EC-032: hosting lifecycle.
- EC-033: evidence and assurance.
- EC-034: immutable target set, fan-out, repair, convergence, and containment.

## Deletion Targets

- upgrade scripts that infer fleet success from command exit;
- scripts that repair every unit after a partial failure;
- file-timestamp backup consistency checks;
- process-exists readiness checks;
- manual evidence assembly; and
- kill scripts that equate process exit with effect containment.

