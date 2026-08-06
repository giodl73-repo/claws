# Enterprise Evidence Slice Priorities - 2026-08-01

## Purpose

The first facility audit pass found many `E4/C2` gaps and one `E4/C1` gap.
This plan chooses bounded proof slices rather than proposing another umbrella
enterprise platform.

Each slice follows FACES:

1. one representative fixture;
2. one narrow owner seam;
3. one accepted result and one structured failure;
4. one observable proof surface; and
5. one explicit deletion or migration target.

## Prioritization Rubric

Score each dimension from `0-3`.

| Dimension | Question |
| --------- | -------- |
| Enterprise lift | Does the slice move a major E4 facility from C1/C2 toward a reusable contract? |
| Cross-facility leverage | Does it prove a relationship reused by several facilities? |
| Source readiness | Are owner seams and tests already strong enough for a bounded slice? |
| Risk reduction | Does it address authority, data loss, external effects, or fleet outage? |
| Deletion value | Does it remove bespoke inference, duplicate host logic, or manual evidence assembly? |

Maximum: `15`.

## Ranked Slices

| Rank | Slice | Facilities advanced | Score | Why now |
| ---- | ----- | ------------------- | ----: | ------- |
| 1 | Memory corpus lifecycle evidence | Memory, privacy, workspace, policy, audit | 14 | Only E4/C1 area; proves owner/copy/retention/delete relationships with bounded data. |
| 2 | Authorized external-action evidence | Agent execution, tools/MCP, policy, credentials, audit, transport | 14 | Highest security leverage; ties authority generations to one real side effect and settlement. |
| 3 | Release activation evidence bundle | Release, config, plugins, state, readiness, diagnostics, fleet | 13 | Strong source seams make a portable success/blocked contract cheap to prove. |
| 4 | Provider attempt and usage correlation | Models, credentials, resources, audit, support | 12 | Closes the missing durable attempt identity and separates usage observation from chargeback. |
| 5 | Remote node invocation trust envelope | Nodes, transport, policy, credentials, audit | 12 | Proves pairing/connection/policy fencing and cancellation uncertainty without host/device conflation. |
| 6 | Session export and deletion propagation | Sessions, transcripts, workspace, privacy, backups, audit | 11 | High compliance value, but copy inventory and backup/provider boundaries make it broader. |

## Slice 1: Memory Corpus Lifecycle Evidence

Detailed source framing:
`evidence-slices/memory-corpus-lifecycle.md`.

### Thesis

A memory owner can expose a portable lifecycle result for one canonical corpus
and one derived index without moving memory ownership into a privacy service.

### Representative fixture

- one workspace memory document;
- one owner-native corpus record;
- one derived embedding/index record;
- one retention policy generation; and
- one delete request.

### Narrow seam

Use the memory owner's existing write/index/delete paths and add or extract a
read-only relationship/evidence adapter that reports:

- canonical object identity/generation;
- derived-copy owner and purpose;
- classification/policy generation;
- delete result by owner; and
- retained exception without content.

### Accepted result

`complete`:

- canonical object deleted;
- derived index tombstoned or rebuilt without the object;
- no active hold;
- redacted evidence retained.

### Structured failure

`partial` or `blocked`:

- canonical object removed but derived index owner unavailable; or
- legal/retention hold blocks canonical deletion.

### Proof surface

One JSON result consumable by CLI, audit export, and tests:

```json
{
  "operationId": "delete-...",
  "target": { "owner": "memory", "id": "...", "generation": "..." },
  "policyGeneration": "...",
  "result": "partial",
  "owners": [
    { "owner": "memory-corpus", "result": "deleted" },
    { "owner": "memory-index", "result": "deferred" }
  ]
}
```

### Deletion target

Delete host/privacy code that infers completion from filesystem absence or one
index cleanup call.

### Disproof

Stop if the memory owner cannot identify canonical versus derived state without
exposing content or if the adapter must own deletion.

## Slice 2: Authorized External-Action Evidence

Detailed source framing:
`evidence-slices/authorized-external-action.md`.

### Thesis

One external tool action can retain enough owner-native identity and authority
facts to prove who/what authorized it without centralizing execution.

### Representative fixture

- one admitted user message;
- one session and run;
- one run-scoped tool definition;
- one credential reference/profile;
- one policy decision;
- one approval requirement; and
- one idempotent mock external action.

### Narrow seam

At the existing tool-call admission/execution boundary, correlate:

- principal/session/run;
- accepted config generation;
- tool definition/surface generation;
- policy and approval generation;
- credential/profile reference without secret material;
- invocation/idempotency identity;
- target endpoint class;
- terminal owner outcome and side-effect certainty.

### Accepted result

Approved invocation produces one confirmed external effect and one audit
record linked to the exact run/tool call.

### Structured failure

Policy generation changes or approval expires before execution, producing
`fenced` or `approval_expired` with no external effect.

### Proof surface

- machine-readable tool result;
- audit record;
- replay with the same idempotency key proving no duplicate effect; and
- redacted support view.

### Deletion target

Delete audit reconstruction that guesses authorization from current config,
current policy, or transcript text after the fact.

### Disproof

Stop if correlation requires secret values as identity or if the audit adapter
must decide tool authorization.

## Slice 3: Release Activation Evidence Bundle

Detailed source framing:
`evidence-slices/release-activation.md`.

### Thesis

The existing updater can emit one portable evidence bundle that proves exact
target, compatibility, migration, activation, and readiness without becoming a
fleet manager.

### Representative fixture

- one published package baseline;
- one candidate package;
- one managed Gateway;
- one plugin;
- one schema-compatible state fixture; and
- one incompatible downgrade fixture.

### Narrow seam

Compose existing structured outputs from:

- update plan/status;
- exact package/release identity;
- database compatibility preflight;
- package/source activation;
- target Doctor migration;
- plugin convergence;
- service restart; and
- readiness/version verification.

### Accepted result

`ready` with exact source/artifact identity, prior/target version, applied
migrations, plugin result, service incarnation, and readiness evidence.

### Structured failure

`blocked` before mutation because the target schema envelope cannot open the
current database.

### Proof surface

One signed or hash-bound JSON bundle plus existing console rendering.

### Deletion target

Delete external rollout scripts that parse updater prose or separately guess
the active package root and Gateway version.

### Disproof

Stop if producing the bundle requires bypassing package/service/Doctor owners
or claims code rollback restored forward-migrated state.

## Slice 4: Provider Attempt and Usage Correlation

Detailed source framing:
`evidence-slices/provider-attempt-usage.md`.

The narrow audit revised the object model: existing `model.call` IDs identify
provider requests, while a separate fallback candidate-attempt identity is
still missing.

### Thesis

Each provider candidate attempt can have a durable portable identity linking
model selection, credential binding, provider result, usage, and support
evidence without replacing provider-native IDs.

### Representative fixture

- one run;
- primary and fallback model candidates;
- one auth profile;
- primary retryable failure;
- fallback success; and
- usage observations for both attempts.

### Narrow seam

Generate an OpenClaw attempt ID at the agent-runner/provider boundary and retain
provider-native request/thread IDs as relationships.

### Accepted result

Fallback succeeds; both attempts remain visible with order, model/provider,
credential profile reference, outcome, latency, and usage confidence.

### Structured failure

Credential rotates between preparation and invocation; the stale prepared
runtime is fenced and no usage is attributed to an unexecuted attempt.

### Proof surface

Run status, telemetry, support export, and resource observation share the
attempt ID while preserving owner-native IDs.

### Deletion target

Delete model-name/time-window joins used to correlate fallback, usage, and
support events.

## Slice 5: Remote Node Invocation Trust Envelope

Detailed source framing:
`evidence-slices/remote-node-invocation-trust.md`.

The internal invocation ID and pairing/route fences are strong, but the public
result and durable audit do not currently expose them.

### Thesis

A node command can prove pairing, role, connection, policy, and invocation
generations while preserving uncertain cancellation semantics.

### Representative fixture

- paired device/node;
- role-bound credential;
- one allowed command;
- one connection;
- one invocation with progress; and
- pairing generation change during a second invocation.

### Narrow seam

Project existing NodeRegistry and command-policy facts into invocation evidence.

### Accepted result

Result matches invocation ID, node ID, connection ID, pairing generation, and
effective command policy.

### Structured failure

`PAIRING_CHANGED` or `ROUTE_CHANGED`; stale/late result is ignored.

### Proof surface

Invocation result, audit record, and node status expose identical fencing facts.

### Deletion target

Delete host adapters that infer node authority from advertised capabilities or
current connection alone.

## Slice 6: Session Export and Deletion Propagation

Detailed source framing:
`evidence-slices/session-export-deletion-propagation.md`.

### Thesis

One session can expose canonical transcript, projections, exports, and backup
relationships so export creation and deletion propagation are separately
authorized, owner-specific, and auditable.

### Representative fixture

- one session key and generation;
- canonical SQLite transcript;
- one rendered/export artifact;
- one search/index projection;
- one backup/snapshot relationship; and
- one delete request.

### Narrow seam

Compose session, workspace, export, privacy, and backup owner results without
creating a new canonical session store.

### Accepted result

Export identifies the exact source generation and created copy. Ordinary
deletion removes live canonical/index state but reports the delete archive,
QMD projection, backup, and provider copy as retained, deferred, or externally
controlled rather than claiming purge.

### Structured failure

Provider-hosted copy or legal hold returns `externally_controlled` or `blocked`.

### Proof surface

Separate export and deletion operation results over one owner/copy graph, with
per-owner status, retained exceptions, freshness, and redacted evidence.

### Deletion target

Delete claims that transcript-file removal or export cleanup proves complete
session deletion.

## Recommended Sequence

1. **Memory corpus lifecycle evidence** - establishes the owner/copy/lifecycle
   pattern and lifts the only C1 facility.
2. **Authorized external-action evidence** - establishes the
   authority/execution/effect pattern.
3. **Release activation evidence bundle** - establishes local-to-fleet
   evidence composition using mature source seams.

After those three, reassess the matrix. Provider attempts, node invocation, and
session lifecycle should reuse proven evidence fields rather than each
inventing a new envelope.

## Shared Fields to Test, Not Standardize Yet

The first three slices should experiment with a small evidence header:

- evidence type and schema version;
- owner and subject identity;
- owner generation;
- operation/attempt identity;
- observed and effective time;
- policy/config/authority generations where relevant;
- result and structured reason;
- certainty/freshness;
- redaction/classification;
- integrity reference; and
- links to owner-native evidence.

Do not publish this as a universal runtime type until at least three slices
prove that the fields survive without erasing owner semantics.
