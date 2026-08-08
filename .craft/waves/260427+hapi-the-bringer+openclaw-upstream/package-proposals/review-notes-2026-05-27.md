# Package Proposal Review Notes - 2026-05-27

## Enterprise Feeds

The first draft treated Enterprise Feeds mostly as a post-install checker. That
missed the strongest product shape: users should keep using normal ClawHub skill
and plugin install commands, while Enterprise Feeds registers a filter that
annotates, warns, or denies candidate entries.

Revised direction:

- ClawHub remains discovery/distribution.
- Enterprise Feeds becomes curation/eligibility.
- Normal commands stay normal:
  - `openclaw skills search <query>`
  - `openclaw skills install <id>`
  - `openclaw plugins install <id-or-package>`
- Enterprise Feeds plugs into search/install/update/audit as an eligibility hook.
- The hook supports advisory and enforcing modes.
- The package should not implement a second installer.

Open design questions:

1. What is the narrowest hook that covers both skills and plugins?
2. Does OpenClaw already have one install chokepoint, or do skills and plugins
   need separate adapters?
3. Should the hook run before network/package download, after metadata fetch, or
   both?
4. How much metadata does ClawHub expose before install today?
5. Can search results show eligibility without hiding public discovery?

## Context Budget

No major change yet. Keep it observational:

- audit;
- explain;
- recommend dry-run;
- no autonomous edits.

The interesting future connection is that Enterprise Feeds can declare expected
context ranges for feed entries, and Context Budget can report when an
installed entry exceeds those expectations.
