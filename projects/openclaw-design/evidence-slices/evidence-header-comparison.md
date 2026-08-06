# Experimental Evidence Header Comparison

## Result

All six ranked slices support a small common projection header. They do not
support one common runtime object, operation type, or facility payload.

The table uses the first three unlike slices as compact exemplars. Provider,
node, and session lifecycle stress results follow below.

## Candidate Shared Header

| Field | Memory | External action | Release activation |
| ----- | ------ | --------------- | ------------------ |
| `schemaVersion` | yes | yes | yes |
| `evidenceType` | lifecycle type | action lifecycle | activation |
| `operationId` | delete operation | invocation/effect operation | update attempt |
| `owner` / `subject` | corpus path + generation | tool/effect owner | installation + plan |
| `observedAt` / `effectiveAt` | cleanup observation | decision/effect time | phase/ready time |
| `ownerGeneration` | file hash/index revision | surface/policy generation | plan/release/incarnation |
| `result` / `reason` | complete/partial/blocked | complete/blocked/unknown | ready/blocked/recovered |
| `certainty` / `freshness` | copy settlement | effect settlement | activation/recovery proof |
| `authorityGeneration` | retention/hold when present | required | approval/rollout when present |
| `redaction` / `classification` | no deleted content | no params/secrets/effect content | no secret/config content |
| `integrityRef` | evidence hash/signature | audit chain/hash | bundle/release proof hash |
| `links` | owner cleanup results | decision/invocation/effect | release/phase owner results |

## Required Facility Payloads

The header cannot replace:

- memory owner settlements and retained exceptions;
- action authority, invocation, and effect certainty;
- release identity, compatibility dimensions, phase results, and recovery
  layers.

## Architecture Decision

Treat the header as a versioned evidence-envelope convention for projections
and exports only.

Do not:

- require semantic owners to store this exact shape;
- make it the input to owner mutations;
- define universal `Resource`, `Action`, `Artifact`, or `Result` objects;
- flatten owner-specific result vocabularies; or
- infer missing authority/effect/recovery facts from generic success.

## Surviving Invariants

1. Owner-native identity remains authoritative.
2. Evidence identifies the generation it observed.
3. Result and certainty are separate.
4. Authority is recorded when relevant but does not become universal identity.
5. Redacted evidence links to owner proof instead of copying sensitive
   content.
6. Projection failure cannot mutate or roll back the owner.
7. `unknown` and `partial` remain first-class.

## Rejected Shared Fields

- one universal `resourceId`;
- one universal `artifactId`;
- one universal `principalId`;
- one universal status enum;
- one universal idempotency key;
- one universal rollback flag; and
- raw owner payloads.

## Next Validation

The header has now been stress-tested descriptively against provider
candidate/model-call nesting and node authority/route/settlement. Those slices
reinforce that `operationId`, owner generations, result, and certainty can be
shared only while nested identities and facility payloads remain specific.

Session lifecycle adds another constraint: export creation and deletion
propagation may share a copy graph and envelope fields, but they require
different operation types and payloads. Export evidence owns source revision,
disclosure, destination, expiry, and created-copy identity. Deletion evidence
owns target generation, propagation settlement, retained exceptions, and
terminal certainty. A generic lifecycle success would erase this distinction.

Before any RFC:

1. implement at least two fork-only fixtures;
2. verify stable JSON and redaction;
3. test partial/unknown outcomes, not only success and blocked-before-mutation;
4. confirm evidence links survive owner retries and restart; and
5. compare with existing audit schema evolution instead of creating a parallel
   ledger.
