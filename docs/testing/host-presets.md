# Testing under host presets — the matrix model

This guide explains why the bic/claws sim harness ships three named **host
presets** (openclaw / lobster / aether) instead of one "run everything under
one config" harness. If you're reading the repo for the first time and
wondering what a preset is, what the three presets correspond to, or why
there's a matrix dispatcher instead of copy-pasted scenario files, start
here.

## What is a preset?

A preset is a **configured `Harness` instance shaped to a host deployment
pattern**. Concretely, it is a value of `HostPresetConfig` that the test
harness factory (`startHarness`) accepts and uses to wire its three layers
differently.

```ts
interface HostPresetConfig {
  name: 'openclaw' | 'lobster' | 'aether';
  decide:        { providers: ProviderSpec[]; mergerMode: 'oc-native' | 'strict-oc7' };
  track:         { mode: 'off' | 'local-dir' | 'sidecar' | 'multi-tenant' };
  enforceReview: { companionMode: 'cli-stdin' | 'supervisor-http' | 'tenant-admin';
                   signer: 'local-dev' | 'cowork-supervisor' | 'tenant-admin' };
  workspace:     { mount: 'local-dir' | 'container-RO' | 'snapshot-RO' };
  scope:         '@bic/openclaw' | '@openclaw';
}
```

A preset is **not** a separate plugin, a separate codebase, or a separate
product. The same generated gateway plugin and the same `@openclaw/*` runtime
packages run under every preset. Only the host layer changes — so the sim
proves that the contribution is host-neutral the way the upstream proposal
claims.

## The three layers

The upstream proposal (`openclaw-upstream-spec.md` §1.8) partitions any OC
deployment into three separable layers:

```
  ┌─── LAYER 1 · DECIDE ────────────────────────────────────────────┐
  │   Should this tool-call / file-write happen as-is?              │
  │   GuardrailProvider + FileIngestProvider                        │
  │   FileIngestProvider.modify + redirectPath redirects pending    │
  │   writes to .openclaw/.stage/<path>.                            │
  └─────────────────────────────────────────────────────────────────┘

  ┌─── LAYER 2 · TRACK ─────────────────────────────────────────────┐
  │   What workspace state is in force, what's pending, what was?   │
  │   @openclaw/snap owns draft → current → superseded.             │
  │   Absent in openclaw preset (`track.mode: 'off'`).              │
  └─────────────────────────────────────────────────────────────────┘

  ┌─── LAYER 3 · ENFORCE + REVIEW ──────────────────────────────────┐
  │   The generated plugin enforces policy at runtime; the          │
  │   companion reviews and signs approvalHandle for promote.       │
  └─────────────────────────────────────────────────────────────────┘
```

Each layer is separable. That is the structural claim the sim must prove.

## Why three presets?

Each preset is a **different combination of enabled layers + host shape**:

| Preset   | Layers      | Workspace mount | Companion mode      | Tenancy                |
|----------|-------------|-----------------|---------------------|------------------------|
| openclaw | **1 + 3**   | `local-dir`     | `cli-stdin`         | single (proof: no snap)|
| lobster  | **1 + 2 + 3** | `container-RO` | `supervisor-http`   | single, sidecar snap   |
| aether   | **1 + 2 + 3** | `snapshot-RO`  | `tenant-admin`      | multi (**host-layer**) |

**openclaw** proves the no-snap / zero-Microsoft-infra case — a single tenant
with a local `.openclaw/policy/` directory. **lobster** proves the
single-tenant container-per-workspace pattern with a sidecar snap. **aether**
proves host-layer multi-tenancy, where snap stays tenancy-blind per proposal
§5.9 and the aether *host* owns the tenant boundary.

If one preset is deleted, the fidelity claim collapses. If a fourth is added,
some other layer combination must be at stake. See `host-presets--openclaw.md`,
`host-presets--lobster.md`, `host-presets--aether.md` for per-preset detail.

## The matrix dispatcher

Plan 5 owns the behavioural suite (approval flow, handle binding, OC-7
envelope stickiness, G-CHAIN generator-compile-time stickiness) as a
**parameterized test matrix**. Each scenario accepts a `HostPresetConfig` and
asserts only on behavior (e.g., "R5 tool blocked", "supervisor approval path
taken") — never on structural config fields.

Plan 6 owns the **preset matrix dispatcher**: for each preset in
`{openclaw, lobster, aether}` where the scenario's behavior applies (skip
rules declared in plan 5's suite metadata), it runs plan 5's scenario under
that preset's `HostPresetConfig`.

```
          Plan 5 behavioural suite (~13 scenarios, parameterized)
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
         openclaw           lobster           aether
        (Layer 1+3)      (Layer 1+2+3)   (Layer 1+2+3 +
                                          host-layer tenancy)
              │                │                │
              ▼                ▼                ▼
         ~some skips     all run        all run + RESTRICTED
                                         file-ingest scenarios
```

This is why plan 6 does **not** own duplicated behavioural scenarios. Plan 6
owns only scenarios where the **preset config itself is the subject**, not
where it is a parameter. Those are the 15 preset-specific scenarios
(5 per preset) plus the 4 cross-preset parity scenarios below.

## Cross-preset parity gates

Two scenarios run in every preset to catch host-specific bugs in invariants
that should hold identically everywhere:

### `scope-flip-byte-identical` — runs under all three presets

Compiles the same fixture under `--scope=@bic/openclaw` and `--scope=@openclaw`
and asserts produced policy IR + audit manifest + plugin source are
byte-identical. Running under all three presets catches host-specific scope
embedding bugs (e.g., a tenant manifest field that leaks scope strings only
under aether).

### `canonicalize-byte-identical-cross-os` — CI matrix

The proposal §2 / §5 property 6 invariant: the same RFC 8785 JCS
canonicalizer produces byte-identical output on Linux + Windows + macOS on
the same input. Runs on the CI matrix (ubuntu-latest, windows-latest,
macos-latest) and compares artifacts across OS runs.

Both scenarios run in the `invariants` suite on main + PR-to-main only (not
every push) to stay inside the CI-time budget.

## Scenarios never assert on structural config

`preset.name`, `preset.track.mode`, `preset.workspace.mount` are **internal
harness state**. Scenario code cannot read them. Scenarios assert only on
observable behavior:

- "tool was blocked" (not "track.mode is sidecar")
- "`WriteRejection` emitted with `cause: 'readonly-mount'`" (not "OS was Windows")
- "in-flight call completes against registry N" (not "promote happened")

This keeps `HostPresetConfig` a test-harness convenience, not a product
surface that drifts without spec authority.

## Cross-references

- `host-presets--openclaw.md` — Layer 1+3 purity detail
- `host-presets--lobster.md` — container-RO + sidecar snap + supervisor
- `host-presets--aether.md` — host-layer multi-tenancy
- `testing--e2e-harness.md` — `Harness` interface, `startHarness` factory,
  fixtures, teardown, debug dumps
- `governance--approval-flow.md` — approval handle binding + companion
  semantics (consumed by every preset)
- `governance--file-ingest-review.md` — `FileIngestProvider` review + modify
  flow (runs under lobster/aether via dispatcher)
- `openclaw-upstream-spec.md` §1.8 (three-layer composition) and §5.9
  (per-tenant isolation is host-layer, not registry-level)
