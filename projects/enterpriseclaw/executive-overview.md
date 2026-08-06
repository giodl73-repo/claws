# EnterpriseClaw Executive Overview

## The Simple Story

OpenClaw receives intent, gives an agent relevant context, lets it decide and
act, then records what happened so people can supervise, recover, and improve
the system.

```text
human intent
  -> understand
  -> decide
  -> govern
  -> act
  -> settle
  -> remember and report
  -> recover and scale
```

EnterpriseClaw makes each step trustworthy without turning OpenClaw into a
central enterprise platform or replacing the owner systems that already work.

## Five Top-Level Boxes

The complete architecture can be explained through five boxes.

| Box | Executive question | What it contains | RFC scopes |
| --- | --- | --- | --- |
| **1. See and control** | What is running, working, waiting, or broken? | Status, attention, diagnostics, repair, and available operator actions | EC-001-002 |
| **2. Govern** | Is this configuration, identity, authority, and resource use allowed and ready? | Identity, credentials, approval, trust, configuration, readiness, lifecycle obligations, budgets, and admission | EC-003-007, EC-030-031 |
| **3. Think and act** | How does an agent decide and produce a real result? | Runs, delegation, schedules, model/provider attempts, cost, capabilities, tools, effects, conversations, and delivery | EC-008-016 |
| **4. Remember and connect** | How does work retain context, survive interruption, and cross machine boundaries? | Sessions, context, memory, checkpoints, protocols, streaming, nodes, remote invocation, and workspace/filesystem boundaries | EC-017-026, EC-035 |
| **5. Operate at scale** | How is the system extended, upgraded, hosted, proven, and repaired across deployments? | Extension metadata, artifact trust, releases, hosting, evidence, audit, fleet convergence, and containment | EC-027-029, EC-032-034 |

These boxes are teaching and product groupings. They do not merge the
underlying owner or relationship contracts.

## The Runtime Narrative

### 1. Understand

OpenClaw identifies the agent, session, conversation, workspace, memory, and
current context relevant to the request.

### 2. Decide

The agent uses a model to interpret the request, plan work, and select
capabilities.

### 3. Govern

Before protected work proceeds, OpenClaw checks identity, credential binding,
capability, policy, approval, readiness, and resource constraints.

### 4. Act

OpenClaw invokes a model, tool, provider, node, channel, or external system.
The owner of that facility retains its native execution, retry, and effect
semantics.

### 5. Settle

OpenClaw determines what actually happened:

- accepted;
- completed;
- rejected;
- not effected;
- partially effected;
- externally effected; or
- still unknown.

Request receipt, invocation, cancellation, timeout, or process exit alone do
not prove the final outcome.

### 6. Remember and report

The relevant owners update sessions, memory, files, receipts, and evidence.
The product shows the human what happened, what remains uncertain, and what
action is safe.

### 7. Recover and scale

The same contracts support safe retry, reconciliation, restore, upgrade,
rollback, targeted repair, and fleet convergence without changing the basic
local runtime model.

## How the Architecture Cascades

```text
one executive story
  -> five top-level boxes
     -> thirteen architectural capability lanes
        -> thirty-five owner and relationship contracts
           -> profile-specific schemas, APIs, fixtures, and implementations
```

### Executive story

OpenClaw understands intent, governs autonomous work, performs actions, reports
truthful outcomes, and recovers safely.

### Five boxes

The five boxes explain the system to executives, operators, and product teams.

### Thirteen capability lanes

The lanes divide responsibilities for architecture and technology decisions:

1. experience and administration;
2. identity, authority, and trust;
3. configuration and activation;
4. agent runtime and orchestration;
5. models, providers, and compute;
6. actions, tools, and integrations;
7. conversations, channels, and delivery;
8. knowledge, context, and continuity;
9. runtime fabric and protocols;
10. nodes, devices, and edge;
11. extensibility, artifacts, and release;
12. data governance and resource control; and
13. operations, assurance, and fleet.

### Thirty-five contracts

The EC contracts are not 35 services, databases, screens, or concepts an
operator must learn. Each contract isolates one owner boundary or one
relationship that must remain truthful across owners.

Examples:

- EC-004 separates authentication from approval.
- EC-014 separates invocation from external effect.
- EC-016 separates queued work, native attempts, provider acceptance, partial
  effects, and unknown delivery.
- EC-017 separates session continuity, export, archive, reset, and deletion.
- EC-034 separates fleet projection from owner-native runtime state.

### Implementation mechanics

Owner-specific implementations use only the contracts relevant to their
profile. A simple local channel does not need fleet convergence. A managed
protected effect may need authority, durable settlement, evidence, and
retention.

## What People See

Operators should not see 35 contracts. They should be able to answer:

1. What am I running?
2. Is it working?
3. What is it doing?
4. Is anything waiting on me?
5. What needs attention?
6. What can I approve, retry, repair, roll back, restore, or inspect?

The lower layers make those answers truthful.

## Governing Principle

```text
simple human experience
  -> truthful product projections
     -> complete owner and relationship contracts
        -> profile-specific implementation
```

Simplifying an upper layer must not erase a lower-layer distinction required
for authority, recovery, effect certainty, lifecycle, compatibility, or
evidence.

## Compare the Market

See `executive-competitive-landscape-2026-08-02.md` for the executive
comparison with Hermes Agent, OpenAI Agents SDK, LangGraph, Google ADK,
Microsoft Agent Framework, Amazon Bedrock AgentCore, CrewAI, OpenHands, Letta,
and Temporal.
