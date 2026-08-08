# Doc Updates -- XC Ptah the Craftsman

Wave: XC Ptah the Craftsman — claws foundation
Branch: feature/ptah-the-craftsman
Completed: 2026-04-13
Plans: 11 (claws-sdk-bootstrap, claws-governance-ir, claws-detect, claws-parse, claws-rules, claws-emit, claws-cli-foundation, claws-skill-kit, claws-test-framework, claws-public-naming, claws-acceptance-harness)

---

## Phase 1: Scope Identification

### Plans in Scope

| Plan                     | Status      | Atoms                                                                                                           |
| ------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------- |
| claws-sdk-bootstrap      | Implemented | atom:claws-sdk                                                                                                  |
| claws-governance-ir      | Implemented | atom:governance-ir, atom:capability-manifest, atom:mechanical-intent, atom:fail-mode                            |
| claws-detect             | Implemented | atom:claws-compiler, atom:platform-detection, atom:marker-files, atom:multi-platform                            |
| claws-parse              | Implemented | atom:claws-compiler, atom:mechanical-intent, atom:capability-manifest, atom:lossless-roundtrip                  |
| claws-rules              | Implemented | atom:tool-classification, atom:obo-boundary, atom:a2a-governance, atom:elicitation-gate, atom:injection-defense |
| claws-emit               | Implemented | atom:governance-plugin, atom:governance-skill, atom:three-engine-model, atom:workflow-inversion                 |
| claws-cli-foundation     | Implemented | atom:pinch, atom:claws-init, atom:progressive-disclosure, atom:claws-json, atom:error-contract                  |
| claws-skill-kit          | Implemented | atom:skill-kit, atom:tier-adoption                                                                              |
| claws-test-framework     | Implemented | atom:claws-test, atom:cicd-pipeline                                                                             |
| claws-public-naming      | Implemented | C01, C30, C40, C50                                                                                              |
| claws-acceptance-harness | Active      | atom:claws-test, atom:scenario-runner, atom:governance-ir                                                       |

### Areas Touched

- `design/claws/` — specs, atoms, surface contracts
- `docs/claws/concepts/` — 89 concept guides (excluding README)
- `claws-sdk/` — 284 source files, 456 test files (NEW PACKAGE)
- `claws-cli/` — 55 source files (NEW PACKAGE)

### Specs Governing

CL-01 through CL-07 (original 7), plus CL-08 through CL-12 (added during Ptah)

---

## Phase 2: Atom Sync

### Atom Registry Status

The `design/claws/ATOMS.md` registry contains 62 atoms across 10 layers. All atoms pre-date Ptah (created during design phase). No new atoms need registration.

### Atoms Touched by Implementation

| Atom                     | ID  | Authority Updated?      | Mirrors Consistent? | Notes                                         |
| ------------------------ | --- | ----------------------- | ------------------- | --------------------------------------------- |
| atom:governance-ir       | C02 | N/A (spec is authority) | Yes                 | GovernanceIR implemented in claws-sdk/src/ir/ |
| atom:capability-manifest | C03 | N/A                     | Yes                 | Implemented in claws-sdk/src/ir/              |
| atom:mechanical-intent   | C04 | N/A                     | Yes                 | Implemented in claws-sdk/src/ir/              |
| atom:tool-classification | C10 | N/A                     | Yes                 | Rules in claws-sdk/src/governance/rules/      |
| atom:governance-plugin   | C20 | N/A                     | Yes                 | Emitter in claws-sdk/src/emit/                |
| atom:governance-skill    | C21 | N/A                     | Yes                 | Emitter in claws-sdk/src/emit/                |
| atom:claws-sdk           | C50 | N/A                     | Yes                 | Package bootstrapped                          |
| atom:skill-kit           | C41 | N/A                     | Yes                 | Standalone package concept                    |
| atom:claws-test          | C90 | N/A                     | Yes                 | Test framework implemented                    |

### No New Atoms Required

All concepts implemented in Ptah were already registered in ATOMS.md during the design phase.

---

## Phase 3: Count Reconciliation

| Metric               | Before Ptah      | After Ptah        | Authority                     | All Mirrors Updated?                           |
| -------------------- | ---------------- | ----------------- | ----------------------------- | ---------------------------------------------- |
| claws Specs          | 7 (CL-01..CL-07) | 12 (CL-01..CL-12) | design/claws/SPECS.md         | **NO** — design/claws/CLAUDE.md says "7 specs" |
| claws Concept Guides | 89               | 89                | docs/claws/concepts/README.md | Yes                                            |
| claws Atoms          | 62               | 62                | design/claws/ATOMS.md         | Yes                                            |
| claws Plans (total)  | 35               | 35                | .craft/PLANS.md               | Yes                                            |
| Packages in monorepo | 9                | 11                | CODEBASE.md                   | **NO** — CODEBASE.md says "Nine-Package"       |

### Drifts Found

1. **design/claws/CLAUDE.md**: Says "7 specs (CL-01 through CL-07)" but SPECS.md lists 12 (CL-01 through CL-12). FIXABLE.
2. **design/claws/CLAUDE.md**: Says "Implementation | Not started" but Ptah implemented the foundation. FIXABLE.
3. **design/claws/CLAUDE.md**: Says "Scenarios | Not started" but acceptance harness exists. FIXABLE.
4. **CODEBASE.md**: Says "Nine-Package Architecture" but now 11 packages (added claws-sdk, claws-cli). FIXABLE.

---

## Phase 4: Design Doc Sync

| Design Doc                  | Checked? | Updated?         | Notes                                     |
| --------------------------- | -------- | ---------------- | ----------------------------------------- |
| design/claws/SPECS.md       | Yes      | No               | Already at v1.1 with 12 specs — correct   |
| design/claws/ATOMS.md       | Yes      | No               | 62 atoms, all layers present — correct    |
| design/claws/CLAUDE.md      | Yes      | **Needs update** | Stale status table, spec count, phase map |
| design/claws/COMMAND-MAP.md | Yes      | No               | 40 commands — not affected by Ptah        |
| design/claws/PITFALLS.md    | Yes      | No               | 50 pitfalls — not affected by Ptah        |

---

## Phase 5: Concept Guide Assessment

### Guide Coverage

89 concept guides in `docs/claws/concepts/` (excluding README). The README lists guides across 8 sections: Getting Started, Architecture, Building Skills, Fleet, Governance, Maker and DX, Operations, Platforms.

### Atom-to-Guide Mapping

Of 62 atoms in ATOMS.md, concept guides exist for all major atoms. The atom index in the README maps 19 atoms to guides. Coverage is comprehensive for the implemented scope.

### Missing Guides

No missing concept guides identified for Ptah scope. All implemented atoms (GovernanceIR, detect, parse, rules, emit, skill-kit, test) have corresponding guides.

---

## Phase 6: CORPUS & Index Updates

### CORPUS.md

| Check                    | Status | Notes                                           |
| ------------------------ | ------ | ----------------------------------------------- |
| claws design area listed | Yes    | Line 263: `claws                                | design/claws/ (CL specs) | docs/claws/ (concepts, how-to)` |
| Surface count accurate   | N/A    | No count claim in CORPUS for claws specifically |

### Concept README

docs/claws/concepts/README.md — lists all guides, organized by section. No count claim to drift.

---

## Phase 7: Index Updates Required

### CODEBASE.md

**NEEDS UPDATE**: Add claws-sdk and claws-cli package sections. Change "Nine-Package" to "Eleven-Package". Add claws entries to "Where Do I Write?" decision tree.

### WAVES.md

**NEEDS UPDATE**: Ptah wave not listed in either Active or Completed sections. Must add to Completed section, update total count from "179 waves total (48 active, 131 completed)" to "180 waves total (48 active, 132 completed)".

### PHASES.md

**NEEDS UPDATE**: No Phase 50 entry for Ptah. Must add after Phase 49 (Concordia). Update statistics section.

### PLANS.md

**NEEDS AUDIT**: claws-acceptance-harness listed as Active but no plan file found at `.craft/plans/claws-acceptance-harness.md`. All other Ptah plans correctly listed as Implemented.

### ROLES.md

No changes needed. Ptah used existing claws domain lens + craft roles.

### SKILLS.md

No changes needed. No new skills created in Ptah.

---

## Phase 8: Mechanical Fixes

### Fix 1: design/claws/CLAUDE.md — Update Status and Counts

- Specs: "7 specs (CL-01 through CL-07)" → "12 specs (CL-01 through CL-12)"
- Current Status table: Update Implementation and Scenarios rows
- Phase Map: Update phase statuses
- Spec Index: Add CL-08 through CL-12

### Fix 2: CODEBASE.md — Add claws-sdk and claws-cli

- Rename "Nine-Package" to "Eleven-Package"
- Add claws-sdk section after forge-cli
- Add claws-cli section after claws-sdk
- Add claws entries to decision tree

### Fix 3: WAVES.md — Add Ptah wave

- Add to Completed section
- Update header count

### Fix 4: PHASES.md — Add Phase 50 (Ptah)

- Add Phase 50 entry after Concordia
- Update statistics

---

## Phase 9: Spec Checklist Reconciliation

No Implementation Validation Checklists found in design/claws/specs/. This is expected — CL specs are Draft status and the checklist pattern is not yet adopted in the claws design area.

---

## New Stale Items

| Item                   | Issue                                         | Severity | Fix              |
| ---------------------- | --------------------------------------------- | -------- | ---------------- |
| design/claws/CLAUDE.md | Spec count says 7, actual 12                  | Medium   | Fix in this sync |
| design/claws/CLAUDE.md | Implementation status stale                   | Medium   | Fix in this sync |
| CODEBASE.md            | Missing claws-sdk + claws-cli                 | High     | Fix in this sync |
| WAVES.md               | Missing Ptah wave                             | Medium   | Fix in this sync |
| PHASES.md              | Missing Phase 50                              | Medium   | Fix in this sync |
| PLANS.md               | claws-acceptance-harness Active, no plan file | Low      | Flag for review  |
