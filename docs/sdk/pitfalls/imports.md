---
covers: [atom:SKI/barrel-prohibition, atom:SKG/breaking-change]
---

# Pitfalls: imports + breaking changes

## Import cluster

### P-01 · Barrel import temptation

**Scenario**: Developer writes `import * as sdk from '@bic/claws-sdk'`
hoping for the tree-shaking "just works" case.

**Consequence**: resolve error at build time — the package.json
`exports` field doesn't expose a root `.` target. Build fails with
`ERR_PACKAGE_PATH_NOT_EXPORTED`.

**Fix**: always use subpath imports. See
[../specs/SKI-subpath-imports.md § Allowed import forms](../specs/SKI-subpath-imports.md).

### P-02 · Deep internal import

**Scenario**: Developer wants to bypass `/api` and reach into
`@bic/claws-sdk/compile/gRules/gRule-24.js` to check a specific
rule's behaviour.

**Consequence**: works at first (internal subpath exists). But
when the SDK refactors internal file layout, the import breaks —
and the consumer has no stability contract to lean on.

**Fix**: add a public helper to `/api` that exposes what the
consumer needs. Keep internals internal.

### P-03 · Circular import via subpaths

**Scenario**: `claws-sdk/fleet` imports from `claws-sdk/compile`;
`claws-sdk/compile` imports from `claws-sdk/fleet`.

**Consequence**: depending on module load order, one module sees
the other as partially-initialised. Random bugs.

**Fix**: within the SDK, use RELATIVE imports (`../compile/...`)
not package-subpath imports. See
[../specs/SKI-subpath-imports.md § Internal cross-module imports](../specs/SKI-subpath-imports.md).
Break cycles by introducing a shared types module.

## Breaking-change cluster

### P-04 · Silent semver-minor shape change

**Scenario**: Developer rename a field on a public-API return type
and ships as minor.

**Consequence**: external consumers break on upgrade. Major bump
was required; now the SDK's semver reputation is damaged.

**Fix**: treat any shape change on a `/api` return or parameter
type as MAJOR. Add, don't rename. See
[../specs/SKG-graduation.md § Breaking change policy](../specs/SKG-graduation.md).

### P-05 · Remove + re-introduce

**Scenario**: Developer removes a deprecated function at v2.0.
Six months later at v2.3, a different feature needs a function
with the same name.

**Consequence**: any consumer still on v1.x that skipped the v2.0
upgrade gets different semantics when they upgrade.

**Fix**: function names removed in major bumps are RESERVED.
Don't re-use the name for a different semantic. Pick a fresh name.

### P-06 · `@deprecated` without grace window

**Scenario**: v1.0 marks a function `@deprecated`. v1.1 removes it.

**Consequence**: consumer sees one warning before the function
disappears. Compliant with semver-minor-add-only-but-remove-in-major,
but deprecation is meant to give consumers 2+ minor versions to
migrate.

**Fix**: `@deprecated` functions live for AT LEAST 2 minor
versions before removal. Removal is ALWAYS a major bump.
