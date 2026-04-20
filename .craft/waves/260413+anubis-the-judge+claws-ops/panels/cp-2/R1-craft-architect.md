# R1 Panel Review: craft:architect

**Checkpoint**: CP-2 — Init + Three Rings (Watch, Doctor, Amend)
**Pulses**: 10-18
**Reviewer**: craft:architect
**Lens**: Structural clarity, layered boundaries, SDK-owns-logic

---

## Summary

CP-2 introduces four new SDK modules (`init/`, `watch/`, `doctor/`, `amend/`) and four new CLI commands (`init`, `uninstall`, `watch`, `doctor`, `amend`). The overall architecture is **sound**: dependency arrows point inward (CLI -> SDK -> types), no reverse imports exist, and each CLI command is a thin adapter that delegates to SDK orchestrators. Module decomposition is clean, with single-responsibility files throughout. Subpath exports are correctly wired in `package.json`.

**Verdict**: 3 Major, 4 Warning, 5 Note findings. The Majors are addressable without restructuring.

---

## Findings

### M-01: Duplicate sidecar scaffolding functions

**Files**:
- `claws-sdk/src/types/sidecar.ts:84` — `initSidecar()`
- `claws-sdk/src/init/sidecar-scaffold.ts:25` — `scaffoldSidecar()`

Both functions create the 13 `.claws/` subdirectories via `mkdir -p`. The pre-existing `initSidecar()` in `types/sidecar.ts` additionally writes `.claws/.gitignore` for sensitive directories (`keys/`, `secrets/`, `cache/`, `runtime/`). The new `scaffoldSidecar()` does only the mkdir.

The orchestrator calls `scaffoldSidecar()`, meaning the `.claws/.gitignore` is never written during init. This is both a duplication and a behavioral gap.

**Fix**: Delete `sidecar-scaffold.ts`. Have the orchestrator call `initSidecar()` from `types/sidecar.ts` (or factor it into init/ and remove from types/). One function, one place.

**Severity**: **M** — Two functions for the same operation, one silently more complete than the other.

---

### M-02: Policy template schema does not match doctor validation

**Files**:
- `claws-sdk/src/doctor/checks/policy-syntax.ts:19` — `REQUIRED_FIELDS = ['name', 'version', 'rules']`
- `claws-sdk/src/init/templates/soc2.ts` (and hipaa, eu-ai-act) — templates emit `policy:`, `framework:`, `level:`, `rules:`

The doctor's policy-syntax check requires top-level fields `name`, `version`, and `rules`. But every template generates policies with `policy` (not `name`), `framework`, `level`, and `rules` — none include a `version` field.

Running `claws init --template soc2` followed by `claws doctor` will **always** report errors on every generated policy file ("missing required fields: name, version"). The init path and the doctor path disagree on what a valid policy looks like.

**Fix**: Either (a) update `REQUIRED_FIELDS` to match the actual template schema (`policy`, `framework`, `level`, `rules`), or (b) add `name` and `version` fields to all template policies and update the validator to accept the superset.

**Severity**: **M** — Init produces files that doctor immediately flags as broken.

---

### M-03: `types/sidecar.ts` contains business logic (scaffold + gitignore write)

**File**: `claws-sdk/src/types/sidecar.ts:84-98`

The `types/` directory should contain only type definitions and constants. The `initSidecar()` function performs I/O (mkdir, writeFile) — this is business logic that belongs in an `init/` or `scaffold/` module.

Additionally, `types/sidecar.ts` imports `mkdir` and `writeFile` from `node:fs/promises`, which is inappropriate for a types module. If downstream consumers import from `types/sidecar`, they pull in filesystem dependencies they don't need.

**Fix**: Relocate `initSidecar()` to `init/sidecar-scaffold.ts` (merging with the existing function per M-01). Strip the `node:fs/promises` imports from `types/sidecar.ts`, keeping only the type definitions and constants.

**Severity**: **M** — Layer violation: types module performs I/O.

---

### W-01: Gitignore coverage gap between workspace and sidecar

**Files**:
- `claws-sdk/src/init/gitignore-update.ts:14` — adds `.claws/keys/`, `.claws/secrets/`
- `claws-sdk/src/types/sidecar.ts:69` — lists `.claws/keys`, `.claws/secrets`, `.claws/cache`, `.claws/runtime`

The workspace-level `.gitignore` only protects `keys/` and `secrets/`. The sidecar-level `.gitignore` (from `initSidecar()` which is never called) protects four directories including `cache/` and `runtime/`. Since `scaffoldSidecar()` doesn't write the nested `.gitignore`, the `cache/` and `runtime/` directories may be committed.

**Fix**: When resolving M-01, ensure the workspace `.gitignore` covers all sensitive sidecar directories: `keys/`, `secrets/`, `cache/`, `runtime/`.

**Severity**: **W** — Sensitive directories may be tracked by git.

---

### W-02: Glob patterns in platform detection are silently skipped

**File**: `claws-sdk/src/init/platform-detect.ts:39-43,71`

`WORKSPACE_MARKERS` includes `*.csproj` and `*.sln` for dotnet detection, but the detection loop skips any marker containing `*` (line 71). Dotnet workspaces will never be detected — they always fall through to `unknown`.

**Fix**: Either implement glob matching for these patterns (e.g., readdir + filter) or replace the glob entries with exact files that reliably indicate dotnet projects (e.g., `Directory.Build.props`, `global.json`, or a readdir check for `*.csproj`).

**Severity**: **W** — Dotnet platform detection is defined but non-functional.

---

### W-03: `amend/apply.ts` recompile stub in CLI

**File**: `claws-cli/src/commands/amend.ts:89-93`

The CLI's `recompile` callback is a stub that always returns `{ success: true }`. The SDK `applyAmendment()` calls this after writing amendments, expecting it to actually recompile. With the stub, GovernanceIR goes out of sync with the applied amendments until the user manually runs `claws compile`.

The comment says "The full recompile is triggered by the calling context" but there is no evidence of a surrounding recompile call in the command function.

**Fix**: Wire the recompile callback to actually call the SDK compile pipeline, or document clearly in the CLI that `claws amend` requires a subsequent `claws compile`.

**Severity**: **W** — Amendments are applied but IR is stale until manual recompile.

---

### W-04: Watch command's `onBatch` callback is async but not awaited in Debouncer

**Files**:
- `claws-sdk/src/watch/debounce.ts:51` — `setTimeout(() => this.flush(), ...)`
- `claws-sdk/src/watch/debounce.ts:66` — `this.onBatch(files)` (synchronous call)
- `claws-sdk/src/watch/watcher.ts:85` — `(files) => this.processBatch(files)` — `processBatch` is async

The `Debouncer.flush()` calls `this.onBatch(files)` synchronously. But the Watcher passes an async `processBatch` as the callback. The returned Promise from `processBatch` is silently dropped — errors during content-hash reads or batch emission will be unhandled rejections.

**Fix**: Make `BatchCallback` return `void | Promise<void>`, and `await` it in `flush()`. Alternatively, wrap the call in a `.catch()` that routes to `onError`.

**Severity**: **W** — Unhandled promise rejections from the core watch pipeline.

---

### N-01: `init/index.ts` re-exports could leak internal template types

**File**: `claws-sdk/src/init/index.ts:19-30`

The init barrel exports `getTemplate`, `listTemplateNames`, `TemplateNotFoundError`, and all template types (`GovernanceTemplate`, `PolicyFile`, `TemplateConfigOverrides`, `ApplyTemplateResult`). These are internal implementation details — external consumers should use `initWorkspace()` with a template name string, not construct templates directly.

**Recommendation**: Consider keeping template internals private and only exporting the `applyTemplate` function and the error type from the barrel.

**Severity**: **N** — Public API surface larger than necessary.

---

### N-02: `fileExists` helper duplicated across modules

**Files**:
- `claws-sdk/src/init/orchestrator.ts:121-128` — `fileExists()`
- `claws-sdk/src/init/uninstall.ts:178-184` — `exists()`

Both are identical `access()`-based existence checks. Minor duplication; could share `util/fs.ts`.

**Severity**: **N** — Cosmetic duplication.

---

### N-03: `init` command signature differs from other CLI commands

**Files**:
- `claws-cli/src/commands/init.ts:35` — `runInit(workspaceRoot, opts)` takes raw string
- `claws-cli/src/commands/watch.ts:38` — `runWatch(ctx, opts)` takes `PlatformContext`
- `claws-cli/src/commands/doctor.ts:104` — `runDoctorCmd(ctx, opts)` takes `PlatformContext`
- `claws-cli/src/commands/amend.ts:122` — `runAmendCmd(ctx, opts)` takes `PlatformContext`

The init command takes `workspaceRoot: string` while other commands take `PlatformContext`. This is defensible since init runs before config exists, but uninstall also takes `workspaceRoot` despite running post-init. The inconsistency makes the CLI surface harder to reason about.

**Recommendation**: Consider having init/uninstall accept `PlatformContext` too (they can check `ctx.hasConfig`).

**Severity**: **N** — Minor API inconsistency, not a bug.

---

### N-04: Doctor orchestrator runs checks sequentially

**File**: `claws-sdk/src/doctor/orchestrator.ts:106-109`

Checks are run with a sequential `for` loop. All four checks are independent (config-schema, artifact-compat, dependency-check, policy-syntax) and could run in parallel with `Promise.all()` for faster execution.

**Severity**: **N** — Performance opportunity, not a defect.

---

### N-05: `v1ToV2` migration uses mutable `delete` on spread copy

**File**: `claws-sdk/src/doctor/migrate/v1-to-v2.ts:47-55`

The migration creates `{ ...config }` (shallow copy) then mutates it with `delete result[oldName]`. This is functionally correct but violates the readonly discipline visible everywhere else. A cleaner approach would use destructuring or `Object.fromEntries` to avoid mutation.

**Severity**: **N** — Style inconsistency with the rest of the codebase's immutable discipline.

---

## Architecture Checklist

| Check | Status | Notes |
|-------|--------|-------|
| SDK-owns-logic boundary | PASS | All business logic in claws-sdk; CLI is pure adapter |
| Dependency arrows inward (CLI -> SDK -> types) | PASS | No reverse imports found |
| No circular dependencies between new modules | PASS | init, watch, doctor, amend are fully independent |
| Module responsibility clarity | PASS | Single responsibility per file throughout |
| Subpath export correctness | PASS | `./init`, `./watch`, `./doctor`, `./amend` all wired in package.json |
| Public API surface design | WARN | init barrel re-exports more than needed (N-01) |
| No layer violations | FAIL | types/sidecar.ts contains I/O logic (M-03) |
| Template/validator coherence | FAIL | policy-syntax REQUIRED_FIELDS mismatch (M-02) |

---

## Recommendation

**Conditional pass.** The three Majors are well-scoped fixes:

1. **M-01 + M-03**: Merge `initSidecar()` into `init/sidecar-scaffold.ts`, strip I/O from `types/sidecar.ts`
2. **M-02**: Align `REQUIRED_FIELDS` with the actual template policy schema
3. **W-01**: Expand workspace `.gitignore` coverage when resolving M-01

None require architectural rework. The overall module decomposition, dependency direction, and SDK/CLI boundary are clean.
