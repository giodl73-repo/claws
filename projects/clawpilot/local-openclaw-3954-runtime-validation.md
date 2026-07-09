# Local OpenClaw #3954 Runtime Validation

Date: 2026-06-30

Target: live `gim-home/m` PR #3954 head `816943742` in `C:\src\clawpilot`
checked out detached.

## Purpose

Validate what #3954 proves by itself, before the provider-neutral Desktop
capability platform from #3955 is present.

The key question is whether #3954 is enough to prove Local OpenClaw as a
runtime/provider path, and where the switch-over still fails without the later
capability layer.

## Commands Run

```powershell
pnpm exec vitest run electron/local-openclaw-stdio-transport.test.ts -t "waits for a ready frame|frames requests over stdout|emits normalized protocol events|times out when the runtime never becomes ready|reports protocol errors" --reporter=verbose
pnpm exec vitest run electron/sessions.test.ts -t "local OpenClaw" --reporter=verbose
pnpm exec vitest run common/runtime-provider-eligibility.test.ts common/local-openclaw-runtime-compatibility.test.ts -t "allows a ready local OpenClaw|blocks local OpenClaw|requires a manifest|rejects unsupported protocol|requires runtime identity|rejects containment|degrades provider status|applies compatibility checks" --reporter=verbose
pnpm exec vitest run electron/local-openclaw-lifecycle.test.ts -t "starts the sidecar|constructs a stdio client|does not attach|does not start|does not construct|degrades provider status|drops the attached client|startup fails" --reporter=verbose
pnpm exec vitest run electron/local-openclaw-sidecar-manager.test.ts electron/local-openclaw-discovery.test.ts -t "not configured|starts a configured sidecar|unexpected exits|spawn errors|dogfood sidecar|malformed dogfood|configured Scout-managed|Lobster OpenClaw|endpoint descriptor" --reporter=verbose
```

All targeted commands passed.

## Evidence Matrix

| Attempt | Result on #3954 | Evidence |
| --- | --- | --- |
| Create a bound Local OpenClaw session and send a prompt through the local client | Pass | `routes bound local OpenClaw sessions through the local client`; backend send is not called. |
| Reload a cold bound Local OpenClaw session and send through the local client | Pass | `routes cold local OpenClaw sessions through the local client after loading`. |
| Stream assistant output and commit on idle | Pass | `commits idle-flushed local OpenClaw streaming replies to the view`. |
| Cancel a Local OpenClaw turn | Pass | `cancelTurn propagates local OpenClaw cancellation and waits for terminal release`; backend abort is not called. |
| Delete an in-flight Local OpenClaw session | Pass | `clears active local OpenClaw state when deleting an in-flight session`. |
| Use the Scout-managed stdio transport | Pass | `waits for a ready frame`, `frames requests over stdout`, and `emits normalized protocol events`. |
| Discover a configured Scout-managed sidecar | Pass | `reports a configured Scout-managed sidecar as a local runtime source`. |
| Preserve Lobster OpenClaw package metadata | Pass | `preserves Lobster OpenClaw container image metadata from the endpoint descriptor`. |
| Start a configured sidecar | Pass | `starts a configured sidecar with piped stdio and windowless spawn options`. |
| Construct a stdio client from sidecar streams | Pass | `constructs a stdio client from Scout-managed sidecar streams`. |

## Recorded Failure / Degraded Cases

| Attempt | Result on #3954 | Evidence |
| --- | --- | --- |
| Attach a Scout-managed sidecar before an endpoint descriptor exists | Blocked/degraded | Lifecycle tests prove the sidecar is not attached without a descriptor. |
| Attach when runtime compatibility fails | Blocked/degraded | `does not construct a client when runtime compatibility fails`; also applies to Scout-managed stdio. |
| Use a runtime without a manifest | Blocked/degraded | `requires a manifest`; provider status degrades when compatibility fails. |
| Use an unsupported protocol version | Blocked/degraded | `rejects unsupported protocol versions`. |
| Claim mismatched containment | Blocked/degraded | `rejects containment claims that do not match observed containment`. |
| Run when fleet/provider policy blocks Local OpenClaw | Blocked/degraded | Kill switch, missing Desktop node bridge, missing containment, audit unavailable, restart limit, CPU/memory pressure, and battery saver background blocks all pass. |
| Send while the same Local OpenClaw session is active | Rejected | `local-openclaw-session-busy`. |
| Send attachments through Local OpenClaw | Rejected | `local-openclaw-attachments-unsupported`; local client is not invoked. |
| Start when no sidecar command is configured | Not configured | Sidecar manager reports not configured. |
| Start with malformed sidecar args | Args ignored | Sidecar manager ignores malformed JSON args rather than shell-splitting. |
| Spawn missing sidecar binary | Failed/degraded | Sidecar manager records spawn error as failed status. |
| Sidecar exits unexpectedly | Degraded/failed | First unexpected exit consumes restart budget; later exits exhaust budget. |
| Runtime never sends ready frame | Rejected | Stdio transport times out waiting for ready. |
| Runtime emits malformed protocol frames | Degraded event, no throw | Stdio transport reports protocol errors without throwing. |

## Missing Until #3955 Or Later

These files are absent on live #3954 head `816943742`:

```text
electron/desktop-node-capability-executor.ts
electron/desktop-node-filesystem-read-handler.ts
electron/desktop-node-shell-exec-handler.ts
electron/local-openclaw-node-capability-entrypoint.ts
docs/architecture/37-provider-neutral-desktop-capabilities.md
```

That means #3954 does not yet prove browser, clipboard, local app launch,
workspace write/patch, M365 draft broker, filesystem read, shell execution, or
token-sensitive capability flows through a provider-neutral Desktop capability
boundary.

The client test also explicitly normalizes tool events without granting local
execution, so #3954 is intentionally runtime-only. It can carry text/chat/status
events and session lifecycle, but it does not grant Desktop-local authority to a
Local OpenClaw runtime.

## Conclusion

#3954 is a valid runtime-only proof. It proves discovery, compatibility,
eligibility, lifecycle, sidecar startup, stdio transport, Local OpenClaw session
binding, and Lobster package metadata.

It is not sufficient for 100% switch-over parity. The failures above are mostly
good fail-closed behavior, but the missing capability files are real switch-over
gaps. Full parity needs #3955 or an equivalent provider-neutral Desktop
capability platform.
