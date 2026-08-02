# Provider Candidate Attempt and Usage Evidence Slice

## Status

- Phase: Frame + narrow source audit
- Priority: 4
- Audited OpenClaw worktree:
  `C:\src\openclaw-design-audit`
- Audited commit:
  `bde1602e6e86fd91dd0bec3aae714e059e556c4d`

## Revised Thesis

OpenClaw does not need one new identity called "provider attempt."

It needs two explicit levels:

1. a fallback **candidate attempt** binding one provider/model/auth/runtime
   generation; and
2. one or more existing **model call** identities for actual provider
   requests within that candidate attempt.

The evidence slice should connect those levels to per-call usage and terminal
fallback outcome without replacing provider-native request IDs or turning
estimated cost into billing truth.

## Why the Thesis Changed

The earlier source audit correctly found no stable identity on
`FallbackAttempt`. A narrower audit found that current diagnostics already
define `model.call` lifecycle events with:

- `runId`;
- `callId`;
- provider/model/API/transport;
- duration and size/timing observations;
- terminal status/error category;
- per-call token usage; and
- a hashed upstream provider request ID when available.

That is a strong request-level contract. The missing object is the parent
candidate attempt that binds fallback order, auth profile/runtime generation,
and all model calls made while that candidate is active.

## Current Source Facts

### Fallback candidate records

`src/agents/model-fallback.types.ts` defines `FallbackAttempt` with:

- provider;
- model;
- error;
- failover reason;
- auth mode;
- status; and
- code.

It has no:

- candidate-attempt ID;
- run ID;
- candidate order;
- auth-profile reference;
- prepared-runtime fingerprint;
- start/end time;
- linked model-call IDs; or
- per-attempt usage.

`src/agents/model-fallback-runner.ts` keeps an ordered in-memory attempt array
and structured decision logs. Successful fallback selection is observable, but
the portable result is primarily a chain of failed candidate summaries plus
the final provider/model.

### Prepared auth/runtime binding

`src/agents/embedded-agent-runner/run/auth-plan.ts` prepares:

- profile ordering and user locks;
- provider/model/auth attempts;
- credential-scoped model materialization;
- prepared runtime reuse/replacement; and
- the effective harness/runtime.

The execution path carries the selected `authProfileId`, but fallback
observations retain only broad `authMode`. Credential identity and secret
material should remain separate; a redacted profile/runtime generation
reference is sufficient for correlation.

### Existing model-call identity

`src/infra/diagnostic-events.ts` defines:

- `model.call.started`;
- `model.call.completed`; and
- `model.call.error`.

`src/agents/embedded-agent-runner/run/attempt.model-diagnostic-events.ts`
emits these events, propagates trace context to provider wrappers, captures
usage on success and error, and relates a hashed upstream request ID.

`src/agents/embedded-agent-runner/run/attempt-stream.ts` currently generates
call IDs shaped like:

```text
<runId>:model:<attempt-local sequence>
```

The sequence is local to one attempt-stream setup. It identifies calls inside
that setup but does not identify the fallback candidate attempt that owns the
sequence. A candidate-attempt identity must therefore parent the call rather
than being inferred later from provider/model/time.

### Usage aggregation

`src/agents/embedded-agent-runner/usage-accumulator.ts` deliberately merges
usage and assistant/tool-bridge counts across retries and fallback attempts so
run totals do not undercount failed work.

That is correct for run accounting. It loses the per-candidate partition needed
for:

- fallback diagnosis;
- provider comparison;
- credential-route support;
- per-attempt cost confidence; and
- proving that an unexecuted fenced candidate received no usage.

`model.call` events already retain per-call usage. The slice should aggregate
those calls under the candidate attempt rather than changing the run
accumulator.

### Durable evidence gap

Current durable audit projects agent runs, tools, and messages. It does not
project `model.call` or fallback-candidate lifecycle.

Diagnostics and logs contain most request facts, but operators still need
model/provider/time-window joins to connect:

- fallback decision;
- auth binding;
- model calls;
- usage;
- upstream request IDs; and
- final run outcome.

## Working Owners

| Object | Owner |
| ------ | ----- |
| Route candidates/order | Fallback planner |
| Candidate attempt | Fallback runner |
| Auth profile and credential state | Auth-profile/provider auth owner |
| Prepared runtime generation | Prepared model runtime owner |
| Model call ID and lifecycle | Model-call diagnostic/runtime owner |
| Upstream request ID | Provider/backend |
| Per-call usage | Provider/model-call observation |
| Run usage total | Run usage accumulator |
| Estimated cost | Pricing/reporting projection |
| Portable support evidence | New read-only projection |

## Bounded V1 Slice

### Included

- one run;
- a primary and one fallback candidate;
- one auth-profile reference per candidate;
- primary retryable failure;
- fallback success;
- one candidate-attempt ID per candidate;
- all model-call IDs nested under their candidate;
- per-call and per-candidate usage;
- one run aggregate reconciliation; and
- one credential-generation fence with zero calls/usage.

### Excluded

- invoice-grade billing;
- raw credential or profile content;
- universal provider request schemas;
- changing provider-native IDs;
- fleet quota allocation;
- prompt/output content;
- one health state combining availability, cooldown, and readiness; and
- replacing existing run usage totals.

## Proposed Identities

```text
runId
  -> candidateAttemptId
      -> modelCallId
          -> upstreamRequestIdHash
```

Candidate attempt:

```json
{
  "candidateAttemptId": "run-...:candidate:1",
  "runId": "run-...",
  "ordinal": 1,
  "provider": "primary",
  "model": "model-a",
  "authProfileRef": "sha256:...",
  "preparedRuntimeGeneration": "sha256:..."
}
```

The exact ID format is experimental. Identity must be allocated at the
fallback runner before auth/runtime invocation, not reconstructed by telemetry.

## Accepted Result

```json
{
  "schemaVersion": 1,
  "evidenceType": "model.candidate_attempts",
  "operationId": "run-...",
  "result": "completed_with_fallback",
  "certainty": "confirmed",
  "attempts": [
    {
      "candidateAttemptId": "run-...:candidate:1",
      "ordinal": 1,
      "provider": "primary",
      "model": "model-a",
      "result": "retryable_failure",
      "modelCalls": ["run-...:candidate:1:call:1"],
      "usage": { "input": 120, "output": 0 },
      "usageConfidence": "provider_observed"
    },
    {
      "candidateAttemptId": "run-...:candidate:2",
      "ordinal": 2,
      "provider": "fallback",
      "model": "model-b",
      "result": "succeeded",
      "modelCalls": ["run-...:candidate:2:call:1"],
      "usage": { "input": 140, "output": 42 },
      "usageConfidence": "provider_observed"
    }
  ],
  "runUsage": {
    "input": 260,
    "output": 42,
    "reconciles": true
  }
}
```

Cost, if included, must carry pricing generation and `estimated` confidence.

## Structured Failure

Rotate or replace the selected auth/runtime generation after candidate
preparation but before its first model call.

Expected result:

```json
{
  "result": "blocked",
  "reason": "prepared_runtime_generation_changed",
  "candidateAttemptId": "run-...:candidate:1",
  "modelCalls": [],
  "usage": null,
  "certainty": "confirmed"
}
```

No usage may be attributed to this candidate. A later provider timeout after
dispatch is different: it may contain usage and an unknown upstream settlement.

## Role Findings

### Model/runtime owner

Allocate candidate identity in fallback execution and preserve existing model
call diagnostics. Do not make the catalog or usage reporter own attempts.

### Security/support

Persist only redacted auth-profile/runtime references and hashed upstream
request IDs. Support must be able to distinguish credential generation,
provider request, and fallback decision without secret material.

### FinOps/operator

Keep per-call observation, per-candidate aggregation, and run totals separate.
Estimated cost is operational evidence, not provider invoice or chargeback.

### Founder/simplicity

Add one parent identity and links to facts that already exist. Do not create a
new provider gateway, billing service, or universal attempt runtime.

## Deletion Target

Remove:

- provider/model/time-window joins for fallback diagnosis;
- inference of auth binding from current profile state;
- treating run-total usage as if it belonged only to the successful model;
- treating model-call ID as fallback-candidate identity; and
- invoice-shaped claims from local estimated cost.

## Disproof Conditions

Stop or narrow the slice if:

- one candidate attempt cannot contain multiple model calls;
- the ID requires secret material;
- model-call usage cannot be linked without copying prompt/output content;
- adding the parent identity changes fallback ownership; or
- reconciliation forces failed-attempt usage to disappear from run totals.

## Cheapest Proof

1. Run a deterministic primary-failure/fallback-success fixture.
2. Allocate candidate IDs before each candidate begins.
3. Link existing model-call events to the active candidate.
4. Reconcile per-call, per-candidate, and run usage.
5. Rotate the prepared auth/runtime generation before first dispatch and prove
   a blocked candidate with zero calls and usage.
6. Export redacted support JSON containing no credentials or model content.
