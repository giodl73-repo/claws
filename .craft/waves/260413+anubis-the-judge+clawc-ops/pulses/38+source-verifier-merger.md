---
pulse: 38
slug: source-verifier-merger
plan: claws-llm-extraction
depends_on: [37]
governing_roles: [claws:compliance, craft:architect]
scenario_codes: []
stage: implementation
test_tiers:
  L0_unit: 10
  L1_integration: 2
  L2_e2e: 0
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && vitest run tests/compile/llm/"
  typecheck:
    - "cd claws-sdk && tsc --noEmit"
checkpoint: 5
checkpoint_gate: false
---

# Pulse 38: Source Verifier + Intent Merger

## Objective

Source verifier checks that LLM-reported sourceText actually exists at sourceLine in the original file — hallucinated line numbers get confidence 0 and are dropped. Intent merger combines regex + LLM intents with the raise-only security invariant: LLM can only increase risk classification, never decrease below regex baseline.

## Deliverables

- [ ] `claws-sdk/src/compile/llm/verifier.ts` — For each LLM intent, verify sourceText appears at sourceLine. Mismatch → confidence 0 + audit trail entry recording the drop (ciso finding). Fuzzy match (substring) → confidence halved + audit warning.
- [ ] `claws-sdk/src/compile/llm/merger.ts` — Merge regex + LLM intents. Priority: explicit annotation > LLM > regex. Security invariant: LLM risk level = max(LLM, regex). Each merged intent tagged with extractionMethod ("regex", "llm", "llm+regex").
- [ ] Tests: 10 L0 (verifier: exact match, fuzzy match, total miss, wrong line, empty source; merger: raise-only, explicit wins, llm fills gap, extractionMethod tag, confidence threshold) + 2 L1 (full pipeline with mock LLM against reference workspace)

## Key Constraints

- SECURITY INVARIANT: merged risk = max(llm_risk, regex_risk). Never lower.
- Verifier runs before merger — unverified intents are dropped, not merged
- extractionMethod field propagates to GovernanceIR for compliance auditing (CO2)
