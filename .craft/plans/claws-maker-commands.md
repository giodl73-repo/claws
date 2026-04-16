---
slug: claws-maker-commands
preset: "claws"
plan: "2 headlines: claws new skill scaffolds complete governance-aware skill in <2s, claws publish adds governance badge to ClawHub listing"
area: claws
status: Implemented
phase: thoth
atoms: [atom:claws-publish, atom:governance-badge, atom:tier-adoption, atom:claws-compiler]
specs: [CL-05, CL-06]
---

# claws-maker-commands — Skill Creation Workflow

## Headlines

1. **H1: `claws new skill email-drafter --template communication` scaffolds a complete governance-aware skill in <2s** — The maker scaffold reads a template registry (communication, data-processing, browser-automation, developer-tools, custom), generates a SKILL.md with governance frontmatter (risk, OBO, data sensitivity pre-filled from template), a `src/handler.ts` with `@bic/claws-skill-kit` imports and governance decorators, a `package.json` with `@bic/claws-skill-kit` + `@bic/claws-test` as peer dependencies, a `vitest.config.ts` with governance test projects, and a `.claws-manifest` stub. `claws annotate` does the reverse -- it reads an existing SKILL.md and `src/handler.ts`, infers governance metadata from capability analysis (tool usage patterns, OBO indicators, data labels), and suggests frontmatter additions for Tier 1 DECLARED adoption. `claws import skill` migrates an existing OC skill into the claws compilation pipeline by adding governance annotations and generating the `.claws/` directory structure.
   - Validation: `claws new skill test-skill --template communication` creates a directory with SKILL.md (governance frontmatter), handler.ts (decorators), package.json, and vitest.config.ts -- all files pass `tsc --noEmit`
   - Validation: `claws annotate` on an existing SKILL.md without governance frontmatter suggests `risk: R3`, `obo: email`, `data: INTERNAL` based on detected `send-email` capability
   - Validation: `claws import skill ./legacy-skill` produces a `.claws/` directory and governance annotations without modifying original files

2. **H2: `claws publish` adds a governance badge to the ClawHub listing and signs the manifest** — The publish command wraps `clawhub publish` with a governance pre-flight: it runs `claws pinch` on the skill, determines the governance tier (DECLARED/TYPED/VERIFIED), generates a signed `.claws-manifest.json` with build provenance (compiler version, policy hash, risk classification, OBO status), and injects governance metadata into the ClawHub publish payload. The governance badge on ClawHub shows the tier, risk level, OBO status, and supply chain verification. Skills that fail `claws pinch` are blocked from publishing. The badge is additive metadata -- no ClawHub schema changes required.
   - Validation: `claws publish` on a Tier 2 TYPED skill produces a `.claws-manifest.json` with `tier: 'TYPED'`, `risk: 'R3'`, and a valid signature
   - Validation: `claws publish` on a skill that fails `claws pinch` exits with error and does not call `clawhub publish`
   - Validation: The publish payload includes `governance` metadata that ClawHub renders as a badge

## Summary

The maker commands provide the skill creation workflow for claws: scaffold new governance-aware skills (`claws new skill`), annotate existing skills with governance metadata (`claws annotate`), migrate legacy skills (`claws import skill`), and publish with governance badges (`claws publish`). These 4 commands target the skill developer audience and are the primary entry point for Tier 1-3 adoption. The scaffold templates and annotation engine live in claws-sdk `maker/`, reusing compiler-sdk skill compilation infrastructure for template rendering and capability analysis.

## Coverage Contract

### Specs
- [ ] CL-05 -- Maker Experience: 4 commands (new, publish, annotate, import), three-tier adoption (DECLARED/TYPED/VERIFIED)
- [ ] CL-06 -- ClawHub governance badges, skill package compilation, adoption funnel

### Concept Guides
- [ ] docs/claws/maker/scaffold.md -- NEW: template registry, generated file structure, template customization
- [ ] docs/claws/maker/publish.md -- NEW: governance pre-flight, badge generation, manifest signing
- [ ] docs/claws/maker/adoption.md -- NEW: Tier 1-3 migration paths with annotate/import commands

### Scenario Coverage
- [ ] maker/scaffold-communication -- new skill from communication template
- [ ] maker/scaffold-data-processing -- new skill from data-processing template
- [ ] maker/scaffold-custom -- new skill with custom template overrides
- [ ] maker/annotate-existing-skill -- suggest governance frontmatter for ungoverned skill
- [ ] maker/annotate-obo-detection -- detect OBO patterns and suggest correct OBO type
- [ ] maker/import-legacy-skill -- migrate legacy OC skill without modifying originals
- [ ] maker/publish-tier2-success -- publish TYPED skill with governance badge
- [ ] maker/publish-pinch-failure -- block publish on governance violation
- [ ] maker/publish-manifest-signing -- signed manifest with build provenance
- [ ] maker/tier1-declared-3-lines -- 3 YAML lines produce DECLARED badge

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 18 | Template registry (3), scaffold file generation (5), annotate capability analysis (4), publish pre-flight (3), manifest signing (3) |
| L1 integration | 6 | Full scaffold pipeline, annotate on fixture skill, import on fixture skill, publish pipeline mock |
| L2 e2e | 3 | `new skill` + `annotate` + `publish` on fixture skills |
| L3 acceptance | 0 | CLI acceptance deferred to claws-cli plan |

## Scope

- `claws-sdk/src/maker/scaffold.ts` (NEW) -- Skill scaffolding: template selection, file generation (SKILL.md, handler.ts, package.json, vitest.config.ts)
- `claws-sdk/src/maker/templates/` (NEW) -- Template registry: communication, data-processing, browser-automation, developer-tools, custom base
- `claws-sdk/src/maker/annotate.ts` (NEW) -- Governance annotation engine: read existing skill, analyze capabilities, suggest frontmatter
- `claws-sdk/src/maker/import.ts` (NEW) -- Legacy skill migration: add .claws/ structure and governance annotations without modifying originals
- `claws-sdk/src/maker/publish.ts` (NEW) -- Governed publish: pinch pre-flight, tier determination, manifest generation, ClawHub payload injection
- `claws-sdk/src/maker/manifest.ts` (NEW) -- .claws-manifest.json generation: build provenance, policy hash, risk/OBO/tier, signature
- `claws-sdk/src/maker/types.ts` (NEW) -- SkillTemplate, AnnotationSuggestion, PublishPayload, ManifestEntry types
- `claws-sdk/src/maker/index.ts` (NEW) -- Barrel exports

## Deliverables

### Specs & Design
- [ ] CL-05 amendment -- maker command behavior finalized, template registry schema, annotate heuristics documented
- [ ] CL-06 amendment -- governance badge payload schema finalized for ClawHub integration

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/maker/scaffold.ts -- template selection + file generation engine
- [ ] claws-sdk/src/maker/templates/communication.ts -- email/message skill template (R3-R5, OBO email/message)
- [ ] claws-sdk/src/maker/templates/data-processing.ts -- data transformation template (R2-R3, no OBO)
- [ ] claws-sdk/src/maker/templates/browser-automation.ts -- browser control template (R4, OBO social)
- [ ] claws-sdk/src/maker/templates/developer-tools.ts -- dev tooling template (R2-R4, no OBO)
- [ ] claws-sdk/src/maker/templates/base.ts -- custom base template (R1, minimal governance)
- [ ] claws-sdk/src/maker/annotate.ts -- capability analysis: OBO pattern detection, risk inference, data label suggestion
- [ ] claws-sdk/src/maker/import.ts -- legacy migration: .claws/ directory scaffolding, annotation injection
- [ ] claws-sdk/src/maker/publish.ts -- governed publish pipeline: pinch check, tier evaluation, manifest sign, ClawHub API call
- [ ] claws-sdk/src/maker/manifest.ts -- manifest generation with build provenance and signature
- [ ] claws-sdk/src/maker/types.ts -- all maker type definitions
- [ ] claws-sdk/src/maker/index.ts -- barrel exports
- [ ] claws-sdk/tests/maker/scaffold.unit.test.ts -- template selection, file content generation, <2s timing
- [ ] claws-sdk/tests/maker/annotate.unit.test.ts -- OBO detection patterns, risk inference, suggestion formatting
- [ ] claws-sdk/tests/maker/import.unit.test.ts -- .claws/ structure creation, original files untouched
- [ ] claws-sdk/tests/maker/publish.unit.test.ts -- pinch pre-flight pass/fail, tier determination, manifest fields
- [ ] claws-sdk/tests/maker/manifest.unit.test.ts -- provenance fields, signature generation
- [ ] claws-sdk/tests/maker/scaffold.integration.test.ts -- full scaffold + tsc --noEmit on generated output
- [ ] claws-sdk/tests/maker/publish.integration.test.ts -- full publish pipeline with mocked ClawHub API
- [ ] claws-sdk/tests/fixtures/ungoverned-skill/ (NEW) -- existing skill without governance metadata for annotate/import testing
- [ ] claws-sdk/tests/fixtures/tier2-skill/ (NEW) -- TYPED skill with decorators for publish testing

### CLI Wiring
- None in this plan (maker is SDK only -- CLI `claws new skill`/`claws publish`/`claws annotate`/`claws import` come in claws-cli plan)

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Scenario-Driven Additions

**From skill-lifecycle S01 (scaffold-new-skill):**
- [ ] Trust tier derivation: scaffold reads workspace trust tier from claws.json, defaults risk to max allowed (S01-F01, P-225)
- [ ] Dependency bootstrapping: check @bic/claws-skill-kit presence, auto-install or guided install (S01-F02)
- [ ] Scaffold default tier: TYPED by default, `--tier declared` for minimal scaffold (S01-F03)
- [ ] Version alignment: generated package.json uses same major version as running claws binary (S01-F04)
- [ ] .gitignore in scaffold template with `.claws/` entry (S01-F05)
- [ ] Skill name vs directory name consistency check (S01-F06)
- [ ] OBO auto-suggestion from skill name keyword heuristics (S01-F08)
- [ ] Scaffold produces pinch-clean output: all required fields with valid values (S01-F10)

**From skill-lifecycle S02 (three-tier-upgrade-path):**
- [ ] Prompt-only skill tier ceiling: DECLARED or VERIFIED, skip TYPED (S02-F01)
- [ ] Frontmatter-to-decorator value propagation in `claws import` (S02-F02)
- [ ] Enterprise tier-per-risk enforcement via fleet policy (S02-F03)
- [ ] Governance-aware test generation from frontmatter in `claws build --skill` (S02-F04)
- [ ] Tier detection from workspace state, not stored metadata (S02-F05)
- [ ] Signature staleness detection and tier downgrade on handler modification (S02-F06, P-227)

**From skill-lifecycle S03 (governance-badge-assignment):**
- [ ] Visual distinction between DECLARED and VERIFIED badges (S03-F01)
- [ ] Self-reported qualifier for DECLARED-tier OBO claims (S03-F02, P-226)
- [ ] Supply chain badge independent of governance tier (S03-F03)
- [ ] Badge staleness and re-validation policy (S03-F04)
- [ ] Data sensitivity requires higher tier for enterprise trust (S03-F05)
- [ ] Inconsistent governance metadata display: risk-OBO contradictions flagged (S03-F06)
- [ ] claws/clawhub metadata namespace boundary (S03-F08)

**From skill-lifecycle S04 (invalid-governance-frontmatter):**
- [ ] Closest-value suggestion for enum validation errors (S04-F01)
- [ ] Collect-all-errors for frontmatter validation (S04-F02)
- [ ] YAML None/null ambiguity in obo field (S04-F04, P-229)
- [ ] URL stability and versioning policy for error message docs (S04-F05)
- [ ] Annotate command as remediation path in error messages (S04-F09)

**From skill-lifecycle S05 (publish-unsigned-manifest):**
- [ ] Unsigned vs invalid-signed manifest distinction (S05-F01)
- [ ] Fleet-level publish tier requirement (S05-F02)
- [ ] Security warnings not suppressible by --quiet (S05-F03)
- [ ] Manifest signing key source and key management (S05-F04)
- [ ] Publish atomicity with rollback on remote failure (S05-F05, P-228)
- [ ] Badge freshness at publish time from current SKILL.md (S05-F06)
- [ ] Per-version badge storage on ClawHub (S05-F09)

## Out of Scope

- @bic/claws-skill-kit package (that's claws-skill-kit plan -- scaffold generates import stubs, skill-kit provides the runtime)
- @bic/claws-test package (that's claws-test-framework plan -- scaffold generates test config, test package provides the harness)
- ClawHub server-side badge rendering (ClawHub is external -- this plan only generates the metadata payload)
- SKILL.md compilation pipeline (CL-05 PARSE/EXTRACT/ANALYZE/GENERATE/EMIT -- that's the emit plan for skills)
- Cross-compile targets for scaffolded skills (cursor, claude templates -- Phase 3+)
- Fleet-wide skill inventory (`claws scan --skills`) -- fleet operations plan
- Template marketplace / custom template publishing -- Phase 3+

## Notes

- Scaffold templates REUSE compiler-sdk skill compilation patterns for template rendering -- not a template engine, string interpolation
- Annotate capability analysis REUSES the same OBO detection heuristics from G-CLASS rules (claws-rules plan) -- shared as pure functions
- Publish pre-flight calls `pinch()` from claws-rules -- same analysis as `claws pinch`, just programmatic
- Manifest signing REUSES the same artifact-signer from claws-comply-audit -- shared signing infrastructure
- Templates pre-fill governance frontmatter based on skill category (communication = R3+ OBO email, data-processing = R2-R3 no OBO)
- `claws import skill` is ADD-ONLY -- it creates .claws/ directory and adds annotations but NEVER modifies the original SKILL.md or handler.ts
- Depends on claws-emit (for SKILL.md understanding), claws-rules (for pinch pre-flight and annotate heuristics)
