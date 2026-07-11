# Layering Inventory

Store source-backed as-is inventories here. Each row must identify the producer,
consumer, owner, lifecycle, stability, and proof. Avoid prose-only lists that
cannot be checked against current Lobster and OpenClaw revisions.

## Planned Inventories

| Inventory | Area | Status |
| --- | --- | --- |
| Environment projection and restore matrix | Activation / Runtime boundary | Pending |
| Baked config field and consumer map | Activation | Pending |
| State path durability table | State and continuity | Pending |
| Mutation generation and component watermark map | State and continuity | Pending |
| Snapshot materialization versus host publication flow | State and continuity | Pending |
| Proxy-pipe state and failure taxonomy | Runtime boundary | Pending |
| Lifecycle and warm-reuse state machine | Runtime boundary | Pending |
| Telemetry event and dimension dependencies | Evidence and compatibility | Pending |
| Lobster patch-to-contract ledger | All | Pending |

## Required Evidence Fields

| Field | Meaning |
| --- | --- |
| Source | File, symbol, config key, env var, header, event, or API |
| Producer | Component that sets or emits it |
| Consumer | Component or operational system that relies on it |
| Lifecycle | Image-time, process-time, per-start, per-session, or persistent |
| Current owner | OpenClaw, Lobster, plugin, OCC, AgentHarness, or unclear |
| Target area | Activation, Runtime Boundary, State/Continuity, or Evidence/Compatibility |
| Stability | Public contract, internal behavior, workaround, or suspect |
| Proof | Test, documentation, dashboard, PR, issue, or runtime trace |
