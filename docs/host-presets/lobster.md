# Host preset — lobster (one of N HostAdapter adapters)

The **lobster preset** is the `LobsterAdapter` implementation of
the `HostAdapter` contract (CL-07 amendment §1a): single-tenant
container-per-workspace shape with a read-only workspace mount, a
sidecar `snap serve` daemon handling the draft → current lifecycle, and
an external supervisor companion app that reviews and signs approvals
over HTTP. It is the sim shape Wepwawet will port against when wiring
the real lobster deployment.

## HostAdapter methods — lobster mapping

| `HostAdapter` method           | `LobsterAdapter` implementation                                                                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extractIdentity(req)`         | Cowork session-principal extraction from `X-Session-Principal` header; single-tenant (`tenantId: null`).                                                                           |
| `routePolicy(ctx)`             | `GET http://sidecar-snap/v1/policy/current`; on sidecar-unreachable fallback to on-disk `.openclaw/policy/policy-ir.json` with `SidecarUnreachableEntry` after 2-strike threshold. |
| `getApprovalSink(ctx)`         | Returns `LobsterSupervisorHttpSink` — HMAC-signed POST to supervisor companion, buffered write-behind to `.openclaw/audit/*.log`.                                                  |
| `shapeResponse(decision, ctx)` | HTTP status + optional `Approval-Redirect` header pointing at supervisor's review URL (for `decision: 'review'`).                                                                  |

See `testing--host-presets.md` for the matrix model and
`host-adapter-contract.md` for the interface all four adapters
implement.

## What the lobster preset proves

1. **Layer 1 + 2 + 3** all on. The generated plugin (Layer 1+3) runs inside
   a container whose workspace directory is mounted read-only. A sidecar
   snap daemon (Layer 2) tracks the draft/current/superseded lifecycle.
   A supervisor companion (Layer 3 review surface) approves promotes over
   HTTP with a signed handle.
2. **Platform-neutral RO-mount rejection**: direct FS writes into the
   workspace emit a `WriteRejection` event with `cause: 'readonly-mount'` —
   regardless of whether the host OS is Windows (`ERROR_ACCESS_DENIED`),
   Linux (`EROFS`), or macOS (`EACCES`). The sim asserts on the neutral
   shape only.
3. **Stage redirect** via `FileIngestProvider.modify + redirectPath` lands
   the write in `.openclaw/.stage/<path>` instead of the canonical workspace.
4. **Continuity on sidecar outage**: the plugin continues enforcing from
   last-loaded PolicyIR when snap goes unreachable, logs a
   `SidecarUnreachableEntry`, and rehydrates on reconnect by comparing hashes.

## LayerConfig

```ts
const lobsterPreset: HostPresetConfig = {
  name: "lobster",
  decide: {
    providers: [/* GuardrailProvider + FileIngestProvider fixtures */],
    mergerMode: "strict-oc7",
  },
  track: { mode: "sidecar" },
  enforceReview: { companionMode: "supervisor-http", signer: "cowork-supervisor" },
  workspace: { mount: "container-RO" },
  scope: "@bic/openclaw",
};
```

Key values:

- `track.mode: 'sidecar'` — a real `claws snap serve` binds via `listen(0)`,
  health-polls `GET /v1/healthz`, exposes the port on `harness.snapPort`.
- `workspace.mount: 'container-RO'` — `host-mock.ts` models the container
  boundary. Direct writes emit `WriteRejection { cause: 'readonly-mount' }`.
- `companionMode: 'supervisor-http'` — the companion runs in HTTP mode; the
  sim's companion mock signs approval handles with an HMAC key whose
  `keyId` is in the plugin's `trustedKeyIds` set.

## Stage lifecycle (ASCII)

```
   agent write attempt
           │
           ▼
   host-mock intercepts → WriteRejection { cause: 'readonly-mount' }
           │
           ▼
   plugin retries via FileIngestProvider.modify + redirectPath
           │
           ▼
   write lands in .openclaw/.stage/<path>   (draft)
           │
           ▼
   claws snap stage on  ─── collects staged files ───▶ snap upload
                                                            │
                                                            ▼
                                                    { id, status: 'draft' }
                                                            │
                       supervisor HTTP callback: sign(approvalHandle)
                                                            │
                                                            ▼
                                                    claws snap promote
                                                            │
                                                            ▼
                         provider.onSnapshotPromoted({ id, policyIrPath })
                                                            │
                                                            ▼
                                            container mount updates to new current;
                                            rehydrate fires before next decision
```

## Platform-neutral mount rejection

The sim emits a single normalized shape regardless of OS:

```ts
interface WriteRejection {
  cause: "readonly-mount";
  path: string;
  timestamp: number;
}
```

Scenarios assert on `cause: 'readonly-mount'` only. The OS errno is
**not observable to scenario code**. Wepwawet's real lobster integration is
responsible for the translation:

| OS      | Native errno / code                     | → Emits                   |
| ------- | --------------------------------------- | ------------------------- |
| Windows | `ERROR_ACCESS_DENIED` (0x5) or `EACCES` | `cause: 'readonly-mount'` |
| Linux   | `EROFS` (30)                            | `cause: 'readonly-mount'` |
| macOS   | `EROFS` or `EACCES`                     | `cause: 'readonly-mount'` |

This contract is also captured in `claws-sim-host-presets.md`
"Platform-neutral RO-mount contract" and will be reflected in the CL-07
amendment FileIngestProvider spec.

## Continuity on sidecar outage

```
 t=0   snap sidecar healthy; plugin holds last-loaded PolicyIR in memory
 t=1   /v1/healthz fails (1st strike)
 t=2   /v1/healthz fails (2nd strike) — plugin logs SidecarUnreachableEntry
 t=3   agent invokes a tool — decision fires against last-loaded IR
         * plugin does NOT re-read .openclaw/policy/policy-ir.json from disk
         * decisions continue; no false-allow
 t=10  snap comes back; plugin fetches GET /v1/policy/current
         * compares hash with last-loaded IR
         * if different → onSnapshotPromoted-equivalent re-init
         * if same → resume normally
```

The on-disk `.openclaw/policy/policy-ir.json` is the continuity source.
There is **no "baked-in policy"** concept — the plugin does not inline
policy at build time. It holds the last-loaded IR in process memory and
uses on-disk policy only as a tiebreaker at rehydrate. See
`claws-sim-host-presets.md` "Sidecar-unreachable contract" for the
authoritative spec wording.

## Preset-specific scenarios (5)

### `ro-mount-rejection-shape`

Direct FS write attempt from an in-host agent produces a `WriteRejection`
event with `cause: 'readonly-mount'` regardless of host OS. Scenario
asserts only on the neutral shape; no OS-specific errno string leaks into
the assertion.

### `ro-mount-modify-redirect-to-stage`

Following a RO-mount rejection, the plugin retries via
`FileIngestProvider.modify + redirectPath` and the write lands in
`.openclaw/.stage/<path>`. This verifies the staged-write round-trip is
distinct from the bare-rejection shape (rejection is visible, redirect is
transparent to the agent).

### `stage-on-promote-rehydrate`

Full loop: `claws snap stage on` → agent writes SOUL.md → stage catches it
→ supervisor approves via HTTP companion path (HMAC signed) →
`claws snap promote` → rehydration callback fires → container mount updates
to new current. The scenario asserts the supervisor-approval round-trip is
observable in the audit chain (DecisionEntry + ApprovalEntry cross-linked
by `correlationId`).

### `sidecar-unreachable-policy-survives`

Kill snap sidecar mid-session. Plugin continues enforcing with last-loaded
PolicyIR. Does **not** re-read from disk. Logs `SidecarUnreachableEntry`
after 2 consecutive `/v1/healthz` failures. On reconnect, plugin fetches
`/v1/policy/current` and compares hash; if different, triggers
`onSnapshotPromoted`-equivalent re-init. No false-allow during outage.

### `onSnapshotPromoted-hot-reload`

Supervisor promotes new policy. Provider lifecycle `onSnapshotPromoted`
fires. In-flight calls complete against the **old** registry; the next call
uses the **new** registry. This is the snapshot-switch non-uplift rule (see
`claws-sim-host-presets.md` H3 "Snapshot-switch semantics" — pending
proposal §1.4a amendment).

## Scope-flip runs here too

The cross-preset parity gate (`scope-flip-byte-identical.e2e.test.ts`)
compiles the fixture under both scopes and asserts byte-identical artifacts.
Running under lobster catches container-RO-specific scope bugs (e.g., a
mount-path that embeds a scope string).

## Cross-references

- `testing--host-presets.md` — matrix model
- `host-presets--openclaw.md` — what lobster adds on top of Layer 1+3
- `host-presets--aether.md` — what aether adds on top of lobster
- `testing--e2e-harness.md` — `Harness` + `snap.kill()/restart()` API
- `governance--approval-flow.md` — supervisor HTTP companion + handle binding
- `governance--file-ingest-review.md` — RESTRICTED file-ingest scenarios
  (run under lobster via dispatcher)
- `openclaw-upstream-spec.md` §1 (two peer interfaces) and §4 (snap HTTP surface)
- `claws-sim-host-presets.md` H2 — authoritative scenario list
