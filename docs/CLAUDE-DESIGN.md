# claws — Session Driver

## Overview

claws is the governance compiler for OpenClaw agents. It reads 9 workspace files, compiles governance rules into executable TypeScript skills that run inside the OC Gateway, and provides 11+ shared libraries as the .NET for OpenClaw.

**Specs**: `SPECS.md` — 12 specs (CL-01 through CL-12), all Draft
**Scenarios**: `scenarios/` — 30 series, 331 scenarios
**DCRs**: `DCR.md` — 0 filed
**Research**: `design/claws/focus/Q01-Q18` — 18 questions, all Proposed
**Roles**: `.craft/roles/claws/` — 8 roles across 3 stakeholder layers
**Deck**: `docs/claws/presentations/why-claws.md` — product pitch
**Pitfalls**: `design/claws/PITFALLS.md` — 50 pitfalls + HITL map
**Command Map**: `design/claws/COMMAND-MAP.md` — 40 commands
**Atoms**: `ATOMS.md` — 79 atoms across 13 layers
**Concept Guides**: `docs/claws/concepts/` — 89 guides

## Current Status

| Area | Status |
|------|--------|
| Research | Complete — 18 questions (Q01-Q18), all Proposed |
| Specs | Complete — 12 specs (CL-01 through CL-12), all Draft |
| Deck | Complete — why-claws.md + .pptx |
| Roles | Complete — 8 roles + openclaw domain lens |
| Pitfalls | Complete — 50 pitfalls + HITL map |
| Command Map | Complete — 40 commands, 8 groups |
| Scenarios | Complete — 331 scenarios across 30 series |
| Implementation | Complete — 3 waves: Ptah (foundation), Anubis (ops), Thoth (ecosystem) — 4,571 tests |

## Phase Map

| Phase | Focus | Status |
|-------|-------|--------|
| 0 | Research (Q01-Q18) | Complete — 18 questions |
| 1 | Specs (CL-01 through CL-12) | Complete — 12 specs |
| 2 | Scenario accumulation | Complete — 331 scenarios, 30 series |
| 3 | Role-based reviews | Complete — per-checkpoint reviews |
| 4 | Implementation (Ptah) | Complete — foundation wave XC (453 tests) |
| 5 | Implementation (Anubis) | Complete — operations wave XCIV |
| 6 | Implementation (Thoth) | Complete — ecosystem wave XCV (4,571 tests) |

## Spec Index (Quick Reference)

| Spec | Focus | Source | Status |
|------|-------|--------|--------|
| CL-01 | CLI Surface & Schema | Q12a-d, Q12g | Draft |
| CL-02 | Security Model | Q12h | Draft |
| CL-03 | Runtime Enforcement | Q12i, Q12r | Draft |
| CL-04 | Compilation Pipeline | Q12j, Q12m | Draft |
| CL-05 | Developer Experience | Q12e-f, Q12o, Q12q | Draft |
| CL-06 | Platform Ecosystem | Q12k-l, Q12n | Draft |
| CL-07 | Deep Integration | Q12p, Q12b | Draft |
| CL-08 | Freemium Boundary | Q12s | Draft |
| CL-09 | OC Workspace Format | Q12t | Draft |
| CL-10 | CAP Integration & Serve API | CAP Product Day | Draft |
| CL-11 | Upstream Governance | Q12b, Thoth | Draft |
| CL-12 | Approval Event Schema | Q12b, Thoth | Draft |

## Key Design Decisions (from research)

1. **Name**: `claws` — the claw compiler. `{lang}c` convention earned by real code generation.
2. **Architecture**: claws-sdk is a SIBLING to craftworks-sdk on compiler-sdk + agent-sdk. Zero extraction.
3. **Lossless**: claws NEVER modifies original OC workspace files. Add-only. Byte-for-byte round-trip.
4. **OC-native**: Generated code passes the "would an OC developer understand this?" test. No @craftworks/ in output.
5. **R5 fail-closed**: Non-negotiable, non-configurable. The compiler refuses to emit R5 fail-open.
6. **Three tiers**: @openclaw/* (contributed) → @claws/* (shared libraries) → @craftworks/* (internal only).
7. **Adoption funnel**: Free libraries → governance compiler → fleet management → enterprise.

## Session Protocol

1. Read this file on startup
2. Check **Current Status** — resume from last incomplete work
3. For spec work: check `SPECS.md` for index and status
4. For scenario work: check `scenarios/` for progress
5. For research context: read `design/agent/focus/Q12{x}.md`
6. For role reviews: use `.craft/roles/claws/` roles
7. After completing a spec: update `SPECS.md` index

## Key References

| Document | Purpose |
|----------|---------|
| `SPECS.md` | Spec index |
| `DCR.md` | Design change records |
| `design/claws/COMMAND-MAP.md` | Command surface (40 commands) |
| `design/claws/PITFALLS.md` | 50 pitfalls + HITL map |
| `design/claws/focus/Q01-Q18` | 18 research questions |
| `.craft/roles/claws/` | 8 stakeholder roles |
| `docs/claws/presentations/why-claws.md` | Product pitch deck |
| `design/agent/focus/Q12m/data/atoms-audit.md` | 163 atoms classified |
