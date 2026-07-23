# Host preset — openclaw (one of N HostAdapter adapters)

The **openclaw preset** is the `OpenClawVanillaAdapter`
implementation of the `HostAdapter` contract (CL-07 amendment
§1a): the no-Microsoft-infra shape. A local `.openclaw/policy/`
directory compiled into the running plugin, no sidecar snap daemon, no
HTTP supervisor companion. It is the adapter a third-party OC
community adopter who never talks to Microsoft runs. If it works under
openclaw, an external adopter can take the upstream contribution
(including `@openclaw/host-adapter` once published) as-is and
ship.

## HostAdapter methods — openclaw-vanilla mapping

| `HostAdapter` method           | `OpenClawVanillaAdapter` implementation                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `extractIdentity(req)`         | OS user via `os.userInfo().username` or `--principal` CLI flag override. Single-user (`tenantId: null`, `sessionId: null`).        |
| `routePolicy(ctx)`             | Single locally-compiled `.openclaw/policy/policy-ir.json` — no snap, no registry lookup.                                           |
| `getApprovalSink(ctx)`         | Returns `OpenClawStdinSink` — JSON entries to stdout, ApprovalEntry read from stdin via `readline`. Declared `scope: 'ephemeral'`. |
| `shapeResponse(decision, ctx)` | Process stdout (JSON) + exit code: 0 allow, 1 deny, 75 (EX_TEMPFAIL) review-pending.                                               |

See `testing--host-presets.md` for the matrix model and
`host-adapter-contract.md` for the interface all four adapters
implement.

## What the openclaw preset proves

Proposal §1.8 states: _"a host can run Layer 1 + 3 on a single tenant without
a snapshot registry (local `.openclaw/policy/` compiled into the running
plugin)."_ The openclaw preset is the sim proof of exactly that claim.

Specifically it proves:

1. The generated gateway plugin **loads and enforces decisions** with only a
   local `.openclaw/policy/` directory present — no `snap serve` process is
   started, no HTTP calls happen.
2. A policy edit flow exists that **does not require a Layer 2 signal**:
   edit SOUL.md → `claws policy generate` → restart the plugin process → new
   IR is in effect. No `onSnapshotPromoted` lifecycle hook fires.
3. Approval review works through **stdin** (the `readline`-style companion
   mode), so an OC adopter needs no HTTP supervisor stack to exercise the
   review path.
4. `claws doctor` produces actionable diagnostics when a workspace is missing
   `.openclaw/policy/`, and `claws policy generate` recovers from that state.

## LayerConfig

```ts
const openclawPreset: HostPresetConfig = {
  name: "openclaw",
  decide: {
    providers: [/* GuardrailProvider + FileIngestProvider fixtures */],
    mergerMode: "strict-oc7",
  },
  track: { mode: "off" }, // Layer 2 absent
  enforceReview: { companionMode: "cli-stdin", signer: "local-dev" },
  workspace: { mount: "local-dir" },
  scope: "@bic/openclaw", // or '@openclaw' via scope-flip
};
```

Key values:

- `track.mode: 'off'` — first-class absent-Layer-2 state. `snapPort` is
  `null`, `onSnapshotPromoted` is **not callable** (there is no registry to
  promote from).
- `workspace.mount: 'local-dir'` — the plugin reads `.openclaw/policy/`
  directly; no container boundary, no RO mount, no stage redirect.
- `companionMode: 'cli-stdin'` — a mock `readline` prompt. No HTTP. Local
  dev signs with a scenario-derived HMAC key via `signer: 'local-dev'`.

## What openclaw SKIPS (compared to lobster/aether)

| Feature                                 | lobster / aether                           | openclaw                           |
| --------------------------------------- | ------------------------------------------ | ---------------------------------- |
| `snap serve` daemon                     | spawned                                    | **not spawned**                    |
| `onSnapshotPromoted` hook               | fires on promote                           | **never fires**                    |
| `stage` redirect to `.openclaw/.stage/` | container-RO path                          | **not applicable** (direct writes) |
| Supervisor HTTP callback                | signed HMAC over HTTP                      | stdin prompt                       |
| Container-RO `WriteRejection`           | platform-neutral `cause: 'readonly-mount'` | **not applicable**                 |
| `SidecarUnreachableEntry`               | logged on 2× healthz fail                  | **not applicable** (no sidecar)    |
| `currentSnapshotId`                     | tracked by snap                            | **`null`** always                  |

This subtractive list is the point of the preset. Every capability listed
above is a Microsoft-infra cost an adopter might not want. openclaw proves
the plugin still enforces without any of them.

## Preset-specific scenarios (5)

### `bare-plugin-loads`

The plugin loads against a fixture that has `.openclaw/policy/` but no
running snap. Decisions still fire (allow/deny/review/modify) because the
provider chain is fully constituted from the local IR. No Layer 2 wire is
attached to the provider registry — attempting `harness.getCurrentSnapshotId()`
returns `null` and attempting to call through a `snap.*` API returns an
explicit "no track layer" error rather than a hang.

### `regenerate-and-restart-picks-up-new-policy`

The local-dev loop. The scenario edits SOUL.md to add a deny rule, runs
`claws policy generate`, restarts the plugin process (new `require()` with
cache bust), then invokes the newly-denied tool and asserts the deny fires.
Crucially, **no** `onSnapshotPromoted` is invoked across this flow —
reloading is a process-lifecycle fact, not a Layer 2 signal. This is the
Layer 1+3 purity invariant the openclaw shape rests on.

### `cli-hitl-approval`

The companion mock runs in stdin mode (simulates a `readline` prompt that a
developer would answer at the terminal). An R5 tool invocation produces an
`approvalHandle`; the mock's programmed verdict ("allow") is read from the
mock stdin stream; the scenario asserts the approval round-trip completed
and no HTTP path was exercised. Any HTTP call here would be a bug.

### `doctor-diagnoses-missing-policy`

Runs `claws doctor` on a workspace missing `.openclaw/policy/` and asserts
the diagnostic output names the missing directory + suggests
`claws policy generate`. Then runs `claws policy generate` to recover and
reruns `claws doctor`, which must pass clean. This is the recovery-path
contract for a fresh adopter cloning the repo.

### `openclaw-layer-1-plus-3-purity`

The structural guarantee scenario. Runs a full regenerate-and-restart loop
and asserts:

- `track.mode` was `'off'` for the entire scenario,
- no `snap` child process was spawned (`harness.snap` surface is inactive),
- `onSnapshotPromoted` was never invoked on any registered provider,
- no synthetic Layer 2 signal was emitted by the harness at any point.

This is the scenario a real OC adopter relies on — they have no signal source
to impersonate, and this proves the preset doesn't silently pretend.

## Optional: `openclaw-file-watcher-detects-change`

Flagged as **Windows-unreliable** (`fs.watch` is platform-dependent — see
Node.js docs). This scenario is **not part of the preset contract**; it runs
on Linux/macOS only, purely as a bonus convenience probe for developers on
those platforms. Windows developers rely on the regenerate-and-restart loop
instead.

## Scope-flip runs here too

The scope-flip parity gate (`scope-flip-byte-identical.e2e.test.ts`) runs
under openclaw just like under lobster and aether — it compiles the fixture
under `--scope=@bic/openclaw` and `--scope=@openclaw` and asserts produced
policy IR + audit manifest + plugin source are byte-identical modulo the
scope rewrite. Running under openclaw catches host-shape-independent scope
embedding bugs.

See `testing--host-presets.md` "Cross-preset parity gates" for the full
framing.

## Cross-references

- `testing--host-presets.md` — matrix model
- `host-presets--lobster.md` — what lobster adds on top of this shape
- `host-presets--aether.md` — what aether adds on top of lobster
- `testing--e2e-harness.md` — `Harness` interface detail
- `openclaw-upstream-spec.md` §1.8 (three-layer composition — read the
  "1 + 3 on a single tenant" sentence)
- `claws-sim-host-presets.md` H1 — authoritative scenario list
