# PR 5 Draft: Feed catalog policy conformance

Branch: `feeds-policy-conformance`
Base: `feeds-install-from-feed`
Head: `6f471c3165d`
Status: committed locally, not pushed/opened

## Intent

Let policy authors require the workspace feed catalog posture they expect,
without changing install behavior or fetching feed documents during policy
checks.

This PR keeps feeds in the policy conformance lane: policy observes configured
feed source declarations and reports drift through policy/doctor findings.

## Implemented scope

- Add policy evidence for `plugins.entries.feeds.config.sources`.
- Add `feeds.sources.require` to require configured and enabled feed source ids.
- Add `feeds.sources.requirePinned` to require enabled sources to declare
  `trust: "pinned"` with an integrity hash.
- Add `feeds.sources.allowUnsigned` to reject enabled sources that use unsigned
  trust when set to `false`.
- Add docs and focused policy tests.

## Out of scope

- No feed document fetch during policy checks.
- No install allow/deny enforcement.
- No runtime blocking.
- No package provenance or update comparison.

## Verification

- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-feeds-policy-vitest3 OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs extensions/policy/src/doctor/register.test.ts -- --reporter=dot --testTimeout=30000`
- `pnpm tsgo:extensions`
- `node scripts/run-bundled-extension-oxlint.mjs`
- `pnpm docs:check-mdx docs/cli/policy.md docs/plugins/reference/feeds.md`
- `pnpm exec oxfmt --check --threads=1 extensions/policy/src/doctor/register.ts extensions/policy/src/policy-state.ts extensions/policy/src/doctor/register.test.ts docs/cli/policy.md`
- `git diff --check`
- `pnpm docs:list`

## Stack notes

```text
origin/main
  -> feeds-extension (80b0acb838c)
      -> feeds-cli (63282345977)
          -> feeds-install-policy (f35507f04ac)
              -> feeds-install-from-feed (c17e8072f6d)
                  -> feeds-policy-conformance (6f471c3165d)
```
