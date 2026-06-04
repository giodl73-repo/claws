# PR 2 Draft: Feeds inspection CLI

Branch: `feeds-cli`
Base: `feeds-extension`
Head: `63282345977`
Status: committed locally, not pushed/opened

## Intent

Add read-only CLI commands on top of the feed source validation plugin:

```bash
openclaw feeds sources
openclaw feeds list --source company-approved
openclaw feeds search calendar
```

The CLI should read configured feed documents from `https://` or `file://`
sources, validate feed document shape, and print catalog entries without
changing install behavior.

## Implemented scope

- register `openclaw feeds` command from `extensions/feeds`
- parse feed document schema v1
- support `sources`, `list`, and `search`
- verify pinned feed integrity while loading entries
- keep proof file-backed so the branch does not depend on network access
- document command syntax
- add focused tests for source listing, file-backed feeds, search, and pinned
  integrity

## Out of scope

- ClawHub polling/indexing service
- install interception
- enterprise allow/deny enforcement
- remote feed signing beyond hash-pinned source validation
- update detection against installed skills/plugins; defer until OpenClaw has a
  stable installed package metadata source to compare against

## Verification

- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-feeds-cli-vitest OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs extensions/feeds/src/cli.test.ts extensions/feeds/src/doctor/register.test.ts src/flows/bundled-health-checks.test.ts -- --reporter=dot --testTimeout=30000`
- `pnpm tsgo:extensions`
- `node scripts/run-bundled-extension-oxlint.mjs`
- `pnpm docs:check-mdx docs/plugins/reference/feeds.md docs/plugins/reference.md`
- `pnpm docs:list`
- `pnpm exec oxfmt --check --threads=1 extensions/feeds/index.ts extensions/feeds/src/cli.ts extensions/feeds/src/feed-document.ts extensions/feeds/src/cli.test.ts extensions/feeds/src/doctor/register.test.ts docs/plugins/reference/feeds.md`
- `git diff --check`

## Stack notes

This branch is stacked on PR 1:

```text
origin/main
  -> feeds-extension (80b0acb838c)
      -> feeds-cli (63282345977)
```
