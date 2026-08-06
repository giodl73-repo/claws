---
pulse: 16
slug: compliance-hipaa
plan: claws-comply-audit
depends_on: [15]
governing_roles: [claws:founder, claws:ciso]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 5
  L1_integration: 1
  L2_e2e: 1
  L3_accept: 2
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 2
checkpoint_gate: false
---

# Pulse 16: Compliance HIPAA

## Objective

HIPAA Security Rule evidence builder. Map safeguards to 164.312 subsections. PHI detection via pii_types cross-reference against HIPAA 18-identifier list. Per-pii-type label coverage check. 164.312(e)(1) tool-to-external transmission gap detection.

The HIPAA evidence builder maps five technical safeguards from the Security Rule to claws governance analysis: 164.312(a)(1) Access Control, 164.312(b) Audit Controls, 164.312(c)(1) Integrity, 164.312(d) Person or Entity Authentication, and 164.312(e)(1) Transmission Security. PHI detection operates by cross-referencing the pii_types declared in tool governance rules against the HIPAA 18-identifier list (names, dates, SSN, medical records, etc.). Per-pii-type label coverage checks ensure every declared PHI type has corresponding governance labels. The transmission gap detector identifies tools that send data externally without 164.312(e)(1) encryption/integrity safeguards.

## Deliverables

- [ ] `claws-sdk/src/compliance/hipaa.ts` — HIPAA evidence builder: 5 safeguard mappings, PHI detection, per-pii-type coverage, transmission gap detection
- [ ] `claws-sdk/tests/compliance/hipaa.unit.test.ts` — L0: safeguard mapping (3), PHI detection (1), transmission gap (1)
- [ ] `claws-sdk/tests/compliance/comply-hipaa.integration.test.ts` — L1: full HIPAA pipeline on fixture workspace
- [ ] `claws-sdk/tests/compliance/comply-hipaa.e2e.test.ts` — L2: complete comply hipaa on PHI workspace fixture
- [ ] `claws-sdk/tests/fixtures/hipaa/` — HIPAA workspace with PHI data labels
- [ ] `claws-sdk/tests/compliance/comply-hipaa.accept.test.ts` — L3: SDK acceptance — HIPAA evidence builder API validates safeguard mappings and PHI coverage from consumer perspective
- [ ] `claws-cli/tests/compliance/comply-hipaa.accept.test.ts` — L3: CLI acceptance — `claws comply hipaa` command produces correct evidence output with PHI detection results

## Acceptance Criteria

- [ ] All 5 safeguards (164.312(a)(1) through 164.312(e)(1)) mapped to governance rule categories
- [ ] PHI detection cross-references pii_types against HIPAA 18-identifier list
- [ ] Per-pii-type label coverage: every declared PHI type has corresponding governance labels
- [ ] Missing label coverage produces a finding with the specific pii_type and expected label
- [ ] Transmission gap detection identifies tools sending data externally without encryption safeguards
- [ ] 164.312(e)(1) gap produces a high-severity finding with tool name and destination
- [ ] HIPAAEvidence JSON includes safeguard statuses, PHI coverage matrix, and transmission gaps
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0

## Governing Roles

Load these role files before starting:

- `.craft/roles/claws/founder.md` — product vision for HIPAA compliance, PHI scope decisions
- `.craft/roles/claws/ciso.md` — HIPAA Security Rule requirements, 164.312 subsection mappings, PHI identifier list

## Dependencies

- Pulse 15 (compliance-soc2) — provides shared compliance types (ComplianceFinding, AsymmetricSignature) and barrel exports

## Test Gates

- [ ] L0 unit (5 tests): 164.312(a)(1) access control mapping (1), 164.312(b) audit controls mapping (1), 164.312(c)(1) integrity mapping (1), PHI detection cross-references 18-identifier list (1), transmission gap detection for unencrypted external tools (1)
- [ ] L1 integration (1 test): full HIPAA pipeline on fixture workspace (1)
- [ ] L2 e2e (1 test): complete comply hipaa on PHI workspace fixture (1)
- [ ] L3 accept (2 tests): SDK acceptance — HIPAA evidence API with safeguard mappings and PHI coverage (1), CLI acceptance — `claws comply hipaa` command end-to-end (1)
- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0
