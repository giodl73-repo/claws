# Release Playbook — bic/claws

How to publish `@bic/*` packages from this repo. Operator-focused — if
you've never released before, follow the steps.

## Audience

Anyone with `npm publish` access to the `@bic` scope on the internal
GPR (GitHub Packages on microsoft.ghe.com).

## Pre-release checks

Before bumping versions:

1. **CI is green on `main`** — all status checks pass on the commit you
   intend to release
2. **No-craftworks gate is clean** — `bash scripts/residue-grep.sh
   --mode=ci` returns 0 violations locally
3. **Working tree is clean** — `git status` shows nothing uncommitted
4. **You're on `main`** — `git branch --show-current` = `main`; you've
   pulled latest: `git pull --ff-only`

## Version bump

Semver applies per-package:
- **Patch** (0.36.0 → 0.36.1): bug fixes, no new exports, no behavior
  changes customers would notice
- **Minor** (0.36.0 → 0.37.0): additive changes (new exports, new
  options with defaults)
- **Major** (0.36.0 → 1.0.0): breaking changes (removed exports, changed
  signatures, removed options)

Bump with workspaces:

```bash
# Bump a single package
npm version patch --workspace @bic/claws-cli

# Bump all workspaces to the same version (monorepo convention)
for pkg in packages/*/; do
  (cd "$pkg" && npm version patch)
done
```

Commit the version bump:

```bash
git add packages/*/package.json
git commit -m "chore(release): bump packages to v0.36.1"
```

## Publish

Each `@bic/*` package publishes separately to the internal GPR:

```bash
# Authenticate first (once per machine; uses GHE personal access token)
npm login --scope=@bic --registry=https://npm.pkg.microsoft.ghe.com/

# Publish each package
for pkg in packages/*/; do
  name=$(jq -r .name "$pkg/package.json")
  if [ "$name" != "null" ] && [ -z "$(jq -r '.private // false' "$pkg/package.json")" ]; then
    (cd "$pkg" && npm publish --access restricted)
  fi
done
```

Private packages (`"private": true` in package.json) are skipped
automatically.

## Tag the release

```bash
VERSION=$(jq -r .version packages/claws/package.json)
git tag "version-$VERSION"
git push origin main --tags
```

## Verify

Check a clean clone can install the published version:

```bash
cd /tmp
mkdir claws-release-check && cd claws-release-check
npm init -y
npm install @bic/claws-cli@$VERSION --registry=https://npm.pkg.microsoft.ghe.com/
npx claws --help
# Expect: Usage: claws [options] [command] ...
```

## Rollback

If a bad version ships:

```bash
# Deprecate (preferred — warns but doesn't remove)
npm deprecate @bic/claws-cli@$VERSION "Rollback: <reason>"

# Unpublish (24h window after publish; avoid — breaks anyone who installed)
npm unpublish @bic/claws-cli@$VERSION
```

**Never** force-delete old versions customers may depend on. Prefer
shipping a fixed patch version over unpublishing.

## What NOT to do

- `npm publish --force` — don't override the registry's safety checks
- Version-bump directly on `main` without a PR — breaks CODEOWNERS /
  branch protection
- Publish without CI green — the point of CI is to catch regressions
- Publish from a branch other than `main` — tagged releases come from
  the trunk only

## Checklist

Copy into the release PR description:

```
- [ ] CI green on the commit being released
- [ ] residue-grep clean locally
- [ ] Version bumps applied and committed
- [ ] CHANGELOG entries updated (once we have one)
- [ ] Published to GPR (per-package npm publish confirmed)
- [ ] Git tag `version-X.Y.Z` pushed
- [ ] Verified a fresh install works
- [ ] Notified team (channel, email, etc.)
```
