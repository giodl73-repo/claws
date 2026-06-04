## Summary

Adds explicit feed source management helpers so operators can configure feed consumers without hand-editing `openclaw.json`.

This PR adds:

- `openclaw feeds sources add <id> <url>`.
- `openclaw feeds sources remove <id>`.
- Source id, URL, and integrity normalization before config writes.
- Duplicate source protection unless `--replace` is explicit.
- Config mutation through the normal OpenClaw config write path.
- Docs showing the source helper alongside manual config syntax.

## Commands

```bash
openclaw feeds sources add company-approved https://feeds.example.com/openclaw/feed.json \
  --integrity sha256:... \
  --require-attestation
openclaw feeds sources add company-approved file:///opt/openclaw/feeds/company.json --replace
openclaw feeds sources remove company-approved
```

## Notes

This is config management only. Removing a source does not delete cached feed data, installed skills, or installed plugins.

## Validation

```bash
node scripts/run-vitest.mjs src/cli/feeds-cli.test.ts src/catalog/feeds/feed-updates.test.ts -- --reporter=dot --testTimeout=30000
node node_modules/oxlint/bin/oxlint src/catalog/feeds/feed-source-config.ts src/cli/feeds-cli.ts src/cli/feeds-cli.test.ts --tsconfig tsconfig.json
node node_modules/oxfmt/bin/oxfmt --check --threads=1 docs/cli/feeds.md src/catalog/feeds/feed-source-config.ts src/cli/feeds-cli.ts src/cli/feeds-cli.test.ts
node --import tsx -e "await import('./src/catalog/feeds/feed-source-config.ts'); await import('./src/cli/feeds-cli.ts'); console.log('feeds source management imports ok')"
git diff --check
CODEX_HOME=/home/giodl/.codex-review-home codex review --commit HEAD
```

Focused proof: 12 feed CLI/update tests passed. Codex review reported no actionable correctness issues.
