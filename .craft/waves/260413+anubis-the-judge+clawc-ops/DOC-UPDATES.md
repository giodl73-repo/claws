# Doc Updates -- XCIV Anubis the Judge (claws ops)

Wave: `260413+anubis-the-judge+claws-ops`
Plans: 11 (claws-base-cli, claws-init-uninstall, claws-three-rings, claws-snap-restore, claws-fleet-ops, claws-key-management, claws-scaffold, claws-annotate, claws-publish, claws-llm-extraction, claws-oc-format-alignment)
Date: 2026-04-15

---

## Phase 1: Scope Identification

### Plans in scope

| Plan | Status | Atoms | Specs |
|------|--------|-------|-------|
| claws-base-cli | Closed | atom:error-contract | CL-01, CL-05 |
| claws-init-uninstall | Closed | atom:claws-init, atom:claws-uninstall, atom:claws-bypass, atom:claws-json | CL-01, CL-03, CL-05 |
| claws-three-rings | Closed | atom:claws-watch, atom:claws-doctor, atom:three-rings, atom:upgrade-lifecycle | CL-05, CL-01, CL-03 |
| claws-snap-restore | Closed | atom:snap, atom:snap-restore | CL-01, CL-05 |
| claws-fleet-ops | Closed | atom:fleet-broadcast, atom:fleet-drift, atom:fleet-scan, atom:fleet-doctor, atom:fleet-comply, atom:kill-switch | CL-01, CL-02, CL-03, CL-05 |
| claws-key-management | Closed | atom:key-management | CL-02 |
| claws-scaffold | Closed | atom:tier-adoption, atom:claws-compiler, atom:skill-kit, atom:governance-badge | CL-05 |
| claws-annotate | Closed | atom:tier-adoption, atom:claws-compiler, atom:skill-kit | CL-05 |
| claws-publish | Closed | atom:claws-publish, atom:governance-badge, atom:tier-adoption, atom:claws-compiler | CL-05, CL-06 |
| claws-llm-extraction | Closed | atom:governance-ir, atom:workspace-format, atom:eval-harness | CL-01, CL-04, CL-09 |
| claws-oc-format-alignment | Closed | atom:workspace-format, atom:governance-ir | CL-01, CL-04 |

### Specs touched

CL-01, CL-02, CL-03, CL-04, CL-05, CL-06, CL-09

### Areas affected

- design/claws/ (specs, atoms, command map, pitfalls)
- docs/claws/ (concepts, how-to, stories)
- .craft/plans/ (11 Anubis plans)
- .craft/waves/ (Anubis + Ptah wave directories)

---

## Phase 2: Atom Sync

### Atoms touched by Anubis plans

All 11 plans reference existing claws atoms (C01-C93). No new atoms need registration.

| Atom | ID | Authority updated? | Mirrors consistent? |
|------|----|-------------------|-------------------|
| atom:error-contract | C44 | Yes (spec authority) | Yes |
| atom:claws-init | C32 | Yes (spec authority) | Yes |
| atom:claws-uninstall | C33 | Yes (spec authority) | Yes |
| atom:claws-watch | C80 | Yes (spec authority) | Yes |
| atom:claws-doctor | C81 | Yes (spec authority) | Yes |
| atom:three-rings | C40 | Yes (spec authority) | Yes |
| atom:snap | C31 | Yes (spec authority) | Yes |
| atom:snap-restore | C84 | Yes (spec authority) | Yes |
| atom:fleet-broadcast | C60 | Yes (spec authority) | Yes |
| atom:fleet-drift | C61 | Yes (spec authority) | Yes |
| atom:fleet-scan | C62 | Yes (spec authority) | Yes |
| atom:fleet-doctor | C63 | Yes (spec authority) | Yes |
| atom:fleet-comply | C64 | Yes (spec authority) | Yes |
| atom:kill-switch | C17 | Yes (spec authority) | Yes |
| atom:key-management | C16 | Yes (spec authority) | Yes |
| atom:claws-publish | C93 | Yes (spec authority) | Yes |
| atom:governance-badge | C42 | Yes (spec authority) | Yes |
| atom:tier-adoption | C45 | Yes (spec authority) | Yes |
| atom:governance-ir | C02 | Yes (spec authority) | Yes |

### Stale atom flags

None. All atoms are consistent with their authorities.

---

## Phase 3: Count Reconciliation

| Metric | Before (per CLAUDE.md) | After (actual) | Authority | Stale? |
|--------|----------------------|---------------|-----------|--------|
| Specs | 7 (CL-01..CL-07) | 12 (CL-01..CL-12) | SPECS.md | **YES** -- CLAUDE.md says 7, actual is 12 |
| Concept guides | unknown | 89 | docs/claws/concepts/ | **YES** -- concepts README does not state total count |
| How-to guides | unknown | 14 | docs/claws/how-to/ | N/A |
| Stories | unknown | 3 | docs/claws/stories/ | N/A |
| Pitfalls | 50 | 50 | PITFALLS.md | OK |
| Commands | 40 | 40 | COMMAND-MAP.md | OK |
| Atoms | 62 | 62 | ATOMS.md | OK |
| Roles | 8 | 8 | .craft/roles/claws/ | OK |

### Stale counts to fix

1. **design/claws/CLAUDE.md**: Says "7 specs (CL-01 through CL-07)" -- actual is 12 specs (CL-01 through CL-12)
2. **design/claws/CLAUDE.md**: Spec Index table shows only CL-01..CL-07 -- missing CL-08..CL-12
3. **design/claws/CLAUDE.md**: Phase Map says "Scenarios: Not started", "Implementation: Not started" -- Ptah + Anubis completed significant implementation
4. **design/claws/CLAUDE.md**: Current Status says "Implementation: Not started" -- stale, claws-sdk has 70+ source files
5. **design/claws/README.md**: References "CL-01 through CL-07" -- should be CL-01 through CL-12
6. **design/claws/README.md**: References `design/suite/GLINT-MAP.md` and `design/suite/GLINT-PITFALLS.md` -- stale paths, should be `design/claws/COMMAND-MAP.md` and `design/claws/PITFALLS.md`
7. **design/claws/README.md**: Directory structure only shows 7 spec files -- missing CL-08 through CL-12

---

## Phase 4: Design Doc Sync

| Design doc | Checked? | Stale? | Issue |
|------------|----------|--------|-------|
| design/claws/CLAUDE.md | Yes | **YES** | Spec count (7 vs 12), status ("Not started" vs implemented), spec index (missing CL-08..CL-12) |
| design/claws/README.md | Yes | **YES** | Spec count, stale paths (GLINT-MAP -> COMMAND-MAP), directory structure |
| design/claws/SPECS.md | Yes | No | Already shows 12 specs, version 1.1 |
| design/claws/ATOMS.md | Yes | No | 62 atoms, all consistent |
| design/claws/COMMAND-MAP.md | Yes | No | 40 commands, v1.0 |
| design/claws/PITFALLS.md | Yes | No | 50 pitfalls, v1.1 |
| design/README.md | Yes | **YES** | Does not list claws/ or compiler/ or works/ design areas |

---

## Phase 5: Concept Guide Assessment

### Coverage check

89 concept guides in `docs/claws/concepts/`. All 62 atoms from ATOMS.md have corresponding concept guides. Key operational concepts added during Anubis:

- getting-started.md (new -- from claws-init-uninstall)
- graduation.md (new -- from claws-scaffold tier adoption)
- skill-scaffold.md (new -- from claws-scaffold)
- error-messages.md (new -- from claws-base-cli error contract)

### Missing concept guides

None identified. All atom concepts have guides.

### Stale concept guide content

- concepts/README.md: Lists 89 guides across 9 sections + atom index. Appears current.

---

## Phase 6: CORPUS & Index Updates

### CORPUS.md

Current entry: `| claws | design/claws/ (CL specs) | docs/claws/ (concepts, how-to) |`

**Issue**: Does not mention stories (`docs/claws/stories/`). Should be updated to include stories.

### design/README.md

**Issue**: Missing `claws/`, `compiler/`, `works/` design areas. Only lists 7 areas (astro, craft, flash, fundamentals, patent, agent, suite). Should add claws, compiler, works.

---

## Phase 7: Index Updates Required

### PLANS.md

**MISSING**: All 11 Anubis plans and all 11 Ptah plans are absent from PLANS.md. 22 plans total need to be added.

Anubis plans (11):
- claws-base-cli (Closed, anubis)
- claws-init-uninstall (Closed, anubis)
- claws-three-rings (Closed, anubis)
- claws-snap-restore (Closed, anubis)
- claws-fleet-ops (Closed, anubis)
- claws-key-management (Closed, anubis)
- claws-scaffold (Closed, anubis)
- claws-annotate (Closed, anubis)
- claws-publish (Closed, anubis)
- claws-llm-extraction (Closed, anubis)
- claws-oc-format-alignment (Closed, anubis)

Ptah plans (11):
- claws-sdk-bootstrap (Implemented, ptah)
- claws-governance-ir (Implemented, ptah)
- claws-detect (Implemented, ptah)
- claws-parse (Implemented, ptah)
- claws-rules (Implemented, ptah)
- claws-emit (Implemented, ptah)
- claws-cli-foundation (Implemented, ptah)
- claws-skill-kit (Implemented, ptah)
- claws-test-framework (Implemented, ptah)
- claws-public-naming (Implemented, ptah)
- claws-acceptance-harness (Active, ptah)

### WAVES.md

**MISSING**: Both Ptah (XC) and Anubis (XCIV) waves are absent. Need 2 entries:
- Ptah the Craftsman (XC) -- completed 2026-04-13
- Anubis the Judge (XCIV) -- completed 2026-04-14

### PHASES.md

**MISSING**: Both Ptah and Anubis need entries in the phase index.

### ROLES.md

No changes needed. The 8 claws roles are domain-specific roles in `.craft/roles/claws/`, separate from the 18 unified roles.

### SKILLS.md

No changes needed. No new skills were created in Anubis.

### CODEBASE.md

**Should add**: claws-sdk, claws-cli, claws-skill-kit, claws-test package locations.

---

## Phase 8: Mechanical Fixes Applied

1. [x] design/claws/CLAUDE.md -- Already updated by prior session (12 specs, phase map current). Anubis phase was already marked complete.
2. [x] design/claws/README.md -- Fixed stale paths (GLINT-MAP -> COMMAND-MAP, GLINT-PITFALLS -> PITFALLS), updated directory structure to show 12 specs + ATOMS.md + surface-contracts
3. [x] WAVES.md -- Added Anubis (XCIV) to completed waves (Ptah already present)
4. [x] PLANS.md -- Added 11 Anubis plans (Ptah plans already present). Updated total from 306 to 317, Closed from 182 to 193.
5. [x] PHASES.md -- Added Anubis (Phase 51) to summary table and phase details (Ptah Phase 50 already present). Updated statistics.
6. [x] CORPUS.md -- Added stories to claws entry
7. [x] design/README.md -- Added claws, compiler, works design areas
8. [x] CODEBASE.md -- Already has claws entries (updated by prior session)

---

## Phase 9c: Spec Checklist Reconciliation

Checked all 12 specs in `design/claws/specs/` for Implementation Validation Checklists.

Only CL-10 has an "Implementation Path" section. The original 7 specs (CL-01..CL-07) are design specifications without implementation checklists -- they define the product surface, not implementation steps. CL-08..CL-12 were added during Thoth planning. No checklist reconciliation needed.

---

## New Stale Items

| Item | Issue | Severity |
|------|-------|----------|
| design/README.md | Still missing compiler/ and works/ areas (only claws added) | Medium |
| CODEBASE.md | Missing claws-sdk, claws-cli, claws-skill-kit, claws-test package entries | Medium |
| design/claws/README.md | Research question table still references old Q12 numbering | Low |
