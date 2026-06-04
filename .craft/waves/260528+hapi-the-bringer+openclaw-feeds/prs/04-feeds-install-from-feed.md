# PR 4 Draft: Install explicit feed entries

Branch: `feeds-install-from-feed`
Base: `feeds-install-policy`
Head: `c17e8072f6d`
Status: committed locally, not pushed/opened

## Intent

Let an operator explicitly install one feed-backed skill or plugin entry after
feed discovery has shown the entry and install command.

This PR still does not make feeds an enforcement mechanism. It resolves one
entry, verifies the feed document through the same loader used by list/search,
then hands off to the existing OpenClaw install command.

## Implemented scope

- Add `openclaw feeds install <id>`.
- Support `--source <id>` and `--type skill|plugin` to disambiguate entries.
- Support `--dry-run` to print the resolved command without running it.
- Support `--force` and forward it to the existing install command.
- Preserve existing install surfaces:

```bash
openclaw plugins install clawhub:openclaw-calendar
openclaw skills install excel-review
```

## Out of scope

- No allow/deny enforcement.
- No feed-only install restriction mode.
- No new package installation implementation.
- No policy checks yet.

## Verification

- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-feeds-pr4-vitest4 OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs extensions/feeds/src/cli.test.ts extensions/feeds/src/doctor/register.test.ts src/flows/bundled-health-checks.test.ts -- --reporter=dot --testTimeout=30000`
- `pnpm tsgo:extensions`
- `node scripts/run-bundled-extension-oxlint.mjs`
- `pnpm docs:check-mdx docs/plugins/reference/feeds.md docs/plugins/reference.md`
- `pnpm exec oxfmt --check --threads=1 extensions/feeds/src/cli.ts extensions/feeds/src/cli.test.ts docs/plugins/reference/feeds.md`
- `git diff --check`
- `pnpm docs:list`

## Stack notes

```text
origin/main
  -> feeds-extension (80b0acb838c)
      -> feeds-cli (63282345977)
          -> feeds-install-policy (f35507f04ac)
              -> feeds-install-from-feed (c17e8072f6d)
```
