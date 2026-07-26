# Claws CLI Incubator

Private standalone repository for the harness-neutral Claws command and
reference parser. It has no public remote, no publishable package, and no claim
on the unscoped `claws` npm name.

```bash
pnpm install
pnpm build
pnpm proof:pack
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- ./path/to/claw --agent openclaw --dry-run
OPENCLAW_EXPERIMENTAL_CLAWS=1 pnpm claws-dev -- ./path/to/claw --agent openclaw --yes --plan-integrity sha256:<reviewed-digest>
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
portable manifest before OpenClaw receives an immutable snapshot.
`CLAWHUB_REGISTRY_URL` is required until the experimental feed is deployed. It
must select an HTTPS registry or a loopback HTTP development registry; artifact
downloads remain pinned to that origin.

Preview returns OpenClaw's complete native plan and its `planIntegrity` value.
Apply requires explicit `--yes` plus that exact value. The adapter re-resolves
and snapshots the package, then delegates to `openclaw claws add --yes
--plan-integrity`; OpenClaw recomputes the plan and rejects stale consent before
mutation. Broader lifecycle dispatch, final naming, publication, and other
harness adapters remain deferred.

Because OpenClaw binds local development plans to the absolute package path,
the adapter atomically materializes each exact package integrity at a private,
content-addressed OS-temporary path. The immutable snapshot is reused across
preview and apply so the reviewed host digest remains valid; OpenClaw still
revalidates every byte before mutation. Snapshots expire after 24 hours, and
the cache is capped at 16 snapshots or 512 MiB while protecting recently
active operations.

The adapter never retries a timed-out apply. OpenClaw may have recorded partial
progress, so inspect `openclaw claws status` before deciding whether to resume
or remove it.

## Private Distribution Proof

`pnpm proof:pack` builds the bundled CLI, packs it without lifecycle scripts,
checks that the tarball contains only package metadata, its README, and bundled
runtime modules, installs it offline into an isolated prefix, and executes the
installed `claws-dev` binary. It proves both the disabled experimental gate and
successful local-package inspection. Set `OPENCLAW_CLI_ENTRY` to additionally
prove a real OpenClaw dry-run through the packed binary. That optional lane
uses disposable home, state, and config paths and does not read or migrate the
operator's normal OpenClaw state.

The incubation artifact requires Node.js 22.22.3 or newer and an OpenClaw build
that provides the experimental `openclaw claws add --json` contract. A
configured OpenClaw entry runs with the CLI's Node executable, which must also
satisfy that OpenClaw build's supported Node range. The CLI
collects no telemetry and does not update itself; installation and updates
remain the eventual package manager's responsibility. No registry publication,
final package name, or stable compatibility promise is made by this proof.

Run `pnpm proof:private` for the complete private readiness gate. The concise
architecture, evidence, and public-incubation decision brief is in
[`PRIVATE-REVIEW.md`](PRIVATE-REVIEW.md).
