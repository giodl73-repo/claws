# R1 — craft:navigator — CP-1 Implementation Review

**Role**: craft:navigator (user journey coherence)
**Tension**: User journey coherence > implementation simplicity
**Scope**: CLI command flow, first-5-minutes experience, error messages, progress reporting, E2E loop completeness

---

## Findings

### NAV-01 [M] — `claws compile` and `claws build` have duplicate compile pipelines with divergent caching

`compile.ts:51-67` has its own inline cache check (reads `governance-ir.json`, compares `compilerVersion`), while `build.ts:111-119` delegates to the SDK-backed `checkBuildCache()` from `core/cache.ts`. A user running `claws compile` gets one cache behavior (version-match check on the IR file) and running `claws build` gets a completely different one (composite source-file hashing via SDK). This means:

- `claws compile` may report "up-to-date" when source files changed (it only checks compiler version, not content hash)
- `claws build` correctly detects source changes
- A user who learns caching from `build` will be confused when `compile` behaves differently

The compile command should delegate to the same `checkBuildCache`/`storeBuildCache` in `core/cache.ts` that build uses.

**Fix**: Replace the inline `checkCache()` in `compile.ts` with the SDK-backed `checkBuildCache()` from `core/cache.ts`, and call `storeBuildCache()` after writing the IR.

---

### NAV-02 [M] — `--format` flag is registered in the format registry but not wired into any CLI command

`format/index.ts` declares a full formatter registry (SARIF, JSON, CSV, default) with `getFormatter()` and `FORMAT_NAMES`, but no CLI command accepts a `--format` flag. The `check` command uses the `--json` boolean flag instead. The `build` command also uses `--json`. This means:

- SARIF output (a CP-1 exit criterion) is built and tested but unreachable from the command line
- CSV output for fleet reporting is dead code from the user's perspective
- The format registry itself (`format/index.ts`) is orphaned — nothing calls `getFormatter()`

A user wanting SARIF for CI integration or CSV for fleet reports has no way to request either format without writing code.

**Fix**: Add `--format <name>` option to the `check` command (and optionally `compile`/`build`) that routes through `getFormatter()`. Deprecate `--json` in favor of `--format json` or keep `--json` as a shorthand alias.

---

### NAV-03 [M] — `init` does not use the `claws help` diagnostic hint or error code registry

The `init` command writes errors directly with `console.error()` strings (`'claws.json already exists in this directory.'`) instead of using the error contract. The error code registry (`errors/codes.ts`) allocates codes E080-E089 for init errors, and the `DiagnosticError` class (`errors/contract.ts`) provides the WHAT+HOW+WHERE pattern, but `init.ts` uses neither. This breaks the user journey contract: every other command produces structured errors with codes, fix instructions, and doc references. Init is the first command a new user runs — and it is the only one that breaks the diagnostic pattern.

**Fix**: Have `runInit` throw or return `DiagnosticError` instances using the allocated init error codes (CLAWS-E080 for "already initialized", CLAWS-E082 for "template not found", etc.).

---

### NAV-04 [M] — Suppressed violations warn to stderr but show no actionable detail

In all three pipelines (`compile.ts:148`, `check.ts:113`, `build.ts:178`), when rules are suppressed via `claws.json`, the only output is `console.warn('${n} violation(s) suppressed by claws.json')`. This tells the user violations were hidden but not which ones. For an enterprise user reviewing governance posture, this is a black hole — they know something was suppressed but cannot audit what without reading `claws.json` and mentally correlating. The `--verbose` flag does not expand this either.

**Fix**: When `--verbose` is set, list the suppressed rule IDs. In JSON mode, include the suppressed violations as a separate `suppressed` array in the output.

---

### NAV-05 [W] — `init` success message crams too much into one line and buries the next step

`init.ts:115-118` outputs: `Detected: ${platform}. Created claws.json + .claws/. Run \`claws check\` to check governance.` This is 3 distinct pieces of information in one line:
1. What was detected
2. What was created
3. What to do next

On a typical 80-column terminal this wraps awkwardly. More importantly, the "next step" gets lost after the status information. The bare invocation (`cli.ts:131-136`) formats next steps as a multi-line list — init should follow the same pattern.

**Fix**: Split the init success message into separate lines: status, what was created, then a clear "Next:" section matching the bare invocation style.

---

### NAV-06 [W] — Progress bar and spinner exist but are never used by any command

`ui/progress.ts` and `ui/spinner.ts` are fully implemented with TTY detection, NO_COLOR support, and non-TTY fallback. But no command uses them. The `build` command has a manual `reportStage()` function that prints `[1/4] parse...` only when `--verbose` is set. Without `--verbose`, a build on a large workspace produces zero progress feedback until the final summary line.

This is a user experience gap: a `claws build` that takes 2+ seconds gives no intermediate feedback, making it feel frozen. The spinner and progress bar were built for exactly this use case.

**Fix**: Wire the spinner into the build pipeline stages (at minimum: start spinner on build, update per stage, succeed/fail on completion). Use the progress bar for operations with known step counts.

---

### NAV-07 [W] — Banner is never printed during any user-facing workflow

`ui/banner.ts` produces a formatted ASCII art banner with version, but no command or entry point calls `printBanner()`. The version is available via `--version` flag (Commander built-in), but the brand moment at first launch is missing. Tools like ESLint, webpack, and Vite print their banner on first run or when entering watch mode — it anchors the user's mental model.

**Fix**: Call `printBanner()` in the bare invocation handler (`cli.ts:119`) when no command is given and no `--json` flag is set.

---

### NAV-08 [W] — `claws build` with no platform autodetection fallback gives a developer-facing error

When platform autodetection fails (no markers, no config), the error originates from `platform-detect.ts:101` calling `resolve(inventory)` which throws. The `build` command at line 140 catches this and wraps it with `compileFailedError()`, producing: `CLAWS-E020: Compilation failed: Platform detection failed: <SDK internal message>`. The SDK error message is implementation-facing (e.g., "No platforms detected in inventory"). The user sees a compile error code (E020) for what is actually a workspace setup issue.

**Fix**: Use a workspace-category error code (E010-E019 range) and an actionable message: "No platform detected. Run `claws init` to configure your workspace, or pass `--target <platform>` explicitly."

---

### NAV-09 [W] — Two parallel color systems create divergent color semantics

`output/color.ts` defines a `Palette` (pass/fail/warn/info/dim/bold/cyan) for the `check` command. `color/index.ts` defines a `ColorPalette` (green/cyan/yellow/red/brightRed/dim/bold/gray) for the format registry and UI modules. Both define `isColorEnabled` / `isColorDisabled` with slightly different APIs. The `check` command uses `Palette`; the format registry default formatter uses `ColorPalette` via `color/index.ts`. This means:

- Two different `severityColor()` functions exist with different type signatures
- `output/color.ts` has no `brightRed` — CRITICAL violations in `check` render as regular red
- `color/severity.ts` properly maps CRITICAL to brightRed, but only the `format/default.ts` formatter uses it

This is not visible to users yet (both produce the same ANSI codes for the overlap), but it is a ticking bomb: any change to one system that doesn't propagate to the other will produce inconsistent severity coloring across `--json`/`--format` modes.

**Fix**: Consolidate to a single color system (`color/index.ts` + `color/risk.ts` + `color/severity.ts`). Retire `output/color.ts` by migrating `check.ts` to use `ColorPalette`.

---

### NAV-10 [N] — `claws compile` does not count conflicts in exit-code semantics

`compile.ts:196` returns `violationCount > 0 ? 1 : 0`, but the function also detects conflicts (`compileConflicts.conflicts.length`) and logs them at line 189. Conflicts are not violations — they represent structural contradictions between governance declarations (e.g., a tool both denied and required). A compile that produces zero violations but 5 conflicts returns exit code 0. For CI pipelines that gate on exit code, this is a silent pass on potentially dangerous config.

This is currently acceptable because `build` will also catch conflicts, but a user who runs `compile` in CI expecting comprehensive coverage will miss structural issues.

---

### NAV-11 [N] — No `--quiet` or `--silent` flag for CI pipelines

All commands produce human-readable output on success. CI pipelines typically want exit-code-only behavior. The `--json` flag converts output to JSON but does not suppress it. There is no way to run `claws check` and get only the exit code with zero stdout. This is a common CI ergonomics feature (`eslint --quiet`, `tsc --noEmit`).

---

## Summary

| Grade | Count | IDs |
|-------|-------|-----|
| M     | 4     | NAV-01, NAV-02, NAV-03, NAV-04 |
| W     | 5     | NAV-05, NAV-06, NAV-07, NAV-08, NAV-09 |
| N     | 2     | NAV-10, NAV-11 |
| Total | 11    | |

### Key user journey risks

1. **First-5-minutes path** (NAV-03, NAV-05, NAV-07): `init` is the entry point for every new user. It is the only command that lacks error contract compliance, crams output, and misses the banner brand moment. This path needs the most polish.

2. **Format reachability** (NAV-02): SARIF and CSV formatters are built, tested, and registered — but invisible to users. This is an exit criterion gap since CP-1 requires "SARIF output validates against SARIF 2.1.0 JSON schema" but no CLI flag exposes it.

3. **Cache consistency** (NAV-01): Two different caching strategies across compile/build will confuse users who expect deterministic behavior from the same compiler.

4. **Progress feedback** (NAV-06): Commands give no intermediate progress, making the CLI feel unresponsive on anything but tiny workspaces.
