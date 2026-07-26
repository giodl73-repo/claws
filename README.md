# Claws CLI Incubator

Private standalone repository for the harness-neutral Claws command and
reference parser. It has no public remote, no publishable package, and no claim
on the unscoped `claws` npm name.

```bash
pnpm install
pnpm build
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- ./path/to/claw --agent openclaw --dry-run
```

The intended future command shape remains:

```text
npx <name> <claw> --agent openclaw
```

`<name>` remains unresolved until the Foundation selects or secures the npm
identity.

## Repository Boundary

- `packages/reference` owns portable manifest parsing, types, and portability
  rules. It imports no harness implementation.
- `packages/cli` owns local source inspection, integrity, adapter dispatch, and
  cross-harness outcome conventions.
- The OpenClaw adapter invokes `openclaw claws ... --json` as an external
  process. It does not import OpenClaw code or recreate host policy.
- OpenClaw revalidates packages at its own trust boundary and continues to own
  consent, mutation, provenance, update, status, doctor, and removal.

## Current Scope

The current slice supports local package inspection and OpenClaw dry-run
preview through an immutable verified snapshot. Remote ClawHub resolution,
apply, lifecycle dispatch, final naming, publication, and other harness
adapters are deferred.
