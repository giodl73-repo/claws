# PR 7 Draft: Feed authoring commands

Branch: `feeds-authoring`
Base: `feeds-install-enforcement`
Head: `c706f0b066d`
Status: committed locally, not pushed/opened

## Intent

Make feeds easier to maintain by giving operators local validation and pinning
helpers for feed JSON documents.

This PR does not add publishing, hosted state, or ClawHub interop. It only
author-checks local feed documents and computes the integrity string already
used by pinned feed source config.

## Implemented scope

- Add `openclaw feeds validate <path>`.
- Add `openclaw feeds validate <path> --json`.
- Add `openclaw feeds hash <path>`.
- Reuse the existing feed document parser for schema validation.
- Print `sha256:<hex>` integrity for `sources[].integrity`.
- Update feed docs and focused tests.

## Out of scope

- No feed publishing.
- No feed generation from installed packages.
- No update comparison.
- No ClawHub API interop.

## Verification

- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-feeds-pr7-vitest1 OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs extensions/feeds/src/cli.test.ts -- --reporter=dot --testTimeout=30000`
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
```
