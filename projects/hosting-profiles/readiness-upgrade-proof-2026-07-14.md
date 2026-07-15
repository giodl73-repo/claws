# Readiness Published Upgrade Proof

## Scope

Prove that the readiness-only implementation in OpenClaw PR 104018 upgrades a
real published installation without changing readiness requirements that the
operator did not select.

## Versions

- Published baseline: `openclaw@2026.7.1`
- Candidate package: `2026.7.2`
- Candidate source: `e5f5e97332e5495e65c1993dba258109849bdece`
- Environment: Ubuntu 24.04, Node 24.15.0, Docker Linux/amd64

## Command

```bash
OPENCLAW_UPGRADE_SURVIVOR_PUBLISHED_BASELINE=1 \
OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@2026.7.1 \
OPENCLAW_UPGRADE_SURVIVOR_CANDIDATE=current \
OPENCLAW_UPGRADE_SURVIVOR_ARTIFACT_DIR="$PWD/.artifacts/upgrade-survivor/readiness-104018-2026.7.1-rebased" \
OPENCLAW_UPGRADE_SURVIVOR_DOCKER_RUN_TIMEOUT=1500s \
NODE_OPTIONS=--max-old-space-size=16384 \
  bash scripts/e2e/upgrade-survivor-docker.sh
```

## Result

The command exited 0 and all 54 recorded phases passed. The lane:

- installed and configured the published baseline before touching the candidate;
- seeded agents, sessions, workspaces, credentials, channels, plugins, and
  legacy dependency state;
- upgraded the same installation through `openclaw update`;
- ran non-interactive Doctor and post-Doctor config validation;
- verified config and state survival before starting the upgraded Gateway;
- returned HTTP 200 from `/healthz` and `/readyz`; and
- completed RPC status successfully.

Timings were 47 seconds for startup, 1 second for `/healthz`, 1 second for
`/readyz`, and 2 seconds for RPC status.

The durable summary is under the WSL proof checkout at:

```text
/root/src/openclaw-104018-rebase/.artifacts/upgrade-survivor/readiness-104018-2026.7.1-rebased/summary.json
```

## Interpretation

The upgraded installation did not silently acquire `WorkspaceWritable` as a
new required condition. That is the intended compatibility behavior: existing
installations retain the Gateway lifecycle baseline unless the operator selects
additional criteria.

The separate exact-package proof explicitly selects
workspace writability and proves `/ready` and `/readyz` transition
`200 -> 503 -> 200`, `/healthz` remains 200, and `openclaw ready --json` exits
`0 -> 1 -> 0`. Together, the proofs establish compatible upgrade defaults and
fail-closed opt-in readiness.

## Final Rebase

OpenClaw main advanced by seven unrelated commits after the upgrade lane. The
four readiness commits were rebased once more to final PR head
`89d8607aab9f9a942d45a6910cba1db3a210e239`. Range-diff preserved the readiness
patches; only the plugin SDK budget adapted to upstream's export deletion.

The final head passed all 259 changed-file assertions, format, lint, SDK
surface validation, a full package build, tarball integrity, clean Codex review,
and package-installed Docker proof. Final image:
`sha256:8add3c4f8ce2f1a444a735c43f19eac4ee0212778123fb883ff8f9f785a9fd0d`.
