# Restore hold owner/adopter role review

## Scope

Reviewed E4a/E4b as a design-only extension to the Hosted Integration roadmap
through Gateway runtime, Lobster container, enterprise security, platform
operator, and skeptical maintainer lenses.

## Findings

### Gateway runtime

The hold belongs at launcher start admission. Healthy Gateway work and ordinary
request paths must not perform a remote hold lookup. Conventional startup
remains unchanged when no hosted lifecycle implementation is selected.

### Lobster container

One record must fence both launch layers: runtime callers converging on the
container session/Plex adapter and adapter callers converging on
`start_openclaw_if_needed`. Covering only one layer leaves health recovery or
container replacement able to expose partial restore.

### Enterprise security

The hold must not expire or fail open. Unknown authority, stale generation,
receipt mismatch, and replay all block startup. Commit binds the exact receipt;
deleting a hold is not proof of a valid restore.

### Platform operator

Status and Doctor must distinguish held, committed, stale, unavailable, and
quarantined states without exposing artifact or credential details. Mixed
versions remain inactive until both E4 sides support the same transition
version.

### Skeptical maintainer

Reuse the lifecycle owner's generation, registration, readiness, and
operational surfaces. Do not add a continuity provider registry, renewable
lease protocol, generalized lock service, or carrier. E4 is two bounded PRs
because the repositories cannot merge atomically.

## Decision

Approve E4a/E4b as a parallel Area 1 lifecycle wave. It may proceed alongside
D2 after the Hosted Integration foundations are stable. It blocks only managed
restore execution, not local Archived capture, materialization, or preview.
