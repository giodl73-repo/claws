# CP-2 Review: platform-eng (R1)

**Reviewer**: claws:platform-eng
**Scope**: Pulses 10-18 (Init + Three Rings: Watch, Doctor, Amend)
**Lens**: Fleet consistency, operational reliability, cross-platform correctness, SDK/CLI boundary

---

## Summary

CP-2 implements the init pipeline, uninstall, bypass, watch engine, doctor diagnostics, migration runner, and amend pipeline. The SDK/CLI boundary discipline is well-maintained throughout -- all business logic lives in claws-sdk, CLI modules are thin adapters. The code is generally clean, well-typed, and idempotent where it claims to be. However, several findings affect fleet-scale operations, cross-platform correctness, and operational reliability.

---

## Findings

### M-01: Gitignore update is inconsistent with sidecar.ts CLAWS_GITIGNORE_DIRS [M]

**File**: `claws-sdk/src/init/gitignore-update.ts:14-17`
**File**: `claws-sdk/src/types/sidecar.ts:69-74`

The gitignore-update module hardcodes only 2 entries (`.claws/keys/`, `.claws/secrets/`), but `sidecar.ts` defines `CLAWS_GITIGNORE_DIRS` with 4 entries (keys, secrets, cache, runtime). When I run `claws init` across 47 workspaces, some will have `.claws/cache/` and `.claws/runtime/` tracked by git because the init pipeline doesn't use the authoritative list. The `sidecar.ts` file even has its own `.gitignore` inside `.claws/` that covers these, but the workspace-root `.gitignore` is missing them.

**Impact**: Fleet-wide git drift. Sensitive runtime data and cache artifacts may be committed to repos across the fleet.

**Fix**: Import and use `CLAWS_GITIGNORE_DIRS` from `sidecar.ts` instead of a hardcoded list.

---

### M-02: Platform detection skips glob patterns silently -- dotnet and sln never detected [M]

**File**: `claws-sdk/src/init/platform-detect.ts:70-71`

The marker list includes `*.csproj` and `*.sln` for dotnet detection, but the detection loop has `if (marker.file.includes('*')) continue;` which silently skips all glob entries. Dotnet workspaces will always be detected as `unknown` unless `package.json`, `pyproject.toml`, etc. happen to exist. In a fleet of 47 workspaces, any .NET projects get miscategorized.

**Impact**: Any dotnet workspace in the fleet will be initialized with `platform: unknown`, leading to incorrect config defaults and inaccurate fleet reports.

**Fix**: Either (a) implement a minimal glob/readdir check for `*.csproj`/`*.sln`, or (b) replace the glob patterns with explicit common filenames like `Directory.Build.props` or similar concrete markers.

---

### M-03: Policy-syntax check expects fields that templates do not emit [M]

**File**: `claws-sdk/src/doctor/checks/policy-syntax.ts:19`
**File**: `claws-sdk/src/init/templates/soc2.ts` (and hipaa, eu-ai-act)

The policy-syntax doctor check requires top-level fields `name`, `version`, `rules`. But the actual templates emit `policy`, `framework`, `level`, `rules`. Only `rules` overlaps. This means `claws doctor` will report every template-generated policy file as invalid immediately after `claws init --template soc2`. The init+doctor round-trip is broken.

This is a fleet showstopper: after a fleet-wide `claws broadcast` of a template upgrade, `claws doctor --fleet` will report every workspace as unhealthy.

**Impact**: False-positive errors across the entire fleet after any template-based init or upgrade.

**Fix**: Either (a) change `REQUIRED_FIELDS` to match actual template output (`policy`, `framework`, `level`, `rules`), or (b) update templates to emit `name` and `version` instead of `policy` and `framework`.

---

### M-04: Uninstall uses `cp()` without `force: true` -- fails on read-only files (Windows) [M]

**File**: `claws-sdk/src/init/uninstall.ts:99-103`

`cp(auditSrc, auditArchivePath, { recursive: true })` and `cp(sidecarPath, ...)` do not pass `{ force: true }`. On Windows, if the backup target directory already exists from a previous interrupted uninstall, `cp` will throw EEXIST. Additionally, read-only files (which audit chain files might be if tamper-proofed) will fail without force. The subsequent `rm(sidecarPath, { recursive: true, force: true })` correctly uses force, but the backup step that precedes it does not.

**Impact**: Uninstall fails on Windows workspaces that had a prior interrupted uninstall, or on workspaces with read-only audit files. Fleet-wide uninstall+reinstall cycles are unreliable.

**Fix**: Add `{ recursive: true, force: true }` to both `cp()` calls.

---

### W-01: Watch directory monitoring is non-recursive -- nested skill dirs missed [W]

**File**: `claws-sdk/src/watch/watcher.ts:155` (comment: "non-recursive, since Node's recursive option is not reliable on all platforms")

The `watchDirectory` method explicitly avoids recursive watching. The `skills/` directory can contain nested subdirectories (e.g., `skills/deploy/run.md`). Changes to files in nested skill directories will not trigger watch events. The comment mentions Node's recursive option being unreliable, but `{ recursive: true }` works on Windows (NTFS/ReadDirectoryChangesW), macOS (FSEvents), and Linux 5.9+ (fanotify). Older Linux kernels are the only gap.

**Impact**: Silent missed changes on nested directories. A fleet operator editing `skills/security/audit-check.md` won't see the watch trigger, leading to stale governance state.

**Fix**: Use `{ recursive: true }` for directory watchers (works on Windows and macOS which are the primary fleet platforms). Document Linux kernel 5.9+ requirement, or add a fallback inotify walker for older kernels.

---

### W-02: Doctor checks run sequentially -- fleet-wide `--post-upgrade` is slower than needed [W]

**File**: `claws-sdk/src/doctor/orchestrator.ts:106-109`

The doctor orchestrator runs all checks with a sequential `for` loop. The 4 checks (config-schema, artifact-compat, dependency-check, policy-syntax) are independent -- they read different files and don't share state. For a single workspace this is negligible, but `claws doctor --post-upgrade --fleet` across 47 workspaces multiplies the latency.

**Impact**: Monthly fleet upgrade validation takes longer than necessary. The 10-minute fleet upgrade window is tighter than it needs to be.

**Fix**: Use `Promise.all()` to run independent checks in parallel:
```ts
const results = await Promise.all(checks.map(check => check(workspaceRoot)));
```

---

### W-03: Bypass audit record lacks process identity -- insufficient for fleet forensics [W]

**File**: `claws-sdk/src/init/bypass.ts:97-101`

The bypass audit event records only `type`, `timestamp`, and `env`. For fleet forensics, when investigating which agent in which workspace bypassed governance, the record needs: workspace path, hostname, process PID, and ideally the user/CI identity. Without these, the audit chain is not useful for fleet-wide compliance reporting.

**Impact**: `claws comply --fleet` cannot attribute bypass events to specific machines or operators. SOC2 and HIPAA audit requirements need identity attribution.

**Fix**: Enrich the audit event with `hostname`, `pid`, `cwd`, and optionally `user` from `os.userInfo()`.

---

### W-04: Template configOverrides are generated but never applied to claws.json [W]

**File**: `claws-sdk/src/init/orchestrator.ts:86-113`
**File**: `claws-sdk/src/init/templates/index.ts:47-51`

Each template defines `configOverrides` (e.g., soc2 sets `trustTier: 3` and `complianceFramework: 'soc2'`). But `applyTemplate()` only writes policy files -- it never applies the overrides to `claws.json`. And in the orchestrator, the config is built and written at step 3 (with defaults), then the template is applied at step 6, but no merge happens. A `claws init --template soc2` workspace will have `trustTier: 2` (default) instead of `trustTier: 3` (template override).

**Impact**: Fleet-wide template broadcasts don't enforce the intended trust tier or compliance framework. The fleet operator thinks SOC2 workspaces are at T3, but they're actually at T2.

**Fix**: After `applyTemplate()`, merge `templateResult.template.configOverrides` into `claws.json` and rewrite. Or refactor the orchestrator to pass template overrides into `buildInitConfig()`.

---

### W-05: EventNormalizer memory leak on long-running watch sessions [W]

**File**: `claws-sdk/src/watch/event-normalizer.ts:31-49`

The `EventNormalizer.lastSeen` map grows monotonically -- entries are never evicted. Each unique filename seen by `fs.watch` adds an entry that persists for the lifetime of the watcher. On a fleet workspace with frequent file renames or temporary files, the map grows without bound.

**Impact**: Long-running `claws watch` sessions (common in fleet daemonized mode) will slowly leak memory. Not catastrophic, but the map should be bounded.

**Fix**: Add a periodic eviction pass (e.g., every 60s, remove entries older than 5s), or use a bounded LRU cache.

---

### W-06: Migration v1-to-v2 sets `fleet.allowBypass: false` -- blocks bypass across fleet [W]

**File**: `claws-sdk/src/doctor/migrate/v1-to-v2.ts:34-36`

The v2 migration adds `fleet: { allowBypass: false }` as a default. This is a policy decision embedded in a migration, not a template. When `claws doctor --fix --fleet` runs the monthly upgrade across 47 workspaces, every v1 workspace will suddenly have bypass disabled. Operators who relied on `CLAWS_BYPASS=1` for debugging will be locked out without warning.

**Impact**: Fleet-wide bypass lockout after v1-to-v2 migration. Operators who need bypass for incident response will be blocked.

**Fix**: Either (a) default to `allowBypass: true` and let fleet policy override, or (b) emit a warning when bypass is disabled by migration, giving operators a chance to set it explicitly before the next `claws doctor` run.

---

### N-01: Amend CLI recompile callback is a stub [N]

**File**: `claws-cli/src/commands/amend.ts:89-93`

The `recompile` function is a stub that always returns `{ success: true }`. The comment says "full recompile is triggered by the calling context" but there's no evidence of that in the CLI wiring. After `claws amend add-skill`, the GovernanceIR is stale until the user manually runs `claws compile`.

**Impact**: Post-amend state is inconsistent until explicit recompile. Not a fleet-scale issue but could confuse operators.

---

### N-02: Uninstall result type documents exitCode as "0 = success, 0 = no-op" [N]

**File**: `claws-sdk/src/init/uninstall.ts:37`

The JSDoc comment says `Exit code: 0 = success, 0 = no-op (idempotent).` which is correct (both are 0) but reads as if it's a copy-paste error. Consider clarifying: `Exit code: always 0 (success or no-op)`.

---

### N-03: content-hash imports stripBOM/normalizeLF from util/text -- verify cross-platform [N]

**File**: `claws-sdk/src/watch/content-hash.ts:14`
**File**: `claws-sdk/src/watch/incremental.ts:16`

Both modules import `stripBOM` and `normalizeLF` from `../util/text.js`. This is good practice for cross-platform consistency. The CRLF normalization before hashing means the same file on Windows (CRLF) and macOS (LF) produces the same hash. This is correct and fleet-friendly.

---

### N-04: init/orchestrator template error handling is clean [N]

**File**: `claws-sdk/src/init/orchestrator.ts:106-114`

The `TemplateNotFoundError` pattern is properly defined in the SDK and caught in the CLI. Clean separation. No business logic leaks into the CLI layer.

---

## Lens Checklist

| Question | Assessment |
|----------|-----------|
| Does `claws broadcast` reliably push this to 47 workspaces? | Partial -- M-03 (doctor false positives) and W-04 (template overrides not applied) would cause fleet-wide issues after broadcast. |
| Does `claws drift` detect when a workspace diverges from fleet policy? | Not directly tested in CP-2, but the config schema check and artifact compat check provide a foundation. M-01 (gitignore drift) is a gap. |
| Does `claws doctor --post-upgrade --fleet` handle monthly upgrades? | W-02 (sequential checks) makes it slower than needed. W-06 (bypass lockout) is a policy hazard during fleet upgrades. |
| Can I see fleet-wide compliance in one command? | Partial -- bypass audit (W-03) lacks identity attribution needed for compliance reports. |
| What happens when 3 of 47 workspaces fail the upgrade? | Migration runner has proper backup+restore (good). Doctor checks aggregate per-workspace. Individual workspace failures are isolated. |
| Does the CI/CD pipeline work with GitHub Enterprise? | Not tested in CP-2 scope. |

---

## Verdict

**4 Major, 6 Warning, 4 Note**

The M-03 finding (policy-syntax vs template mismatch) is the highest priority -- it makes the init+doctor round-trip broken out of the box. M-01 (gitignore drift), M-02 (dotnet detection), and M-04 (Windows cp failure) should be fixed before CP-2 merge. W-04 (template overrides not applied) is functionally close to Major severity and should also be addressed.

The architecture is sound. SDK/CLI boundary discipline is clean. Cross-platform considerations (BOM stripping, CRLF normalization, path normalization) are well-handled in the watch pipeline. The migration runner's backup-and-restore pattern is exactly what fleet operations need.
