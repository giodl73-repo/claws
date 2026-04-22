---
covers: [atom:CXJ/three-layer]
---

# Pitfalls: claws.json config

The three-layer merge order is simple but produces reliable
surprises. This page enumerates them.

## P-01 · Fleet override unexpectedly replaces workspace

**Scenario**: workspace `claws.json` sets `fleet: 'acme'`. The fleet
binding `~/.claws/fleets/acme.json` has `snapshotId: 'shared-snap-01'`.
The workspace `claws.json` doesn't set `snapshotId`.

**Result**: effective `snapshotId` is `shared-snap-01` (fleet wins
because workspace didn't set it — fleet precedence > default).

**Surprise**: operator expected workspace-local to "own" the snapshot
choice. They didn't realise "not set" means "inherit".

**Fix**: set `snapshotId` explicitly in the workspace `claws.json`.
Explicit beats absent at the workspace layer.

## P-02 · Array replacement (not concatenation)

**Scenario**: fleet sets `hosts: ['openclaw', 'aether']`. Workspace
sets `hosts: ['lobster']`.

**Result**: effective `hosts` is `['lobster']`, NOT
`['openclaw', 'aether', 'lobster']`.

**Fix**: arrays are replaced wholesale at the field level. If you
need both, list both explicitly in the workspace file. This is
intentional — deep merge on arrays almost always produces subtly
wrong results.

## P-03 · Missing fleet file

**Scenario**: workspace sets `fleet: 'acme'` but
`~/.claws/fleets/acme.json` doesn't exist (typo, fleet removed).

**Result**: `claws doctor` exits 1 with `fleet-not-found: acme`.

**NOT**: silently falls back to defaults.

**Fix**: if you don't want a fleet, remove the `fleet` field
entirely. Don't leave a typo'd name hoping it "just works" — we
never guess.

## P-04 · Version bump surprise

**Scenario**: a future claws version bumps the schema to v2.
Operator checks out an old workspace with v1 `claws.json`.

**Result**: `claws-json: unsupported version 1` error; operator
must run migration tool explicitly.

**Fix**: `claws migrate --from v1` does the migration. We never
silently upgrade — the migration is a visible operation with a
recorded commit.

## P-05 · Secrets in claws.json

**Scenario**: operator thinks "this is just config" and pastes an
HMAC key into `trust.keyMaterial`.

**Consequence**: secret is now in version control; multi-author
commit history makes rotation painful.

**Fix**: `claws.json` is not privileged. Key material ONLY lives
at `trust.source` (a path to a separate file) which points at a
restricted filesystem location. The CLI reads that file at boot.
