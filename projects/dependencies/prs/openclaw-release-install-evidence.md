# Draft OpenClaw PR: Bind npm install graph to release evidence

Proposed title:

`chore(release): bind npm install graph to release evidence`

## What Problem This Solves

OpenClaw's npm preflight already publishes strong dependency policy reports and
binds the prepared tarball to the release commit. Those reports describe the
repository lock graph, but npm consumers do not install from `pnpm-lock.yaml`.
The complete transitive graph resolved for the published package is therefore
not preserved as release evidence.

## Why This Change Was Made

Generate a production npm install lock and normalized dependency inventory from
the exact prepared `openclaw-<version>.tgz` during release preflight, with
install scripts disabled. Record the npm version, tarball SHA-256, inventory
count, and evidence-file SHA-256 values in the existing preflight manifest.

The publish job verifies and promotes the same prepared bundle. This PR extends
the existing release evidence boundary; it does not add a new runtime service,
Microsoft policy, or contributor-facing dependency workflow.

Durable public publication of the bundle is intentionally left to a follow-up
after release and security owners approve the evidence schema as a stable
public contract.

## User Impact

No runtime behavior changes. Release operators and downstream consumers can
identify the exact production dependency graph resolved for the npm artifact,
instead of approximating it later from the source workspace lock.

## Evidence

- The evidence generator installs only the prepared tarball in a fresh
  temporary project with scripts disabled and production dependencies only.
- The generated lock resolves the expected OpenClaw package version and
  integrity.
- The normalized inventory is deterministic for a fixed generated lock.
- The preflight manifest contains and verifies:
  - prepared tarball SHA-256;
  - npm install lock SHA-256;
  - normalized inventory SHA-256 and package count;
  - npm and Node versions;
  - existing dependency policy-report manifest SHA-256.
- Focused tests cover successful generation, tarball-version mismatch,
  malformed lock data, hash drift, and publish-time verification failure.

## Expected Files

- `scripts/generate-npm-install-release-evidence.mts`
- `scripts/verify-npm-install-release-evidence.mts`
- `scripts/generate-dependency-release-evidence.mts`
- `.github/workflows/openclaw-npm-release.yml`
- `test/scripts/generate-npm-install-release-evidence.test.ts`
- `test/scripts/generate-dependency-release-evidence.test.ts`

## Proposed Evidence Shape

```json
{
  "schemaVersion": 2,
  "releaseTag": "vYYYY.M.D",
  "releaseSha": "<commit>",
  "package": {
    "name": "openclaw",
    "version": "YYYY.M.D",
    "tarball": "openclaw-YYYY.M.D.tgz",
    "sha256": "<digest>"
  },
  "npmInstall": {
    "nodeVersion": "24.16.0",
    "npmVersion": "<version>",
    "scriptsRun": false,
    "dependencyCount": 306,
    "lock": {
      "path": "dependency-evidence/npm-install/package-lock.json",
      "sha256": "<digest>"
    },
    "inventory": {
      "path": "dependency-evidence/npm-install/dependencies.json",
      "sha256": "<digest>"
    }
  }
}
```

## Follow-up Publication PR

After owner confirmation, a second PR would:

- package `preflight-manifest.json`, dependency reports, install lock, and
  inventory as `openclaw-dependency-evidence-vYYYY.M.D.tgz`;
- upload that immutable bundle and `SHA256SUMS` to the matching GitHub release;
- use the GitHub Releases API as the initial append-only polling feed;
- document supersession and withdrawal without rewriting historical entries.

**Maintainer alert:** the release-asset schema becomes a public evidence
contract consumed by downstream products. Release owner `@steipete` and the
security/release owners should confirm versioning, retention, and withdrawal
semantics before that follow-up ships.
