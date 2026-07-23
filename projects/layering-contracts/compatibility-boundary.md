# Lobster/OpenClaw Compatibility Boundary

## Purpose

Define and audit the small explicit as-is boundary between Lobster and
OpenClaw. This is an integration ABI and migration ledger, not a new monolithic
OpenClaw hosted-configuration envelope.

Every value crossing this boundary must map to one four-corner semantic area or
be classified as plugin-owned, temporary workaround, or suspect.

## Boundary Inventory

| Surface             | Examples                                                                   | Primary area                  |
| ------------------- | -------------------------------------------------------------------------- | ----------------------------- |
| Start request       | Adapter start-body fields, identity/profile metadata, lifecycle options    | Activation / Runtime Boundary |
| Environment         | Per-start flags, process settings, feature gates, proxy settings           | Activation / Runtime Boundary |
| Headers             | Trusted identity, tenant/user context, origins, correlation                | Runtime Boundary / Evidence   |
| Config overlays     | Gateway, models, tools, plugins, skills, diagnostics, hooks                | Activation                    |
| Proxy-pipe protocol | Frames, status, keepalive, retry, failure and generation ownership         | Runtime Boundary              |
| Lifecycle signals   | Start, ready, drain, stop, retry, warm-container reuse                     | Runtime Boundary              |
| State boundary      | Durable paths, snapshot artifacts, manifests, publication acknowledgements | State and Continuity          |
| Telemetry           | Stable events, dimensions, boot/runtime/config/profile identity            | Evidence and Compatibility    |

## Boundary Rule

Anything Lobster relies on outside this inventoried boundary is suspect until
classified. Anything inside it is not automatically legitimate: each item must
still have an owner, lifecycle, stability level, test, and removal or support
plan.

## Required Record

| Field                 | Requirement                                                               |
| --------------------- | ------------------------------------------------------------------------- |
| Identifier            | Exact env var, header, config field, event, API field, path, or frame     |
| Producer and consumer | Both sides of the dependency                                              |
| Lifecycle             | Image-time, process-time, per-start, per-session, or persistent           |
| Semantic area         | Activation, Runtime Boundary, State/Continuity, or Evidence/Compatibility |
| Current owner         | OpenClaw, Lobster, plugin, OCC, AgentHarness, or unclear                  |
| Target disposition    | Upstream contract, plugin feature, host decision, workaround, or delete   |
| Stability             | Public, internal, experimental, or accidental                             |
| Proof                 | Test, docs, runtime trace, dashboard, issue, or PR                        |
| Removal condition     | OpenClaw release/contract that permits Lobster cleanup                    |

## Versioning

If a boundary version is needed, it versions the Lobster adapter's understood
contract set. It must not imply that OpenClaw owns one Lobster-shaped envelope.
Prefer capability/contract discovery and independently versioned portable
contracts over a single ever-growing `hosted-openclaw` schema.

## Audit Outcome

The boundary audit should produce:

- a machine-readable inventory;
- a patch-to-contract ledger;
- upstream contract and plugin backlog;
- compatibility tests against supported OpenClaw releases;
- a removal queue for Lobster workarounds after release promotion.
