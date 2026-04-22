# Atoms Registry

**What this guide is**: the schema, lifecycle, and oracle invariants of `docs/concepts/atoms-registry.md` — the single source of truth that both the doc-validation gate and the accept-test gate consult. Read this before adding an atom or reviewing a PR that touches atoms.

## What an atom is

An atom is a named, reusable unit of concept or capability in bic/claws — `atom:guardrail-provider`, `atom:audit-chain`, `atom:snap-registry`. Each atom has one canonical definition (**authority**) and one or more **mirrors** that must stay consistent. Atoms are stable identifiers; they outlive specs, plans, and package boundaries.

The registry exists because atoms are cross-cut: a single atom is cited by specs, guides, decks, scenarios, and runtime code. Without a central oracle, the references drift. `claws doctor --check atoms` fails the build when the registry, the surface contracts, and the scenario tree disagree.

## The 13-field schema

Every registry row carries exactly 13 fields. Six are preserved from the pre-Horus clawc ATOMS.md; seven are new for the oracle.

| Field              | Meaning                                                                       |
|--------------------|-------------------------------------------------------------------------------|
| `id`               | Canonical identifier: `atom:{slug}`                                           |
| `slug`             | Identifier suffix (no `atom:` prefix), used in filenames + series-ids         |
| `name`             | Human-readable display name                                                   |
| `authority`        | Path to the canonical spec/doc that defines this atom                         |
| `mirrors`          | Paths that must stay byte- or content-equivalent to the authority             |
| `reuses`           | Atoms this one extends or composes                                            |
| `spec`             | Governing spec ID(s) — `CL-07`, `CL-13`, `CL-NEW-canonicalizer-byte-identical`|
| `layer`            | `compiler`, `security`, `runtime`, `cli`, `governance`, `workspace`, `testing`, `ops` |
| `visibility`       | `public`, `internal`, `private`                                               |
| `docType`          | `concept`, `process`, `command`, `spec`, `domain`                             |
| `status`           | `draft`, `stable`, `deprecated` (deprecated carries a `replaces:` pointer)    |
| `surfaces`         | Required doc surfaces — subset of the 11 (see `concepts--doc-validation.md`)  |
| `scenario`         | Discriminated union — see next section                                        |

## The `scenario` discriminated union

The `scenario` field is what binds an atom to its behavioural proof. It has two shapes — no halfway states, no optional sub-fields.

```ts
type AtomScenario =
  | { source: 'series'; series: string[] }     // accept-test series IDs
  | { source: 'unit-test' };                   // exemption; behaviour proved via L0 tests
```

Zod shape:

```ts
const AtomScenario = z.discriminatedUnion('source', [
  z.object({ source: z.literal('series'), series: z.array(z.string()).min(1) }),
  z.object({ source: z.literal('unit-test') }),
]);
```

**Use `source: 'series'`** when the atom describes externally observable behaviour (a decision flow, a host preset, a compilation round-trip). The `series` array names semantic series IDs — `series:governance-decision`, `series:preset-matrix` — which `tests/accept/scenarios/manifest.yaml` then maps to concrete runners.

**Use `source: 'unit-test'`** for infrastructure atoms whose behaviour is proved by the implementing package's L0 tests rather than a top-level scenario tree. The six current exemptions are all ops-layer atoms: `atom:repo-ops`, `atom:doc-validation`, `atom:accept-test`, `atom:atoms-registry`, `atom:no-craftworks-gate`, `atom:doc-scrubber`. `atom:atom-scaffolder` is also ops-layer but is NOT exempt — its `claws make atom` surface is scenario-covered via `series:atom-scaffold-roundtrip`. Exemptions are a first-class field, not a special-case in the validator — audit is mechanical.

## The `status` lifecycle

```
  draft ──(authority spec signs)──▶ stable ──(superseded)──▶ deprecated
```

Pin semantics:
- **`draft`** — row exists; authority spec is in `specs/drafts/`. Gates apply doc + scenario obligations but tolerate in-flight drift.
- **`stable`** — authority spec is in `docs/specs/`. Surface contract + scenario series are complete and passing. This is the default for ported atoms that were stable in clawc.
- **`deprecated`** — atom retired. Row carries `replaces: atom:{new-slug}` pointing at the successor (or `replaces: null` if nothing took its place). Coverage gates skip deprecated atoms; the row stays in the registry so git log + older PRs still resolve.

Deprecation is not deletion. A clean-up wave can compact deprecated rows into an appendix, but they never disappear from history.

## The oracle invariant

```
  atoms-registry.md ◀────────────┐
          │                       │ (reverse: orphan sweep)
          │  (forward: coverage)  │
          ▼                       │
  docs/specs/contracts/*.yaml ────┘
  tests/accept/scenarios/{series-id}/
```

**Forward** (coverage): every atom row declares `surfaces` + `scenario`. The doc-validation gate checks each atom has a matching `docs/specs/contracts/{atom-id}.yaml`. The accept-test gate checks each referenced series exists with ≥ its declared min count.

**Reverse** (orphan detection): every surface contract file maps back to a registry row (no orphan contracts); every `tests/accept/scenarios/{series-id}/` directory maps back to at least one registry row (no orphan scenarios). Orphans are renamed atoms that left their artifacts behind, or artifacts added without a row.

`claws doctor --check atoms` runs both passes. Exit code 1 on any mismatch; exit code 0 clean.

## Example: `atom:guardrail-provider`

Registry row (YAML-equivalent view — the registry stores it as a markdown table row):

```yaml
id: atom:guardrail-provider
slug: guardrail-provider
name: GuardrailProvider
authority: docs/specs/CL-07.md
mirrors:
  - packages/openclaw-guardrails/README.md
  - docs/concepts/governance/guardrail-provider.md
reuses: [atom:approval-handle, atom:audit-chain]
spec: [CL-07, CL-11]
layer: governance
visibility: public
docType: spec
status: stable
surfaces: [guide, spec, howto]
scenario:
  source: series
  series: [series:governance-decision, series:tool-at-risk-approval]
```

Adding this atom is a **3-file PR**:

1. `docs/concepts/atoms-registry.md` — the registry row above
2. `docs/specs/contracts/guardrail-provider.yaml` — declares each listed surface's content obligations (what the guide must cover, what the spec must define, what the howto walks through)
3. `tests/accept/scenarios/governance-decision/S01-*/scenario.yaml` — at least one scenario under the first listed series (the second, `tool-at-risk-approval`, reuses the scenario dir for `atom:approval-handle`)

Running `claws make atom guardrail-provider --layer governance --visibility public --doc-type spec --surfaces guide,spec,howto --scenario-source series --scenario-series series:governance-decision,series:tool-at-risk-approval` scaffolds all three files from templates; see `concepts--accept-test-system.md` for the scenario shape.

## Cross-references

- [concepts--doc-validation.md](./doc-validation.md) — 11 surfaces + 17 gap types the oracle checks
- [concepts--accept-test-system.md](./accept-test-system.md) — scenario series shape + 7 runners
- `docs/contributing/adding-an-atom.md` — 3-file PR walkthrough (authored by H6)
- `docs/specs/CL-13-repo-boundary.md` — renames `bic/clawc` → `bic/claws`, scope split
- `docs/specs/CL-13-repo-boundary.md` — §N.1 atoms registry as oracle, §N.6 status semantics
