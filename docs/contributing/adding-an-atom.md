# Contributing — Adding an atom

You're adding a new concept to bic/claws that other contributors will need
to find, test, and document. This guide walks you through the 3-file PR
shape the atoms-registry oracle enforces, how to use `claws make atom` to
scaffold it, and when the unit-test exemption applies.

Prereqs: dev env set up (see `contributing--windows-setup.md`), on a branch
off `main`, working tree clean.

## The 3-file PR shape

Every new atom lands as one PR that touches exactly three locations:

1. **Registry entry** in `docs/concepts/atoms-registry.md` — one row under
   the correct layer, with all 13 required fields (id, slug, name, layer,
   visibility, docType, status, surfaces, scenario, authority, mirrors,
   reuses, spec).
2. **Surface contract** at `docs/specs/contracts/{atom-id}.yaml` — declares
   which of the 11 doc surfaces (guide, deck, tutorial, trace, spec, story,
   howto, example, research, index, root) your atom needs.
3. **Scenario series** at `tests/accept/scenarios/{series-id}/` — at least
   one scenario directory with `scenario.yaml` + `fixtures/`. **OR** the
   `scenario-source: unit-test` exemption (see below).

PRs that add fewer than three files get rejected at the atoms-oracle gate
(`claws doctor --check atoms`), which runs on every PR.

## Quick path — `claws make atom`

Don't hand-write these files. The scaffolder writes all three at once from
templates:

```bash
claws make atom guardrail-provider \
  --name GuardrailProvider \
  --layer governance \
  --visibility public \
  --doc-type spec \
  --surfaces guide,spec,howto \
  --scenario-source series \
  --scenario-series governance-decision,tool-at-risk-approval
```

### What the scaffolder writes

Templated from `devtools/repo-ops/atom-templates/`:

| Template | Output |
|---|---|
| `atoms-registry-row.md.hbs` | new row inserted at the `governance` layer in `docs/concepts/atoms-registry.md` |
| `surface-contract.yaml.hbs` | `docs/specs/contracts/guardrail-provider.yaml` with narrative placeholders per surface |
| `scenario.yaml.hbs` | `tests/accept/scenarios/governance-decision/S01-guardrail-provider-happy-path/scenario.yaml` + `fixtures/` (one per series-id) |

### Flags you'll actually use

| Flag | Purpose |
|---|---|
| `--layer` | one of `compiler`, `security`, `runtime`, `cli`, `governance`, `workspace`, `testing`, `ops` |
| `--visibility` | `public` (stable contract), `internal` (cross-package but not exported), `private` (single-package) |
| `--doc-type` | `concept`, `process`, `command`, `spec`, `domain` |
| `--surfaces` | comma list from the 11-surface matrix |
| `--scenario-source` | `series` (default) or `unit-test` exemption |
| `--scenario-series` | comma list of semantic series ids (e.g. `governance-decision`) |
| `--status` | `draft` (default for new atoms) → promote to `stable` later |
| `--dry-run` | prints unified diff; writes nothing; skips editor |
| `--no-editor` | writes files but doesn't open them |

### Editor cascade

After writing, the scaffolder opens all three files so you can fill in the
prose. It tries, in order: `$EDITOR` → `%VISUAL%` → `code` on PATH →
`Start-Process <file>` (Windows shell association) → `notepad.exe`. Pass
`--no-editor` on CI or when running in a headless shell.

## Verification

Before pushing, run the oracle check locally:

```bash
claws doctor --check atoms
```

Expected: exits `0`, no findings. Common immediate failures:

- **"Atom `guardrail-provider` has no surface contract"** — you skipped step 2,
  or the YAML file path doesn't match the atom id.
- **"Scenario series `governance-decision` not referenced by any atom"** —
  orphan series; add the registry row or delete the series directory.
- **"Contract `guardrail-provider.yaml` has no registry entry"** — orphan
  contract; inverse of above.

The bidirectional sweep catches both directions — registry→contract and
contract→registry, registry→scenario and scenario→registry. Silent drift is
rejected.

## When to use `scenario-source: unit-test`

Pure library code and ops atoms (things that validate, scrub, or package
infrastructure rather than execute runtime behavior) are exempt from the
scenario-series requirement. Use the exemption when:

- Atom is `layer: ops` and its behaviour is small, deterministic, and fully
  covered by the implementing package's L0 unit tests.
- Atom has no user-observable runtime surface (nothing a scenario could
  `expect:` on beyond what a unit test already covers).

Current exempted atoms (see registry): `atom:repo-ops`,
`atom:doc-validation`, `atom:accept-test`, `atom:atoms-registry`,
`atom:no-craftworks-gate`, `atom:doc-scrubber`.

If you're not sure, default to `--scenario-source series` — the exemption
is a narrow carve-out, not the easy path.

## Status lifecycle

- `draft` — default at port time. Spec obligations are drafted but may still
  move; coverage gates run but don't enforce `stable`-tier requirements.
- `stable` — authority spec signed, scenarios green on main for one release
  cycle, no open revisions. Promotion happens in a follow-up PR.
- `deprecated` — atom retired; `replaces: atom:{new-slug}` names the
  successor. Gates ignore deprecated atoms for coverage requirements but
  keep the row so historical references resolve.

## Common mistakes

| Symptom | Cause | Fix |
|---|---|---|
| Contract YAML exists, `--check atoms` still fails | filename doesn't match atom id | rename file to `{atom-id without "atom:" prefix}.yaml` |
| Scaffolded but CI fails on series min-count | manifest.yaml `min` > scenarios present | add scenarios, or lower min in `tests/accept/scenarios/manifest.yaml` |
| `scenario-source: series` with no series listed | discriminated-union violation | add `--scenario-series` or switch to `unit-test` exemption |
| Cross-wave atom reference broken | atom renamed elsewhere | `claws doctor --check atoms` will flag; update `reuses` field |

## Cross-references

- [`concepts--atoms-registry.md`](../concepts/atoms-registry.md) — full registry + 13-field schema reference
- [`concepts--accept-test-system.md`](../concepts/accept-test-system.md) — manifest + runner + scenario anatomy
- `specs/CL-13-repo-boundary.md` — canonical `@bic/*` scope rules
- `specs/CL-13-repo-boundary.md` — oracle invariants
