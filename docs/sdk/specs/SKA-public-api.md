# SKA — Public API

**Sub-spec of**: [SK-sdk.md](./SK-sdk.md)

## Facade pattern

The stable public API is a single subpath: `@bic/claws-sdk/api`.
Consumers import ONLY from here:

```ts
import { initWorkspace, runDoctor, promoteSnapshot } from "@bic/claws-sdk/api";
```

All other subpaths (`/compile`, `/fleet`, `/relax`) are INTERNAL —
no backwards-compat guarantee across minor versions.

## Semver policy

| Change                                  | Version bump |
| --------------------------------------- | ------------ |
| New public-API function                 | minor        |
| New optional param on existing function | minor        |
| New required param on existing function | major        |
| Removed function                        | major        |
| Changed error type / shape              | major        |
| Internal refactor                       | patch        |

## What lives in `/api`

The facade exposes the 4 CLI operations as functions:

- `initWorkspace(opts): Promise<Workspace>` — behind `claws init`
- `runDoctor(ws): Promise<DoctorReport>` — behind `claws doctor`
- `snapshotOps`: `{ list, promote, rollback, current, events }` — behind `claws snap`
- `policyOps`: `{ generate, validate, verify, diff }` — behind `claws policy`

Plus types: `Workspace`, `DoctorReport`, `SnapshotInfo`, `PolicyReport`.

## What does NOT live in `/api`

- Compiler internals (`GovernanceIR`, G-rule definitions)
- Fleet client internals (`FleetResolver`)
- SIEM sink implementations
- Relax engine internals

Internal consumers (inside `claws-sdk`, other @bic packages) can
import from `/compile`, `/fleet`, etc. directly. External
consumers MUST NOT.

## Deprecation policy

When a public-API function is deprecated:

1. Mark with `@deprecated {reason}` JSDoc + tsconfig-visible warning
2. Keep for at least TWO minor versions before removal
3. Document the migration in CHANGELOG.md
4. Removal bumps major

Never silently remove or change semantics of a `/api` function.
