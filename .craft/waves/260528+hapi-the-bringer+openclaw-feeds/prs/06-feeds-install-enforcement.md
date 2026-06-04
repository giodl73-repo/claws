# PR 6 Draft: Approved feed install enforcement

Branch: `feeds-install-enforcement`
Base: `feeds-policy-conformance`
Head: `026a6bb79eb`
Status: committed locally, not pushed/opened

## Intent

Give operators an opt-in restriction path for feed-backed installs without
claiming that feeds intercept every OpenClaw install surface.

This PR applies only to `openclaw feeds install`. It checks feed entry approval
metadata before handing off to the existing skill/plugin installer.

## Implemented scope

- Add `plugins.entries.feeds.config.installPolicy`.
- Support `mode: "off" | "warn" | "enforce"`.
- Support `requireApproval: true` to require feed entries to declare
  `approval.status: "approved"`.
- Warn and continue in `warn` mode.
- Fail before invoking the existing installer in `enforce` mode.
- Validate install policy config through feed doctor checks.
- Update feed docs and focused tests.

## Out of scope

- No interception of direct `openclaw plugins install`.
- No interception of direct `openclaw skills install`.
- No runtime package provenance scanning.
- No update comparison.

## Verification

- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-feeds-pr6-vitest1 OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs extensions/feeds/src/cli.test.ts extensions/feeds/src/doctor/register.test.ts -- --reporter=dot --testTimeout=30000`
- `pnpm tsgo:extensions`
- `node scripts/run-bundled-extension-oxlint.mjs`
- `pnpm docs:check-mdx docs/plugins/reference/feeds.md docs/plugins/reference.md`
- `pnpm exec oxfmt --check --threads=1 extensions/feeds/src/cli.ts extensions/feeds/src/cli.test.ts extensions/feeds/src/doctor/register.ts extensions/feeds/src/doctor/register.test.ts docs/plugins/reference/feeds.md`
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
```
