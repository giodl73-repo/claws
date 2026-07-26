# Claws CLI Incubator

Private standalone repository for the harness-neutral Claws command and
reference parser. It has no public remote, no publishable package, and no claim
on the unscoped `claws` npm name.

```bash
pnpm install
pnpm build
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- ./path/to/claw --agent openclaw --dry-run
CLAWHUB_REGISTRY_URL=https://registry.example OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- clawhub:@publisher/claw@1.0.0 --agent openclaw --dry-run
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

The current slice supports local package inspection and exact ClawHub package
coordinates. ClawHub resolution verifies the official experimental feed,
downloaded artifact digest, archive limits, extracted package identity, and
portable manifest before OpenClaw receives an immutable dry-run snapshot.
`CLAWHUB_REGISTRY_URL` is required until the experimental feed is deployed. It
must select an HTTPS registry or a loopback HTTP development registry; artifact
downloads remain pinned to that origin.
Apply, lifecycle dispatch, final naming, publication, and other harness
adapters remain deferred.
