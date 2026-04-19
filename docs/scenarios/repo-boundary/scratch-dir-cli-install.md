# scratch-dir-cli-install: Fresh npm install succeeds in empty scratch dir

**Series**: repo-boundary
**Spec**: CL-13
**Type**: release
**Criticality**: high

## Setup

- `bic/claws` at tag `v0.1.0` — inaugural release, all 7 packages published atomically to GPR
- Empty scratch directory on a Linux, Windows, and macOS runner (matrix)
- **No ambient `.npmrc`** in the scratch dir or its parents — the auth config must come from the CI-provided `NODE_AUTH_TOKEN` only, not a dev-machine global `.npmrc`
- GPR `NODE_AUTH_TOKEN` fine-grained PAT with `read:packages` scope, rotated within the 90-day window

## Steps

1. `cd` into scratch dir; assert `ls -la` shows no `.npmrc`
2. Write the CL-13 §5 consumer `.npmrc` template to the scratch dir:
   ```
   @bic:registry=https://npm.pkg.microsoft.ghe.com
   //npm.pkg.microsoft.ghe.com/:_authToken=${NODE_AUTH_TOKEN}
   ```
3. `npm init -y`
4. `npm install @bic/claws-cli@0.1.0` — no caret, exact pin per §3
5. `npx claws --help` — assert exit 0 and help text printed (or on Windows, direct-binary invocation since monorepo rule bans `npx`)
6. Run on all 3 OS in CI matrix

## Expected outcome

- Install completes without interactive prompts or warnings other than standard peer-dep notices
- `claws --help` prints the CL-01 command surface (40 commands, 8 groups) and exits 0
- All 7 sibling packages resolve from GPR with exact-version matching across the dep tree (no floating-range drift inside the claws family)
- Matrix green on Linux, Windows, macOS

## Failure modes

- `npm install` fails with 401 → token scope insufficient or rotated too early; re-rotate and re-run
- Install succeeds but `claws --help` fails → packaging regression in `claws-cli` entrypoint; block tag, return to `InauguralPublish` state
- A sibling package resolves at a different minor/patch than `claws-cli` → atomic-release invariant violated; treat as release-coordination failure (see `atomic-release-rollback`)
- Must NOT pass if any `.npmrc` was inherited from the runner environment — scenario requires proof of no-ambient-config

## Evidence

`smoke-install.yaml` — per-OS matrix results, install log, `claws --help` stdout, resolved dep tree snapshot. Signed by `claws-release-eng`. Retained 12 months (release gate artifact).

## Related

- CL-13 §Validation #3
- CL-13 §4 (Release coordination — pre-tag smoke gate)
- CL-13 §5 (GPR auth — consumer `.npmrc` template)
- Sibling: `atomic-release-rollback`
