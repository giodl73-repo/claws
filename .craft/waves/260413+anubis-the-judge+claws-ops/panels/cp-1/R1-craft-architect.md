# R1 Review — craft:architect

**Wave**: Anubis CP-1
**Role**: craft:architect (Cluster D — structural clarity > rapid delivery)
**Scope**: claws-sdk, claws-test, claws-cli new files
**Date**: 2026-04-13

---

## Summary

The three-package decomposition (claws-sdk, claws-cli, claws-test) follows the SDK-owns-logic / CLI-is-thin-adapter rule faithfully. Dependency arrows are correct: CLI depends on SDK, SDK has zero reverse imports, and claws-test is isolated with peer deps. Subpath exports are well-designed with clean barrel files per module boundary. The main structural findings center on duplicated domain logic that leaked into the CLI layer, a split formatting surface that muddies module responsibility, a package naming inconsistency, and hardcoded version strings.

---

## Findings

### F-01 [M] — Suppression logic is duplicated domain logic in CLI

**Files**: `claws-cli/src/commands/compile.ts:141-149`, `claws-cli/src/commands/check.ts:106-113`, `claws-cli/src/commands/build.ts:171-179`

The exact same 9-line suppress-filter block is copy-pasted across three CLI commands:

```ts
const suppressSet = new Set(ctx.suppressedRules);
const suppressed = rawAnalysis.violations.filter((v) => suppressSet.has(v.ruleId));
const activeViolations =
  suppressSet.size > 0
    ? rawAnalysis.violations.filter((v) => !suppressSet.has(v.ruleId))
    : rawAnalysis.violations;
```

This is a domain decision (which violations are active given suppression config) living in the CLI adapter layer. The SDK's `analyze()` function should accept suppression rules and return pre-filtered results. This violates SDK-owns-logic: if a future consumer (e.g., an API server) calls the SDK, it would have to re-implement suppression filtering.

**Recommendation**: Move suppression filtering into the SDK analyze pipeline. `analyze()` or a wrapper should accept `{ suppress: string[] }` and return `{ violations, suppressedCount }`.

---

### F-02 [M] — Dual formatting surfaces: `output/` and `format/` directories

**Files**: `claws-cli/src/output/` (4 files), `claws-cli/src/format/` (5 files)

The CLI has two overlapping formatting subsystems:

- `output/format-default.ts` + `output/format-json.ts` — used by the commands today
- `format/default.ts` + `format/json.ts` + `format/sarif.ts` + `format/csv.ts` — a formatter registry with `getFormatter()`

The `format/default.ts` file literally wraps `output/format-default.ts` and re-implements `countBySeverity()` inline. The `format/json.ts` is a separate implementation from `output/format-json.ts` with different interfaces (`FormattedJsonViolation` vs `JsonViolation`). The commands import from `output/`, not `format/`, so the registry is orphaned — `getFormatter()` and `FORMAT_NAMES` are never called from any command.

**Recommendation**: Collapse into one surface. Either the registry (`format/`) replaces `output/`, or `output/` absorbs the new formatters. One module, one responsibility. Wire `--format` flag in `cli.ts` to the registry.

---

### F-03 [M] — Package naming inconsistency: `@bic/claws-test` vs `@craftworks/claws-*`

**Files**: `claws-test/package.json:2`, `claws-sdk/package.json:2`, `claws-cli/package.json:2`

claws-sdk is `@bic/claws-sdk` and claws-cli is `@bic/claws-cli`, but claws-test is `@bic/claws-test`. This creates two npm scopes for the same product family. Consumers need to know which scope to use for which package. The peer dependency `@bic/claws-skill-kit` in claws-test also uses the `@claws/` scope, but that package may not yet exist as a published artifact.

**Recommendation**: Settle on one scope. Either `@bic/claws-test` (matching SDK/CLI) or migrate all three to `@claws/`. The scope split will cause confusion when onboarding external consumers.

---

### F-04 [W] — Hardcoded version `0.36.0` in two CLI source files

**Files**: `claws-cli/src/cli.ts:24`, `claws-cli/src/format/sarif.ts:135`

The CLI version is hardcoded as a const `VERSION = '0.36.0'` in `cli.ts` and again inline in the SARIF formatter's tool.driver.version. Both will drift from `package.json` on the next version bump. The SDK correctly uses a `COMPILER_VERSION` constant from `compile/version.ts`.

**Recommendation**: Read the version from package.json at build time (tsup define) or export a single `CLI_VERSION` constant. The SARIF formatter should import from that constant rather than embedding a literal.

---

### F-05 [W] — `compile.ts` has inline IR construction logic

**File**: `claws-cli/src/commands/compile.ts:152-164`, `claws-cli/src/commands/build.ts:182-194`

Both `compile.ts` and `build.ts` manually construct the `GovernanceIR` object literal in the CLI layer:

```ts
const ir: GovernanceIR = {
  capabilities: capabilityManifest,
  analysis,
  intents: [],
  delegationMap: [],
  conflicts: toIRConflictReport(compileConflicts),
  compiler: {
    compilerVersion: COMPILER_VERSION,
    compiledAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
  },
};
```

IR assembly is a compiler concern. If the IR shape changes, both CLI commands (and any future consumer) must be updated in lockstep.

**Recommendation**: Expose a `buildGovernanceIR(manifest, analysis, conflicts)` factory from `claws-sdk/compile` that owns the shape. CLI commands call it and serialize the result.

---

### F-06 [W] — `pre-command.ts` duplicates config loading vs `config/loader.ts`

**Files**: `claws-cli/src/hooks/pre-command.ts:44-52`, `claws-cli/src/config/loader.ts`

The pre-command hook has its own `loadClawsJson()` that reads and `JSON.parse`s claws.json with a bare `as ClawsJsonConfig` cast. Meanwhile, `config/loader.ts` wraps the SDK's Zod-validated `loadConfig()` with DiagnosticError handling. The commands use the pre-command hook's unvalidated parse. The validated loader exists but is never wired into the command flow.

**Recommendation**: Wire `config/loader.ts` into `preCommand()` so all commands get Zod-validated config. The current approach silently swallows malformed configs.

---

### F-07 [W] — `platform-detect.ts` in CLI contains resolution logic

**File**: `claws-cli/src/core/platform-detect.ts:55-110`

The `detectPlatform()` function in the CLI layer contains non-trivial resolution logic: config override priority, error message construction for config/detection mismatches, and the `VALID_PLATFORMS` set that "must stay in sync with Platform type in claws-sdk." This is a domain decision (how platform resolution works) with a manual sync obligation.

**Recommendation**: The SDK's detect module should export a high-level `resolveWorkspacePlatform(root, config?)` that encapsulates priority logic. The CLI should call it and only handle rendering. The `VALID_PLATFORMS` set should be derived from the SDK's `Platform` type, not maintained manually.

---

### F-08 [W] — `claws-cli/src/index.ts` barrel re-exports internal modules

**File**: `claws-cli/src/index.ts`

The CLI barrel exports rendering internals (`formatViolation`, `countBySeverity`, `createPalette`, `severityColor`) as public API. A CLI package's public API should be the program entry point and possibly a `createProgram()` for programmatic use — not formatting utilities. These exports couple external consumers to the CLI's internal rendering implementation.

**Recommendation**: Trim the barrel to `createProgram`, `GlobalOpts`, and at most the error types. If rendering functions need to be shared, they belong in a shared formatting package, not exported from the CLI.

---

### F-09 [N] — `compile.ts` inline cache check vs SDK cache

**File**: `claws-cli/src/commands/compile.ts:51-67`

The compile command has a bespoke `checkCache()` function that reads the IR file, parses it, and checks `compilerVersion`. Meanwhile, `build.ts` uses the CLI's `core/cache.ts` wrapper which delegates to the SDK's `cacheCheck()` / `cacheStore()`. The compile command's cache logic duplicates what the SDK already provides and uses a different caching strategy (file read + version match vs. content hash).

**Recommendation**: Unify on the SDK cache. The compile command should use `checkBuildCache()` like build does.

---

### F-10 [N] — `@craftworks/compiler-sdk` and `@craftworks/agent-sdk` in SDK devDeps

**File**: `claws-sdk/package.json:62-63`

These appear as devDependencies but no import from them exists in `claws-sdk/src/`. If they are only used in tests, this is fine but worth noting — it means the test suite for claws-sdk couples to the broader craftworks ecosystem. If any production code later imports from them, the dependency arrow would point outward from claws-sdk to the craft platform, which would be an architectural violation for an independently publishable SDK.

**Recommendation**: Verify no production imports exist (confirmed: none found). Add a comment in package.json clarifying these are test-only deps. Consider moving to a test-specific config if the monorepo tooling supports it.

---

### F-11 [N] — `GatewaySim.fromWorkspace()` is a stub

**File**: `claws-test/src/gateway-sim.ts:154-174`

`fromWorkspace()` is documented as "Placeholder for when compile pipeline is available" and returns a no-op sim with hardcoded console output (e.g., "Detected: SOUL.md, TOOLS.md..."). Since the compile pipeline now exists in claws-sdk, this should be wired up or clearly marked as `@experimental` / `@todo`.

**Recommendation**: Either wire it to `claws-sdk/compile` or add a `@deprecated` / `@todo` JSDoc tag. A consumer calling `fromWorkspace()` today gets silent no-op behavior, which is a correctness trap.

---

## Verdict

| Severity         | Count  |
| ---------------- | ------ |
| Must-fix (M)     | 3      |
| Worth-fixing (W) | 5      |
| Nitpick (N)      | 3      |
| **Total**        | **11** |

The package decomposition is clean and the dependency graph is correct. The three must-fix items (F-01, F-02, F-03) are all boundary violations: domain logic in the CLI, an orphaned formatting surface, and a scope split that will confuse consumers. The worth-fixing items are all instances of the same pattern: logic that should live in the SDK living in the CLI instead. None of these are blocking for CP-1 completion, but F-01 and F-03 should be addressed before the packages are published externally.
