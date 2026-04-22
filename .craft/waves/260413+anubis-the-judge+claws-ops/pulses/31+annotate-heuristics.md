---
pulse: 31
slug: annotate-heuristics
plan: claws-annotate
depends_on: []
governing_roles: [claws:skill-author, craft:architect]
scenario_codes: [obo-elicitation/S01, obo-elicitation/S02, obo-elicitation/S03, obo-elicitation/S04, obo-elicitation/S05, obo-elicitation/S06, obo-elicitation/S08, injection-defense/S01, injection-defense/S05]
stage: implementation
test_tiers:
  L0_unit: 8
  L1_integration: 2
  L2_e2e: 1
  L3_accept: 0
test_scope:
  run:
    - "cd claws-sdk && npx vitest run"
  typecheck:
    - "cd claws-sdk && npx tsc --noEmit"
checkpoint: 4
checkpoint_gate: false
---

# Pulse 31: Annotate Heuristics

## Objective

Implement the heuristic-based annotation engine for `claws annotate`. This engine infers governance metadata (risk level, OBO boundary, data classification) from skill source code using keyword-anchored pattern matching. It provides a zero-config onboarding path where skill authors get reasonable governance annotations without manual specification.

The heuristic system uses three pattern families: tool name patterns (e.g., "send"/"delete" imply R4-R5), import patterns (e.g., "fs.write"/"exec" imply R3-R5), and API signature patterns (known SDK method names mapped to risk classifications). Each match produces a confidence score (0.0-1.0) based on pattern strength.

## Deliverables

- [ ] `claws-sdk/src/annotate/heuristics.ts` — Keyword-anchored pattern matching for risk/OBO/data inference: tool name patterns ("send"/"email"/"purchase"/"delete" to R4-R5, "search"/"read"/"get" to R1-R2), import patterns ("fs.write"/"exec"/"spawn" to R3-R5, "fetch"/"http.get" to R2), API signature patterns (known SDK method names to risk classification)
- [ ] `claws-sdk/src/annotate/confidence.ts` — Confidence scoring (0.0-1.0) based on pattern match strength
- [ ] `claws-sdk/src/annotate/obo-detect.ts` — OBO detection from tool names/descriptions ("as user", "on behalf", "impersonate")
- [ ] `claws-cli/src/commands/annotate.ts` — `claws annotate [skill-dir] [--dry-run]`

**Note:** Verify directory paths (e.g., `claws-sdk/src/annotate/`) match authoritative plan before implementation.

## Acceptance Criteria

- [ ] Tool name "send-email" is classified as R4+ risk
- [ ] Tool name "search-docs" is classified as R1-R2 risk
- [ ] Import of "child_process.exec" is classified as R3+ risk
- [ ] Import of "fetch" is classified as R2 risk
- [ ] OBO patterns ("as user", "on behalf") are detected in tool descriptions
- [ ] Each annotation includes a confidence score between 0.0 and 1.0
- [ ] `--dry-run` outputs proposed annotations without modifying files
- [ ] Without `--dry-run`, annotations are written to skill frontmatter

## Test Gates

- L0 (8 tests): risk heuristic for R1 (read-only tools), R2 (fetch/http), R3 (fs.write), R4 (delete/send), R5 (purchase/transact), OBO detection on "as user" pattern, confidence scoring produces 0.0-1.0 range, dry-run output matches expected format
- L1 (2 tests): annotate on reference workspace skills produces expected classifications, verify suggested annotations match known-correct metadata
- L2 (1 test): `claws annotate` on reference workspace → verify risk classifications match expected R-levels for each tool type → verify OBO boundaries detected on "send"/"email" tools → verify `--dry-run` produces output without modifying files then re-run without flag and verify files updated
