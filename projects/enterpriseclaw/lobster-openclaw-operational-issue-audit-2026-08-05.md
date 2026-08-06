# Lobster / OpenClaw Operational Issue Audit

Date: 2026-08-05

## Executive Read

Lobster's recurring OpenClaw problems are not primarily missing enterprise
features. They are failures at the host/runtime boundary:

1. lifecycle ownership and recovery;
2. durable cron and session continuity;
3. truthful operation completion and failure state;
4. approval and authority correlation;
5. channel/session/participant identity;
6. versioned host-policy and compatibility contracts.

"The agent hung" is an umbrella symptom. In the inspected issues it can mean:

- an idle detector drained an active container;
- a workspace or Passport claim wedged restart;
- the browser remained on `Writing response...` after the turn completed;
- `exec` returned no inline result while completion arrived later;
- a node operation produced no observable completion;
- an approval wait was surfaced as a network failure; or
- a model call exceeded the cron execution deadline.

The common pattern is not that Lobster needs to own OpenClaw semantics. It is
that managed hosting exposes implicit local-runtime assumptions and Lobster
currently compensates with lifecycle, routing, persistence, and policy logic.

## Method and Limits

The audit used:

- Lobster issues and merged PRs from `microsoft.ghe.com/bic/lobster`;
- `origin/main` commit subjects from `C:\src\lobster`;
- the active OpenClaw patch ledger in
  `C:\src\lobster-control-ui-surgical\src\openclaw_container\openclaw-patches\README.md`;
- the hosted Control UI design and preview documentation; and
- the current 2026-08-05 repository state.

The broad issue and PR searches each reached the 1,000-result API cap. Counts
below are therefore directional lower bounds, not a complete defect census.
Regex families overlap: one issue may be counted under lifecycle, cron,
approval, and Teams.

Captured broad OpenClaw issue corpus:

- 1,000 results;
- 562 open;
- 438 closed.

Sparse labels understate the surface:

- `openclaw`: 33 issues, 25 open, 8 closed;
- `category: reliability`: 38 issues, 31 open, 7 closed;
- `failure/runtime`: 2 issues, 1 open, 1 closed.

Directional matches in the capped issue corpus:

| Family | Matches | Open | Closed |
| --- | ---: | ---: | ---: |
| Timeout / connectivity | 143 | 70 | 73 |
| Container lifecycle | 121 | 62 | 59 |
| Session / state | 113 | 79 | 34 |
| Teams / delivery | 111 | 67 | 44 |
| Cron / automation | 103 | 61 | 42 |
| Approval / authority | 93 | 59 | 34 |
| Restart / recovery | 47 | 21 | 26 |
| Explicit hang / stuck wording | 12 | 6 | 6 |
| Version / config | 51 | 31 | 20 |

The merged-PR corpus shows matching repair pressure. Among 1,000 captured merged
OpenClaw-related PRs, title matches included 118 container/lifecycle, 106
Teams/delivery, 99 timeout/connectivity, 96 approval/authority, 89 cron, 48
session/state, and 39 restart/recovery fixes.

These are not mutually exclusive counts and should not be added together.

## 1. Lifecycle Wedges and Unsafe Recovery

### Observed symptoms

- **#3613, closed**: the idle detector drained active containers because
  Gateway WebSocket and ProxyPipe work did not refresh the idle clock. Users saw
  `409-draining` and browser `1006`.
- **#3880, closed**: an assertion-less start could not mint Graph OBO, left
  `mySite` unresolved, and entered a repeatable workspace rehydrate failure.
- **#5156, closed**: a metadata-only allocation persisted an incomplete claim
  without a worker instance and wedged every later workspace preparation.
- **#6999, open**: an orphaned Passport owner can strand a user across islands.
- **#7119, open**: workspace Passport supersession churn still needs reduction.

### Representative merged fixes

- **#5274** recovers metadata-only workspace claims.
- **#5474** repairs stale worker-claim conflict recovery.
- **#6145** prevents the container claim/Passport fence from wedging live-user
  restarts.
- **#6247** confirms Gateway health before recycling a busy container.
- **#6439** quiesces a draining container's ProxyPipe instead of cancelling its
  in-flight turn.
- **#6851** centralizes allocation authority.

### Contract implication

The host needs a versioned lifecycle state machine with one allocation owner,
fenced transitions, explicit readiness, quiescence, and bounded recovery.
Container existence, cached route, workspace claim, Gateway health, and
Passport ownership cannot be inferred independently.

## 2. Cron Is the Strongest Continuity Stress Test

### Observed symptoms

- **#3929, open**: custom cron jobs disappeared after a run.
- **#4117, open**: jobs can disappear after fresh git-mode rehydrate.
- **#4243, open**: diagnostic regeneration overwrote `cron/jobs.json`, dropping
  active recurring jobs.
- **#4131, open**: a scheduled briefing reaches model-call-started, times out,
  and produces an empty run.
- **#4882, open**: scheduled runs denied required M365 reads but reported
  success and delivery: a false-green result.
- **#5941, open**: completion state still needs durable checkpointing to close
  the stale-rehydrate duplicate-delivery window.
- **#6673, open**: a Gateway-restart interruption is skipped rather than
  retried or resumed.

### Representative merged fixes and carried patches

- **#3274** externalizes cron persistence with Redis wake coordination.
- **#4651** re-drives wakes interrupted by Gateway or pod restart.
- **#4881 / patch 0006** classifies restart interruptions as skipped rather
  than generic errors.
- **#5289** captures cron state before Gateway recycle.
- **#5385** fences duplicate execution with Passport ownership.
- **#5502** adds a durable worker hint and occurrence single-grant to stop
  duplicate recurring Teams delivery.
- **#6228 / patch 0024** makes drain quiesce cron work instead of racing active
  execution.
- **patches 0007-0009 and 0011** add job identity, execution fencing,
  preapproval transactions, and nested tool-operation authorization.

### Contract implication

Cron combines every hard hosted requirement: durable state, wake ownership,
single execution, approval lineage, in-flight drain accounting, delivery
receipts, restart recovery, and truthful terminal status. A cron run cannot be
called successful merely because scheduling or the model turn succeeded.

## 3. "Hung" Often Means Unknown or Misprojected Completion

### Observed symptoms

- **#4599, open**: the server completed and persisted the turn while webchat
  remained on `Writing response...`.
- **#6202, open**: foreground `exec` returned empty inline output; stdout
  arrived later through asynchronous completion events.
- **#6996, open**: Windows node execution produced no output, completion, or
  approval prompt, while the same node's MCP path worked.
- **#6493, open**: an approval wait closed ProxyPipe and surfaced as
  `NetworkError` instead of an approval-wait state.
- **#5657, open**: foreground node approvals frequently did not register.

### Representative fixes and patches

- **patch 0013** expands and preserves approved node follow-up output.
- **patch 0022** carries ordered execution deadlines across the runtime,
  Gateway, paired node, and outer client, and distinguishes unobserved
  completion from denial.
- **#6217** unifies SPA transcript projection.
- **#5575** prevents a stuck approval from making the SPA read-only.

### Contract implication

OpenClaw operations need a stable operation identity and explicit states such
as:

```text
accepted -> waiting_for_approval -> running -> completed
                                  -> denied
                                  -> timed_out
                                  -> outcome_unknown
```

Transport closure, UI timeout, and missing observation must not be converted
into denial, failure, or safe retry. The UI should render owner-native state,
not infer completion from one stream.

## 4. Session and Memory Continuity Remain Incomplete

### Observed symptoms

- **#5665, open**: prior-day session history was unrecoverable and memory search
  could not bridge the gap.
- **#5915, open**: session transcripts remain unindexed by memory search.
- **#5913, open**: the memory FTS index rebuilds on every cold start.
- **#5907, open**: fail-closed memory-search refusal on a warm Gateway-reuse
  path does not drain the running Gateway.
- **#5318, open**: `.jsonl.reset.<timestamp>` transcripts accumulate without
  retention.
- **#5914, open**: daily memory notes have no retention or rollup.

### Carried fixes

- **patch 0016** adds a bounded read-only `memory.list` Gateway RPC.
- **patches 0014 and 0025** add and then refine sensitivity/provenance state
  projected through session context.
- Lobster also carries workspace checkpoint, restore, and recovery work outside
  the OpenClaw patch set.

### Contract implication

The required contract is not simply "persist SQLite." It is a complete inventory
of session, transcript, memory, workspace, index, plugin, and provenance state;
generation-bound capture and restore; and readiness only after dependent state
is usable.

## 5. Approval and Authority Are Distributed Across Too Many Surfaces

### Observed symptoms

- **#5657, open**: approvals may never register.
- **#6493, open**: approval wait appears as network failure.
- **#6833, open**: unattended approved cron still prompts every run.
- **#7032, open**: Teams approval cards expire before the advertised approval
  window.
- **#7067, open**: mail approvals appear to expire within seconds and prompt
  repeatedly.
- **#6996, open**: node execution can fail before any approval surface appears.

### Representative fixes and patches

- **patch 0017** carries a runtime-signed capability token through the existing
  approval-resolve and node-invoke path.
- **patches 0007-0009 and 0011** bind cron identity, ownership, preapproval, and
  nested tool operations.
- Recent fixes bind MCP and node approvals to Gateway-stamped sessions and
  correct WorkIQ approval ownership.

### Contract implication

Approval needs durable, attributable, scoped, expiring receipts bound to the
exact operation shape and owner generation. Waiting is a first-class state.
Compound tools need method-level consequences. A model-visible top-level tool
allowlist cannot describe WorkIQ, MCP, node, and code-mode effects by itself.

## 6. Teams and Multiplayer Expose Identity-Binding Errors

### Observed symptoms

- **#6500, closed**: a channel workspace reused a Passport bound to the last
  speaker, causing the agent to stop replying to everyone else.
- **#7150, open**: a valid channel turn can lose its Channel Participant binding
  and publish an artifact to the owner's personal drive.
- **#7187, open**: a route-cache miss can send an owner to the wrong island and
  silently lose channel messages.
- **#6805, open**: a named address in group chat may never route as an inbound
  turn.
- **#6573, open**: a cron-delivered Teams message is absent from the Teams DM
  session, so the reply has no context.

### Carried fixes

- **patch 0001** contains generally useful Teams normalization, threading,
  quoting, attachment-context, streaming, and final-text fixes intended for
  upstream contribution.
- **patch 0002** keeps Microsoft-specific identity, delegated auth, Graph egress,
  delivery dedupe, and multiplayer routing in Lobster.
- **patch 0012** repairs brokered Bot Framework attachment downloads.
- **patch 0018** adds brokered agent-initiated reactions.

### Contract implication

Conversation, participant, actor, owner, delivery target, workspace, session,
and credential subject are different identities. They need explicit bindings
and provenance across ingress, execution, persistence, and effects.

## 7. Version and Patch Drift Amplify Every Failure Family

The current patch ledger contains 25 ordered patches, including:

- OpenClaw core behavior fixes;
- generic contributions intended to converge upstream;
- Lobster-specific broker and policy adaptations;
- temporary compatibility backports such as hosted Control UI policy patch
  0019; and
- test/build infrastructure required to validate the pin.

Examples of drift pressure:

- **#5738, open**: plugins carry hand-maintained TypeScript/JavaScript twins
  without a generation or parity gate.
- **#5296, open**: the Dockerfile patch chain needs an ordered helper.
- **#6395, open**: the OpenClaw patch-to-adapter cron wire contract needs CI
  pinning.
- the production promotion still has to reconcile config and SQLite migrations
  as durable-state changes.

### Contract implication

OpenClaw needs a supported compatibility and conformance surface for config,
state, Gateway protocols, plugins, UI assets, and host policy. Lobster needs a
patch ledger with owner, upstream target, deletion condition, and exact release
proof until those contracts ship.

## What Belongs Where

### Appropriate for OpenClaw

- lifecycle and readiness semantics;
- operation identity and truthful completion states;
- cron state, execution, and delivery meaning;
- session, memory, and config schema semantics;
- Gateway protocol and Control UI behavior;
- generic approval, policy, plugin, and node contracts;
- Teams channel behavior that is generally useful outside Microsoft hosting;
- compatibility, migration, and conformance tests.

### Appropriate for Lobster / Microsoft

- Entra and tenant admission;
- AOS, Plex, Redis, region, worker, and container placement;
- CAPI policy and physical provider dispatch;
- Microsoft Graph OBO and brokered credential materialization;
- Teams Bot endpoint and Microsoft tenant routing;
- tenant policy values, rollout cohorts, telemetry, and support;
- product navigation and the host shell around version-matched OpenClaw UI;
- Microsoft-owned WorkIQ, WebIQ, and M365 product behavior.

### Temporary Lobster Workarounds With Deletion Targets

- core semantic patches required only because the production OpenClaw pin lacks
  the accepted upstream behavior;
- ProxyPipe functions that duplicate owner semantics;
- inferred lifecycle or result state;
- duplicate Lobster chat, session, settings, and dashboard UI;
- shell or side-channel bridges that exist because a typed Gateway contract is
  missing.

## Recommended Executive Framing

Do not say:

> OpenClaw is unreliable and agents hang.

Say:

> One hundred internal Scout users and sustained Lobster/ClawPilot engineering
> have exercised OpenClaw under elastic, multi-channel hosting. The recurring
> failures cluster around lifecycle ownership, state continuity, operation
> settlement, authority correlation, and identity binding. Microsoft has built
> and can contribute bounded fixes and adopter proof. We need agreement on which
> portable contracts OpenClaw will own, version, test, and support.

This framing is candid without turning every Lobster-specific incident into an
upstream defect.
