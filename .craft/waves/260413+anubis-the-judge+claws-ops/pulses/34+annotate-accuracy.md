---
pulse: 34
slug: annotate-accuracy
plan: claws-annotate
depends_on: [31]
governing_roles: [claws:skill-author, claws:compliance]
scenario_codes: [emit-artifacts/S04, cross-file-conflicts/S03, obo-elicitation/S08]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 2
  L2_e2e: 2
  L3_accept: 1
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 34: Annotate Accuracy

## Objective

Harden the annotation engine with a 20-skill test corpus, accuracy bounds, YAML edge case handling, and remediation injection. The test corpus contains skills with known-correct governance metadata across all five risk levels, enabling measurable accuracy validation. The engine must achieve >=85% accuracy within 1 R-level on the corpus, with OBO false-negative rate <3% and false-positive rate <15%.

YAML edge cases from P-229 (None/null disambiguation) are handled explicitly: YAML `None` is normalized to the correct governance value rather than being interpreted as a null literal. Closest-value Levenshtein matching catches near-miss typos in governance enum values. Remediation messages inject actionable "Or run: claws annotate" hints into error output.

## Deliverables

- [ ] `claws-sdk/src/annotate/accuracy.ts` — Accuracy bound constants (>=85% within 1 R-level, OBO FN<3%, FP<15%) and test corpus runner
- [ ] `claws-sdk/src/annotate/corpus/` — 20-skill test corpus with known-correct governance metadata: 5 R1 skills (read-only), 5 R2 skills (write), 4 R3 skills (create), 3 R4 skills (delete/modify), 3 R5 skills (transact/impersonate)
- [ ] `claws-sdk/src/annotate/yaml-edge.ts` — YAML None/null disambiguation (P-229), case normalization, closest-value Levenshtein matching
- [ ] `claws-sdk/src/annotate/remediation.ts` — Inject "Or run: claws annotate" into error messages, versioned doc URLs

**Note:** Verify directory paths (e.g., `claws-sdk/src/annotate/`) match authoritative plan before implementation.

## Acceptance Criteria

- [ ] Test corpus contains exactly 20 skills across 5 risk levels (5+5+4+3+3)
- [ ] Annotation accuracy on corpus is >=85% within 1 R-level
- [ ] OBO false-negative rate on corpus is <3%
- [ ] OBO false-positive rate on corpus is <15%
- [ ] YAML `None` is correctly disambiguated (not treated as null)
- [ ] YAML case variations ("r1", "R1", "risk-1") are normalized to canonical form
- [ ] Near-miss typos ("R6", "risk_high") produce closest-value suggestions via Levenshtein
- [ ] Error messages include "Or run: claws annotate" remediation hint
- [ ] Remediation doc URLs include claws version number

## Test Gates

- L0 (8 tests): accuracy on corpus >=85% within 1 R-level, OBO FN rate <3%, OBO FP rate <15%, YAML None/null disambiguation, YAML case normalization, closest-value Levenshtein matching for near-miss, remediation injection in error output, versioned doc URL format
- L1 (2 tests): annotate full 20-skill corpus end-to-end and validate all accuracy bounds, remediation messages appear in claws check error output
- L2 (2 tests): annotate corpus skills → scaffold from annotations → claws check verifies annotations match check expectations, YAML edge case round-trip: create skills with None/null/case-variant/near-miss governance values → annotate → verify normalization → verify Levenshtein suggestions → verify remediation messages in error output
- L3 (1 test): Annotation accuracy acceptance: run full 20-skill corpus through annotate engine → validate >=85% within 1 R-level → validate OBO FN<3% and FP<15% → verify YAML None/null disambiguation (P-229) → verify case normalization → verify near-miss Levenshtein suggestions → verify remediation doc URLs include version → verify `claws annotate --dry-run` matches live annotations
