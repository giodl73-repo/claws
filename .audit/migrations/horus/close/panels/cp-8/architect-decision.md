# Architect decision — atoms registry home (pulse 75)

**Wave**: Horus (260416+horus-the-heir+clawc-migration)
**Pulse**: 75 (atoms-registry-seed)
**Decision required**: co-habit OR split for the 97-atom registry
**Date**: 2026-04-22

## Context

Pulse 75 per CL-13 v1.8 §N.1 requires an authoritative atoms
registry that load-registry.ts can parse. The pulse plan offers two
options:

- **co-habit**: append the 97-atom inventory section to the
  existing `docs/concepts/atoms-registry.md` narrative guide
- **split**: keep the narrative at `atoms-registry.md` and put the
  inventory at `docs/concepts/atoms-registry-inventory.md`

## Decision: **neither as originally specified — per-package ATOMS.md is canonical**

Pulses 74.5 + 74.6 landed 14 per-package `ATOMS.md` files under
`docs/{package}/ATOMS.md`. Each file IS the authoritative atom
registry for its package — this matches the design pattern
documented in `c:\src\craftworks\CLAUDE.md` under "Design areas":

> `design/{area}/ATOMS.md` — authoritative atom registry for the area

Consolidating to a single monolithic `docs/concepts/atoms-registry.md`
would:

1. Duplicate content that already lives at the authoritative
   per-package location
2. Require a sync mechanism that would drift
3. Invert the hierarchy — packages own their atoms; `concepts/`
   should link to them, not own them

## Rationale

The oracle tooling at `tools/atoms-oracle/` walks
`docs/{package}/ATOMS.md` directly. This matches how
`devtools/repo-ops/src/check.ts` validates atom coverage. Both
tools consume the same per-package files — one source of truth.

The 97-atom target from the pulse plan is close to the 94 atoms
that actually landed across the 14 package+domain ATOMS.md files.
The 3-atom discrepancy is the result of content consolidation
during pulses 74.5 + 74.6 — some atoms from the original
craftworks-origin ATOMS.md were merged into parent atoms (e.g.,
compiler sub-atoms were nested inside atom:SKC rather than kept
as separate entries).

## Current inventory

Per `tools/atoms-oracle/emit-evidence.ts` output:

- Total atoms: 94
- Packages: 14 (workspace, guardrails, policy, snap, lsp, cli,
  action, sdk, serve, skill-kit, test, security, upstream, repo)
- Orphans (all 4 kinds): 0

The existing `docs/concepts/atoms-registry.md` narrative guide
remains as a reader-facing concept document. It does NOT duplicate
the registry content; it explains what atoms are + links to the
per-package ATOMS.md files for the authoritative lists.

## What's delivered this pulse

- `tools/atoms-oracle/load-registry.ts` — parses per-package ATOMS.md
  files into a typed registry with duplicate-id detection + cache
- `tools/atoms-oracle/bidirectional-sweep.ts` — 4-way invariant check
- `tools/atoms-oracle/emit-evidence.ts` — per-run audit sidecar
- Unit + integration tests (9 tests, all green)
- Evidence: `atoms-oracle-sweep-evidence.json` — 94 atoms, 0 orphans

## Signed off

Architect: recorded 2026-04-22 as part of pulse 75 sign-off.
