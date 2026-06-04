# PR 8 Draft: Feed update reporting

Branch: `feeds-updates`
Base: `feeds-authoring`
Head: `0c7975ad1d5`
Status: committed locally, not pushed/opened

## Intent

Report feed-backed updates without performing updates or reaching into unstable
installed package internals from the feeds extension.

This PR compares configured feed entries against an explicit installed inventory
JSON file. A later PR can replace or supplement that input with a stable
OpenClaw extension API for installed skill/plugin indexes.

## Implemented scope

- Add `openclaw feeds updates --installed <path>`.
- Support `--source`, `--type`, `--approved-only`, and `--json`.
- Compare inventory entries by `type`, `id`, and `version`.
- Report feed entries with newer feed versions.
- Mark whether each update carries `approval.status: "approved"`.
- Keep the command read-only.

## Out of scope

- No package update execution.
- No direct reads of internal plugin install indexes.
- No direct reads of ClawHub skill lock files.
- No ClawHub API interop.

## Verification

- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-feeds-pr8-vitest1 OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs extensions/feeds/src/cli.test.ts -- --reporter=dot --testTimeout=30000`
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
              -> feeds-install-from-feed (c17e8072f6d)
                  -> feeds-policy-conformance (6f471c3165d)
                      -> feeds-install-enforcement (026a6bb79eb)
                          -> feeds-authoring (c706f0b066d)
                              -> feeds-updates (0c7975ad1d5)
```
