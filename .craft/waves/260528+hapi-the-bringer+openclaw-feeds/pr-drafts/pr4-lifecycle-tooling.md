## Summary

Adds feed publisher/subscriber lifecycle tooling on top of the feed source, install, and policy primitives.

This PR adds:

- `openclaw feeds validate <path>` and `feeds hash <path>`.
- `openclaw feeds build --inventory <path> --out <path>` for deterministic curated feed artifacts.
- `openclaw feeds diff --previous <path> --current <path>` for publisher-side delta review.
- `openclaw feeds notices --installed <path>` for subscriber-facing update notices with install commands.
- Deterministic build output, including canonicalized nested metadata.
- Diff coverage for catalog-visible payload changes, approval changes, version changes, and artifact hash changes.
- `docs/cli/feeds.md` for the source config, publisher, and subscriber workflows.

## Example publisher flow

```bash
openclaw feeds validate ./company-feed.json --require-attestation --json
openclaw feeds hash ./company-feed.json
openclaw feeds build --inventory ./inventory.json --out ./company-feed.json --id company-approved
openclaw feeds diff --previous ./previous-feed.json --current ./company-feed.json --json
```

## Example subscriber flow

```bash
openclaw feeds notices --installed ./installed.json --approved-only --json
```

## Notes

This stays file-based and explicit. There is no daemon, background watch, auto-update, or ClawHub-native feed service in this PR.

## Validation

```bash
node scripts/run-vitest.mjs src/cli/feeds-cli.test.ts src/catalog/feeds/feed-updates.test.ts -- --reporter=dot --testTimeout=30000
node node_modules/oxfmt/bin/oxfmt --check --threads=1 docs/cli/feeds.md docs/docs.json src/catalog/feeds/feed-lifecycle.ts src/cli/feeds-cli.ts src/cli/feeds-cli.test.ts
node node_modules/oxlint/bin/oxlint src/catalog/feeds/feed-lifecycle.ts src/cli/feeds-cli.ts src/cli/feeds-cli.test.ts --tsconfig tsconfig.json
node --import tsx -e "await import('./src/catalog/feeds/feed-lifecycle.ts'); await import('./src/cli/feeds-cli.ts'); console.log('feeds lifecycle imports ok')"
git diff --check
CODEX_HOME=/home/giodl/.codex-review-home codex review --commit HEAD
```

Focused proof: 11 feed lifecycle/update tests passed. Codex review reported no actionable correctness issues.
