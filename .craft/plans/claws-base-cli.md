---
slug: claws-base-cli
preset: "claws"
plan: "3 headlines: SARIF output accepted by GitHub Code Scanning, error messages include fix instructions, risk-level color palette"
area: claws
status: Draft
phase: anubis
atoms: [atom:error-contract]
specs: [CL-01, CL-05]
---

# claws-base-cli -- Output Package

## Headlines

1. **H1: SARIF output from `claws pinch --format sarif` is accepted by GitHub Code Scanning** -- The SARIF 2.1.0 formatter produces a valid `staticAnalysis.results` array where each governance violation maps to a SARIF `result` with `ruleId` (G-CLASS, G-ELICIT, ...), `level` (error/warning/note mapped from severity), `message.text` with the WHAT+HOW+WHERE error contract, and `locations[0].physicalLocation` with file URI and line number. The output passes the GitHub Code Scanning SARIF validation endpoint.
   - Validation: `claws pinch --format sarif` output parses as valid SARIF 2.1.0 JSON against the OASIS schema
   - Validation: Upload to GitHub Code Scanning API returns 202 Accepted (no schema errors)
   - Validation: Each violation in GovAnalysis maps to exactly one SARIF result with ruleId, level, and location

2. **H2: Every error message includes WHAT is wrong, HOW to fix it, and WHERE to learn more** -- The error contract (`terminal/errors.ts`) enforces the three-part pattern on every diagnostic rendered to the terminal. `formatViolation()` takes a `Violation` from GovAnalysis and produces a formatted block with the rule ID, description, PASS/FAIL status, severity badge, source file:line, fix instruction, and docs URL. Errors missing any of the three parts fail an assertion in test.
   - Validation: `formatViolation()` on a G-CLASS violation produces output containing file:line, "Fix:" line, and "Docs:" URL
   - Validation: Unit test that constructs a Violation without a `remediation` field causes `formatViolation()` to throw
   - Validation: `--json` output includes `what`, `fix`, and `docsUrl` fields in every violation object

3. **H3: Risk-level colors map R1=green through R5=red with NO_COLOR support** -- `color.ts` maps the 5 governance risk levels to terminal colors: R1=green, R2=cyan, R3=yellow, R4=magenta, R5=red. Severity badges follow the same palette: PASS=green, FAIL(low)=dim, FAIL(medium)=yellow, FAIL(high/critical)=red. Colors are suppressed when `NO_COLOR` env var is set, `--no-color` flag is passed, or stdout is not a TTY. Colors are pure functions with zero dependency on chalk or any color library -- uses ANSI escape codes directly.
   - Validation: `riskColor(5)` returns the ANSI escape sequence for red
   - Validation: With `NO_COLOR=1`, `riskColor(5)` returns an empty string (no escape codes)
   - Validation: `severityBadge('critical')` returns red-colored `[CRITICAL]` text

## Summary

claws-base-cli is the output foundation for the claws CLI product line -- equivalent to shared-cli but for claws branding and governance-specific formatting. Phase 1 inlined minimal output formatting directly in claws-cli; this plan extracts and completes that output layer as a standalone package. It provides SARIF/JSON/CSV/default formatters, the WHAT+HOW+WHERE error contract, risk-level color palette, progress bar for fleet operations, spinner for compilation, and the claws banner. ~2,000 lines total. No TUI, no Ink rendering. The package imports from claws-sdk for types only (enforced by ESLint `consistent-type-imports`).

## Coverage Contract

### Specs
- [ ] CL-01 -- `claws pinch` output format, SARIF/JSON/CSV output modes, color coding, severity badges
- [ ] CL-05 -- Error message contract (WHAT + HOW + WHERE), progressive disclosure terminal output

### Concept Guides
- [ ] docs/claws/cli/output-formats.md -- NEW: SARIF, JSON, CSV, default output modes
- [ ] docs/claws/cli/error-contract.md -- NEW: three-part error message pattern with examples

### Scenario Coverage
- [ ] output/sarif-valid -- SARIF 2.1.0 schema validation on pinch output
- [ ] output/sarif-github-upload -- simulated GitHub Code Scanning upload acceptance
- [ ] output/json-violation-fields -- JSON output contains what/fix/docsUrl fields
- [ ] output/csv-fleet-report -- CSV output for fleet compliance reports
- [ ] output/error-three-part -- every violation has WHAT+HOW+WHERE
- [ ] output/color-risk-palette -- R1-R5 color mapping verified
- [ ] output/no-color-env -- NO_COLOR suppresses escape codes
- [ ] output/progress-fleet -- progress bar renders for 47-workspace fleet scan

### Test Tier Targets
| Tier | Target | Rationale |
|------|--------|-----------|
| L0 unit | 25 | Formatters (4x5), color functions (5), error contract (3), table renderer (3), progress bar (2), banner (2) |
| L1 integration | 5 | Full GovAnalysis -> formatted output pipeline per format mode |
| L2 e2e | 2 | End-to-end render of multi-violation GovAnalysis in default + SARIF |
| L3 acceptance | 0 | CLI acceptance comes in claws-cli plan |

## Scope

- `claws-base-cli/package.json` (NEW) -- `@craftworks/claws-base-cli`, type-only dependency on `@bic/claws-sdk`
- `claws-base-cli/tsconfig.json` (NEW) -- extends monorepo base, strict mode
- `claws-base-cli/vitest.config.ts` (NEW) -- unit/integration/e2e projects
- `claws-base-cli/.eslintrc.cjs` (NEW) -- `no-restricted-imports` blocks shared-cli, craftworks-sdk; `consistent-type-imports` enforces type-only from claws-sdk
- `claws-base-cli/src/output/format-sarif.ts` (NEW) -- SARIF 2.1.0 formatter (duplicates pattern from shared-cli/src/output/format-sarif.ts, adapted for GovAnalysis)
- `claws-base-cli/src/output/format-json.ts` (NEW) -- JSON output mode with what/fix/docsUrl fields
- `claws-base-cli/src/output/format-csv.ts` (NEW) -- CSV output for fleet reports
- `claws-base-cli/src/output/format-default.ts` (NEW) -- Human-readable terminal output, claws-specific formatting
- `claws-base-cli/src/output/color.ts` (NEW) -- Risk-level coloring (R1=green -> R5=red), NO_COLOR support, ANSI direct
- `claws-base-cli/src/output/table.ts` (NEW) -- Table renderer (duplicates shared-cli/src/output/table.ts pattern)
- `claws-base-cli/src/output/render.ts` (NEW) -- Output dispatcher: routes --format flag to correct formatter
- `claws-base-cli/src/terminal/progress.ts` (NEW) -- Progress bar for fleet operations (duplicates shared-cli/src/output/progress.ts pattern)
- `claws-base-cli/src/terminal/spinner.ts` (NEW) -- Spinner for compilation feedback
- `claws-base-cli/src/terminal/banner.ts` (NEW) -- claws branding banner (not craft branding)
- `claws-base-cli/src/terminal/errors.ts` (NEW) -- Error message contract: WHAT + HOW + WHERE, formatViolation()
- `claws-base-cli/src/core/logger.ts` (NEW) -- Structured logging (duplicates shared-cli/src/core/logger.ts pattern)
- `claws-base-cli/src/core/config-loader.ts` (NEW) -- claws.json loading + Zod validation (delegates to claws-sdk ClawsConfig type)
- `claws-base-cli/src/core/platform-detect.ts` (NEW) -- Auto-detect OC workspace from marker files
- `claws-base-cli/src/core/bypass.ts` (NEW) -- CLAWS_BYPASS=1 detection and warning
- `claws-base-cli/src/types/index.ts` (NEW) -- Re-exports
- `claws-base-cli/src/index.ts` (NEW) -- Barrel export
- Root `package.json` (EDIT) -- add `claws-base-cli` to workspaces array

## Deliverables

### Package Configuration
- [ ] claws-base-cli/package.json -- name, version, type-only dependency on claws-sdk, build scripts
- [ ] claws-base-cli/tsconfig.json -- strict, paths restricted
- [ ] claws-base-cli/vitest.config.ts -- 3-project setup (unit, integration, e2e)
- [ ] claws-base-cli/.eslintrc.cjs -- forbidden imports (shared-cli, craftworks-sdk) + type-only enforcement
- [ ] Root package.json -- workspaces array includes claws-base-cli

### SDK Logic (claws-base-cli)
- [ ] claws-base-cli/src/output/format-sarif.ts -- SARIF 2.1.0 with ruleId, level, locations, message
- [ ] claws-base-cli/src/output/format-json.ts -- JSON with what/fix/docsUrl per violation
- [ ] claws-base-cli/src/output/format-csv.ts -- CSV columns: ruleId, severity, file, line, message
- [ ] claws-base-cli/src/output/format-default.ts -- Human-readable terminal with check/cross marks
- [ ] claws-base-cli/src/output/color.ts -- riskColor(), severityBadge(), NO_COLOR/--no-color/TTY detection
- [ ] claws-base-cli/src/output/table.ts -- generic table renderer for inspect/report commands
- [ ] claws-base-cli/src/output/render.ts -- renderOutput(analysis, format) dispatcher
- [ ] claws-base-cli/src/terminal/progress.ts -- progress bar with workspace count and ETA
- [ ] claws-base-cli/src/terminal/spinner.ts -- compilation spinner with elapsed time
- [ ] claws-base-cli/src/terminal/banner.ts -- claws banner with version, workspace status
- [ ] claws-base-cli/src/terminal/errors.ts -- formatViolation(), assertThreePart(), error rendering
- [ ] claws-base-cli/src/core/logger.ts -- structured log with level, timestamp, context
- [ ] claws-base-cli/src/core/config-loader.ts -- loadClawsConfig() with Zod validation
- [ ] claws-base-cli/src/core/platform-detect.ts -- detectPlatform() from workspace marker files
- [ ] claws-base-cli/src/core/bypass.ts -- isBypassed(), emitBypassWarning()
- [ ] claws-base-cli/tests/output/format-sarif.unit.test.ts -- SARIF schema validation, ruleId mapping
- [ ] claws-base-cli/tests/output/format-json.unit.test.ts -- JSON field presence, what/fix/docsUrl
- [ ] claws-base-cli/tests/output/format-csv.unit.test.ts -- CSV column ordering, escaping
- [ ] claws-base-cli/tests/output/format-default.unit.test.ts -- terminal formatting, severity coloring
- [ ] claws-base-cli/tests/output/color.unit.test.ts -- R1-R5 palette, NO_COLOR, TTY detection
- [ ] claws-base-cli/tests/terminal/errors.unit.test.ts -- three-part contract, missing field assertion
- [ ] claws-base-cli/tests/terminal/progress.unit.test.ts -- progress bar rendering
- [ ] claws-base-cli/tests/terminal/banner.unit.test.ts -- banner content, version
- [ ] claws-base-cli/tests/output/render.integration.test.ts -- GovAnalysis -> all 4 formats

### CLI Wiring
- [ ] claws-cli (EDIT) -- replace Phase 1 inlined output modules with imports from claws-base-cli
- [ ] claws-cli (EDIT) -- delete inlined format-json.ts, format-sarif.ts, color.ts from claws-cli/src/

### Scenario Findings (added during wave)
*(empty -- populated during implementation)*

## Out of Scope

- Business logic (lives in claws-sdk, not here)
- TUI / Ink rendering (claws v1 has no TUI -- terminal output only)
- Wallboard or dashboard (claws v1 uses terminal + SARIF, not UI)
- shared-cli modification (claws-base-cli is a sibling, not a fork)
- Common `cli-foundation` extraction (deferred to Phase 3 per ARCHITECTURE.md M-02 -- only if divergence < 20%)

## Notes

- Duplicates 6 modules from shared-cli per ARCHITECTURE.md M-02 duplication trade-off: format-json, format-sarif, format-csv, table, progress, logger
- Rewrites 4 modules for claws-specific needs: format-default (governance formatting), color (R1-R5 risk palette), errors (WHAT+HOW+WHERE), banner (claws branding)
- SARIF formatter follows OASIS SARIF 2.1.0 specification -- same schema used by ESLint, Semgrep, Snyk, Trivy
- Color implementation uses raw ANSI codes, zero npm color dependencies -- keeps package small
- Phase 3 re-evaluation: if >80% of the 6 duplicated modules remain identical with shared-cli, extract a common cli-foundation package
- Depends on claws-cli-foundation (Phase 1) existing so we can replace inlined output modules
