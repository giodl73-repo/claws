# claws doctor

Middle ring diagnostic and repair tool for governance health.

## Overview

`claws doctor` diagnoses governance configuration issues and suggests fixes. It sits in the middle ring of the three-ring architecture: between the inner ring (runtime enforcement) and the outer ring (fleet operations). Doctor handles upgrade paths, migration from older claws versions, and configuration validation.

## Diagnostic Checks

| Check | What It Validates |
|-------|-------------------|
| Config schema | claws.json matches current schema version |
| Policy syntax | All policy YAML files parse without errors |
| Rule references | Policy rules reference valid atoms and fields |
| Chain integrity | CGR hash chain is unbroken |
| Version compatibility | claws-sdk version compatible with workspace artifacts |
| Deprecated features | Flags usage of deprecated config keys or rule syntax |

## Usage

```bash
claws doctor                   # Run all checks
claws doctor --check config    # Run specific check
claws doctor --fix             # Apply automated fixes
claws doctor --upgrade         # Migrate to latest config schema
```

## Upgrade Migration

When a new claws version changes the config schema, `claws doctor --upgrade` performs the migration:

1. Read current claws.json
2. Detect schema version
3. Apply migration transforms (rename keys, add defaults, restructure)
4. Write updated claws.json
5. Re-validate against new schema

## Related

- [Three Rings Architecture](architecture-three-rings.md) -- inner/middle/outer ring model
- [Upgrade Lifecycle](upgrade-lifecycle.md) -- version upgrade process
- `design/claws/ATOMS.md` -- C81 `atom:claws-doctor`
