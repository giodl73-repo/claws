# claws — Session Driver

## Overview

claws is the governance compiler for OpenClaw agents. It reads 9 workspace files, compiles governance rules into executable TypeScript skills that run inside the OC Gateway, and provides 11+ shared libraries as the .NET for OpenClaw.

**Specs**: `SPECS.md` — 7 specs (CL-01 through CL-07), all Draft
**Scenarios**: `scenarios/` — pending
**DCRs**: `DCR.md` — 0 filed
**Research**: `design/claws/focus/Q01-Q18` — 18 questions, all Proposed
**Roles**: `.craft/roles/claws/` — 8 roles across 3 stakeholder layers
**Deck**: `docs/claws/presentations/why-claws.md` — product pitch
**Pitfalls**: `design/claws/PITFALLS.md` — 50 pitfalls + HITL map
**Command Map**: `design/claws/COMMAND-MAP.md` — 40 commands

## Current Status

| Area | Status |
|------|--------|
| Research | Complete — 18 questions (Q01-Q18), all Proposed |
| Specs | In progress — 7 specs, all Draft |
| Deck | Complete — why-claws.md + .pptx |
| Roles | Complete — 8 roles + openclaw domain lens |
| Pitfalls | Complete — 50 pitfalls + HITL map |
| Command Map | Complete — 40 commands, 8 groups |
| Scenarios | Not started |
| Implementation | Not started |

## Phase Map

| Phase | Focus | Status |
|-------|-------|--------|
| 0 | Research (Q01-Q18) | Complete — 18 questions |
| 1 | Specs (CL-01 through CL-07) | In progress |
| 2 | Scenario accumulation | Not started |
| 3 | Role-based reviews | Not started |
| 4 | Implementation | Not started |

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
