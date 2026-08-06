---
reviewer: claws:platform-eng
round: 1
checkpoint: 1
wave: "260413+anubis-the-judge+claws-ops"
date: "2026-04-12"
verdict: conditional-pass
findings: 12
major: 3
warning: 5
note: 4
---

# R1 — claws:platform-eng Review of CP-1 Plan

**Lens**: Fleet consistency, cross-platform reliability, npm packaging, CI/CD readiness.
**Scope**: wave.yaml + cp-1.md + Pulses 01-09.

## Verdict: CONDITIONAL PASS

The CP-1 plan is well-structured with a clear dependency graph and achievable test gates. The batch decomposition makes sense and the parallelization boundaries are correct. However, there are three major issues around cross-platform path handling, SARIF schema validation rigor, and fixture location ambiguity that need resolution before implementation begins.

---

## Findings

### M-01: SARIF formatter has no cross-platform path normalization (Pulse 03)

**Severity**: Major
**Pulse**: 03 (base-cli-formatters)

SARIF 2.1.0 `physicalLocation.artifactLocation.uri` fields must use forward-slash URI paths, not OS-native paths. On Windows, `path.resolve()` produces backslash paths like `C:\src\workspace\SOUL.md`. If these are emitted directly into SARIF, every CI tool that consumes the output (GitHub Code Scanning, Azure DevOps, SonarQube) will fail to resolve the locations.

Pulse 03 does not mention path normalization. The deliverables list a SARIF formatter and schema validation tests, but schema validation alone will not catch this -- backslash paths are valid JSON strings, they just break URI resolution.

**Recommendation**: Add an explicit deliverable to Pulse 03: a `toSarifUri(absolutePath, workspaceRoot)` utility that converts OS paths to workspace-relative POSIX URIs. Test it with Windows-style backslash inputs. The L1 schema validation test should also assert that no `uri` field contains a backslash.

---

### M-02: Reference workspace fixture location is ambiguous (Pulse 01)

**Severity**: Major
**Pulse**: 01 (reference-workspace)

Pulse 01 places the reference workspace at `fixtures/oc-reference-workspace/` with no package prefix. There is no `fixtures/` directory at the repo root. Meanwhile, the test scope says `cd claws-sdk && npx vitest run`, and Pulses 07-09 (e2e tests in claws-sdk) reference the fixture.

But Pulses 03-06 (in claws-cli) also need this fixture for formatter tests and config loading tests. If the fixture lives in `claws-sdk/tests/fixtures/oc-reference-workspace/`, the claws-cli tests either need a cross-package reference (fragile, breaks `npm pack` isolation) or a symlink (breaks on Windows without developer mode).

The existing pattern shows `claws-sdk/tests/fixtures/` already has 10+ fixture directories and `claws-cli/tests/fixtures/` has `oc-workspace/`. This needs a clear decision.

**Recommendation**: Place the fixture in `claws-sdk/tests/fixtures/oc-reference-workspace/` (consistent with existing claws-sdk fixtures). For claws-cli formatter tests, use minimal inline fixture data (violation objects, not full workspace trees). Document this decision in the pulse plan so agents don't invent ad-hoc locations.

---

### M-03: Config loader belongs in claws-sdk, not claws-cli (Pulse 06)

**Severity**: Major
**Pulse**: 06 (base-cli-config)

Pulse 06 places the config loader at `claws-cli/src/config/loader.ts`. This is a domain decision module: it parses `claws.json`, validates against a schema, supplies defaults, and determines trust tier. Per the SDK architecture rule in CLAUDE.md ("All business logic, domain decisions, orchestration, and state transitions live in the SDK packages"), config loading is SDK business logic.

The existing codebase already follows this pattern -- platform detection logic lives in `claws-sdk/src/detect/` and the CLI wrapper at `claws-cli/src/core/platform-detect.ts` is a thin adapter. The config loader should follow the same split: schema + validation + defaults in `claws-sdk`, thin `loadConfig(cwd)` call from CLI.

The bypass detection module in the same pulse also makes fleet policy decisions (allow/deny bypass based on fleet policy). Fleet policy is definitionally SDK logic.

**Recommendation**: Split Pulse 06 deliverables. Move `loader.ts`, `types.ts` (Zod schema), and `bypass.ts` to `claws-sdk/src/config/`. Keep `claws-cli/src/config/` as a thin wrapper that calls the SDK and handles CLI-specific concerns (reading `--config` flag override, reporting DiagnosticErrors to the terminal).

---

### W-01: FORCE_COLOR not mentioned anywhere (Pulse 04)

**Severity**: Warning
**Pulse**: 04 (base-cli-error-contract)

Pulse 04 mentions `NO_COLOR` and `FORCE_COLOR` support, which is good. But the existing `color.ts` at `claws-cli/src/output/color.ts` already handles `NO_COLOR` and does NOT handle `FORCE_COLOR`. The pulse plans to create `claws-cli/src/color/index.ts` -- a new file at a different path from the existing `claws-cli/src/output/color.ts`.

This will create two color modules. Pulse 03 (formatters) depends on Pulse 04 (color system), but the existing formatters (`format-default.ts`, `format-json.ts`) already import from `./color.js`.

**Recommendation**: Pulse 04 should explicitly state: "Migrate `claws-cli/src/output/color.ts` to `claws-cli/src/color/index.ts` and add FORCE_COLOR support." Do not create a parallel module. Also add TTY detection (`process.stdout.isTTY`) as a third color enablement signal alongside NO_COLOR and FORCE_COLOR.

---

### W-02: Existing code at proposed deliverable paths (Pulses 03, 04, 06)

**Severity**: Warning
**Pulses**: 03, 04, 06

The pulse plans describe deliverables as if they are net-new files, but several already exist:

- `claws-cli/src/output/color.ts` (Pulse 04 creates `claws-cli/src/color/`)
- `claws-cli/src/output/errors.ts` (Pulse 04 creates `claws-cli/src/errors/`)
- `claws-cli/src/output/format-default.ts` (Pulse 03 creates `claws-cli/src/format/`)
- `claws-cli/src/output/format-json.ts` (Pulse 03 creates `claws-cli/src/format/`)
- `claws-cli/src/core/platform-detect.ts` (Pulse 06 creates `claws-cli/src/config/platform.ts`)

If agents treat these as "create new file" tasks, they will either duplicate code or miss migrating imports from the old locations. Stale files at old paths will cause tsc errors or dead code.

**Recommendation**: Each affected pulse should include an explicit migration step: "Move `output/color.ts` to `color/index.ts`, update all imports, delete the old file." Pulse agents must be briefed that these are refactor+extend tasks, not greenfield.

---

### W-03: CSV formatter lacks BOM and CRLF specification (Pulse 03)

**Severity**: Warning
**Pulse**: 03 (base-cli-formatters)

The CSV formatter is described as "one row per violation: file, line, severity, ruleId, message." For fleet-scale reporting, CSV will be consumed by Excel, Power BI, and fleet dashboards. Two common cross-platform pitfalls:

1. **BOM**: Excel on Windows requires a UTF-8 BOM (`\xEF\xBB\xBF`) prefix to correctly display Unicode characters. Without it, non-ASCII characters in violation messages render as mojibake.
2. **CRLF**: The CSV RFC (RFC 4180) specifies CRLF line endings, but Node.js `\n` produces LF only. Some CSV parsers (particularly Windows-native ones) choke on mixed line endings when the file is concatenated with other fleet reports.

Neither is mentioned in the pulse plan.

**Recommendation**: Add to Pulse 03 acceptance criteria: "CSV output uses CRLF line endings per RFC 4180. When `--bom` flag is passed, output includes UTF-8 BOM prefix for Excel compatibility." At minimum, document the line ending choice.

---

### W-04: E2E tests write to temp dirs but no cleanup strategy (Pulses 07-09)

**Severity**: Warning
**Pulses**: 07, 08, 09

Pulse 09 explicitly says "Copy reference workspace to temp dir." Pulses 07 and 08 will also produce compiled artifacts somewhere. On Windows, temp directory cleanup is notoriously unreliable -- `os.tmpdir()` returns a deeply nested path under `AppData\Local\Temp`, and file handles left open by the gateway simulator or compile pipeline will prevent deletion with EBUSY errors.

None of the e2e pulse plans mention cleanup strategy. On fleet CI machines, accumulated temp artifacts from repeated test runs can exhaust disk space.

**Recommendation**: Add to all e2e pulse plans: "Use vitest `afterEach` / `afterAll` hooks to clean up temp directories. Use `fs.rm(dir, { recursive: true, force: true, maxRetries: 3 })` with retries to handle Windows EBUSY. Consider using vitest's `tmpdir` fixture if available."

---

### W-05: Test gate counts are low for a foundation checkpoint (CP-1)

**Severity**: Warning
**Scope**: CP-1 overall

The exit criteria specify "L0: 25+ unit tests passing, L1: 5+ integration, L2: 3 e2e loops." Adding up the per-pulse test tier counts:

| Tier | Sum                   | Gate |
| ---- | --------------------- | ---- |
| L0   | 3+8+8+6+4+5 = 34      | 25+  |
| L1   | 0+2+2+0+0+2 = 6       | 5+   |
| L2   | 0+0+0+0+0+0+1+1+1 = 3 | 3    |
| L3   | 0+0+0+0+0+0+0+0+1 = 1 | n/a  |

The numbers add up, but the L0 margin is thin (34 planned vs 25 gate). If any pulse agent writes fewer tests than planned, the gate still passes. More importantly, the formatter tests (8 tests for 4 formatters, 2 each) are extremely thin -- a SARIF formatter that handles tool metadata, rule index, and file locations needs more than 2 unit tests. The config loader gets 5 L0 tests for schema validation, defaults, platform detect, and bypass -- also thin for a module that needs to handle malformed JSON, permission errors, missing files, and encoding issues.

**Recommendation**: Raise the L0 gate to 40+ and add edge-case tests to Pulse 03 (SARIF: empty violations array, violations with missing fields, very long messages) and Pulse 06 (config: malformed JSON, EPERM on read, BOM in claws.json, path with spaces).

---

### N-01: Gateway simulator `eval` loading is a security surface (Pulse 02)

**Severity**: Note
**Pulse**: 02 (gateway-simulator)

GatewaySim loads generated `index.ts` via "import or eval." Using `eval` on generated code in tests is acceptable, but if this loading mechanism is shared with production code, it becomes a code injection surface. The pulse should clarify that GatewaySim is test-only infrastructure and the generated plugin loading uses `import()` (dynamic import), not `eval()`.

**Recommendation**: Explicitly state in Pulse 02 that GatewaySim uses `import()` for plugin loading, not `eval()`. Add a comment in the deliverable description.

---

### N-02: Risk color mapping inconsistency between Pulse 03 and Pulse 04 (Pulses 03, 04)

**Severity**: Note
**Pulses**: 03, 04

Pulse 04 specifies risk tier colors: R1=green, R2=cyan, R3=yellow, R4=red, R5=bright-red. Pulse 03 specifies severity colors for the default formatter: CRITICAL=bright-red, HIGH=red, MEDIUM=yellow, LOW=dim. The existing `color.ts` maps level 5 (critical) and level 4 (high) both to `palette.fail` (red), and level 3 (medium) to yellow.

The plan introduces two parallel color mappings -- risk tiers (R1-R5) and severity levels (CRITICAL/HIGH/MEDIUM/LOW). These are related but distinct (a tool's risk tier determines its governance weight; a violation's severity is the check output). The plan does not clarify whether the formatters use risk-tier colors or severity colors when rendering violations.

**Recommendation**: Add a note to Pulse 04 clarifying: "Risk tier colors are used in `claws build` output (showing tool governance weight). Severity colors are used in `claws check` output (showing violation importance). The formatter uses severity colors."

---

### N-03: Pulse 09 depends on `claws init` which is a CP-2 plan (Pulse 09)

**Severity**: Note
**Pulse**: 09 (e2e-init-loop)

Pulse 09 runs the sequence: `claws init` -> `claws check` -> `claws build` -> GatewaySim. But `claws init` is delivered by Pulses 10-11 in CP-2 (init-orchestrator, init-templates). Pulse 09 is the CP-1 gate.

This means Pulse 09 either (a) depends on CP-2 code that does not yet exist, which would make it unbuildable, or (b) uses a stub/mock version of `claws init`. The pulse plan says dependencies are Pulse 07 and 08 -- it does not list Pulse 10 or 11.

If `claws init` needs to be functional for CP-1 to close, it should be pulled forward into CP-1. If Pulse 09 can use a manual init (just copy claws.json and .claws/ into the temp dir), the pulse description should say so explicitly.

**Recommendation**: Clarify in Pulse 09 whether it calls the actual `claws init` command or manually creates the config files. If manual: rename the test to avoid confusion. If it calls the real command: add Pulse 10 as a dependency or pull it into CP-1.

---

### N-04: No mention of `--ci` flag or non-interactive mode (CP-1 overall)

**Severity**: Note
**Scope**: CP-1 overall

For fleet CI/CD pipelines, claws must run non-interactively: no prompts, no spinners writing to stderr, deterministic output, machine-parseable exit codes. The progress bar (Pulse 05) and spinner explicitly mention TTY degradation, but there is no `--ci` flag or `CI` environment variable detection in the plan.

This is a foundation concern -- if `--ci` mode is not designed into the base CLI from the start, it becomes a retrofit that touches every UI component.

**Recommendation**: Add a `--ci` flag (or `CI=true` env detection) to Pulse 06 (config) that sets: `NO_COLOR=1`, disables spinners/progress, enables JSON output by default, and ensures exit codes follow semver-style conventions (0=clean, 1=violations, 2=error). This is a one-line config flag that pays off across every subsequent checkpoint.

---

## Summary

| ID   | Sev     | Pulse    | Issue                                       |
| ---- | ------- | -------- | ------------------------------------------- |
| M-01 | Major   | 03       | SARIF paths not normalized for Windows      |
| M-02 | Major   | 01       | Fixture location ambiguous across packages  |
| M-03 | Major   | 06       | Config loader is SDK logic, not CLI         |
| W-01 | Warning | 04       | FORCE_COLOR missing, dual color module risk |
| W-02 | Warning | 03,04,06 | Existing code at planned deliverable paths  |
| W-03 | Warning | 03       | CSV lacks BOM/CRLF specification            |
| W-04 | Warning | 07-09    | No temp dir cleanup strategy for e2e        |
| W-05 | Warning | all      | L0 test gate too low for foundation         |
| N-01 | Note    | 02       | Gateway sim eval loading clarification      |
| N-02 | Note    | 03,04    | Risk vs severity color mapping unclear      |
| N-03 | Note    | 09       | Depends on claws init from CP-2             |
| N-04 | Note    | all      | No --ci flag in foundation                  |

The three Majors (M-01, M-02, M-03) should be resolved before implementation begins. The Warnings should be addressed in pulse plan amendments. The Notes are advisory for pulse agents.
