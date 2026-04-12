---
slug: claws-scaffold
preset: "claws"
plan: "2 headlines: claws new skill derives scaffold risk from workspace trust tier, scaffold produces pinch-clean output at target tier"
area: claws
status: Draft
phase: anubis
atoms: [atom:tier-adoption, atom:claws-compiler, atom:skill-kit, atom:governance-badge]
specs: [CL-05]
---

# claws-scaffold — Skill Scaffolding with Trust Tier Awareness

## Headlines

1. **H1: `claws new skill` derives scaffold risk level from workspace trust tier and produces pinch-clean output** — The scaffold command reads the workspace's trust tier from claws.json (T1-T4) and sets the maximum allowed risk level in generated governance frontmatter. A T2 workspace (R3-max) scaffolds skills at R3 by default, never R5. The `--tier` flag selects the adoption tier (DECLARED, TYPED, or VERIFIED default TYPED). `--tier declared` produces a minimal 3-line YAML frontmatter scaffold. All generated frontmatter satisfies `claws pinch` on first run with zero manual edits -- no placeholder "TODO" values, no empty strings. The skill name drives OBO auto-suggestion: names containing "send", "email", "purchase", or "schedule" get a commented OBO hint.
   - Validation: `claws new skill mailer` in a T2 workspace produces frontmatter with `risk: R3` (not R5), and `claws pinch` passes immediately
   - Validation: `claws new skill helper --tier declared` produces SKILL.md with 3 governance YAML lines and no handler decorators
   - Validation: `claws new skill purchase-handler` includes a comment suggesting `obo: purchase` in the generated frontmatter
   - Validation: Scaffold in a T4 workspace defaults to the workspace maximum risk, not a hardcoded value

2. **H2: Scaffold dependency management ensures @bic/claws-skill-kit is available and version-aligned** — When the scaffold generates handler.ts importing from `@bic/claws-skill-kit`, the package must be installed or the first build fails. `claws new skill` checks for `@bic/claws-skill-kit` in the workspace's node_modules; if absent, it either auto-installs (when `--install` is passed or interactive mode prompts) or emits a clear instruction: `Run: npm install @bic/claws-skill-kit@^{version}`. The `@bic/claws-skill-kit` version in the generated package.json uses the same major version as the running claws binary, preventing version mismatch. The scaffold includes `.gitignore` with `.claws/` to prevent generated files from polluting version control.
   - Validation: Scaffold in a workspace without @bic/claws-skill-kit emits an install instruction with the correct version range
   - Validation: Generated package.json references `@bic/claws-skill-kit@^2.0.0` when claws binary is v2.x
   - Validation: Generated .gitignore includes `.claws/` entry
   - Validation: Skill name in handler.ts `skill()` factory matches the directory name

## Summary

The scaffold plan extracts the skill creation pipeline from claws-maker-commands and focuses specifically on the trust-tier-aware scaffolding logic. The core insight from skill-lifecycle scenario S01 is that scaffold defaults must be workspace-aware: a skill scaffolded in a T2 workspace with R5 risk fails on first pinch, breaking the first-run experience. This plan ensures scaffold output is always immediately valid within the workspace governance envelope. It also handles dependency bootstrapping (S01-F02), tier selection (S01-F03), version alignment (S01-F04), and OBO hinting (S01-F08).

## Coverage Contract

### Specs
- [ ] CL-05 -- Maker Experience: scaffold risk derivation from workspace trust tier, dependency management, tier flag, pinch-clean output

### Concept Guides
- [ ] docs/claws/maker/skill-scaffold.md (EDIT) -- add trust tier derivation, dependency install, OBO suggestion sections

### Scenario Coverage
- [ ] scaffold/trust-tier-t2-cap -- scaffold in T2 workspace caps risk at R3
- [ ] scaffold/trust-tier-t4-cap -- scaffold in T4 workspace caps risk at R4 max
- [ ] scaffold/tier-flag-declared -- --tier declared produces minimal frontmatter
- [ ] scaffold/tier-flag-typed -- --tier typed produces decorators + frontmatter
- [ ] scaffold/dependency-missing -- @bic/claws-skill-kit not installed, instruction emitted
- [ ] scaffold/dependency-present -- @bic/claws-skill-kit found, no install instruction
- [ ] scaffold/version-alignment -- generated package.json matches claws major version
- [ ] scaffold/obo-hint-email -- skill name "send-email" triggers obo: email suggestion
- [ ] scaffold/obo-hint-purchase -- skill name "purchase-handler" triggers obo: purchase suggestion
- [ ] scaffold/obo-hint-none -- skill name "data-parser" triggers no OBO suggestion
- [ ] scaffold/gitignore -- generated .gitignore includes .claws/
- [ ] scaffold/name-consistency -- skill() factory name matches directory name
- [ ] scaffold/pinch-clean -- scaffolded skill passes claws pinch immediately
- [ ] scaffold/prompt-only-declared -- prompt-only skill scaffolded at DECLARED (no TYPED, per S02-F01)

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 14 | Trust tier cap logic (3), tier flag handling (3), OBO hinting (3), version alignment (2), gitignore generation (1), name consistency (2) |
| L1 integration | 5 | Full scaffold + pinch validation, scaffold + dependency check, scaffold + build, tier flag + scaffold output |
| L2 e2e | 2 | Full `claws new skill` in T2 workspace + immediate pinch, scaffold at DECLARED + publish |
| L3 acceptance | 0 | CLI acceptance deferred to claws-cli plan |

## Scope

### SDK Logic (claws-sdk)
- `claws-sdk/src/maker/scaffold.ts` (EDIT) -- add trust tier reading from claws.json, risk cap logic, --tier flag handling
- `claws-sdk/src/maker/scaffold-defaults.ts` (NEW) -- workspace trust tier -> max risk mapping, OBO hinting from skill name
- `claws-sdk/src/maker/dependency-check.ts` (NEW) -- check @bic/claws-skill-kit in node_modules, version alignment logic
- `claws-sdk/src/maker/templates/` (EDIT) -- ensure all templates respect trust tier cap, include .gitignore

## Deliverables

### Specs & Design
- [ ] CL-05 amendment -- scaffold trust tier derivation, --tier flag, dependency management, OBO hinting documented

### SDK Logic (claws-sdk)
- [ ] claws-sdk/src/maker/scaffold.ts -- trust tier reading + risk cap + tier flag dispatch
- [ ] claws-sdk/src/maker/scaffold-defaults.ts -- workspace tier -> max risk mapping, OBO keyword heuristics
- [ ] claws-sdk/src/maker/dependency-check.ts -- @bic/claws-skill-kit presence + version alignment check
- [ ] claws-sdk/tests/maker/scaffold-defaults.unit.test.ts -- trust tier cap, OBO hinting, version alignment
- [ ] claws-sdk/tests/maker/dependency-check.unit.test.ts -- missing/present dependency, version mismatch
- [ ] claws-sdk/tests/maker/scaffold-tier-flag.unit.test.ts -- declared/typed/verified tier flag output
- [ ] claws-sdk/tests/maker/scaffold-trust-tier.integration.test.ts -- full scaffold in T2/T4 workspace fixture
- [ ] claws-sdk/tests/fixtures/t2-workspace/ (NEW) -- claws.json with trust tier T2
- [ ] claws-sdk/tests/fixtures/t4-workspace/ (NEW) -- claws.json with trust tier T4

### CLI Wiring
- None in this plan (scaffold is SDK only -- CLI `claws new skill` comes in claws-cli plan)

### Scenario-Driven Additions

**From skill-lifecycle S01 (scaffold-new-skill):**
- [ ] Trust tier derivation: scaffold reads workspace trust tier from claws.json, defaults risk to max allowed (S01-F01, P-225)
- [ ] Dependency bootstrapping: check @bic/claws-skill-kit presence, emit install instruction or auto-install (S01-F02)
- [ ] Tier flag: `--tier declared` for minimal scaffold, `--tier typed` for full decorators (S01-F03)
- [ ] Version alignment: generated package.json uses same major version as running claws binary (S01-F04)
- [ ] .gitignore in scaffold template with `.claws/` entry (S01-F05)
- [ ] Skill name vs directory name consistency check in scaffold output (S01-F06)
- [ ] OBO auto-suggestion from skill name keyword heuristics: "send"->email, "purchase"->purchase (S01-F08)
- [ ] Scaffold must produce pinch-clean output: all 3 required fields with valid values, no placeholders (S01-F10)

**From skill-lifecycle S02 (three-tier-upgrade-path):**
- [ ] Prompt-only skill tier ceiling: prompt-only skills scaffold at DECLARED or VERIFIED, skip TYPED (S02-F01)
- [ ] Enterprise tier-per-risk enforcement: fleet policy requiring minimum tier per risk level (S02-F03)

## Out of Scope

- Full scaffold file generation engine (that's claws-maker-commands -- this plan focuses on trust tier awareness and dependency management)
- @bic/claws-skill-kit package (that's claws-skill-kit plan)
- Template registry and template customization (that's claws-maker-commands plan)
- CLI argument parsing for `claws new skill` (that's claws-cli-foundation plan)
- SKILL.md compilation pipeline (that's claws-parse/claws-emit plans)

## Notes

- This plan is extracted from claws-maker-commands to isolate the trust-tier-aware scaffolding logic identified in scenario S01
- The trust tier -> max risk mapping: T1=R1, T2=R3, T3=R4, T4=R5 (derived from CL-02 trust tier definitions)
- OBO hinting is conservative: it suggests via comment, never auto-fills -- the developer must explicitly set OBO values
- Depends on claws-maker-commands (scaffold.ts base), claws-skill-kit (the package being installed)
- The scaffold-defaults module is pure (no I/O) -- testable with L0 unit tests
- P-225 is the driving pitfall: scaffold defaults to R5 in T2 workspace -> immediate G-CLASS violation on first pinch
