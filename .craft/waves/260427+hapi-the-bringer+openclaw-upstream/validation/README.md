# Real-world validation suite

Fork-readiness validation harness. Runs the 5-substrate toolchain against
authentic public OpenClaw-shaped GitHub repos + synthetic edge-case
fixtures, then reports per-fixture outcomes.

The point: catch "our rules and fixers work on workspaces we authored,
but break on workspaces in the wild" before pasting the substrates into
the openclaw fork.

## Layout

```
validation/
├── fixtures/                     clean copies — never mutated
│   ├── real/<slug>/              cloned from public github repos
│   └── synthetic/<slug>/         hand-authored edge cases
├── scratch/<slug>/               working copy — regenerated per run
├── manifest.json                 source of truth: slug → {kind, source, ref, shape}
├── scripts/
│   ├── stage.mjs                 rsync clean → scratch (idempotent)
│   ├── run-suite.mjs             invoke all 5 tools per scratch dir
│   └── report.mjs                aggregate results → REPORT.md
├── results/<slug>/               per-tool JSON outputs
│   ├── path.json
│   ├── lint.json
│   ├── doctor.json
│   ├── policy-generate.json
│   ├── policy-check.json
│   └── lkg.json
└── REPORT.md                     human-readable cross-fixture rollup
```

## The pipeline per fixture

1. **Stage**: rsync `fixtures/<kind>/<slug>/` → `scratch/<slug>/`. Idempotent.
2. **Path**: `openclaw-path workspace --cwd <scratch>` — manifest detection.
3. **Lint**: `openclaw-pinch run <scratch>` — all registered rule packs.
4. **Doctor**: oc-doctor adapter detect (no fix) — list findings, classify by tier.
5. **Policy generate** (if MD source files present): `openclaw-policy generate <scratch>` → emit policy.jsonc, observe shape.
6. **Policy check** (if policy.jsonc present): `openclaw-policy check <scratch>` → drift detect.
7. **LKG fault simulation**: pick one tracked file, clobber with garbage bytes, run `openclaw-cage observe`, verify recovery.

## Running

```sh
# stage one fixture
node scripts/stage.mjs <slug>

# stage + run the full suite for one fixture
node scripts/run-suite.mjs <slug>

# stage + run for all fixtures in manifest.json
node scripts/run-suite.mjs --all

# regenerate REPORT.md from results/
node scripts/report.mjs
```

## Manifest schema

See `manifest.json`. Each entry has:

- `slug` (kebab-case, unique)
- `kind` ("real" | "synthetic")
- `source` (real only): `{ type: "git", url, ref, subdir? }`
- `license` (real only): SPDX id
- `shapeFiles`: which OpenClaw-shape files this fixture exercises
- `notes`: what's interesting about this fixture (rich shape, edge case, etc.)

## Adding fixtures

**Real**: clone the upstream repo into `fixtures/real/<slug>/`, add a manifest entry, commit. Use a shallow clone + remove `.git` to keep the suite hermetic.

**Synthetic**: create `fixtures/synthetic/<slug>/` by hand, add a manifest entry, commit.
