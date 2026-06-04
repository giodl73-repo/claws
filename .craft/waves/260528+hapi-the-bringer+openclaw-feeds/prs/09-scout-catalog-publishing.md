## Summary

Adds the producer-side Scout catalog workflow for publishing approved tenant feeds without making Scout a package publisher.

This PR adds:

- A file-backed tenant catalog state model for local admin and CI workflows.
- `scout catalog submit` to add package candidates from ClawHub, MOS3, GitHub/local inventory, static feeds, or internal registries.
- `scout catalog import` to seed candidates from an existing feed.
- `scout catalog list` and `validate` for review queues.
- `scout catalog approve`, `reject`, `deny`, and version pinning.
- `scout catalog publish` to materialize an attested feed from approved catalog entries only.
- `scout catalog updates` to detect upstream source changes without silently approving them.

## Boundary

Scout does not upload packages to ClawHub, MOS3, npm, GitHub, or internal registries. Authors use those systems' native publishing flows. Scout starts after a package exists in a source system: it imports source metadata, records tenant/admin review state, and publishes an approved feed for clients.

## Commands

```bash
scout catalog submit --catalog contoso.catalog.json --tenant contoso --source clawhub:calendar-helper --type plugin
scout catalog import --catalog contoso.catalog.json --tenant contoso --from-feed reviewed.feed.json
scout catalog list --catalog contoso.catalog.json --status submitted --json
scout catalog validate --catalog contoso.catalog.json calendar-helper
scout catalog approve --catalog contoso.catalog.json calendar-helper --version 1.2.0
scout catalog reject --catalog contoso.catalog.json risky-plugin --reason "not approved for tenant use"
scout catalog deny --catalog contoso.catalog.json shell-runner --reason "blocked by tenant policy"
scout catalog publish --catalog contoso.catalog.json --source root.feed.json --out approved.feed.json
scout catalog updates --catalog contoso.catalog.json --against root.feed.json --json
```

## Validation

```bash
just cargo fmt --check
just cargo test scout --no-fail-fast
```

Focused proof should show:

- submitted candidates can be validated, approved, and published into an attested feed;
- rejected and denied candidates never appear in the approved feed;
- pinned candidates publish only the approved version;
- upstream changes produce `update_available` state rather than automatic approval;
- published feed documents contain tenant hashes, not raw tenant ids.
