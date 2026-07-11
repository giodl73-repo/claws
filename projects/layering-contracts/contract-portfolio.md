# Layering Contract Portfolio

## Objective

Identify every behavior Lobster depends on to host OpenClaw, classify its real
owner, and turn repeated private patches into upstream contracts and
conformance tests. Do not design one large Lobster-shaped OpenClaw API.

Apply `charter.md` as the ownership rule and `compatibility-boundary.md` as the
inventory boundary for the audit.

## Classification

Every audited item must be classified as one of:

- portable OpenClaw runtime contract;
- Lobster enterprise host decision or implementation;
- plugin-owned capability;
- OCC control-plane concern;
- AgentHarness/runtime data-plane concern;
- temporary compatibility workaround;
- suspect behavior with no justified owner.

## Area Map

| Existing contract concern | Owning area |
| --- | --- |
| Config composition and effective-config identity | Runtime activation |
| Plugin activation and dependencies | Runtime activation |
| Tool, node, and restriction materialization | Runtime activation |
| Trusted hosted identity and allowed origins | Runtime boundary |
| Brokered provider access and proxy-pipe | Runtime boundary |
| Start, readiness, drain, stop, reload, and retry | Runtime boundary |
| Durable paths, snapshots, checkpoint, restore, and leases | State and continuity |
| Diagnostics, failure taxonomy, version identity, and release gates | Evidence and compatibility |

Readiness and Hosting Profiles is the first child initiative under Runtime
Boundary. Startup-critical Runtime Activation observations fold into that
readiness framework rather than creating `/converged` or another RFC. Remote
AgentHarness remains a related data-plane RFC, not another area. OCC remains a
future control-plane producer, not an implementation dependency.

## First Audit Pass

1. Compare every runtime-projected environment variable with adapter restore,
   clearing, reuse, and process-scope behavior.
2. Inventory baked OpenClaw config fragments and trace each field to the code
   that consumes it.
3. Build a durability table for workspace, OpenClaw home, memory, sessions,
   transcripts, plugin state, credentials, and generated config.
4. Trace checkpoint, restore, lease, corruption, and schema-migration behavior.
5. Enumerate proxy-pipe states, retries, timeouts, keepalive, generation
   ownership, credential posture, and stable failures.
6. Trace startup, readiness, drain, stop, restart, warm-container reuse, and
   terminal exit semantics.
7. Inventory telemetry events and dimensions consumed by dashboards, alerts,
   support tooling, and compliance evidence.
8. Map recent broad Lobster config or runtime fixes to the contract that should
   have prevented the patch.

## Deliverables

- An as-is machine-readable inventory with source and consumer references.
- A path durability and state-ownership table.
- A start/reuse/lifecycle state machine.
- A proxy-pipe failure and responsibility taxonomy.
- A stable diagnostics dependency inventory.
- A prioritized contract backlog, with one narrow RFC or upstream issue per
  independently useful OpenClaw primitive.
- A deletion plan for Lobster workarounds as upstream releases arrive.

## Non-Goals

- Moving Lobster tenant routing, Microsoft storage, IdP, deployment, or admin
  UX into OpenClaw.
- Making OCC part of runtime traffic.
- Putting AgentHarness execution frames into a startup/configuration envelope.
- Replacing existing OpenClaw config trees with a parallel hosted schema.
- Depending on the optional policy plugin for core hosting correctness.

## Current Hypothesis

The next strongest contract candidates are state portability and trusted hosted
identity. The audit must test that hypothesis before selecting another RFC.

Managed Configuration is now an approved project deliverable under Runtime
Activation. It remains unfiled until the Lobster replacement proof and current
OpenClaw config concept audit satisfy
`managed-configuration-deliverable.md`.

## Effort Limit

Keep no more than two active initiatives from this portfolio at once:

1. Complete or obtain disposition on Readiness and Hosting Profiles.
2. Audit State and Continuity deeply enough to decide whether it needs an
   upstream issue, RFC, or improvements to existing OpenClaw primitives.

Activation stays a readiness condition family plus inventory. Remaining Runtime
Boundary items and Evidence/Compatibility stay as inventory until evidence
establishes a narrow independently useful change.

The completed surface disposition is recorded in `four-corners.md`. Evidence
and Compatibility uses artifact capabilities, release conformance, runtime
identity, and stable events; it does not introduce `/compatible`.
