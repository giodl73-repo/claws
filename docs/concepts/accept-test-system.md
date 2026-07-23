# Accept-Test System

**What this guide is**: how accept tests are organised and executed in bic/claws — the manifest, scenario anatomy, the 7 runners, why runner names are decoupled from plan numbers, and the orphan-safety flows. Read this before authoring a scenario or adding a runner.

## The manifest

`tests/accept/scenarios/manifest.yaml` is the top-level registry. It names every semantic series, maps each to a runner, and declares the minimum scenario count.

```yaml
version: 1
series:
  governance-decision:
    runner: e2e-loop-sim
    min: 4
    description: |
      Provider authorization flow: preAuthorize + postAudit + approval routing
      + audit cross-linking. Atoms: guardrail-provider, audit-chain.
  tool-at-risk-approval:
    runner: approval-flow-sim
    min: 5
    description: Approval handle lifecycle for R-tier-elevated tool invocations.
  preset-matrix:
    runner: host-shape-sim
    min: 3
    description: openclaw / lobster / aether host shapes run the same behavioural suite.
  compile-roundtrip:
    runner: compile-sim
    min: 4
    description: Generator emits → policy plugin consumes → byte-identical round-trip.
```

An atom's `scenario.series` field names one of these keys. `manifest-runner.ts` resolves the key to its runner at test-discovery time.

## Scenario anatomy

A scenario lives at `tests/accept/scenarios/{series-id}/S{NN}-{kebab-name}/scenario.yaml` with optional adjacent `fixtures/`.

```yaml
# tests/accept/scenarios/governance-decision/S01-r1-public-allow/scenario.yaml
series: governance-decision
name: R1 tool with PUBLIC data allows cleanly
fixture: allow-r1-public
providers:
  - kind: guardrail
    providerId: example
    impl: example-guardrail
layers:
  decide: true
  track: local-dir
  enforceReview: true
invoke:
  kind: tool_call
  tool: read-inbox
  args: {}
expect:
  decision: allow
  requiresExternalApproval: false
  auditChain:
    entries: [producer, decision]
    verifyOk: true
```

The top-level `scenario.yaml` schema is permissive — `z.record(z.string(), z.unknown())` for the `expect` block — so new runners can extend without migrating every scenario. The **runner** owns the strict shape of its `expect`.

## The 7 runners

Each runner is a semantic name — it describes the behaviour being exercised, not the plan that introduced it. Renaming or re-scoping a plan never renames a runner.

| Runner              | Exercises                                                                                                                                                                              |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compile-sim`       | Generator round-trip: `claws policy generate` → emitted artifacts → canonicalized re-emit produces byte-identical output. Used for `compile-roundtrip`, `atom-scaffold-roundtrip`.     |
| `e2e-loop-sim`      | Full decide/track/enforce+review loop: provider `preAuthorize`, snap lifecycle, generated plugin, audit chain verification. Used for `governance-decision`, `provider-lifecycle-init`. |
| `approval-flow-sim` | Approval-handle lifecycle: 8-field binding, `ApprovalEntry.outcome`, envelope stickiness. Used for `tool-at-risk-approval`, `file-ingest-review`.                                      |
| `host-shape-sim`    | Preset matrix: same behavioural suite under openclaw / lobster / aether host shapes. Used for `preset-matrix`, `tenant-isolation`.                                                     |
| `pinch-sim`         | Rule-level spot-checks — single pinch points (one rule, one input, one expected decision). Used for narrow regression tests.                                                           |
| `emit-sim`          | Artifact validation: does the emitted policy-ir.json / gateway-plugin.ts / audit-manifest.json match its schema + content rules?                                                       |
| `security-sim`      | A2A trust, injection defense, provenance escalation. Used for `security-provenance`.                                                                                                   |

Each runner ships with a typed Zod schema for its `expect` block (`src/accept-runner/schemas/{runner}.schema.ts`). Scenarios load through the dispatcher, which selects the schema by looking up the runner via the series→runner mapping in `manifest.yaml`.

## Why runners are semantic

Pre-Horus, craftworks had runners whose names named the plan that built them — `harness-sim`, `approval-sim`, `preset-sim`. When plan 4 renamed, every atom referencing `harness-sim` needed a coordinated rewrite. That's cascading drift.

Semantic names — `e2e-loop-sim`, `approval-flow-sim`, `host-shape-sim` — describe the _behaviour_. Plan 4 builds the harness that `e2e-loop-sim` uses; if plan 4 renames, the runner name is unchanged because the behaviour is unchanged. This is why the Horus rename was load-bearing: `fleet-sim` was dropped (no downstream behaviour to test), and the other three runners were renamed to match their semantic function once and for all.

## The `--dry-run-drop` flag

Before deleting a runner, a series, or renaming an atom, run:

```bash
claws doctor --check atoms --dry-run-drop series:fleet-coordination
claws doctor --check atoms --dry-run-drop e2e-loop-sim
```

The flag simulates the drop and reports any atoms that would be orphaned (`scenario.series` referencing the dropped series, or atoms whose only series resolves to the dropped runner). Exit code 1 on any orphan — non-zero blocks the drop PR.

This is the safety that let `fleet-sim` be dropped in Horus: a pre-drop scan against the scenario tree confirmed zero atoms referenced it. Adding a new runner is the reverse: write the runner, add a series, write scenarios, then add the registry row.

## Bidirectional orphan sweep

`claws doctor --check atoms` runs both directions on every invocation:

```
  series → atom:
    for each tests/accept/scenarios/{series-id}/:
      ensure ≥ 1 atom declares scenario.series containing series-id
      (otherwise: ORPHAN_SCENARIO_SERIES)

  atom → series:
    for each atom row with scenario.source === 'series':
      for each series in atom.scenario.series:
        ensure tests/accept/scenarios/{series-id}/ exists
        ensure tests/accept/scenarios/manifest.yaml has the entry
        (otherwise: SCENARIO_SERIES_UNDECLARED or MISSING_SCENARIO_DIR)
```

Forward-only sweeps miss renamed atoms that left their old scenario dir behind. Reverse-only sweeps miss new atom rows that forgot to author scenarios. The bidirectional sweep catches both.

## Runtime budgets per tier

| Tier                         | What                                                           | Budget                     |
| ---------------------------- | -------------------------------------------------------------- | -------------------------- |
| L0 unit                      | Per-runner schema validation, manifest loader, scenario loader | < 500ms total              |
| L1 integration               | Real scenario tree loaded; fixture copy; no providers wired    | < 2s                       |
| L2 e2e (accept-runner scope) | Full runner with mocked layers                                 | < 5s on ~350-scenario tree |

`--check accept` (harness-less accept-runner invocation) shares the L1 budget. Running the full accept suite via the e2e harness is governed by plan 4's harness budgets, not this gate.

## The scaffolder

`claws make atom <slug> --scenario-source series --scenario-series series:{id}` creates the scenario directory with an `S01-{slug}-happy-path/scenario.yaml` template. The template fills in the `series`, `fixture`, and `expect` block based on the runner the series resolves to — so a `host-shape-sim` series gets a preset-matrix expect scaffold, an `approval-flow-sim` series gets an approval-handle scaffold, and so on.

See `docs/contributing/adding-an-atom.md` for the 3-file PR walkthrough that ties scenario authoring to registry + contract authoring.

## Cross-references

- [concepts--atoms-registry.md](./atoms-registry.md) — `scenario` discriminated union, the source of series references
- [testing--e2e-harness.md](../testing/e2e-harness.md) — how `e2e-loop-sim` wires scenarios through the full governance loop
- [governance--approval-flow.md](../governance/approval-flow.md) — the flow `approval-flow-sim` covers
- `docs/specs/CL-13-repo-boundary.md` §N.3 — accept-test authority invariants
