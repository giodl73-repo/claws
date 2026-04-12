# Focus — claws Research Questions

Research investigations into the claws governance compiler for OpenClaw agents.

Uses the research question format — hypothesis-first, experiment-driven, findings-synthesized.

## Questions

| QID | Question | Status | Origin |
|-----|----------|--------|--------|
| Q00 | What is the right CLI surface and operational boundary for OpenClaw enterprise users? | **Proposed** | Q12 |
| Q01 | One CLI or two? And what naming surface does the user see? | **Proposed** — One CLI (`claws`), `claws.json` + `.claws/`, complements openclaw CLI | Q12a |
| Q02 | What should Craftworks contribute upstream to OpenClaw? | **Proposed** — 5 runtime packages + GuardrailProvider spec PR across 3 waves (16 weeks) | Q12b |
| Q03 | What is the right verb surface for claws? | **Proposed** — 39 commands, 8 groups + 4 maker verbs, pinch + snap, progressive disclosure 4/18/39 | Q12c |
| Q04 | What is the right CLI name? | **Proposed** — `claws` (the claw compiler). {lang}c convention earned by real code generation. Went glint→claws when compiler identity proved out. | Q12d |
| Q05 | What is the right upgrade and continuous governance experience? | **Proposed** — Three rings (live/upgrade/fleet), 10-step script → 3 commands, inner ring handles 70% | Q12e |
| Q06 | How should claws integrate with CI/CD pipelines? | **Proposed** — 4-stage pipeline (pre-commit → CI → CD → fleet cron), `@bic/claws-action`, SARIF | Q12f |
| Q07 | What is the right claws.json schema for cross-platform governance? | **Proposed** — Three-layer (core/targets/detection), v2, 7-platform detection, backwards-compatible | Q12g |
| Q08 | What is the right security model for claws? | **Proposed** — 4 layers (Classification R1-R5, A2A + FE6, injection 16 rules, elicitation/OBO), OWASP 10/10 | Q12h |
| Q09 | How does claws enforce governance at runtime? | **Proposed** — 5 defense-in-depth layers, `claws init` installs 4 automatically, R5 always fail-closed | Q12i |
| Q10 | What is the compilation model for agent governance? | **Proposed** — 5-phase pipeline (PARSE/EXTRACT/ANALYZE/OPTIMIZE/EMIT), GovernanceIR, workflow inversion, skills-are-specs | Q12j |
| Q11 | What Craftworks runtime powers claws-generated skills? | **Proposed** — Three-tier packages (@openclaw/*, @claws/*, @craftworks/*), OC-native generated code | Q12k |
| Q12 | What does claws take from Craftworks? | **Proposed** — No extraction, new frontend + .NET for OpenClaw, 11 @claws/* libraries, PRESS→pinch | Q12l |
| Q13 | How does claws-sdk compose on top of compiler-sdk + agent-sdk? | **Proposed** — Sibling architecture, 4 DIRECT IRs + 4 EXTEND, OperationIR→TS, QueryIR→OC memory | Q12m |
| Q14 | How does claws map to the 5,198 skill ecosystem? | **Proposed** — 10 units, 165 OBO skills, 98.4% ungoverned, 8 REPLACE / 43 COMPLEMENT / 34 ENABLE | Q12n |
| Q15 | How does claws help makers create skills? | **Proposed** — @bic/claws-skill-kit + @bic/claws-test, 3-tier adoption (DECLARED/TYPED/VERIFIED), 4 new commands | Q12o |
| Q16 | Which Craftworks atoms power claws's deep capabilities? | **Proposed** — 48 atoms reused, 7/12 CREST files, tension analysis 5/7 auto-resolve, eval G0-G3 | Q12p |
| Q17 | How should claws integrate with VS Code? | **Proposed** — claws-lsp + claws-vscode + compilation host, <200ms diagnostics, zero competition | Q12q |
| Q18 | How does claws map to OC Gateway runtime contracts? | **Proposed** — GovernanceHost 6-facet, 4-layer context, 6 composition patterns, WAL crash recovery | Q12r |

## Mapping: Old QID → New QID

| New | Old | Short name |
|-----|-----|-----------|
| Q00 | Q12 | CLI boundary (original, superseded by Q01-Q18) |
| Q01 | Q12a | One CLI + naming |
| Q02 | Q12b | Upstream contributions |
| Q03 | Q12c | Verb surface |
| Q04 | Q12d | CLI name |
| Q05 | Q12e | Upgrade experience |
| Q06 | Q12f | CI/CD integration |
| Q07 | Q12g | Schema v2 |
| Q08 | Q12h | Security model |
| Q09 | Q12i | Runtime enforcement |
| Q10 | Q12j | Compilation pipeline |
| Q11 | Q12k | Runtime libraries |
| Q12 | Q12l | Extraction boundary |
| Q13 | Q12m | claws-sdk composition |
| Q14 | Q12n | Skill ecosystem |
| Q15 | Q12o | Maker experience |
| Q16 | Q12p | Atoms deep-dive |
| Q17 | Q12q | VS Code |
| Q18 | Q12r | Runtime contracts |

## Context

claws is the governance compiler for OpenClaw agents. It reads 9 workspace files, compiles governance rules into executable TypeScript, and provides 11+ shared libraries as the .NET for OpenClaw.

**Design area**: `design/claws/`
**Specs**: `design/claws/SPECS.md` — CL-01 through CL-07
**Roles**: `.craft/roles/claws/` — 8 stakeholder roles
**Deck**: `docs/presentations/why-claws.md`
