# Claws Project

Use this area for the OpenClaw RFC direction around Claws: runnable starter
setups that can include skills, plugins, MCP servers, connectors, workspace
files, persona files, heartbeat/crons, schedules, and automations.

Claws are not feeds and not raw workspace templates:

- feeds are discovery, curation, approval, and effective-view projections;
- individual skills/plugins remain normal packages or bundle-style plugins;
- plugins may bundle companion skills when those skills are plugin-owned;
- Claws are versioned starter setup manifests with typed entries, previews,
  consent, provenance, and rollback expectations.

## Active Notes

| Area | File |
| --- | --- |
| Initial RFC sketch | `rfc-sketch.md` |
| Role review | `role-review.md` |
| Auditable Skills receipt-first role review | `auditable-skills-role-review.md` |
| Auditable Skills support-case proof | `auditable-skills-support-proof.md` |
| Auditable Skills maintainer brief | `auditable-skills-maintainer-brief.md` |
| Auditable Skills fork PR bodies | `auditable-skills-pr-bodies/` |

## Related Areas

- `projects/feeds/README.md` for the feed curation and composition precedent.
- `projects/openclaw/README.md` for OpenClaw RFC and PR coordination.

## Prior Art To Keep In View

| Ref | Status | Relevance |
| --- | --- | --- |
| OpenClaw issue #97885 | Open | Portable Agent Bundles for full agent export/import. Adjacent, but broader than Claws because it includes full instance export/import, bindings, and environment state. |
| OpenClaw issue #90605 | Open | OCI/ORAS artifact distribution for skills, plugins, and workspace templates. Relevant as a possible package transport, not the semantic model. |
| OpenClaw issue #68782 | Open | Selective install for plugins, skills, and channels. Claws can be a declarative setup unit. |
| OpenClaw issue #83074 | Open | Skill manifest and multi-component skill package model. Related to individual package shape. |
| OpenClaw issue #55297 | Open | Auto-update for skills and plugins. Claws need explicit pin, track-latest, audit, and rollback semantics. |
| OpenClaw issue #38038 / PR #38070 | Closed | Agent Pack/workspace-template attempt. Avoid repeating the core workspace-file write surface. |
