---
slug: claws-annotate
preset: "claws"
plan: "2 headlines: claws annotate infers governance metadata with documented accuracy bounds, false-positive/negative targets drive adoption trust"
area: claws
status: Closed
phase: anubis
atoms: [atom:tier-adoption, atom:claws-compiler, atom:skill-kit]
specs: [CL-05]
---

# claws-annotate — Annotation Heuristics with Accuracy Bounds

## Headlines

1. **H1: `claws annotate` infers governance metadata from capability analysis with documented accuracy bounds** — The annotate command reads an existing SKILL.md and handler.ts, analyzes tool usage patterns, API call signatures, and data flow indicators, then suggests governance frontmatter (risk level, OBO type, data sensitivity). Each suggestion includes a confidence score. Accuracy bounds are documented and testable: risk level suggestions target >=85% accuracy (correct within 1 R-level), OBO type suggestions target >=90% precision (false-positive OBO claims are worse than false-negatives). The heuristics are keyword-anchored (tool names, import patterns, API signatures) -- not LLM-based. Suggestions below the confidence threshold include an explanation of why the heuristic was uncertain.
   - Validation: Handler with `send-email` tool usage produces `risk: R5, obo: email` suggestion with confidence >= 0.85
   - Validation: Handler with only `read-file` tool usage produces `risk: R1, obo: none` suggestion with confidence >= 0.90
   - Validation: Handler with ambiguous tool names produces lower confidence and explains uncertainty
   - Validation: Across a test corpus of 20 fixture skills, risk suggestions are correct within 1 R-level >=85% of the time

2. **H2: False-positive and false-negative targets drive enterprise adoption trust** — False-positive R5 suggestions (annotate says R5, actual risk is R2) create unnecessary governance burden and slow adoption. False-negative R1 suggestions (annotate says R1, actual risk is R4) create security gaps. The annotate command targets asymmetric error bounds: false-negative rate < 5% (security-critical -- must not under-classify risk), false-positive rate < 15% (adoption-friendly -- over-classification is annoying but safe). OBO false-negatives (claiming no OBO when OBO exists) are especially dangerous at DECLARED tier (P-226) because there is no compiler verification. The annotate error message contract suggests `claws annotate` as the remediation path when frontmatter is invalid (S04-F09), connecting the error path to the automated fix path.
   - Validation: False-negative rate for R4/R5 risk across test corpus is < 5%
   - Validation: False-positive rate for R4/R5 risk across test corpus is < 15%
   - Validation: OBO false-negative rate (missed OBO when present) across test corpus is < 3%
   - Validation: Error messages for invalid frontmatter suggest `claws annotate` as remediation

## Summary

The annotate plan covers the `claws annotate` command's governance inference heuristics, accuracy bounds, and error message integration. The core insight from skill-lifecycle scenario S02-F08 is that annotation heuristics must be documented and testable with explicit accuracy targets -- "suggest R3" is not enough; we need "suggest R3 with 87% confidence, correct within 1 R-level 90% of the time across the test corpus." The plan also addresses YAML edge cases (S04-F04, P-229: None parsed as null), closest-value suggestions for enum errors (S04-F01), collect-all-errors for frontmatter validation (S04-F02), and the annotate command as the recommended remediation path in error messages (S04-F09).

## Coverage Contract

### Specs
- [ ] CL-05 -- claws annotate: heuristic accuracy requirements, false-positive/negative bounds, confidence scoring

### Concept Guides
- [ ] docs/claws/maker/annotation-heuristics.md (NEW) -- accuracy bounds, confidence scoring, keyword patterns, test corpus methodology
- [ ] docs/claws/maker/error-messages.md (EDIT) -- add annotate as remediation path, closest-value suggestion, URL stability

### Scenario Coverage
- [ ] annotate/risk-r5-email -- handler with email API -> R5 suggestion
- [ ] annotate/risk-r1-readonly -- handler with read-only tools -> R1 suggestion
- [ ] annotate/obo-email-detected -- send-email tool -> obo: email suggestion
- [ ] annotate/obo-none-correct -- no OBO indicators -> obo: none suggestion
- [ ] annotate/ambiguous-tools -- mixed tool patterns -> lower confidence with explanation
- [ ] annotate/confidence-threshold -- suggestions above/below threshold handled differently
- [ ] annotate/false-positive-r5 -- R5 suggestion on R2 skill detected by test corpus
- [ ] annotate/false-negative-r1 -- R1 suggestion on R4 skill detected by test corpus
- [ ] annotate/yaml-none-null -- `obo: None` parsed as string "none" not YAML null
- [ ] annotate/closest-value-suggestion -- `obo: email-send` suggests "email"
- [ ] annotate/collect-all-errors -- both risk and obo errors reported simultaneously
- [ ] annotate/as-remediation -- error message includes "Or run: claws annotate"
- [ ] annotate/url-stability -- documentation URLs are versioned or use permanent redirects

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 18 | Risk heuristics (5), OBO detection patterns (4), confidence scoring (3), YAML edge cases (2), closest-value matching (2), error formatting (2) |
| L1 integration | 6 | Full annotate pipeline on fixture skills, collect-all-errors validation, annotate + pinch integration |
| L2 e2e | 3 | Annotate on 3 fixture workspaces (email skill, read-only skill, mixed skill), accuracy corpus test |
| L3 acceptance | 0 | CLI acceptance deferred to claws-cli plan |

## Scope

### SDK Logic (claws-sdk)
- `claws-sdk/src/maker/annotate.ts` (EDIT) -- add confidence scoring, accuracy-bounded heuristics, YAML edge case handling
- `claws-sdk/src/maker/annotate-heuristics.ts` (NEW) -- keyword-anchored risk inference, OBO detection, data label suggestion with confidence
- `claws-sdk/src/maker/annotate-accuracy.ts` (NEW) -- accuracy bounds constants, test corpus runner, false-positive/negative tracking
- `claws-sdk/src/maker/annotate-yaml.ts` (NEW) -- YAML frontmatter edge cases: None/null disambiguation, case normalization, closest-value matching
- `claws-sdk/src/maker/annotate-remediation.ts` (NEW) -- error message integration: annotate as remediation path, URL stability

## Deliverables

### Specs & Design
- [ ] CL-05 amendment -- annotate heuristic accuracy requirements, false-positive/negative bounds, confidence scoring documented

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/maker/annotate.ts -- confidence-scored annotation pipeline with accuracy bounds
- [ ] claws-sdk/src/maker/annotate-heuristics.ts -- keyword patterns: tool names, import patterns, API signatures -> risk/OBO/data
- [ ] claws-sdk/src/maker/annotate-accuracy.ts -- accuracy bound constants (risk >=85%, OBO FN <3%, FP <15%), test corpus methodology
- [ ] claws-sdk/src/maker/annotate-yaml.ts -- YAML None/null fix (P-229), case normalization, closest-value Levenshtein matching
- [ ] claws-sdk/src/maker/annotate-remediation.ts -- error message "Or run: claws annotate" injection, versioned doc URLs
- [ ] claws-sdk/tests/maker/annotate-heuristics.unit.test.ts -- keyword patterns, risk inference, OBO detection, confidence scoring
- [ ] claws-sdk/tests/maker/annotate-accuracy.unit.test.ts -- accuracy bounds against test corpus, false-positive/negative rates
- [ ] claws-sdk/tests/maker/annotate-yaml.unit.test.ts -- None/null, case normalization, closest-value matching
- [ ] claws-sdk/tests/maker/annotate-remediation.unit.test.ts -- error message format, URL structure
- [ ] claws-sdk/tests/maker/annotate-pipeline.integration.test.ts -- full annotate on fixture skills
- [ ] claws-sdk/tests/maker/annotate-corpus.integration.test.ts -- accuracy bounds across 20-skill test corpus
- [ ] claws-sdk/tests/fixtures/email-skill/ (NEW) -- skill with email API patterns for annotation testing
- [ ] claws-sdk/tests/fixtures/readonly-skill/ (NEW) -- skill with read-only tools for annotation testing
- [ ] claws-sdk/tests/fixtures/mixed-risk-skill/ (NEW) -- skill with ambiguous tool patterns
- [ ] claws-sdk/tests/fixtures/annotation-corpus/ (NEW) -- 20 fixture skills with known governance metadata for accuracy testing

### CLI Wiring
- None in this plan (annotate is SDK only -- CLI `claws annotate` comes in claws-cli plan)

### Scenario-Driven Additions

**From skill-lifecycle S02 (three-tier-upgrade-path):**
- [ ] Heuristic accuracy requirements: risk >=85% within 1 R-level, documented and testable (S02-F08)
- [ ] False-positive R5 (says R5, actual R2) creates unnecessary governance burden (S02-F08)
- [ ] False-negative R1 (says R1, actual R4) creates security gaps (S02-F08)

**From skill-lifecycle S04 (invalid-governance-frontmatter):**
- [ ] Closest-value suggestion for enum validation errors: "email-send" -> suggest "email" (S04-F01)
- [ ] Collect-all-errors for frontmatter validation: report all errors simultaneously (S04-F02)
- [ ] YAML None/null ambiguity: `obo: None` parsed as string "none" not null (S04-F04, P-229)
- [ ] URL stability and versioning policy for error message documentation links (S04-F05)
- [ ] Annotate command as remediation path in error messages: "Or run: claws annotate" (S04-F09)

**From skill-lifecycle S03 (governance-badge-assignment):**
- [ ] OBO false-negative danger at DECLARED tier: badge shows "obo: none" but handler calls email APIs (P-226 context)

## Out of Scope

- LLM-assisted annotation (future -- heuristics are keyword-anchored only in this plan)
- @bic/skill-kit package (that's claws-skill-kit plan)
- Scaffold template generation (that's claws-scaffold plan)
- ClawHub badge generation (that's claws-badge plan)
- Legacy skill import pipeline (that's claws-maker-commands plan)
- Full SKILL.md compilation (that's claws-parse/claws-emit plans)

## Notes

- P-229 is a key pitfall: YAML `obo: None` (capitalized) parsed as null breaks validation with a cryptic error
- P-226 context: unverified OBO at DECLARED tier makes annotation accuracy especially important for OBO detection
- The test corpus methodology requires maintaining 20+ fixture skills with known-correct governance metadata
- Accuracy targets are asymmetric by design: under-classification (false-negative) is worse than over-classification (false-positive)
- The heuristic patterns are shared with the G-CLASS rules in claws-rules -- same OBO detection, different context (annotate suggests, rules enforce)
- Closest-value matching uses Levenshtein distance with a threshold of 2 edits for enum values
- Depends on claws-maker-commands (annotate.ts base), claws-rules (shared heuristic patterns)
