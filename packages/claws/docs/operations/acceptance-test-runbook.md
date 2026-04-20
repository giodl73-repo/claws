# Acceptance-test runbook

> Pulse 09 L3 acceptance for the Horus migration. This runbook is the
> operator's reference for running the `claws` acceptance suite locally,
> interpreting failures, and tracing them back to the migration gates
> they guard.

## What this suite proves

The L3 acceptance suite is the boundary between "scrubbed tree" and
"CP-2 signed complete". It proves three things together, through the
real `claws` binary (not a mock):

1. The repo builds from a fresh `npm ci` on a clean checkout.
2. The installed CLI entry point (`bin/claws.js` → `dist/cli.js`) boots,
   parses `--help`, and runs `doctor` against a real fixture workspace.
3. The residue-grep runner reports zero violations across the tree.

A passing run of `vitest run --project accept tests/acceptance/` + a
clean residue-grep + a green CI matrix on Linux + Windows + macOS is the
pulse-09 success signal.

## Prerequisites

- Node.js ≥ 20.
- A bash shell for `scripts/residue-grep.sh` (Git Bash on Windows, or
  any native bash on POSIX).
- `tar` on PATH for the install-smoke test (ships with Git Bash on
  Windows; native on POSIX).

## Running locally

From the repo root:

```bash
# 1. Install all workspace dependencies.
npm ci

# 2. Build the CLI + its peer packages.
npm run build

# 3. Run the full acceptance tier (L0-L3) for the claws CLI.
cd packages/claws
npx vitest run --project unit tests/acceptance/
npx vitest run --project integration tests/acceptance/
npx vitest run --project e2e tests/acceptance/
npx vitest run --project accept tests/acceptance/

# 4. Residue-grep gate.
cd ../../
bash scripts/residue-grep.sh --mode=ci
```

To run everything in one shot (the same sequence CI uses):

```bash
npm ci
npm run build
cd packages/claws && npx vitest run tests/acceptance/ && cd ../..
bash scripts/residue-grep.sh --mode=ci
```

## Files in scope

| Path | Purpose |
|------|---------|
| `packages/claws/tests/acceptance/sim-boot-harness.ts` | Spawn-the-real-CLI primitive. |
| `packages/claws/tests/acceptance/sim-boot-harness.unit.test.ts` | L0 unit tests for the harness primitives. |
| `packages/claws/tests/acceptance/sim-boot-harness.integration.test.ts` | L1 harness→CLI integration. |
| `packages/claws/tests/acceptance/claws-boot.e2e.test.ts` | L2 full boot through `dist/cli.js`. |
| `packages/claws/tests/acceptance/repo-migration.accept.test.ts` | L3 primary gate: `--help` + `doctor` + compile-help + residue. |
| `packages/claws/tests/acceptance/install-smoke.accept.test.ts` | L3 `npm pack` + packaged-bin invocation smoke. |
| `packages/claws/tests/fixtures/acceptance/minimal-workspace/` | `.openclaw/` fixture (SOUL + 1 subject + 1 tool). |
| `.github/workflows/acceptance.yml` | CI matrix on Linux + Windows + macOS. |

## Interpreting failures

### "ERR_MODULE_NOT_FOUND … dist/…/index.js"

The CLI bin (`bin/claws.js`) imports `dist/cli.js`, which transitively
imports `@bic/claws-sdk`, `@bic/claws-serve`, etc. This error means one
of those peer packages has not been built. Fix: run `npm run build` from
the repo root. If build fails, read the upstream build output — the
acceptance suite runs `skip` when the peers are missing rather than
pretend-green.

### "residue-grep: mode=ci — VIOLATIONS FOUND"

The three-pass scan (`scripts/residue-grep.sh`) has spotted content
that violates one of the pulse-08 invariants:

- **PASS1** — `@craftworks/(clawc-|agent-sdk|compiler-sdk|craftworks-sdk)`
  survived the CP-2 scrub. Fix by renaming to the `@bic/*` equivalent
  and adding the path to `.no-craftworks-allowlist.yaml` only if the
  content is intentionally preserved history (e.g. migration logs).
- **PASS2** — `@bic/clawc-*` leaked into `packages/openclaw-*/`.
  Fix: remove the cross-scope dependency. openclaw packages must not
  depend on clawc-* packages.
- **PASS3** — `@bic/openclaw-*` resolves to a package not in
  `{workspace, guardrails, policy, snap, lsp}`. Fix: either rename the
  target package to one of the allowed names or drop the reference.

### "doctor timedOut: true"

`claws doctor` hung past its 30-second per-invocation timeout.
Usually means the SDK entered a cycle walking the fixture workspace.
Investigate in `src/commands/doctor.ts` and the referenced
`@bic/claws-sdk/doctor` orchestrator.

### Install-smoke skipped

`install-smoke.accept.test.ts` skips when either:
- `dist/cli.js` is missing (run `npm run build` in `packages/claws`), or
- workspace peer dists are missing (run `npm run build` at repo root).

A skipped install-smoke is not a failure, but CP-2 completion requires
it to have passed at least once in the current wave — the evidence
file records the last known status.

## Relationship to the CP-5 sim harness

This pulse ships the minimum spawn-the-real-CLI-and-capture-output
primitive. The full sim harness (see the `claws-e2e-sim-harness` plan,
owned by CP-5) extends this with:

- mocked host environments (filesystem, network, clock),
- golden-output replay (fixtures captured from known-good runs),
- scenario DSL for multi-step workflows.

When that work lands, `sim-boot-harness.ts` becomes the low-level
`invokeClaws` primitive that the richer harness sits on top of —
nothing in this runbook changes except test coverage expands.

## Evidence

Pulse 09 emits a signed evidence record at
`.audit/migrations/horus/repo-migration-acceptance-evidence.json`
(in the craftworks monorepo, not this repo). The record captures:

- exit codes for `claws --help`, `claws doctor`, `claws compile --help`,
- residue-grep violation count,
- install-smoke status (`passed` | `skipped`),
- SHA-256 of the built `dist/cli.js` artifact,
- HMAC-SHA256 signature across the canonicalized payload.

Downstream CP-2 review verifies the signature before admitting the
evidence.
