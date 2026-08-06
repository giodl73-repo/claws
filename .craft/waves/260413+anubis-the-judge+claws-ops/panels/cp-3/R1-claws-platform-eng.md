# CP-3 Review: platform-eng (R1)

**Reviewer**: claws:platform-eng
**Scope**: Snapshot system (save, restore, diff, promote, fleet-registry) + Fleet operations (scan, classify, drift, broadcast, kill, report)
**Lens**: Fleet consistency, operational reliability, cross-platform correctness, parallel execution, storage patterns, .claws/ directory conventions

---

## Summary

CP-3 implements the snapshot lifecycle (save/restore/diff/promote) and the full fleet operations suite (scan, classify, drift, broadcast, kill, report). The architecture is sound: snapshot integrity is SHA-256 verified at every boundary, the fleet registry uses versioned directories to prevent overwrites, and broadcast has atomic write + retry for Windows transient failures. The SDK/CLI boundary is clean throughout -- CLI modules are thin adapters with zero business logic. However, several findings affect fleet-scale reliability: a kill sentinel path mismatch between the kill module and report module, non-deterministic hash ordering across locales, sequential fleet-wide operations where parallelism is needed, and a discovery phase that skips `.claws` as a hidden directory.

---

## Findings

### M-01: Kill sentinel path mismatch -- report.ts reads `kill.json`, kill.ts writes `KILL` [M]

**File**: `claws-sdk/src/fleet/report.ts:150`
**File**: `claws-sdk/src/fleet/kill.ts:59`

The kill module writes the sentinel to `.claws/KILL` (constant `KILL_SENTINEL_FILE = 'KILL'` at line 59, used in `readSentinel` at line 66 and `writeSentinel` at line 79). But `report.ts:readKillStatus()` reads `.claws/kill.json` to determine kill status. These are different files. A workspace killed via `claws kill` will have `.claws/KILL` but `claws report` will never detect it -- every killed workspace shows as `active` in fleet reports.

**Impact**: Fleet compliance reports show 0 killed workspaces even when kills are active. The platform-eng has no visibility into kill status from `claws report --fleet`. The compliance matrix and summary statistics are incorrect.

**Fix**: Change `report.ts:readKillStatus()` to use `readSentinel()` from `kill.ts` instead of reading a hardcoded wrong path:

```ts
import { readSentinel } from "./kill.js";

async function readKillStatus(
  workspacePath: string,
  classification: string,
): Promise<"active" | "killed" | "unknown"> {
  const sentinel = await readSentinel(workspacePath);
  if (sentinel !== null) return "killed";
  return classification === "GOVERNED" ? "active" : "unknown";
}
```

---

### M-02: `localeCompare` without explicit locale produces non-deterministic hash ordering across platforms [M]

**File**: `claws-sdk/src/snapshot/integrity.ts:72`
**File**: `claws-sdk/src/snapshot/promote.ts:141`

Both `computeWorkspaceHash()` and `computeBundleHash()` sort file paths using `localeCompare()` without specifying a locale. The default locale varies by OS configuration (e.g., `de_DE` sorts umlauts differently than `en_US`). If a governance policy file has a non-ASCII name, the sort order -- and therefore the composite hash -- will differ between a Windows machine with German locale and a CI runner with `LANG=en_US.UTF-8`. A snapshot saved on one machine may fail integrity verification on another, or provenance verification may report false tampering.

**Impact**: Cross-platform fleet operations where snapshots are saved on one machine and promoted/verified on another. Provenance chain breaks silently. The bundleHash in provenance.json depends on sort order, so promoted snapshots verified on a different locale will show as tampered.

**Fix**: Use byte-order comparison for deterministic sorting:

```ts
.sort((a, b) => (a.relativePath < b.relativePath ? -1 : a.relativePath > b.relativePath ? 1 : 0))
```

Or use `localeCompare` with an explicit invariant locale: `.localeCompare(b, 'en')`.

---

### M-03: `discoverWorkspacePaths` skips `.claws` as hidden directory -- fleet-registry and fleet-manifest are unreachable for nested workspace detection [M]

**File**: `claws-sdk/src/fleet/scan.ts:101-102`

The discovery phase skips all hidden directories (starting with `.`) except `.cursor`. This is correct for general scanning, but it means workspace discovery will never traverse into `.claws/` subdirectories. This is actually fine for workspace discovery itself (workspaces don't live inside `.claws/`), however, if a fleet root's own workspace is nested under a hidden parent directory (e.g., `C:\src\.internal\project-a\`), the scanner will skip `.internal` entirely and miss all workspaces beneath it.

More importantly, the exclude list is rebuilt from `config.excludeDirs` on every recursive call (line 95) but it is not cached. For a fleet of 47 workspaces with maxDepth=5 and wide directory trees, this creates a new `Set` per directory visited. This is a minor performance concern at scale.

**Impact**: Workspaces under hidden parent directories are invisible to fleet scan. The Set reconstruction is wasteful but not blocking.

**Fix**: (a) Document that fleet roots must not be nested under hidden directories, or (b) add a `includeHiddenDirs` config option. (c) Hoist the `excludeSet` creation above the recursive loop -- pass it as a parameter instead of rebuilding per call.

---

### M-04: `diff.ts` reads manifest twice per snapshot -- redundant I/O after integrity verification [M]

**File**: `claws-sdk/src/snapshot/diff.ts:344-350` (first read for verification)
**File**: `claws-sdk/src/snapshot/diff.ts:365-366` (second read for timestamps)

The `diff()` function reads manifests in the verification loop (line 345), then reads them again at lines 365-366 to get timestamps. Each `readManifest` call is a file read + JSON parse. For a snapshot with many files, this doubles the manifest I/O.

**Impact**: Performance issue, not correctness. At fleet scale where snapshots may be large (hundreds of governance files), this doubles the manifest read time unnecessarily.

**Fix**: Capture the manifests from the verification loop and reuse them:

```ts
const manifests = new Map<string, SnapshotManifest>();
for (const name of [baseName, targetName]) {
  const manifest = await readManifest(workspaceRoot, name);
  manifests.set(name, manifest);
  // ... verify
}
const baseManifest = manifests.get(baseName)!;
const targetManifest = manifests.get(targetName)!;
```

---

### W-01: Fleet-wide drift detection is sequential -- no parallelism for 47 workspaces [W]

**File**: `claws-sdk/src/fleet/drift.ts:111-112`

`detectDrift()` processes workspaces in a sequential `for` loop. Each iteration computes a governance hash (reading claws.json + policies + governance-ir.json) and optionally classifies severity (reading trust tiers and policy files from both the workspace and the reference). For 47 governed workspaces, this is 47 sequential file-system traversals. The fleet module already has `runParallel` from `runner.ts` with configurable concurrency, but drift detection doesn't use it.

**Impact**: Weekly `claws drift` across 47 workspaces takes 47x longer than necessary. The platform-eng's "detect drift before it causes incidents" workflow is slower than it should be.

**Fix**: Use `runParallel` from `runner.ts` with the fleet's concurrency setting (default 8) to parallelize drift detection:

```ts
const { results } = await runParallel(
  workspacePaths.map((p) => ({ path: p })),
  async (item) => {
    /* compute hash, classify severity, match exception */
  },
  concurrency,
);
```

---

### W-02: Fleet-wide kill is sequential -- `killFleet` doesn't use `runParallel` [W]

**File**: `claws-sdk/src/fleet/kill-fleet.ts:62-70`

Similar to W-01, `killFleet()` iterates workspaces sequentially. Each `guardedKill` call reads a sentinel, potentially writes one, and records an audit event. For 47 workspaces, an emergency fleet kill takes 47x longer than necessary. The kill switch is an emergency mechanism -- speed matters.

**Impact**: Emergency fleet kill during an incident is slower than it should be. When I need to kill 47 workspaces because of a compromised policy, every second counts.

**Fix**: Use `runParallel` with high concurrency for kill operations (each workspace's kill is fully independent).

---

### W-03: `broadcastPolicy` processes workspaces sequentially -- not fleet-scale [W]

**File**: `claws-sdk/src/fleet/broadcast.ts:329-371`

The confirm-mode broadcast loop processes workspaces one at a time. Trust compat check, then atomic write, then next workspace. Broadcast is the most latency-sensitive fleet operation (pushing a policy to 47 workspaces). The atomic write includes retry logic with exponential backoff, so a single EBUSY workspace can stall the entire broadcast for seconds while the other 46 wait.

**Impact**: `claws broadcast --confirm` across 47 workspaces is unnecessarily slow. One Windows workspace with a locked file delays the entire fleet.

**Fix**: Use `runParallel` with the fleet concurrency setting. Each workspace's broadcast (trust check + atomic write) is independent.

---

### W-04: `checkFleetTrustCompat` is also sequential [W]

**File**: `claws-sdk/src/fleet/trust-compat.ts:153-159`

Same pattern as W-01/W-02/W-03. Fleet trust compatibility check runs a sequential loop over workspace paths. Each check reads claws.json and the policy YAML, which are independent per-workspace.

**Impact**: Pre-flight trust check before broadcast is slower than necessary.

**Fix**: Parallelize using `Promise.all` or `runParallel`.

---

### W-05: `collectFiles` in save.ts and promote.ts are duplicate implementations [W]

**File**: `claws-sdk/src/snapshot/save.ts:52-71` (`collectFiles`)
**File**: `claws-sdk/src/snapshot/promote.ts:105-124` (`collectAllFiles`)

These are functionally identical recursive directory-walking functions with slightly different names. Both read a directory, check if entries are files or subdirectories, and recurse. Code duplication increases maintenance burden and divergence risk.

**Impact**: A bug fix in one copy may not be applied to the other. Not a fleet operational issue, but a maintenance concern.

**Fix**: Extract a shared `collectFilesRecursive` utility into a common module (e.g., `snapshot/util.ts`) and import from both `save.ts` and `promote.ts`.

---

### W-06: `loadGovernanceIR` is duplicated in diff.ts and promote.ts [W]

**File**: `claws-sdk/src/snapshot/diff.ts:102-117`
**File**: `claws-sdk/src/snapshot/promote.ts:75-89`

Same function, same logic, same return type. Both load the pre-compiled GovernanceIR from a snapshot's `files/.claws/compiled/governance-ir.json`.

**Impact**: Same as W-05 -- maintenance divergence risk.

**Fix**: Extract to a shared location (e.g., `snapshot/storage.ts` alongside `readManifest`).

---

### W-07: Exception pattern matching is overly broad -- `includes` can match unintended paths [W]

**File**: `claws-sdk/src/fleet/exception.ts:50`

The match logic is: `normalizedPath.endsWith(pattern) || normalizedPath.includes(pattern)`. The `includes` check means a pattern like `test` matches any workspace containing "test" anywhere in its path: `/c/src/attestation/workspace`, `/c/src/contest/ws`, etc. This is too broad for fleet exception matching where precision matters -- one exception could inadvertently suppress drift alerts for many unrelated workspaces.

**Impact**: An exception pattern like `staging` intended for `/c/fleet/staging` would also suppress drift for `/c/fleet/staging-backup`, `/c/fleet/old-staging-copy`, etc. Drift goes undetected in workspaces that should be monitored.

**Fix**: Either (a) require full path patterns or glob patterns with proper glob matching, or (b) at minimum, require the pattern to match only the final path segment (basename) rather than any substring. Document the matching behavior explicitly.

---

### W-08: `severity.ts` deny-rule detection uses naive regex on YAML [W]

**File**: `claws-sdk/src/fleet/severity.ts:157-162`

`collectDenyRules` uses a line-by-line regex `/^\s*-\s*deny:\s*(.+)/` to find deny rules in policy YAML files. This misses multi-line deny blocks, YAML anchors/aliases, and deny rules nested inside `when:` conditions. A sophisticated policy using YAML features could have deny rules that this regex doesn't detect, leading to incorrect severity classification (the drift shows as LOW when it should be HIGH because a deny constraint was actually removed).

**Impact**: Severity misclassification for workspaces using advanced YAML policy syntax. The platform-eng might triage a CRITICAL policy removal as LOW and miss an urgent remediation.

**Fix**: Use a proper YAML parser (the `yaml` package is already a dependency -- it's used in `broadcast.ts:129`). Parse the policy files, walk the structure to find deny entries.

---

### N-01: `discoverWorkspacePaths` uses sequential recursion -- could use breadth-first with concurrency [N]

**File**: `claws-sdk/src/fleet/scan.ts:97-108`

The directory traversal is sequential and depth-first. For wide directory trees, this is fine. For deep trees with many sibling directories, a breadth-first approach with concurrent readdir calls could improve discovery speed. Not urgent -- the classify phase (which IS parallelized via `runParallel`) is the slower part.

---

### N-02: `runner.ts` completion check uses array length sum -- non-atomic read [N]

**File**: `claws-sdk/src/fleet/runner.ts:53`

The completion check `results.length + errors.length >= total` reads two mutable arrays whose lengths could change between reads in concurrent callbacks. In practice, V8's single-threaded event loop means this is safe because the `.finally()` callbacks run on the microtask queue (one at a time). But the pattern is fragile -- a future refactor using worker threads would break it.

**Impact**: Currently safe due to V8's event loop model. Noted for awareness, not a fix requirement.

---

### N-03: `recoverOrphanedStaging` is a good resilience pattern [N]

**File**: `claws-sdk/src/fleet/broadcast.ts:251-278`

The orphaned staging recovery function is excellent fleet hygiene. After a crash or SIGKILL during broadcast, `claws broadcast` can recover partial writes on the next run. This is exactly the kind of resilience pattern fleet operations need.

---

### N-04: `Dirent` cast in scan.ts is safe but unnecessary [N]

**File**: `claws-sdk/src/fleet/scan.ts:90`

`await readdir(rootDir, { withFileTypes: true }) as Dirent[]` -- the cast is unnecessary since `readdir` with `{ withFileTypes: true }` already returns `Dirent[]`. The import of `type Dirent from 'node:fs'` at line 12 and the cast are both redundant with Node 20+.

---

### N-05: `csvEscape` handles commas, quotes, and newlines correctly [N]

**File**: `claws-sdk/src/fleet/report-format.ts:89-94`

Windows paths with backslashes don't need CSV escaping (backslash is not a CSV special character). The function correctly escapes commas, double quotes, and newlines. Fleet report CSV export will work correctly when paths contain these characters.

---

### N-06: Atomic write fallback to `copyFile` on final retry is good Windows resilience [N]

**File**: `claws-sdk/src/fleet/broadcast.ts:218-224`

The fallback from rename to copyFile after exhausting retries handles the case where rename fails due to cross-device move (e.g., NTFS junction points, mapped drives). This is correct for fleet environments where workspace storage may span volumes.

---

## Lens Checklist

| Question                                                               | Assessment                                                                                                                                                                                |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Does `claws broadcast` reliably push this to 47 workspaces?            | Functionally yes, but sequentially (W-03). Atomic writes with retry are solid. Trust compat enforcement is correct.                                                                       |
| Does `claws drift` detect when a workspace diverges from fleet policy? | Yes -- governance hash comparison works. But sequential execution (W-01) makes it slow, exception matching is too broad (W-07), and severity classification uses naive YAML regex (W-08). |
| Does `claws doctor --post-upgrade --fleet` handle the monthly upgrade? | Not directly in CP-3 scope, but snapshot save/restore provides the rollback mechanism for upgrade failures.                                                                               |
| Can I see fleet-wide compliance in one command?                        | `claws report` produces compliance matrix in CSV/JSON/table. BUT M-01 means killed workspaces show as active -- compliance posture is misreported.                                        |
| What happens when 3 of 47 workspaces fail the upgrade?                 | Snapshot restore with integrity verification provides clean rollback. Promote gate (pinch) prevents non-compliant snapshots from reaching the fleet registry. Good.                       |
| Does the CI/CD pipeline work with GitHub Enterprise?                   | Not directly tested in CP-3 scope.                                                                                                                                                        |

---

## Verdict

**4 Major, 8 Warning, 6 Note**

M-01 (kill path mismatch) is the highest priority -- it makes fleet compliance reports silently wrong. A killed workspace showing as `active` is a governance blindspot. M-02 (locale-dependent hash ordering) is a latent correctness bug that will bite when snapshots cross platform boundaries. M-03 and M-04 are lower severity but still affect fleet reliability and performance.

The sequential processing pattern (W-01 through W-04) is a systemic issue -- four fleet-level operations are sequential when the infrastructure for parallelism (`runParallel`) already exists in the codebase. This should be addressed holistically rather than piecemeal.

The snapshot system's integrity design (SHA-256 per-file + composite hash + provenance chain + tamper detection) is strong. The fleet registry's versioned storage prevents overwrites. The broadcast module's atomic write + retry + orphaned staging recovery is exactly what fleet operations need. The overall architecture is correct; the findings are execution details, not design flaws.
