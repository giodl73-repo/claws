# E2E Sim Harness

**What this guide is**: how the `test/e2e/harness/` scaffolding stands up the clawc governance loop end-to-end — real `snap serve`, real generated plugin, real `claws` CLI, mocked host + companion — and how you write a scenario against it.

## What the harness IS — and what it IS NOT

The harness is **hybrid-fidelity**. Real OpenClaw artifacts and real `claws` binaries do real work; only the plugin-hook invocation path (host) and the supervisor UI (companion) are replaced with in-process mocks so decisions are observable and scriptable.

It is **not** a real deployment. It does not start OC-core, does not talk to a real supervisor app, does not run under a tenant boundary. Those come later (Wepwawet). Scenarios that need real OC-core belong in a different suite.

## Fidelity model

```
┌─────────────────────── in-process (mocked) ───────────────────────┐
│                                                                    │
│   host-mock.ts ──→ plugin-hook registry shape                      │
│                    multi-provider OC-7 merger                      │
│                    deny > review > modify > allow                  │
│                                                                    │
│   companion-mock.ts ──→ signed approvalHandle responses            │
│                         programmable verdict (allow/deny/never)    │
└────────────────────────────────────────────────────────────────────┘
              │                         │
              │ require() cache-bust    │ HMAC sign
              ▼                         ▼
┌─────────────────────────── real bytes ─────────────────────────────┐
│                                                                    │
│   claws policy generate ──→ .openclaw/policy/{policy-ir.json,      │
│                             gateway-plugin.ts, audit-manifest.json}│
│                                                                    │
│   claws snap serve       ──→ HTTP on ephemeral port (listen(0))    │
│                                                                    │
│   claws CLI (via tsx)    ──→ subcommand execution                  │
│                                                                    │
│   HMAC signer            ──→ seed-derived keys, never committed    │
└────────────────────────────────────────────────────────────────────┘
```

Real: snap HTTP, generated plugin bytes, policy IR + audit manifest, 20-verb `claws` CLI, HMAC signing. Mocked: plugin-hook registry invocation (host), supervisor UI (companion).

## The `Harness` interface

Six method groups. Plans 5 and 6 consume this surface — they never extend it.

**State accessors**: `snapPort`, `policyDir`, `scope`.

```ts
const h = await startHarness({ layers, providers, fixture: "allow-r1-public" });
console.log(h.snapPort); // 52341 (or null if layers.track === 'off')
```

**Execution**: `invokeTool`, `ingestFile`.

```ts
const result = await h.invokeTool("send-email", { to: "x@y.z", body: "hi" });
expect(result.decision).toBe("review");
```

**Observability**: `getAuditChain`, `getSnapshots`, `getCurrentSnapshotId`, `verifyAuditChain`.

```ts
const chain = h.getAuditChain();
const verdict = await h.verifyAuditChain();
expect(verdict.ok).toBe(true);
```

**State transitions**: `promote`. Fires `provider.onSnapshotPromoted` on every registered provider.

```ts
await h.promote(draftSnapshotId);
```

**Layer control**: `snap.kill()`, `snap.restart()` for sidecar-crash scenarios.

```ts
await h.snap.kill(); // L2-off simulated mid-scenario
const r = await h.invokeTool("read-inbox", {}); // decide-layer still works
await h.snap.restart();
```

**Lifecycle**: `teardown()`. Returns a `TeardownReport` written to `.teardown-reports/`.

```ts
const report = await h.teardown();
expect(report.residuals).toHaveLength(0);
```

## `LayerConfig` — the three layers

The harness wires the three-layer composition (DECIDE / TRACK / ENFORCE+REVIEW) via a `LayerConfig`:

```ts
interface LayerConfig {
  decide: boolean;
  track: "off" | "local-dir" | "sidecar" | "multi-tenant";
  enforceReview: boolean;
}
```

See [testing--host-presets.md § The three layers](./host-presets.md) for the authoritative layer definitions, the ASCII layer diagram, and why each layer is separable.

Preset dispatch: plan 6 constructs one `LayerConfig` per host preset — `openclaw` (bare-plugin, no snap), `lobster` (stage + promote), `aether` (multi-tenant). Scenarios never know which preset they're running under; they only touch `Harness`.

## Writing a scenario

Minimal `.e2e.test.ts` file:

```ts
import { describe, it, expect, afterEach } from "vitest";
import { startHarness, type Harness } from "../harness";
import { guardrailProvider } from "../providers/example-guardrail";

describe("allow-r1-public", () => {
  let h: Harness;

  afterEach(async () => {
    await h.teardown();
  });

  it("allows R1 tool with PUBLIC data", async () => {
    h = await startHarness({
      layers: { decide: true, track: "local-dir", enforceReview: true },
      providers: [{ kind: "guardrail", providerId: "example", impl: guardrailProvider }],
      fixture: "allow-r1-public",
    });

    const result = await h.invokeTool("read-inbox", {});

    expect(result.decision).toBe("allow");
    expect((await h.verifyAuditChain()).ok).toBe(true);
  });
});
```

The harness copies the fixture into `os.tmpdir()/claws-harness-{scenario}-{uuid}/`, runs `claws policy generate` against the copy, spawns `claws snap serve` on an ephemeral port, registers providers through the host-mock, and wires the companion callback.

## Adding a fixture

Fixtures live under `test/e2e/fixtures/{fixture-name}/`. Minimal layout:

```
allow-r1-public/
├── SOUL.md         # identity + deny rules
├── TOOLS.md        # tool declarations with risk tier + sensitivity
├── AGENTS.md       # agent boundaries
└── .openclaw/      # NEVER present in fixture — harness refuses
```

`fixture-copier.ts` refuses to copy a fixture that already contains `.openclaw/policy/` (unclean source). The per-scenario tmp copy is where `generate` writes; the source stays pristine.

Example `TOOLS.md` entry for `allow-r1-public`:

```markdown
## read-inbox

- riskTier: R1
- sensitivity: PUBLIC
- failOpen: true
- args: { folder: string }
```

## Debug dumps on failure

On any assertion failure, `teardown()` collects:

```
test/e2e/.failures/{scenario-id}.json
  ├── auditChain           full chain at failure point
  ├── snapshots            all draft/current/superseded
  ├── currentRegistry      provider state table
  ├── snapStderr           snap serve stderr tail
  ├── policyGenerateStdout full generate output
  └── fixtureTmpTree       file listing of the tmp fixture copy
```

Default on, opt-out via `VITEST_NO_DUMP=1`. These are your first stop when a scenario flakes.

## Cross-references

- [governance--approval-flow.md](../governance/approval-flow.md) — decision vocabulary, OC-7 merger, 8-field `approvalHandle`, audit cross-linking
- [governance--file-ingest-review.md](../governance/file-ingest-review.md) — `FileIngestProvider` peer path, `redirectPath` invariant, stage lifecycle
- `docs/specs/CL-07-deep-integration.md` — peer-interface canonical types
- `docs/specs/CL-11-upstream-governance.md` — audit chain entry types
- Plan 6 preset guides (`host-presets/openclaw.md`, `host-presets/lobster.md`, `host-presets/aether.md`) for `LayerConfig` presets used in dispatch
