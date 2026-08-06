---
pulse: 19
slug: comply-scenario-findings
plan: claws-comply-audit
depends_on: [14, 15, 16, 17, 18]
governing_roles: [claws:founder, claws:ciso, craft:architect]
scenario_codes:
  [
    compliance-evidence/S01,
    compliance-evidence/S02,
    compliance-evidence/S03,
    compliance-evidence/S04,
    compliance-evidence/S05,
    compliance-evidence/S06,
    fleet-operations/S04,
    fleet-operations/S05,
    fleet-operations/S10,
  ]
stage: implementation
test_tiers:
  L0_unit: 4
  L1_integration: 4
  L2_e2e: 2
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 19: Comply Scenario Findings

## Objective

Implement the 48 compliance-evidence scenario findings and 11 fleet-operations findings documented in the plan. Key additions: SOC2 observation period validation (6 months min), event-to-control filtering, broken chain → critical finding, per-pii-type label coverage, RFC 8785 canonical JSON for reproducible serialization, evidence format versioning, streaming export for large audit chains, fleet-wide compliance matrix.

This is the integration pulse that takes all the individual compliance and audit modules built in Pulses 11-18 and wires them together to satisfy the full scenario finding set. The compliance-evidence scenarios (S01-S06) cover chain integrity, tamper detection, witness receipts, export formats, SOC2 controls, and EU AI Act classification. The fleet-operations scenarios (S04, S05, S10) cover fleet-wide compliance reporting, ungoverned workspace handling, and cross-framework deduplication.

Key technical additions in this pulse: RFC 8785 canonical JSON ensures reproducible serialization of evidence packages (deterministic key ordering, numeric normalization, no trailing whitespace). Evidence format versioning stamps each evidence package with a schema version for forward compatibility. Streaming export uses generator-based processing for audit chains exceeding 10K entries. The fleet compliance matrix aggregates per-workspace compliance status across all three frameworks into a single report with rollup statistics.

## Deliverables

- [ ] `claws-sdk/src/compliance/soc2.ts` (EDIT) — observation period validation, control status thresholds, key fingerprint in evidence
- [ ] `claws-sdk/src/compliance/hipaa.ts` (EDIT) — per-pii-type label coverage, breach notification config, governance enforcement uptime
- [ ] `claws-sdk/src/compliance/eu-ai-act.ts` (EDIT) — Annex III category-specific obligation checklists, unacceptable-risk evidence generation block
- [ ] `claws-sdk/src/audit/verify.ts` (EDIT) — chain break scope assessment, post-break tamper analysis
- [ ] `claws-sdk/src/audit/export.ts` (EDIT) — RFC 8785 canonical JSON, numeric serialization, line-ending normalization
- [ ] `claws-sdk/tests/compliance/scenario-findings.unit.test.ts` — L0: observation period 6-month validation (1), RFC 8785 canonical JSON (1), evidence format versioning (1), line-ending normalization (1)
- [ ] `claws-sdk/tests/compliance/scenario-findings.integration.test.ts` — L1: fleet compliance matrix generation (1), ungoverned workspace exclusion (1), cross-framework dedup (1), streaming export >10K entries (1)
- [ ] `claws-sdk/tests/compliance/scenario-findings.e2e.test.ts` — L2: full comply pipeline with all scenario additions on fixture workspace (1), fleet compliance report (1)
- [ ] `claws-sdk/tests/compliance/scenario-findings.accept.test.ts` — L3: SDK acceptance — compliance matrix API aggregates all 3 frameworks with dedup and streaming from consumer perspective
- [ ] `claws-cli/tests/compliance/scenario-findings.accept.test.ts` — L3: CLI acceptance — fleet compliance matrix CLI output with cross-framework rollup and ungoverned workspace handling

## Acceptance Criteria

- [ ] SOC2 observation period validation rejects periods < 6 months with warning finding
- [ ] Event-to-control filtering routes audit events to correct SOC2 controls
- [ ] Broken audit chain produces critical finding across all SOC2 controls
- [ ] Per-pii-type label coverage check reports missing labels per PHI identifier
- [ ] RFC 8785 canonical JSON produces deterministic output (key ordering, numeric normalization)
- [ ] Evidence format version stamped on every evidence package
- [ ] Streaming export processes >10K entries without full chain in memory
- [ ] Fleet compliance matrix aggregates per-workspace status across all 3 frameworks
- [ ] Ungoverned workspaces excluded from fleet compliance with explanation
- [ ] Cross-framework findings deduplicated (same underlying issue not reported 3 times)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/founder.md` — product vision for compliance integration, fleet compliance scope
- `.craft/roles/claws/ciso.md` — compliance scenario requirements, evidence standards, fleet reporting
- `.craft/roles/craft/architect.md` — cross-module integration patterns, streaming design, canonical serialization

## Dependencies

- Pulse 14 (audit-witness-export) — witness receipts and export formatters
- Pulse 15 (compliance-soc2) — SOC2 evidence builder
- Pulse 16 (compliance-hipaa) — HIPAA evidence builder
- Pulse 17 (compliance-eu-ai-act) — EU AI Act assessment engine
- Pulse 18 (artifact-signer) — signing infrastructure for evidence packages

## Test Gates

- [ ] L0 unit (4 tests): observation period 6-month validation (1), RFC 8785 canonical JSON (1), evidence format versioning (1), line-ending normalization (1)
- [ ] L1 integration (4 tests): fleet compliance matrix generation (1), ungoverned workspace exclusion (1), cross-framework dedup (1), streaming export >10K entries (1)
- [ ] L2 e2e (2 tests): full comply pipeline with all scenario additions on fixture workspace (1), fleet compliance report (1)
- [ ] L3 accept (2 tests): SDK acceptance — compliance matrix API with 3-framework aggregation and dedup (1), CLI acceptance — fleet compliance matrix command end-to-end (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
