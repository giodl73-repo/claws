# PR 1 Draft: Feeds source validation

Branch: `feeds-extension`
Base: `origin/main`
Head: `80b0acb838c`
Status: committed locally, not pushed/opened

## Title

feat(feeds): add feed source validation plugin

## Summary

Adds a bundled `feeds` extension that lets operators declare curated catalog
feed sources for skills and plugins:

```jsonc
{
  "plugins": {
    "entries": {
      "feeds": {
        "enabled": true,
        "config": {
          "sources": [
            {
              "id": "company-approved",
              "url": "https://feeds.example.com/openclaw/feed.json",
              "trust": "pinned",
              "integrity": "sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
            }
          ]
        }
      }
    }
  }
}
```

This first PR is deliberately read-only/config-only:

- adds `extensions/feeds`
- validates configured feed source shape through doctor/lint checks
- reports duplicate source ids, unsupported URLs, bad integrity hashes, and
  pinned feeds without integrity
- documents the plugin and config syntax
- wires the bundled health registration path only when `plugins.entries.feeds`
  is enabled

It does not fetch feed documents, intercept installs, or enforce an enterprise
catalog. Those are follow-up PRs in the stack.

## Verification

- `OPENCLAW_VITEST_FS_MODULE_CACHE_PATH=/tmp/openclaw-feeds-vitest4 OPENCLAW_VITEST_MAX_WORKERS=1 node scripts/run-vitest.mjs extensions/feeds/src/doctor/register.test.ts src/flows/bundled-health-checks.test.ts -- --reporter=dot --testTimeout=30000`
- `pnpm tsgo:extensions`
- `node scripts/run-bundled-extension-oxlint.mjs`
- `pnpm docs:check-mdx docs/plugins/reference/feeds.md docs/plugins/reference.md`
- `pnpm docs:list`
- `pnpm exec oxfmt --check --threads=1 extensions/feeds/package.json extensions/feeds/openclaw.plugin.json extensions/feeds/index.ts extensions/feeds/api.ts extensions/feeds/src/doctor/register.ts extensions/feeds/src/doctor/register.test.ts src/flows/bundled-health-checks.ts src/flows/bundled-health-checks.test.ts docs/plugins/reference/feeds.md docs/plugins/reference.md pnpm-lock.yaml`
- `git diff --check`

## Follow-ups

- PR 2: read-only `openclaw feeds` CLI for source inspection and local feed
  document list/search/update checks.
- PR 3: install discovery integration, with enforcement kept explicit.
