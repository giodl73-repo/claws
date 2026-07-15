# Next Evidence Plan

## Status

Approved project plan. Evidence gathering only; do not file new RFCs or issues
until the named decision gates are met.

## Ordered Work

### 1. Lifecycle And Shutdown Guarantee

Trace the existing Lobster lifecycle path end to end:

```text
LifecycleCommand(workspace_action=checkpoint_unmount)
  -> adapter preparation
  -> workspace/state persistence
  -> LifecycleCommandResult(outcome=shutdown_ready)
```

Deliver:

- exact meaning of `shutdown_ready`;
- state-path and writer inventory;
- drain/checkpoint/shutdown state machine;
- failure and timeout taxonomy;
- proof of which acknowledged state survives replacement.

Decision: whether the `/synced` hypothesis is valid, needs a different
generation/watermark model, belongs only in status, or should be dropped.

### 2. State Durability Table

Inventory workspace, OpenClaw home, sessions, transcripts, memory SQLite,
plugin state, pairing/approval state, snapshot artifacts, credentials, caches,
and generated config.

For each record:

```text
path/owner
writer
durable/reconstructable/ephemeral/secret
consistency point
checkpoint trigger
restore order
schema compatibility
shutdown guarantee
Lobster storage handling
```

### 3. Snapshot RFC 20 Mapping

Map SQLite snapshot creation, manifest finalization, publication, verification,
and recovery into the durability table. Separate local artifact materialization
from Lobster durable publication and determine whether an artifact can prove a
source generation/watermark.

### 4. ProxyPipe Decomposition

Treat ProxyPipe as one physical Lobster connection carrying multiple logical
subprotocols, not as one semantic contract.

Investigate:

- brokered HTTP/provider egress;
- Teams channel ingress;
- runtime/build evidence;
- lifecycle signals and commands;
- node, exec, and plugin approvals;
- product services such as judge dedup and feedback;
- remote AgentHarness substreams;
- capability advertisement and rolling compatibility;
- typed failures versus string-derived retry classification.

Deliver a keep/split/upstream/plugin map for every frame family. In particular,
remote-harness semantics must converge on RFC 31, while Plex routing, provider
brokering, and physical transport may remain Lobster-owned.

### 5. Hosted Integration And Approval Reuse

`node.invoke` comparison completed in pass 8. It proves the unary
server-to-peer foundation; Hosted Integration should add sibling host-provider
invocation over shared machinery rather than treating hosts as nodes. Hosted
peer identity completed in pass 9: use a distinct `host-provider` role,
capability-bound proof-of-possession admission, separate provider permissions,
and active-generation fencing. The next gate is selecting the first portable
bounded unary provider after auditing existing secret/provider seams.

Then compare the repeated approval families:

- node-pair approval;
- per-command exec approval;
- WorkIQ cron-creation approval;
- existing OpenClaw tool/node/plugin approval APIs.

Derive the common semantic shape:

```text
runtime/plugin raises typed pending intent
  -> host pins tenant/user/runtime identity
  -> host presents approval on an available surface
  -> host returns bounded decision and provenance
  -> OpenClaw/plugin resolves or times out fail closed
```

Audit requirements:

- intent identity and namespace;
- request/decision correlation;
- allowed decision vocabulary;
- expiry, cancellation, replay, and idempotency;
- fail-closed missing host/capability behavior;
- approver and runtime identity provenance;
- audit event schema;
- plugin extension boundary;
- AgentHarness overlap.

Decision: approvals use existing Gateway contracts. Hosted Integration uses a
sibling host-provider surface over shared peer-invocation machinery; preserve
`node.invoke` wire behavior. Explicit cancellation and streaming remain later,
evidence-gated extensions.

### 6. Managed Configuration OpenClaw Audit

Inspect the current real OpenClaw repository for config loading, includes,
precedence, schema metadata, validation, effective-config inspection, policy
strictness comparators, and existing managed/enterprise concepts.

Then complete the Managed Configuration proof:

- classify every Lobster baked leaf;
- build representative managed/operator documents;
- prove exact and bounded authority;
- prove effective provenance and redaction;
- establish durable Lobster operator-config ownership;
- quantify removable Lobster config writers and env keys.

Decision: promote, narrow, map to an existing OpenClaw concept, or drop the
Managed Configuration deliverable.

### 7. Prioritization

After the evidence passes, rank candidate upstream work by:

- repeated Lobster patch pressure;
- portability to Docker/Kubernetes/OCC hosts;
- ability to delete Lobster code/config;
- security and data-loss risk;
- fit with current OpenClaw concepts;
- conformance-test value;
- independence from optional plugins and future control planes.

Keep at most two implementation/RFC initiatives active at once.

## Current Discussion Focus

Before executing Pass 1, examine ProxyPipe, existing Gateway transport, and
Hosted Integration conceptually to ensure the audit asks the right ownership
questions. The `node.invoke` and hosted peer identity gates are complete; first
provider selection is next. Do not file a proposal before that comparison.
