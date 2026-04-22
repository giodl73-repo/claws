# Doc Validation

**What this guide is**: how `claws doctor --check docs` decides whether the repo's docs meet their declared obligations — the 11 surfaces, the surface matrix, the 17 gap types, and the `known-gaps.yaml` + `--fix=suggest` flow. Read this if your PR tripped a gap diagnostic or you're trying to understand what the gate covers.

## The 11 surfaces

A surface is a *kind* of doc. Every atom declares a subset of these as required; every doc manifest declares which atoms it serves.

| Surface     | What it is                                                                     |
|-------------|--------------------------------------------------------------------------------|
| `guide`     | Narrative concept or how-it-works doc (this file is a `guide`)                 |
| `deck`      | Pitch / overview slides (marp-compiled markdown)                               |
| `tutorial`  | Step-by-step walkthrough a reader can follow hands-on                          |
| `trace`     | End-to-end pipeline walkthrough with real artifacts                            |
| `spec`      | Normative specification — the authoritative contract                            |
| `story`     | Customer-facing narrative / motivation                                          |
| `howto`     | Task-oriented recipe ("how do I do X?")                                         |
| `example`   | Runnable code sample with explanation                                           |
| `research`  | Background investigation, landscape analysis, or design rationale              |
| `index`     | Hub page linking to a cluster of docs                                           |
| `root`      | Top-level entry (README, landing page)                                          |

These surface names are generic doc-system concepts and stay stable across the migration.

## The 15-entry surface matrix

`surface-matrix.ts` is a lookup table: `(visibility, docType) → required surfaces`. Visibility is `public | internal | private`; docType is `concept | process | command | spec | domain` — 15 combinations, one required-surface list each. An atom's `visibility` + `docType` select its row; the row lists the surfaces it must cover.

Conceptually:

```
  (public, spec)      → [guide, spec, howto]
  (public, command)   → [guide, command, tutorial]
  (internal, domain)  → [guide]
  (public, concept)   → [guide, deck]
  ...
```

Individual atoms may *add* to the matrix default via their `surfaces` field, but cannot fall below it — the matrix is the floor.

## Surface contracts

For every atom, `docs/specs/contracts/{atom-id}.yaml` declares what each required surface must contain. This is how the oracle distinguishes "the guide exists" from "the guide covers what it must."

```yaml
# docs/specs/contracts/guardrail-provider.yaml
atom: atom:guardrail-provider
surfaces:
  guide:
    path: docs/concepts/governance/guardrail-provider.md
    must-cover:
      - decision-vocabulary
      - composition-rule
      - preAuthorize-signature
  spec:
    path: docs/specs/CL-07.md
    section: "§1a Peer Interfaces"
    must-define:
      - interface-shape
      - host-obligations
  howto:
    path: docs/howto/write-a-guardrail-provider.md
    must-walk-through: [minimal-provider, decision-paths, audit-integration]
```

The gap detector reads these + walks the docs; a missing section produces a `MISSING_REQUIRED_COVERAGE` gap with the atom id + surface + offending slot.

## Doc manifests

The reverse direction: `docs/*/doc-manifest.yaml` declares which atoms each doc tree serves.

```yaml
# docs/concepts/governance/doc-manifest.yaml
serves:
  - atom:guardrail-provider
  - atom:file-ingest-provider
  - atom:approval-handle
```

The oracle cross-references: every atom referenced in a manifest must exist in `docs/concepts/atoms-registry.md`; every doc in the tree must either be referenced by a manifest or be flagged as orphan.

## The 17 gap types

Each gap has a code, severity, message template, a hint, and a `docsLink`. The shape is `{ code, severity, message, hint, docsLink }` — this is what shows up in CI annotations.

| Code                          | Severity | Message                                                  | Hint                                                    |
|-------------------------------|----------|----------------------------------------------------------|---------------------------------------------------------|
| `MISSING_SURFACE_CONTRACT`    | error    | Atom has no `docs/specs/contracts/{id}.yaml`             | Run `claws make atom <slug>` or author the contract    |
| `MISSING_REQUIRED_SURFACE`    | error    | Surface required by matrix + atom not found              | Add the doc at the path named by the contract          |
| `MISSING_REQUIRED_COVERAGE`   | error    | Required `must-cover` slot not found in the doc           | Add the missing H2/H3 section                          |
| `ORPHAN_CONTRACT`             | error    | Contract exists but no registry row                      | Add the row or delete the contract                     |
| `ORPHAN_DOC`                  | warn     | Doc not served by any manifest                           | Add to nearest `doc-manifest.yaml` or delete            |
| `UNKNOWN_ATOM_IN_MANIFEST`    | error    | Manifest references atom not in registry                 | Fix slug or add the atom row                           |
| `STALE_AUTHORITY`             | error    | Mirror content hash diverges from authority              | Re-run scrubber / regenerate mirror                    |
| `DEPRECATED_REPLACES_MISSING` | error    | Deprecated atom's `replaces:` target not in registry     | Fix the slug or set `replaces: null`                   |
| `DRAFT_SPEC_LINK_BROKEN`      | error    | `spec:` cites a draft path that doesn't exist            | Add the draft or remove the citation                   |
| `STATUS_SURFACE_MISMATCH`     | warn     | Stable atom still linked via draft spec                  | Promote the spec or move to `draft` status             |
| `MANIFEST_PATH_UNREACHABLE`   | error    | Manifest names a file that doesn't exist                 | Update the path or create the file                     |
| `SURFACE_PATH_COLLISION`      | error    | Two contracts point the same surface at the same file     | Split the surface or merge the atoms                   |
| `REQUIRED_FIELD_MISSING`      | error    | Registry row missing a required field                    | Add the field (13 are required)                        |
| `SCENARIO_DISCRIMINATOR_INVALID` | error | `scenario.source` is neither `series` nor `unit-test`    | Pick one shape; no partial fields                      |
| `SCENARIO_SERIES_UNDECLARED`  | error    | `scenario.series` names a series absent from manifest    | Register it in `tests/accept/scenarios/manifest.yaml`  |
| `ORPHAN_SCENARIO_SERIES`      | error    | `tests/accept/scenarios/{series-id}/` exists but no atom claims it | Add `scenario.series: [series-id]` to a registry row, or delete the scenario directory |
| `MISSING_SCENARIO_DIR`        | error    | Atom cites `scenario.series` but `tests/accept/scenarios/{series-id}/` is absent | Create the scenario directory with ≥1 `S{NN}-*/scenario.yaml` |

## `known-gaps.yaml` acknowledgment

Sometimes a gap is intentional and expected to close in a named wave. `docs/known-gaps.yaml` acknowledges these:

```yaml
version: 1
gaps:
  - code: MISSING_REQUIRED_SURFACE
    atom: atom:host-preset
    surface: example
    plan: .craft/plans/claws-sim-host-presets.md
    expires: 2026-06-01
    reason: |
      Preset example fixtures land with the sim-host-presets plan.
```

An acknowledged gap does not fail the build. `--stale-audit` mode flags acknowledgments whose expiry passed or whose referenced plan closed without addressing them.

## `--fix` modes

```bash
claws doctor --check docs --fix=suggest
claws doctor --check docs --fix=apply --yes
```

`--fix=suggest` prints a unified diff to stdout: for trivial gaps (missing manifest entry, stale path, wrong slug) it shows exactly what would change. No writes.

`--fix=apply --yes` writes the suggested fixes. It never touches prose content — only declarative artifacts (`doc-manifest.yaml`, missing contract scaffolds, slug corrections). Human-judgement gaps (`MISSING_REQUIRED_COVERAGE`) always require hand-editing.

## `claws doctor --check docs` CLI

```bash
claws doctor --check docs                   # run + report
claws doctor --check docs --format json     # machine-readable
claws doctor --check docs --fix=suggest     # print unified diff
claws doctor --check docs --fix=apply --yes # write trivial fixes
```

**Exit codes**: `0` clean; `1` gap(s) found; `3` infrastructure error (missing config, walker crash). A `no-craftworks` violation is exit `2` — that's a different check.

**Runtime budget**: < 3s on a ~200-doc tree (Windows dev machine). Regressions > 30% surface as a CI warning.

## `LIFT-MANIFEST.md` — port tracking (see contributing)

The doc-validator package carries a `LIFT-MANIFEST.md` during CP-3 port work; it tracks each file lifted from craftworks with source, destination, external types, port status, and timestamp. This is **contributor-facing** infrastructure, not part of the gate contract — see [contributing--doc-scrub-checklist.md](../contributing/doc-scrub-checklist.md) for the full port protocol (scrub rules, line-ending preservation, second-eyes review). The manifest is owned by `@bic/claws-release-eng` CODEOWNERS and is archived (or deleted) at CP-8 wave close once ports are complete.

## Cross-references

- [concepts--atoms-registry.md](./atoms-registry.md) — the 13-field schema the doc gate validates against
- [concepts--no-craftworks-gate.md](./no-craftworks-gate.md) — companion content-scan gate (exit code 2)
- `docs/specs/CL-13-repo-boundary.md` §N.2 — doc-validation authority
- `docs/contributing/adding-an-atom.md` — 3-file PR walkthrough
