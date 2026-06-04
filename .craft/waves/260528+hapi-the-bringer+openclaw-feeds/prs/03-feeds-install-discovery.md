# PR 3 Draft: Feeds install discovery

Branch: `feeds-install-policy`
Base: `feeds-cli`
Head: `f35507f04ac`
Status: committed locally, not pushed/opened

## Intent

Show how feed entries map to existing explicit install commands without making
feeds an enforcement layer or a second installer.

This keeps the stack narrow:

- PR 1 validates feed source config.
- PR 2 reads and searches feed documents.
- PR 3 surfaces install discovery hints from feed metadata.
- PR 4 can add explicit install-from-feed behavior.

## Implemented scope

- Add `--type skill|plugin` filtering to `openclaw feeds list` and
  `openclaw feeds search`.
- Read structured `install` metadata from feed entries.
- Render text install hints such as:

```bash
openclaw plugins install clawhub:openclaw-calendar
openclaw skills install excel-review
```

- Keep JSON output unchanged: callers still receive the feed entry metadata,
  including `install`.
- Document that this is discovery only.

## Out of scope

- No installs are executed.
- No `openclaw plugins install` or `openclaw skills install` behavior changes.
- No enterprise allow/deny enforcement.
- No approved catalog policy checks yet.

## Verification

- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-feeds-pr3-vitest8 OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs extensions/feeds/src/cli.test.ts extensions/feeds/src/doctor/register.test.ts src/flows/bundled-health-checks.test.ts -- --reporter=dot --testTimeout=30000`
- `pnpm tsgo:extensions`
- `node scripts/run-bundled-extension-oxlint.mjs`
- `pnpm docs:check-mdx docs/plugins/reference/feeds.md docs/plugins/reference.md`
- `pnpm exec oxfmt --check --threads=1 extensions/feeds/src/cli.ts extensions/feeds/src/cli.test.ts docs/plugins/reference/feeds.md`
- `git diff --check`

## Stack notes

```text
origin/main
  -> feeds-extension (80b0acb838c)
      -> feeds-cli (63282345977)
          -> feeds-install-policy (f35507f04ac)
```
