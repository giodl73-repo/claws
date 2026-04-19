---
slug: claws-skill-kit
preset: "claws"
plan: "2 headlines: npm install @bic/skill-kit works with zero claws CLI dependency, Tier 2 TYPED adoption takes <15 minutes"
area: claws
status: Implemented
phase: ptah
atoms: [atom:skill-kit, atom:tier-adoption]
specs: [CL-05, CL-06]
---

# claws-skill-kit — @bic/skill-kit Package

## Headlines

1. **H1: `npm install @bic/skill-kit && npm test` works with zero claws CLI dependency** — The @bic/skill-kit package is a standalone npm library (~35KB) that skill authors install to build governance-aware OC skills. It provides a `skill()` factory function that creates a typed skill handler, 6 governance decorators (@obo, @audit, @classify, @validate, @budget, @timeout) that annotate handlers with governance metadata, a `MockGateway` for unit testing without the OC runtime, and a governance annotation schema (Zod-based) for SKILL.md frontmatter validation. The package has ZERO dependencies on claws-cli, claws-base-cli, or the compilation pipeline. It imports types only from claws-sdk (GovernanceIR, FailMode, RiskLevel) via `import type`. Decorators are metadata -- they annotate functions for the compiler to read at build time, they do not execute at runtime.
   - Validation: `npm install @bic/skill-kit` in a clean project installs the package with zero transitive claws dependencies
   - Validation: A skill using `skill()` + `@obo('email')` + `@classify('R3')` type-checks with `tsc --noEmit` against OC skill types
   - Validation: `MockGateway` simulates `before_tool_call` events without the OC runtime, returning typed governance responses

2. **H2: Tier 2 TYPED adoption takes <15 minutes for an existing ungoverned skill** — An existing OC skill with a SKILL.md and handler.ts can adopt Tier 2 TYPED governance by: (1) `npm install @bic/skill-kit`, (2) wrap the handler export with `skill()` factory, (3) add decorators (@classify, @obo, @audit as needed), (4) add governance frontmatter to SKILL.md (3 lines). The decorators provide TypeScript completion for risk levels, OBO types, and data labels. The migration path is incremental -- each decorator is optional, and `skill()` works with zero decorators (producing a Tier 1 DECLARED skill when frontmatter is present). The skill continues to work as a normal OC skill without the claws compiler installed.
   - Validation: An ungoverned handler wrapped with `skill()` + `@classify('R3')` passes `tsc --noEmit` with no other changes
   - Validation: The decorated skill runs as a normal OC skill (no behavioral change) without claws installed
   - Validation: `claws pinch` on the Tier 2 skill detects the decorators and validates against the governance frontmatter

## Summary

The @bic/skill-kit package is the skill author's entry point to the claws ecosystem. It provides the typed primitives (factory, decorators, mock, schema) that make governance metadata a first-class part of skill development. The package works standalone -- no compiler, no CLI, no build step required. Decorators are compile-time metadata, not runtime behavior. The skill() factory and MockGateway enable test-driven governance development. This is the bridge between "ungoverned OC skill" and "fully compiled claws skill" -- it makes Tier 2 TYPED adoption a 15-minute task.

## Coverage Contract

### Specs
- [ ] CL-05 -- @bic/skill-kit: skill() factory, 6 decorators, MockGateway, SKILL.md compilation pipeline entry
- [ ] CL-06 -- Single-tier @bic/* standalone library (bic-internal), size budget ~35KB, zero compiler dependency

### Concept Guides
- [ ] docs/claws/skill-kit/getting-started.md -- NEW: install, wrap, decorate, test in 15 minutes
- [ ] docs/claws/skill-kit/decorators.md -- NEW: all 6 decorators with usage examples
- [ ] docs/claws/skill-kit/mock-gateway.md -- NEW: unit testing skills with MockGateway

### Scenario Coverage
- [ ] skill-kit/install-clean-project -- zero transitive claws dependencies
- [ ] skill-kit/skill-factory-basic -- skill() with handler returns typed skill object
- [ ] skill-kit/decorator-obo -- @obo('email') annotates handler with OBO metadata
- [ ] skill-kit/decorator-classify -- @classify('R3') annotates handler with risk level
- [ ] skill-kit/decorator-audit -- @audit() marks handler for audit trail inclusion
- [ ] skill-kit/decorator-validate -- @validate(schema) marks handler for input validation
- [ ] skill-kit/decorator-budget -- @budget(1000) marks handler with token budget limit
- [ ] skill-kit/decorator-timeout -- @timeout(300) marks handler with execution timeout
- [ ] skill-kit/mock-gateway-event -- MockGateway fires before_tool_call with governance response
- [ ] skill-kit/annotation-schema-valid -- Zod schema accepts valid governance frontmatter
- [ ] skill-kit/annotation-schema-invalid -- Zod schema rejects invalid frontmatter with useful errors
- [ ] skill-kit/tier2-migration -- existing skill adopts Tier 2 in <15 minutes
- [ ] skill-kit/no-behavioral-change -- decorated skill runs identically without claws installed

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 20 | skill() factory (3), decorators (6 x 2: application + metadata read-back), MockGateway (4), annotation schema (4) |
| L1 integration | 4 | Decorated skill + MockGateway scenario, annotation validation + pinch integration, tsc type-check on decorated skill |
| L2 e2e | 2 | Full Tier 2 migration on fixture skill, standalone npm install verification |
| L3 acceptance | 0 | Deferred to claws-cli plan |

## Scope

- `claws-skill-kit/` (NEW package) -- New monorepo workspace
- `claws-skill-kit/src/factory/skill.ts` (NEW) -- skill() factory: creates typed SkillHandler with governance metadata slots
- `claws-skill-kit/src/decorators/obo.ts` (NEW) -- @obo(type) decorator: annotates OBO boundary (email/message/calendar/social/purchase/transact)
- `claws-skill-kit/src/decorators/audit.ts` (NEW) -- @audit() decorator: marks handler for audit chain inclusion
- `claws-skill-kit/src/decorators/classify.ts` (NEW) -- @classify(level) decorator: annotates risk level (R1-R5)
- `claws-skill-kit/src/decorators/validate.ts` (NEW) -- @validate(schema) decorator: marks handler for input validation with schema
- `claws-skill-kit/src/decorators/budget.ts` (NEW) -- @budget(tokens) decorator: annotates token budget limit
- `claws-skill-kit/src/decorators/timeout.ts` (NEW) -- @timeout(seconds) decorator: annotates execution timeout
- `claws-skill-kit/src/decorators/index.ts` (NEW) -- Barrel exports for all decorators
- `claws-skill-kit/src/mock/mock-gateway.ts` (NEW) -- MockGateway: simulates OC Gateway hook lifecycle for unit tests
- `claws-skill-kit/src/mock/mock-tools.ts` (NEW) -- MockTools: simulated tool call/response for testing
- `claws-skill-kit/src/mock/mock-approval.ts` (NEW) -- MockApproval: simulated elicitation gate responses
- `claws-skill-kit/src/schema/annotation.ts` (NEW) -- Governance annotation Zod schema: frontmatter validation
- `claws-skill-kit/src/schema/types.ts` (NEW) -- GovernanceAnnotation, SkillMetadata, DecoratorMetadata types
- `claws-skill-kit/src/index.ts` (NEW) -- Package barrel exports
- `claws-skill-kit/package.json` (NEW) -- @bic/skill-kit, peer dep on claws-sdk types only
- `claws-skill-kit/tsconfig.json` (NEW) -- Extends monorepo base, paths exclude forbidden packages
- `claws-skill-kit/vitest.config.ts` (NEW) -- Unit/integration/e2e projects

## Deliverables

### Specs & Design
- [ ] CL-05 amendment -- skill-kit API surface finalized: skill(), 6 decorators, MockGateway
- [ ] CL-06 amendment -- @bic/skill-kit package.json, size budget, dependency boundary

### Package Scaffolding
- [ ] claws-skill-kit/package.json -- name, version, dependencies (types-only from claws-sdk), exports
- [ ] claws-skill-kit/tsconfig.json -- extends monorepo base, forbidden import paths enforced
- [ ] claws-skill-kit/vitest.config.ts -- unit/integration/e2e projects
- [ ] Root package.json workspaces UPDATE -- add "claws-skill-kit"

### SDK Logic (claws-skill-kit)
- [ ] claws-skill-kit/src/factory/skill.ts -- skill() factory with typed return
- [ ] claws-skill-kit/src/decorators/obo.ts -- @obo decorator
- [ ] claws-skill-kit/src/decorators/audit.ts -- @audit decorator
- [ ] claws-skill-kit/src/decorators/classify.ts -- @classify decorator
- [ ] claws-skill-kit/src/decorators/validate.ts -- @validate decorator
- [ ] claws-skill-kit/src/decorators/budget.ts -- @budget decorator
- [ ] claws-skill-kit/src/decorators/timeout.ts -- @timeout decorator
- [ ] claws-skill-kit/src/decorators/index.ts -- barrel exports
- [ ] claws-skill-kit/src/mock/mock-gateway.ts -- MockGateway with configurable hook responses
- [ ] claws-skill-kit/src/mock/mock-tools.ts -- MockTools for simulated tool calls
- [ ] claws-skill-kit/src/mock/mock-approval.ts -- MockApproval for elicitation gate simulation
- [ ] claws-skill-kit/src/schema/annotation.ts -- Zod schema for governance frontmatter
- [ ] claws-skill-kit/src/schema/types.ts -- type definitions
- [ ] claws-skill-kit/src/index.ts -- package barrel
- [ ] claws-skill-kit/tests/factory/skill.unit.test.ts -- skill() creation, metadata slots, handler wrapping
- [ ] claws-skill-kit/tests/decorators/obo.unit.test.ts -- application, metadata readback, type validation
- [ ] claws-skill-kit/tests/decorators/classify.unit.test.ts -- R1-R5 levels, invalid level rejection
- [ ] claws-skill-kit/tests/decorators/audit.unit.test.ts -- audit flag set
- [ ] claws-skill-kit/tests/decorators/validate.unit.test.ts -- schema attachment
- [ ] claws-skill-kit/tests/decorators/budget.unit.test.ts -- token limit annotation
- [ ] claws-skill-kit/tests/decorators/timeout.unit.test.ts -- timeout annotation
- [ ] claws-skill-kit/tests/mock/mock-gateway.unit.test.ts -- event simulation, response types
- [ ] claws-skill-kit/tests/mock/mock-approval.unit.test.ts -- approve, deny, timeout scenarios
- [ ] claws-skill-kit/tests/schema/annotation.unit.test.ts -- valid/invalid frontmatter, error messages
- [ ] claws-skill-kit/tests/integration/tier2-migration.integration.test.ts -- full Tier 2 adoption on fixture skill
- [ ] claws-skill-kit/tests/integration/tsc-type-check.integration.test.ts -- decorated skill passes tsc --noEmit

### CLI Wiring
- None (this is a library package -- no CLI commands)

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Scenario-Driven Additions

**From skill-lifecycle S01 (scaffold-new-skill):**
- [ ] Scaffold handler.ts imports @bic/skill-kit -- dependency must be available or install instructed (S01-F02)
- [ ] skill() factory name parameter must match skill directory name; build warns on mismatch (S01-F06)

**From skill-lifecycle S02 (three-tier-upgrade-path):**
- [ ] Frontmatter-to-decorator value propagation: `claws import` uses frontmatter values as source of truth for decorator arguments (S02-F02)
- [ ] Prompt-only skill tier ceiling: prompt-only skills cannot be TYPED (no code to decorate), skip to DECLARED or VERIFIED (S02-F01)
- [ ] Tier detection from workspace state: skill() + decorators present = TYPED, frontmatter only = DECLARED, signed manifest = VERIFIED (S02-F05)
- [ ] Governance-aware test generation from frontmatter: @bic/test derives test scenarios from declared risk, OBO, and data labels (S02-F04)

**From skill-lifecycle S03 (governance-badge-assignment):**
- [ ] Self-reported qualifier at DECLARED tier: skill-kit decorators absent means governance claims are unverified (S03-F02, P-226)
- [ ] Inconsistent metadata detection: R1 risk + transact OBO is contradictory, skill-kit schema should warn (S03-F06)

**From skill-lifecycle S04 (invalid-governance-frontmatter):**
- [ ] Annotation schema closest-value suggestion: Zod schema error messages suggest nearest valid enum value (S04-F01)
- [ ] Collect-all-errors: Zod schema validates all fields and reports all errors simultaneously (S04-F02)
- [ ] YAML None/null disambiguation: annotation schema accepts string "None" as "none", not null (S04-F04, P-229)
- [ ] Semantic context in validation errors: risk level R6 error explains R1=READ through R5=TRANSACT (S04-F03)

## Out of Scope

- claws compiler pipeline (skill-kit is consumed BY the compiler, not part of it)
- @bic/test package (that's claws-test-framework plan -- separate testing library)
- claws-cli maker commands (that's claws-maker-commands plan -- CLI uses skill-kit for scaffolding)
- Runtime decorator execution (decorators are metadata ONLY -- runtime enforcement is via generated Gateway plugin)
- Tier 3 VERIFIED features (full `claws build` integration -- requires the compiler pipeline)
- ClawHub publishing integration (that's claws-maker-commands plan)

## Notes

- @bic/skill-kit imports ONLY types from claws-sdk -- enforced by ESLint consistent-type-imports + no-restricted-imports
- Decorators use TypeScript decorator metadata (Stage 3 decorators) -- compatible with OC's TypeScript version
- MockGateway simulates the OC Gateway `api.on()` event model -- uses the same event types but in-memory
- The skill() factory returns a standard OC skill shape -- a decorated skill IS a normal OC skill
- Size budget: ~35KB (per CL-06). Zod is the only non-trivial dependency; tree-shakeable.
- Package follows ARCHITECTURE.md dependency rules: claws-skill-kit -> claws-sdk (types only). DOES NOT IMPORT: craftworks-sdk, shared-cli, any CLI package
- Depends on claws-governance-ir (types only: GovernanceIR, FailMode, RiskLevel for decorator type parameters)
- **Phase 1 — ships with Ptah wave.** The skill-kit has ZERO dependency on the compilation pipeline — it imports types only from claws-sdk. Decorators are metadata ONLY and the package works standalone — no compiler, no CLI, no build step required. Moving to Phase 1 addresses the critical community review finding (C-01): the skill author's adoption funnel starts with `npm install @bic/skill-kit`, and it should be available as soon as GovernanceIR types exist.
