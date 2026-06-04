## Summary

Builds on read-only feed discovery by letting native OpenClaw skill/plugin search inspect synced feeds and by allowing explicit install handoff from a selected feed entry.

This PR keeps feed behavior user-directed:

- Adds feed-backed search wiring for native `skills search` and `plugins search` through the explicit `--catalog-feeds` path.
- Surfaces feed install selectors in search results.
- Resolves `feed:<source>:<entry>` install selectors from the local feed index.
- Hands off resolved entries to existing skill/plugin install commands.
- Does not add a background watcher, auto-install path, or separate enterprise search command.

## Commands

```bash
openclaw skills search calendar --catalog-feeds
openclaw plugins search calendar --catalog-feeds
openclaw skills install feed:company-approved:docs-helper
openclaw plugins install feed:company-approved:calendar-helper
```

## Notes

Feed-backed installs are explicit. Existing non-feed install commands keep their current behavior.

## Validation

Use focused feed search/install handoff tests, format/lint on touched CLI/feed files, import smoke, `git diff --check`, and `codex review --commit HEAD`.
