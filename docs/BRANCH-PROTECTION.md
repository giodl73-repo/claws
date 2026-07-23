# Branch Protection — bic/claws

This doc records the **target** branch-protection settings for `main`.
The actual settings are applied via the GHE web UI at:

```
microsoft.ghe.com/bic/claws → Settings → Branches → Branch protection rules → main
```

## Required settings on `main`

### Require a pull request before merging

- [x] Required
- [x] Require approvals: **1**
- [x] Dismiss stale pull request approvals when new commits are pushed
- [x] Require review from Code Owners (enforces `CODEOWNERS` at repo root)

### Require status checks to pass before merging

- [x] Required
- [x] Require branches to be up to date before merging

Required status checks (exact job names from `.github/workflows/`):

- `ci / build-test (ubuntu-latest)` — from `ci.yml`
- `ci / build-test (windows-latest)` — from `ci.yml`
- `no-craftworks / residue-grep (CL-13 v1.7)` — from `no-craftworks.yml`

Once the acceptance workflow stabilizes, also add:

- `acceptance / repo-migration` — from `acceptance.yml`

### Require conversation resolution before merging

- [x] Required

### Restrict who can push to matching branches

- [x] Restrict to CODEOWNERS equivalents (no direct pushes to `main`)

### Do not allow bypassing the above settings

- [x] Required — even admins use PRs

### Rules that apply to everyone including administrators

- [x] Required

## Settings explicitly NOT enabled yet

- Signed commits requirement — flag for future turn-on once team setup
  has signing keys configured consistently
- Require linear history — TBD; monorepo merges vs squash is a per-team
  preference
- Require deployments to succeed — no deployments yet; revisit after
  release workflow lands

## How to apply

1. Sign in to GHE as an admin on `bic/claws`
2. Navigate to Settings → Branches
3. Add branch protection rule, pattern: `main`
4. Check each box per the "Required settings" section above
5. Save

## How to audit

After applying:

1. Try a direct push from a clone on `main` — should be rejected
2. Open a PR with no approvals — merge should be blocked
3. Open a PR where CI fails — merge should be blocked
4. Open a PR that touches `/packages/claws-sdk/` — CODEOWNERS should
   auto-request review from `@giodl`
