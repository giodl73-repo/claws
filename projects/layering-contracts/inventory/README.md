# Layering Inventory

Store source-backed as-is inventories here. Each row must identify the producer,
consumer, owner, lifecycle, stability, and proof. Avoid prose-only lists that
cannot be checked against current Lobster and OpenClaw revisions.

The allowed integration surfaces and required disposition fields are defined in
`../compatibility-boundary.md`.

## Planned Inventories

| Inventory                                                    | Area                          | Status                                           |
| ------------------------------------------------------------ | ----------------------------- | ------------------------------------------------ |
| Boot/start/config audit pass 1                               | Activation / Runtime boundary | `boot-config-2026-07-10.md`                      |
| Managed environment matrix pass 2                            | Activation / Runtime boundary | `env-matrix-2026-07-10.md`                       |
| Complete environment registry including per-claims injectors | Activation / Runtime boundary | In progress                                      |
| Effective config writer/order audit pass 3                   | Activation                    | `config-writers-2026-07-10.md`                   |
| Host/operator config replacement fit                         | Activation                    | `host-operator-config-fit-2026-07-10.md`         |
| Config writer failure and preparation-path parity matrix     | Activation                    | Pending                                          |
| Trusted identity and proxy-pipe audit pass 4                 | Runtime boundary              | `trust-proxy-pipe-2026-07-10.md`                 |
| Proxy-pipe frame ownership and AgentHarness overlap pass 5   | Runtime boundary              | `proxy-pipe-frames-2026-07-10.md`                |
| Gateway coverage versus ProxyPipe pass 6                     | Runtime boundary              | `gateway-proxypipe-coverage-2026-07-10.md`       |
| ProxyPipe and `OpenClawTransport` fit pass 7                 | Runtime boundary              | `proxypipe-openclaw-transport-fit-2026-07-10.md` |
| `node.invoke` fit for Duplex Transport pass 8                | Runtime boundary              | `node-invoke-duplex-fit-2026-07-10.md`           |
| Hosted peer identity for Duplex Transport pass 9             | Runtime boundary              | `hosted-peer-identity-2026-07-10.md`             |
| State path durability table                                  | State and continuity          | Pending                                          |
| Mutation generation and component watermark map              | State and continuity          | Pending                                          |
| Snapshot materialization versus host publication flow        | State and continuity          | Pending                                          |
| Proxy-pipe state and failure taxonomy                        | Runtime boundary              | Pending                                          |
| Lifecycle and warm-reuse state machine                       | Runtime boundary              | Pending                                          |
| Telemetry event and dimension dependencies                   | Evidence and compatibility    | Pending                                          |
| Lobster patch-to-contract ledger                             | All                           | Pending                                          |

## Required Evidence Fields

| Field              | Meaning                                                                   |
| ------------------ | ------------------------------------------------------------------------- |
| Source             | File, symbol, config key, env var, header, event, or API                  |
| Producer           | Component that sets or emits it                                           |
| Consumer           | Component or operational system that relies on it                         |
| Lifecycle          | Image-time, process-time, per-start, per-session, or persistent           |
| Current owner      | OpenClaw, Lobster, plugin, OCC, AgentHarness, or unclear                  |
| Target area        | Activation, Runtime Boundary, State/Continuity, or Evidence/Compatibility |
| Stability          | Public contract, internal behavior, workaround, or suspect                |
| Proof              | Test, documentation, dashboard, PR, issue, or runtime trace               |
| Target disposition | Upstream contract, plugin feature, host decision, workaround, or delete   |
| Removal condition  | Release or contract evidence that permits cleanup                         |
