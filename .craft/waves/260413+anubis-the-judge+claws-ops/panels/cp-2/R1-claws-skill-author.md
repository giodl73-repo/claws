# R1 Review: CP-2 — claws:skill-author

**Reviewer**: claws:skill-author
**Scope**: CP-2 Pulses 10-18 (Init + Three Rings: Watch, Doctor, Amend)
**Date**: 2026-04-13
**Verdict**: CONDITIONAL PASS (3 Major, 5 Warning, 8 Note)

---

## Lens Applied

Every finding below is evaluated through the skill-author lens:
- Can I adopt this in 5 minutes without reading a 40-page doc?
- Does the generated code produce usable workspaces?
- Is the feedback clear enough to act on?
- Do error messages tell me what happened AND how to fix it?

---

## Findings

### M-01: Template configOverrides are never applied to claws.json [MAJOR]

**Files**: `claws-sdk/src/init/orchestrator.ts:86-87`, `claws-sdk/src/init/templates/index.ts:115-135`

The init orchestrator writes `claws.json` at Step 3 with hardcoded `trustTier: 2`, then applies the template at Step 6 — but `applyTemplate()` only writes policy YAML files to `.claws/policies/`. The template's `configOverrides` (e.g., SOC2 sets `trustTier: 3`, `complianceFramework: 'soc2'`) are **never merged back into claws.json**.

Impact: A skill author running `claws init --template soc2` gets trust tier 2 instead of the expected tier 3. The compliance framework field is missing entirely. The workspace looks initialized but is misconfigured from the start. This is a silent correctness bug that undermines the entire template system.

Fix: After `applyTemplate()` returns, merge `templateResult.template.configOverrides` into the config and re-write `claws.json`. Or restructure the orchestrator to build the config after template selection.

### M-02: Policy-syntax doctor check uses wrong required fields [MAJOR]

**File**: `claws-sdk/src/doctor/checks/policy-syntax.ts:19`

`REQUIRED_FIELDS = ['name', 'version', 'rules']` but every template-generated policy file uses `policy:` (not `name:`) and `framework:` + `level:` (not `version:`). Running `claws doctor` on a freshly-initialized SOC2 workspace would report **every policy file as invalid** because they lack `name` and `version` fields.

Impact: A skill author who just ran `claws init --template soc2` and then `claws doctor` sees 5 errors on files that claws itself just generated. This destroys trust in the tool immediately. The very first interaction is "init generates broken files."

Fix: Align `REQUIRED_FIELDS` with the actual template schema: `['policy', 'framework', 'rules']` or `['policy', 'level', 'rules']`. Alternatively, update the templates to include `name:` and `version:` fields. Either way, init output must pass doctor checks.

### M-03: .csproj/.sln glob patterns are silently skipped in platform detection [MAJOR]

**File**: `claws-sdk/src/init/platform-detect.ts:39-40, 71`

The marker list includes `*.csproj` and `*.sln` for dotnet detection, but line 71 explicitly skips any marker containing `*`:
```typescript
if (marker.file.includes('*')) continue;
```

Impact: Dotnet workspaces are **never detected** — they always get `platform: 'unknown'`. A .NET skill author running `claws init` in a project with `MyApp.csproj` sees "unknown platform" even though dotnet is in the supported list. This is confusing and makes the platform detection feature feel broken for an entire language ecosystem.

Fix: Either implement glob matching for `*.csproj`/`*.sln` (e.g., use `readdir` + extension check), or replace the glob entries with specific common filenames like `Directory.Build.props` or check for any file ending in `.csproj`/`.sln`.

---

### W-01: Debouncer resets on every event — no maximum batch latency [WARNING]

**File**: `claws-sdk/src/watch/debounce.ts:48-51`

The debouncer resets the timer on every new event. If a file changes continuously (e.g., a formatter running, log tailing), the batch never fires. There's no maximum latency cap.

Impact: In a busy workspace with frequent saves, a skill author could wait indefinitely for watch feedback. The 300ms window only fires 300ms after the *last* event, not the first. A rapid sequence of 20 saves over 2 seconds produces zero feedback for 2.3 seconds.

Recommendation: Add a `maxWaitMs` (e.g., 2000ms) that forces a flush regardless of new events. The current design is correct for normal use but fragile under load.

### W-02: Recompile stub in amend CLI returns success unconditionally [WARNING]

**File**: `claws-cli/src/commands/amend.ts:89-93`

The `recompile` callback is a stub that always returns `{ success: true }`. The comment says "full recompile is triggered by the calling context" but there's no evidence of this — the amendment pipeline's apply step calls `recompile()` and trusts the result.

Impact: After `claws amend add-skill`, the GovernanceIR may be stale because no actual recompilation occurs. The author thinks the amendment is live but `claws check` still shows old state. This is a confusing gap between what the tool says it did and what actually happened.

Recommendation: Either wire up a real recompile call, or print a clear warning: "Run `claws compile` to update governance artifacts."

### W-03: Watch directory monitoring is non-recursive [WARNING]

**File**: `claws-sdk/src/watch/watcher.ts:155`

The comment says "non-recursive, since Node's recursive option is not reliable on all platforms." However, `skills/` can contain subdirectories (e.g., `skills/my-skill/SKILL.md`). Changes to files in subdirectories of `skills/` or `.claws/policies/` won't trigger watch events.

Impact: A skill author editing `skills/my-custom-skill/handler.ts` gets no watch feedback. Only top-level files in `skills/` are detected.

Recommendation: Either use `{ recursive: true }` with a platform guard (it works on Windows and macOS, the two primary targets), or document this limitation clearly in the watch output.

### W-04: Uninstall + re-init round-trip may not be byte-identical [WARNING]

**File**: `claws-sdk/src/init/uninstall.ts:163-169`

The uninstall gitignore revert strips trailing blank lines aggressively (the `while` loop at line 164). If the original `.gitignore` had trailing blank lines before `claws init`, uninstall removes them. Additionally, the separator blank line added by init (`needsSeparator` in gitignore-update.ts:55) is removed on uninstall but the original file may have had different trailing whitespace.

Impact: The CP-2 exit criteria states "claws uninstall && claws init round-trip leaves workspace byte-identical." This may not hold for gitignore content if the original file had specific trailing whitespace patterns.

Recommendation: Test the round-trip assertion explicitly. Consider preserving the original gitignore content hash and restoring exactly.

### W-05: Template not found error doesn't suggest closest match [WARNING]

**File**: `claws-sdk/src/init/templates/index.ts:83-93`

When a skill author typos a template name (e.g., `claws init --template socc2`), the error says `Template "socc2" not found. Available templates: minimal, soc2, hipaa, eu-ai-act`. This lists all templates but doesn't suggest the closest match.

Impact: Minor friction, but for a tool aiming at "5 minutes to adopt," every error message should be maximally helpful. Fuzzy matching ("Did you mean 'soc2'?") would be a quality-of-life improvement.

Recommendation: Add Levenshtein distance or simple prefix matching to suggest the closest template name.

---

### N-01: Init success message could be more actionable [NOTE]

**File**: `claws-cli/src/commands/init.ts:68-69`

The success message is: `Detected: node. Created claws.json + .claws/. Run 'claws check' to check governance.`

For a skill author, the natural next step after init might be `claws watch` (for development) rather than `claws check`. The message could suggest both.

### N-02: IncrementalParser validates ALL entries on every update [NOTE]

**File**: `claws-sdk/src/watch/incremental.ts:148-150`

On every incremental update, `validateEntry()` runs on ALL cached entries, not just the changed ones. For a workspace with many files, this is O(n) work on every save.

Impact: Minimal for typical workspaces (9 files), but worth noting for future scaling.

### N-03: ViolationDiff computes violationKey three times per violation [NOTE]

**File**: `claws-sdk/src/watch/auto-analyze.ts:53-57`

`diffViolations` computes `violationKey()` multiple times for the same violation objects: once for `prevKeys`, once for the `added` filter, once for the `unchanged` filter. Could pre-compute a Map for better efficiency.

### N-04: Doctor checks run sequentially, not in parallel [NOTE]

**File**: `claws-sdk/src/doctor/orchestrator.ts:106-109`

The `for...of` loop runs each check sequentially. Since all four checks do independent I/O (read different files), they could run via `Promise.all()` for faster doctor execution.

### N-05: Amendment preview before/after for update-policy is not useful [NOTE]

**File**: `claws-sdk/src/amend/preview.ts:122-129`

For `update-policy` amendments, the `before` value is always the string `"(current {field})"` rather than the actual current value. This makes the diff preview meaningless for policy updates.

Impact: A skill author running `claws amend update-policy trustTier --dry-run` sees `~ config.trustTier` with before=`"(current trustTier)"` instead of the actual current trust tier value. The preview is supposed to help them decide; this doesn't.

### N-06: Backup timestamp uses Date.now() while uninstall uses ISO [NOTE]

**File**: `claws-sdk/src/doctor/migrate/backup.ts:33` vs `claws-sdk/src/init/uninstall.ts:59-61`

The migration backup uses `Date.now()` (epoch milliseconds) for the backup filename, while uninstall uses a formatted ISO string. This inconsistency means backup directories have different naming conventions depending on which feature created them.

### N-07: Auto-recompile artifact format differs from real compile output [NOTE]

**File**: `claws-sdk/src/watch/auto-recompile.ts:161-165`

The auto-recompile writes simplified artifact JSON (`{ source, contentHash, compiledAt }`) which differs from the full GovernanceIR structure produced by `claws compile`. This means watch-produced artifacts won't pass the artifact-compat doctor check (which looks for `meta.compilerVersion`).

### N-08: Bypass audit record lacks workspace and user context [NOTE]

**File**: `claws-sdk/src/init/bypass.ts:97-101`

The BYPASS_ACTIVATED audit event records `type`, `timestamp`, and `env` but not the workspace path, user identity, or the operation that was bypassed. For audit compliance (especially SOC2/HIPAA templates), this is insufficient context.

---

## Summary by Module

| Module | Verdict | Key Issue |
|--------|---------|-----------|
| init/orchestrator | FAIL | M-01: configOverrides not applied |
| init/templates | PASS | Well-structured, good policy content |
| init/platform-detect | FAIL | M-03: dotnet never detected |
| init/uninstall | PASS | Clean backup/restore flow |
| init/bypass | PASS | Solid fleet policy check (N-08 is minor) |
| init/gitignore-update | PASS | Correct idempotent behavior |
| init/sidecar-scaffold | PASS | Clean, delegates to CLAWS_SIDECAR_LAYOUT |
| watch/watcher | PASS | Good architecture (W-03 is a limitation) |
| watch/debounce | PASS | Correct semantics (W-01 is edge case) |
| watch/content-hash | PASS | BOM + CRLF normalization is right |
| watch/event-normalizer | PASS | Clean NTFS dedup |
| watch/incremental | PASS | Solid caching design |
| watch/auto-analyze | PASS | Diff-based output is excellent for DX |
| watch/auto-recompile | PASS | Works as designed (N-07 noted) |
| watch/cache-invalidation | PASS | Correct hash-driven invalidation |
| doctor/orchestrator | PASS | Clean aggregation |
| doctor/checks | FAIL | M-02: policy-syntax vs template mismatch |
| doctor/migrate | PASS | Good backup-before-migrate pattern |
| amend/validate | PASS | Trust tier enforcement is correct |
| amend/preview | PASS | Good diff model (N-05 is minor) |
| amend/apply | PASS | Lossless OC fidelity maintained |
| amend/amend | PASS | Clean pipeline orchestration |
| CLI commands | PASS | Thin adapters, good error rendering |

## Blocking Issues for CP-2 Exit

1. **M-01** must be fixed before ship: `claws init --template soc2` produces a workspace with wrong trust tier
2. **M-02** must be fixed before ship: `claws doctor` fails on claws's own generated policy files
3. **M-03** must be fixed before ship: dotnet platform detection is silently broken

All three are "first 5 minutes" experience destroyers. A skill author who hits any of these on day one will not trust the tool.
