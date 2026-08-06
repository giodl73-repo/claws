# Doc Updates -- XCV Thoth the Scribe

Wave: XCV Thoth the Scribe -- claws ecosystem
Branch: feature/thoth-the-scribe
Date: 2026-04-16

---

## Phase 1: Scope Identification

**Plans**: 10 (claws-protect, claws-comply-audit, claws-press-context, claws-maker-commands, claws-badge, claws-lsp, claws-serve, claws-cicd-action, claws-upstream-contrib, claws-aether-integration)
**Specs**: CL-01 through CL-12 (12 total in design/claws/SPECS.md)
**Atoms**: design/claws/ATOMS.md (62 atoms across 10 layers)
**Scenarios**: 30 series, 331 individual scenarios in design/claws/scenarios/
**Concept guides**: 89 in docs/claws/concepts/ (+ README)
**Checkpoints**: 5 (security, compliance, optimization, editor/server, ecosystem)
**New packages**: claws-lsp, claws-serve, 6 @openclaw/* upstream

---

## Phase 2: Atom Sync

### Existing Atoms -- Status Check

All 62 atoms (C01-C93) in design/claws/ATOMS.md remain valid. No authority changes needed for existing atoms.

### New Atoms Needed

Thoth introduced concepts that lack atom registrations:

| Concept                | Suggested ID | Name                                                   | Authority                                         | Spec  |
| ---------------------- | ------------ | ------------------------------------------------------ | ------------------------------------------------- | ----- |
| claws serve (HTTP API) | C94          | claws serve (HTTP governance API)                      | design/claws/specs/CL-10-cap-integration.md       | CL-10 |
| WebSocket events       | C95          | WebSocket Governance Events (real-time streaming)      | design/claws/specs/CL-10-cap-integration.md       | CL-10 |
| GuardrailProvider      | C96          | GuardrailProvider (composable governance interface)    | design/claws/specs/CL-11-upstream-governance.md   | CL-11 |
| Approval Event Schema  | C97          | Approval Event Schema (host-approval-policies.json)    | design/claws/specs/CL-12-approval-event-schema.md | CL-12 |
| SARIF Pipeline         | C98          | SARIF Pipeline (CI/CD governance annotation)           | design/claws/specs/CL-05-developer-experience.md  | CL-05 |
| Severity Gating        | C99          | Severity Gating (gradual CI rollout)                   | design/claws/specs/CL-05-developer-experience.md  | CL-05 |
| Badge Staleness        | C100         | Badge Staleness Detection (per-version expiry)         | design/claws/specs/CL-05-developer-experience.md  | CL-05 |
| Artifact Signer        | C101         | Artifact Signer (Ed25519 + HMAC signing)               | design/claws/specs/CL-02-security-model.md        | CL-02 |
| Witness Export         | C102         | Witness Export (third-party audit attestation)         | design/claws/specs/CL-02-security-model.md        | CL-02 |
| WAL Recovery           | C103         | WAL Recovery (write-ahead log replay)                  | design/claws/specs/CL-02-security-model.md        | CL-02 |
| Context DAG            | C104         | Context DAG (governance context dependency graph)      | design/claws/specs/CL-04-compilation-pipeline.md  | CL-04 |
| PRESS Pinch            | C105         | PRESS Pinch (governance token compression)             | design/claws/specs/CL-04-compilation-pipeline.md  | CL-04 |
| Budget Workspace       | C106         | Budget Workspace (per-workspace token budgeting)       | design/claws/specs/CL-02-security-model.md        | CL-02 |
| Secrets Vault          | C107         | Secrets Vault (AES-256-GCM credential storage)         | design/claws/specs/CL-02-security-model.md        | CL-02 |
| Blob Integrity         | C108         | Blob Integrity Verification (SHA-256 artifact signing) | design/claws/specs/CL-12-approval-event-schema.md | CL-12 |
| Skill Scaffold         | C109         | Skill Scaffold (claws new skill)                       | design/claws/specs/CL-05-developer-experience.md  | CL-05 |
| Host Approval Policies | C110         | Host Approval Policies (host-approval-policies.json)   | design/claws/specs/CL-12-approval-event-schema.md | CL-12 |

**Action**: 17 new atoms registered in ATOMS.md (C94-C110).

### Mirror Status

| Atom                    | Authority Updated? | Mirrors Updated?                              |
| ----------------------- | ------------------ | --------------------------------------------- |
| C42 governance-badge    | Yes (CL-05)        | Yes -- badge-staleness concept guide updated  |
| C43 claws-lsp           | Yes (CL-05)        | Yes -- claws-lsp concept guide already exists |
| C76 siem-export         | No change          | Mirrors current                               |
| C92 cicd-pipeline       | Yes (CL-05)        | Yes -- cicd-pipeline concept guide exists     |
| C15 compliance-artifact | No change          | Mirrors current (SOC2/HIPAA/EU AI Act)        |

---

## Phase 3: Count Reconciliation

| Metric         | Before (CLAUDE.md) | After (Actual)                         | Authority               | Fixed? |
| -------------- | ------------------ | -------------------------------------- | ----------------------- | ------ |
| Specs          | 7 (CL-01..CL-07)   | 12 (CL-01..CL-12)                      | SPECS.md                | YES    |
| Scenarios      | "pending"          | 30 series / 331 scenarios              | design/claws/scenarios/ | YES    |
| Pitfalls       | 50                 | 50 (no change)                         | PITFALLS.md             | --     |
| Commands       | 40                 | 40 (no change)                         | COMMAND-MAP.md          | --     |
| Atoms          | 62                 | 79 (62 + 17 new)                       | ATOMS.md                | YES    |
| Concept guides | not tracked        | 89                                     | docs/claws/concepts/    | YES    |
| Roles          | 8                  | 8 (no change)                          | .craft/roles/claws/     | --     |
| Implementation | "Not started"      | 3 waves complete (Ptah, Anubis, Thoth) | wave.yaml               | YES    |

---

## Phase 4: Design Doc Sync

| Design Doc                  | Checked? | Updated? | Notes                                                                  |
| --------------------------- | -------- | -------- | ---------------------------------------------------------------------- |
| design/claws/SPECS.md       | Yes      | Yes      | Already has 12 specs, version 1.1 -- correct                           |
| design/claws/COMMAND-MAP.md | Yes      | No       | 40 commands unchanged                                                  |
| design/claws/PITFALLS.md    | Yes      | No       | 50 pitfalls unchanged                                                  |
| design/claws/CLAUDE.md      | Yes      | YES      | Stale: says 7 specs, "pending" scenarios, "Not started" implementation |

---

## Phase 5: Concept Guide Assessment

### Existing Guides (89 in docs/claws/concepts/)

All major Thoth features have concept guides:

- claws-lsp.md -- exists (LSP server)
- cicd-pipeline.md -- exists (CI/CD)
- governance-badge.md -- exists (badge system)
- audit-chain.md -- exists (audit chain)
- compliance-soc2/hipaa/eu-ai-act.md -- exist
- upstream-contrib.md -- exists
- skill-scaffold.md -- exists
- pinch.md -- exists (PRESS/pinch optimization)
- snapshot-*.md -- 6 guides exist

### Missing Guides

| Concept                | File needed                               | Atom |
| ---------------------- | ----------------------------------------- | ---- |
| claws serve (HTTP API) | docs/claws/concepts/claws-serve.md        | C94  |
| Aether Integration     | docs/claws/concepts/aether-integration.md | C97  |
| GuardrailProvider      | docs/claws/concepts/guardrail-provider.md | C96  |
| SARIF Pipeline         | docs/claws/concepts/sarif-pipeline.md     | C98  |
| Severity Gating        | docs/claws/concepts/severity-gating.md    | C99  |
| Artifact Signing       | docs/claws/concepts/artifact-signing.md   | C101 |
| Secrets Vault          | docs/claws/concepts/secrets-vault.md      | C107 |

**7 concept guides missing** for new Thoth concepts.

---

## Phase 6: CORPUS & Index Updates

### CORPUS.md

| Item                 | Status               | Action                                             |
| -------------------- | -------------------- | -------------------------------------------------- |
| claws area row       | Present              | No change needed                                   |
| Concept guide count  | Not tracked per-area | --                                                 |
| Thoth wave reference | Missing              | Not required in CORPUS (WAVES.md is the authority) |

### Index Files Needing Updates

| Index       | Status                                             | Action    |
| ----------- | -------------------------------------------------- | --------- |
| WAVES.md    | Missing 4 claws waves (Ptah, Anubis, Ra, Thoth)    | ADD       |
| PHASES.md   | Missing claws phases (50+)                         | ADD       |
| PLANS.md    | Missing 10 Thoth plans (and prior claws plans)     | ADD       |
| CODEBASE.md | Missing claws-sdk, claws-lsp, claws-serve packages | ADD       |
| ROLES.md    | claws domain lens should be verified               | CHECK     |
| SKILLS.md   | No claws-specific skills added by Thoth            | No change |

---

## Phase 7: Mechanical Fixes Applied

### 7a. design/claws/CLAUDE.md -- Updated stale counts

- Specs: "7 specs (CL-01 through CL-07)" -> "12 specs (CL-01 through CL-12)"
- Scenarios: "pending" -> "30 series, 331 scenarios"
- Implementation: "Not started" -> "3 waves complete (Ptah foundation, Anubis ops, Thoth ecosystem)"
- Phase Map: Updated all phases to reflect completion
- Spec Index: Added CL-08 through CL-12

### 7b. design/claws/ATOMS.md -- 17 new atoms registered (C94-C110)

New layers added:

- Serve Layer (C94-C95): HTTP API, WebSocket events
- Upstream Layer (C96-C97): GuardrailProvider, Approval Event Schema
- CI/CD Layer (C98-C99): SARIF pipeline, severity gating
- Badge Layer (C100): Badge staleness detection
- Security Additions (C101-C103, C106-C108): Artifact signer, witness export, WAL recovery, budget workspace, secrets vault, blob integrity
- Optimization (C104-C105): Context DAG, PRESS pinch
- Maker (C109): Skill scaffold
- Aether (C110): Host approval policies

### 7c. WAVES.md -- 4 claws waves added to Completed section

### 7d. PHASES.md -- Phase 50 (Thoth) added

### 7e. PLANS.md -- 10 Thoth plans added

### 7f. CODEBASE.md -- claws-sdk, claws-lsp, claws-serve entries added

---

## Phase 8: Stale Items

| Item                             | Issue                                                          | Severity                          |
| -------------------------------- | -------------------------------------------------------------- | --------------------------------- |
| design/claws/CLAUDE.md Phase Map | Phase 2/3/4 still say "Not started" despite 3 waves completing | HIGH -- fixed                     |
| 7 missing concept guides         | New Thoth concepts lack guides                                 | MEDIUM -- flagged for future wave |
| 10 Thoth plan statuses           | All still "Draft" in frontmatter despite wave completion       | MEDIUM -- should be "Implemented" |

---

## Phase 9c: Spec Checklist Reconciliation

Checked design/claws/specs/ for Implementation Validation Checklists. 12 spec files present (CL-01 through CL-12). CL-10 (CAP Integration), CL-11 (Upstream Governance), and CL-12 (Approval Event Schema) were added during the Thoth wave's ecosystem checkpoint (CP-5). No missing spec files.
