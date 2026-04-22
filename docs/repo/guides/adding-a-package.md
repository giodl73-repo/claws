---
covers: [atom:RB]
---

# How-to: add a new package

You want to add a new package to bic/claws. This guide walks through
the checklist, from location selection to CI integration.

## Step 1 · Pick a location

Per [../specs/RB-repo-boundary.md § Package location rules](../specs/RB-repo-boundary.md):

- Is this a future `@openclaw/*` contribution? → `packages/openclaw-NAME/`
- Is this internal only (not shipping to customers)? → `packages/claws-NAME/`
- Is this repo-business tooling (doc linter, etc.)? → `devtools/NAME/`
- Is this a test harness? → `test/NAME/`

If none fit, discuss with the domain architect before adding a 5th
location.

## Step 2 · Wire into the root workspace

Edit `/c/src/claws/package.json`:

```json
{
  "workspaces": [
    "packages/claws",
    "packages/claws-sdk",
    ...,
    "packages/NEWPKG"   // ← add here
  ]
}
```

Run `npm install` from the repo root.

## Step 3 · Package.json

```json
{
  "name": "@bic/openclaw-NAME",       // or @bic/claws-NAME for internal
  "version": "0.1.0",
  "private": true,                    // never public until scope-flip
  "type": "module",
  "publishConfig": {
    "layer": "incubating"             // see RB § 11-value layer enumeration
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "test:unit": "vitest run --project unit"
  }
}
```

## Step 4 · Directory structure

Create under `docs/NAME/`:

```
docs/NAME/
  README.md
  ATOMS.md
  CHANGELOG.md
  specs/
    XX-primary.md       ← primary spec, 2-letter code
  guides/               ← (optional; if atoms declare need 'guide')
  pitfalls/             ← (optional)
  scenarios/            ← (optional; include manifest.yaml if present)
```

`devtools/repo-ops/src/check.ts --docs-dir docs/` must exit 0 after
you add the package.

## Step 5 · Dependency direction

Per [../specs/RB-repo-boundary.md § Dependency direction](../specs/RB-repo-boundary.md),
pick where in the DAG the package sits. Add imports ONLY in the
allowed direction. If you need an import that reverses the DAG,
refactor — the cycle will block the build.

## Step 6 · Tests

Every package ships a test project. Minimum: per-file 95/90/95/95
coverage bar (statements/branches/functions/lines).

```
packages/NAME/
  src/
    index.ts
  test/
    index.test.ts
  vitest.config.ts          ← with thresholds
```

## Step 7 · CI wire-up

Edit `.github/workflows/ci.yml` if your new package needs its own
CI job. Default workspace-wide jobs (build, test, lint) cover new
packages automatically.

## Step 8 · Documentation cross-linking

Update `docs/README.md` (top-level navigation index) with your new
package's one-liner. Update `docs/CODEBASE.md` (if present) with
package location details.

## Step 9 · PR

Per `upstream/guides/contribution-workflow.md`, land commits in
DAG-dependency order if the PR spans multiple packages.
