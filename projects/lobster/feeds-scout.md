# Lobster Scout Feeds

Track Lobster Scout feed work here. Keep cross-repo feed design in
`projects/feeds/`; use this file for Lobster-specific PR state and integration
notes.

## Operating Model

- Scout is the Lobster-side CLI/control-plane surface for catalog feed work.
- It can consume external sources such as ClawHub snapshots and publish curated
  feed artifacts for tenant or deployment use.
- OpenClaw feed consumption should remain generic enough to read enterprise
  feeds produced outside OpenClaw.

## Active Questions

- Where tenant-scoped feed state should live once Lobster has a durable admin
  storage answer.
- How global feed choices constrain tenant feed choices.
- Which publish motions belong in Scout versus source systems such as ClawHub or
  internal marketplaces.

## Related Areas

- `projects/feeds/README.md`
- `projects/lobster/admin-spaces.md`
- `projects/lobster/partner-center.md`
