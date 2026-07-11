# Layering Inventory

Store source-backed as-is inventories here. Each row must identify the producer,
consumer, owner, lifecycle, stability, and proof. Avoid prose-only lists that
cannot be checked against current Lobster and OpenClaw revisions.

The allowed integration surfaces and required disposition fields are defined in
`../compatibility-boundary.md`.

## Planned Inventories

| Inventory | Area | Status |
| --- | --- | --- |
| Boot/start/config audit pass 1 | Activation / Runtime boundary | `boot-config-2026-07-10.md` |
| Exact environment projection, reset, forwarding, and consumer matrix | Activation / Runtime boundary | In progress |
| Baked config field, writer, and consumer map | Activation | Pass 1 complete; writer trace pending |
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
| Target disposition | Upstream contract, plugin feature, host decision, workaround, or delete |
| Removal condition | Release or contract evidence that permits cleanup |
