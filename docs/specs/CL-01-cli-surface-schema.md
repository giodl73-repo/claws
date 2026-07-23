# CL-01: CLI Surface & Schema

**Status**: Draft v1.2
**Source**: Q12a, Q12c, Q12d, Q12g
**Reviewers**: platform-engineer, enterprise-architect, ux-designer

## Version History

| Version | Change                                                                                                                                                                                                                                             | Source                                                                                                   |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| v1.2    | Scenario findings audit (claws-compile-dx R1): watch debounce/cleanup strengthened, cache CLI idempotence + missing-dir + ISO 8601 + shared resolver + clear safety, fleet diagnostic shape + observability + arg validation + deterministic order | `.craft/waves/260412+ra-the-radiant+claws-graduation/panels/claws-compile-dx-findings-audit/R1-audit.md` |
| v1.1    | `claws watch`, `claws cache {stats, prune, clear, list}`, `claws fleet compile` commands added                                                                                                                                                     | claws-compile-dx plan — watch/cache/fleet commands                                                       |
| v1.0    | Initial Draft — 40-command surface, 8 groups, claws.json v2 schema                                                                                                                                                                                 | Q12a-d, Q12g                                                                                             |

---

## Overview

This spec defines the complete external-facing surface of `claws` -- the cross-platform agent governance compiler. It consolidates four research questions that determined: one CLI (not two), 40 commands across 8 groups, the name `claws`, and the three-layer `claws.json` v2 schema.

The CLI surface is the product's first impression. Every command, flag, and config field reflects the design principle that governance should feel like a developer tool first and an enterprise platform second. Progressive disclosure (4/18/40) ensures a new user sees `claws init` and `claws check`, not `claws kill --fleet --confirm`.

The `claws.json` schema is the workspace-level configuration contract. Its three-layer design (core/targets/detection) scales from a 4-line minimal config to a 33-line fleet-managed enterprise setup without requiring platform-specific knowledge for the common case.

## Scope

**In scope**:

- 40-command surface (8 groups) with SDK mapping
- Progressive disclosure tiers (Maker 4 / Developer 18 / Advanced 40)
- Scope model (workspace-default, `--fleet` escalation, `--confirm` for destructive ops)
- Cross-cutting flags (27 flags across all commands)
- `claws.json` v2 schema (TypeScript types, three-layer architecture)
- Platform detection matrix (7 platforms, marker files, enforcement tiers)
- Workspace layout after `claws init`
- Cross-compile targets and build output
- `CLAWS_BYPASS=1` emergency override
- Bare `claws` invocation behavior (workspace-aware)

**Out of scope**:

- Runtime enforcement mechanics (CL-03)
- Security rules and governance model (CL-02)
- Compilation pipeline internals (CL-04)

**Depends on**: None (foundational spec)

## Design

### Command Surface (40 commands, 8 groups + uninstall)

| Group       | Commands                                                                                     | Count     | Scope               |
| ----------- | -------------------------------------------------------------------------------------------- | --------- | ------------------- |
| **Build**   | init, build, build \<target\>, compile, optimize, test, diff, import, inspect, doctor, amend | 11        | Always workspace    |
| **Check**   | check, check --fix/--watch/--strict/--staged/--fleet                                         | 2 + flags | Scope-sensitive     |
| **Comply**  | comply, comply \<framework\>, assess                                                         | 3         | Scope-sensitive     |
| **Audit**   | audit, audit verify, audit export, audit history                                             | 4         | Workspace + 1 fleet |
| **Snap**    | snap save/restore/diff/promote                                                               | 4         | Scope-sensitive     |
| **Fleet**   | scan, broadcast, drift, report, push, kill, compile                                          | 7         | Always fleet        |
| **Protect** | budget, secrets init, secrets set, identity                                                  | 4         | Scope-sensitive     |
| **Live**    | watch, session, amend                                                                        | 3         | Always workspace    |
| **Cache**   | cache stats, cache prune, cache clear, cache list                                            | 4         | Always workspace    |
| **Maker**   | new skill, publish, annotate, import                                                         | 4         | Always workspace    |
| **Meta**    | uninstall                                                                                    | 1         | Always workspace    |

### Progressive Disclosure

```
Maker (4 commands -- "5 minutes to governed"):
  claws init            Set up governance for your workspace
  claws build           Compile and emit your agent
  claws check           Check against your org's policies
  claws build cursor    Cross-compile to another platform

Developer (18 commands -- full build + governance):
  Build:  init build compile optimize test diff import inspect watch amend doctor
  Govern: check comply assess audit

Advanced (45 commands -- fleet + snapshots + protect + cache + maker + meta):
  + snap [save|restore|diff|promote]
  + scan broadcast drift report push kill
  + fleet compile
  + cache [stats|prune|clear|list]
  + budget secrets [init|set] identity session
  + new skill, publish, annotate, import
  + uninstall
```

### Scope Model

6 scope-sensitive commands accept `--fleet`:

| Command                | Default   | --fleet | --confirm         |
| ---------------------- | --------- | ------- | ----------------- |
| check                  | workspace | Yes     | No                |
| comply                 | workspace | Yes     | No                |
| snap save/restore/diff | workspace | Yes     | No                |
| budget                 | workspace | Yes     | No                |
| kill                   | workspace | Yes     | **Yes (--fleet)** |

Inherently-fleet commands (scan, broadcast, drift, report, push) do not need `--fleet`. Inherently-workspace commands (build, compile, test) do not accept it.

### Cross-Compile Targets

| Target    | Platform       | Output                                             |
| --------- | -------------- | -------------------------------------------------- |
| openclaw  | OpenClaw       | SOUL.md amendments + governance skill + tool hooks |
| cursor    | Cursor         | .cursorrules governance section                    |
| claude    | Claude Code    | CLAUDE.md section + .claude/settings.json          |
| github    | GitHub Copilot | .github/copilot-instructions.md section            |
| bedrock   | AWS Bedrock    | Guardrail policy JSON                              |
| langgraph | LangGraph      | Python guard decorators                            |
| crewai    | CrewAI         | YAML guard config                                  |
| _(auto)_  | _(detected)_   | _(best match from workspace files)_                |

### claws.json v2 Schema

```typescript
type ClawsConfig = {
  $schema?: string; // IDE autocomplete URL
  version: 2; // schema version
  platform?: Platform; // explicit detection override
  enabled: boolean; // master toggle
  template?: PolicyTemplate; // soc2, hipaa, eu-ai-act, minimal
  trustTier?: TrustTier; // T0-T4, default T2 (REQUIRED default — omission defaults to T2, never undefined)
  policies?: string[]; // paths to policy YAML files
  audit?: AuditConfig; // chain, SIEM, retention
  budget?: BudgetConfig; // ceiling, unit, enforcement, warnAt
  compliance?: ComplianceConfig; // frameworks, autoAssess, signing
  fleet?: FleetConfig; // registryUrl, groups, driftHash
  failMode?: FailModeConfig; // per-tool, per-risk, global overrides
  performance?: PerformanceConfig; // hookTimeoutMs, budgets
  targets?: Partial<Record<Platform, TargetConfig>>;
};

type FailModeConfig = {
  global?: "fail-open" | "fail-closed"; // overrides per-risk defaults (Source: SCV-S12-F01)
  r3r4?: "fail-open" | "fail-closed"; // default: 'fail-closed' (Source: SCV-S04-F05)
  perTool?: Record<string, "fail-open" | "fail-closed">; // highest precedence
};

type PerformanceConfig = {
  hookTimeoutMs?: number; // default: 50, ceiling: 500 (Source: SCV-S15-F01)
};

type Platform = "openclaw" | "cursor" | "claude" | "github" | "bedrock" | "langgraph" | "crewai";

type TrustTier = 0 | 1 | 2 | 3 | 4;

type TargetConfig = {
  trustTier?: TrustTier; // overrides core (can only raise)
  policies?: string[]; // appends to core (never weakens)
  config?: PlatformSpecificConfig; // 3-5 fields per platform
};
```

**Three-layer architecture**:

1. **Core** (platform-agnostic): enabled, trustTier, policies, audit, budget, compliance, fleet
2. **Targets** (platform-specific): per-platform build config and governance overrides
3. **Detection** (auto + explicit): `platform` field overrides auto-detection from workspace files

### Platform Detection Matrix

| Platform       | Primary Marker                  | Confidence        | Default Trust | Enforcement              |
| -------------- | ------------------------------- | ----------------- | ------------- | ------------------------ |
| OpenClaw       | SOUL.md                         | Definitive        | T2            | Runtime (Gateway hooks)  |
| Cursor         | .cursorrules                    | Definitive        | T1            | Advisory (instructions)  |
| Claude Code    | CLAUDE.md                       | Definitive        | T2            | Semi-enforced            |
| GitHub Copilot | .github/copilot-instructions.md | Definitive        | T1            | Advisory                 |
| AWS Bedrock    | _(none reliable)_               | Requires explicit | T3            | Runtime (API guardrails) |
| LangGraph      | langgraph.json                  | Definitive        | T2            | Runtime (decorators)     |
| CrewAI         | crewai.yaml                     | Definitive        | T2            | Semi-enforced            |

Detection priority: `targets` map > `platform` field > auto-detect from workspace files.

### Workspace Layout

After `claws init --template soc2`:

```
my-agent/
  [platform workspace files]           -- existing
  claws.json                           -- governance config
  .claws/                              -- governance artifacts
    policies/soc2-baseline.yaml        -- from template
    audit/chain.jsonl                  -- hash-chained append-only log
    cache/compile/                     -- compiled IR cache
    cache/boost/                       -- optimization cache
    cache/eval/                        -- evaluation cache
    cache/snapshots/                   -- named snapshots
    secrets/vault.enc                  -- AES-256-GCM encrypted secrets
    compliance/                        -- signed compliance artifacts
  build/                               -- cross-compilation output (gitignored)
```

### SDK Mapping

All commands route through `claws-sdk`, which is a sibling to `craftworks-sdk` built on `compiler-sdk` + `agent-sdk`. `claws-sdk` does NOT import `craftworks-sdk`. Ever. (See CL-04 sibling architecture.)

| claws group | SDK package | Module                                | Underlying SDK                        |
| ----------- | ----------- | ------------------------------------- | ------------------------------------- |
| Build       | claws-sdk   | build/*                               | compiler-sdk (astro/*)                |
| Pinch       | claws-sdk   | guard/*                               | agent-sdk (GovernanceManager)         |
| Comply      | claws-sdk   | guard/comply                          | agent-sdk (compliance)                |
| Audit       | claws-sdk   | audit/*                               | agent-sdk (audit chain)               |
| Snap        | claws-sdk   | cache/snapshot                        | compiler-sdk (cache)                  |
| Fleet       | claws-sdk   | fleet/*                               | agent-sdk (fleet)                     |
| Protect     | claws-sdk   | guard/budget, guard/secrets, identity | agent-sdk (budget, secrets, identity) |
| Live        | claws-sdk   | session/*                             | compiler-sdk (astro/session)          |
| Maker       | claws-sdk   | maker/*                               | compiler-sdk (skill compilation)      |
| Meta        | claws-sdk   | meta/*                                | (self-contained)                      |

### Bare `claws` Invocation (Workspace-Aware)

Running `claws` with no arguments is workspace-aware. It detects the current state and guides the user to the next action:

```
$ claws                                    # No claws.json found
  claws — governance for every agent

  No governance config found. Get started:
    claws init                   Set up governance (creates claws.json)

  Run 'claws --help' for all commands.

$ claws                                    # claws.json exists, never built
  claws — governance for every agent

  Workspace: my-agent/ (OpenClaw detected, T2)
  Status: configured but never built

  Next steps:
    claws build                  Compile and emit your agent
    claws check                  Check against your org's policies

$ claws                                    # claws.json exists, built, 2 violations
  claws — governance for every agent

  Workspace: my-agent/ (OpenClaw, T2)
  Last build: 2026-04-11 09:15 (847 tokens)
  Last check: 2 violations (1 high, 1 medium)

  Next steps:
    claws check --fix            Auto-fix 1 of 2 violations
    claws check                  Re-check after manual fix
```

### `claws init` Defaults

`claws init` with no flags defaults to `--template minimal`. It is not an error:

```bash
claws init                     # equivalent to: claws init --template minimal
claws init --template soc2     # explicit template selection
claws init --template hipaa    # HIPAA-specific governance defaults
```

The `minimal` template creates a `claws.json` with `enabled: true`, `trustTier: 2`, and zero policy files. It is the simplest valid governance configuration.

### `claws check` Output Format

`claws check` is the primary terminal interface. Its output format is designed for human readability:

```
$ claws check
  ✓ G-CLASS    Tool risk classification          PASS
  ✓ G-ELICIT   OBO elicitation gates             PASS
  ✗ G-A2A-TRUST  Inter-agent trust boundaries    FAIL  [HIGH]
      → agents.yaml:14 — agent "research" trusts "drafting" but no trust group defined
        Fix: add trust-group declaration in agents.yaml or claws.json
        Docs: https://claws.dev/rules/G-A2A-TRUST
  ✗ G-INPUT    Input sanitization                FAIL  [MEDIUM]
      → TOOLS.md:47 — tool "web-fetch" has no input sanitizer
        Fix: run `claws check --fix` to add @claws/security sanitizer stub
        Docs: https://claws.dev/rules/G-INPUT

  2 violations (1 high, 1 medium) in 0.3s
  1 auto-fixable — run `claws check --fix`
```

**Output contract**:

- Each rule shows: check mark or cross, rule ID, description, PASS/FAIL
- Failures show: severity in brackets `[HIGH]`, colored (red=critical/high, yellow=medium, dim=low)
- Each violation shows: `file:line` location, what is wrong, how to fix it, where to learn more
- Summary line: total violations, severity breakdown, elapsed time
- Auto-fix hint when applicable

**Color coding** (respects `NO_COLOR` and `--no-color`):

- Green: PASS
- Red: FAIL (critical/high)
- Yellow: FAIL (medium)
- Dim: FAIL (low)

### `claws uninstall`

Clean removal of all claws artifacts from a workspace:

```bash
claws uninstall                  # Remove claws.json + .claws/ from workspace
claws uninstall --keep-audit     # Preserve .claws/audit/ (hash chain)
claws uninstall --keep-secrets   # Preserve .claws/secrets/
claws uninstall --global         # Remove ~/.claws/ global config
```

**Behavior**:

- Backs up `.claws/` to `~/.claws-backups/<workspace-name>-<timestamp>/` before deletion
- Removes `claws.json` and `.claws/` directory
- Does NOT modify platform workspace files (SOUL.md, .cursorrules, etc.)
- Does NOT remove `build/` output (gitignored, harmless)
- Prints what was removed and where the backup lives
- `--keep-audit` and `--keep-secrets` can be combined

### `claws watch` (Live group)

`claws watch` observes the workspace directory and triggers an incremental compile whenever any of the 9 OC input files changes:

```bash
claws watch                          # defaults: debounce 300ms
claws watch --debounce 500           # override debounce window (ms)
```

**Watched inputs**: the 9 governance input files
`SOUL.md`, `TOOLS.md`, `AGENTS.md`, `MEMORY.md`, `IDENTITY.md`, `USER.md`, `HEARTBEAT.md`, `lobster.yaml`, and `skills/*/SKILL.md` (recursive within `skills/`).

**Behavior**:

- **MUST** trigger an incremental compile on every change event for any watched input. Compilation routes through the same per-subsystem cache path documented in CL-04 §Incremental Stages -- unchanged readers MUST short-circuit on `cacheHit: true`.
- **MUST** debounce rapid-fire edits using **trailing-edge** semantics: the debounce timer resets on every new fs event and fires `<debounce-window>` ms AFTER the last event, never after the first. Leading-edge or leading+trailing debounce is prohibited because it either loses mid-burst edits or doubles compile work. Default window is 300ms; a 10-edit burst **MUST** coalesce into `≤ 3` compile runs. _(Source: watch/S01-F01, S02-F02)_
- **MUST** coalesce duplicate filesystem events inside the debounce window. Editors that save via temp-file-then-rename (VS Code on Windows, many macOS editors) produce multiple fs events for a single logical save; the watcher MUST treat them as one edit, not N. _(Source: watch/S01-F02)_
- **MUST** serialize per-workspace compile invocations OR carry a monotonic compile-generation number and discard stale writes. In-flight compiles MUST NOT have their emit output overwritten by late writes from earlier generations. _(Source: watch/S02-F01)_
- **MUST** read input files at compile time, not at fs-event dispatch time, so OS write buffering cannot cause the compile to observe a pre-edit byte image. The "last edit content reflected" guarantee depends on re-stat / re-read at compile entry. _(Source: watch/S02-F03)_
- **MUST** keep the `CompilationCache` lifetime span the watch SESSION, not per-compile. Instantiating a fresh cache per compile defeats incremental compile because reader stages have no cached data to short-circuit on. _(Source: watch/S01-F03)_
- **MUST** publish the same compile events used by the in-process path to a `CompilerEventBus` (see CL-14 §9 CompilerEventBus). The watch session is a primary bus publisher.
- **MUST** exit cleanly on Ctrl-C (SIGINT). Clean exit means, in order:
  1. Stop the fs watcher from accepting new events (call `watcher.close()` and **await** its completion — chokidar's native watch handles do not release automatically and a synchronous `process.exit()` leaks them, causing `ERROR_SHARING_VIOLATION` on Windows and kqueue descriptor exhaustion on macOS). _(Source: watch/S03-F01)_
  2. Allow any in-flight compile to complete OR discard cleanly — if discarded, the already-existing emit file from the previous successful compile MUST remain intact (no partial overwrite).
  3. Emit output writes MUST use tempfile-plus-atomic-rename, never in-place writes, so an interrupted compile leaves either the old complete file or the new complete file — never a partial. _(Source: watch/S03-F02)_ _(See also CL-04 emit pipeline.)_
  4. Clean up any leftover emit tempfiles (e.g. `plugins/claws-governance/index.ts.tmp-<pid>`) on SIGINT OR on next-startup sweep. _(Source: watch/S03-F07)_
  5. Exit with code `0` within 2000ms.
- **MUST** handle a second SIGINT arriving during cleanup as a force-exit trigger. A 1-second timeout fallback applies: if `watcher.close()` hangs or a second SIGINT arrives, the process exits with code `1` and logs a warning. Impatient users hitting Ctrl-C twice must not be deadlocked on a slow close. _(Source: watch/S03-F05)_
- **MUST** register for SIGBREAK alongside SIGINT on Windows. cmd.exe and PowerShell may send SIGBREAK where Git Bash forwards SIGINT; both MUST be treated as clean-exit triggers. _(Source: watch/S03-F08)_
- **SHOULD** print a single-line compile summary per change to stdout: timestamp, triggering path (as a **workspace-relative path**, NEVER absolute — absolute paths leak user home directories into logs and break snapshot tests across machines), elapsed, stage cacheHit count, diagnostic count. The per-change summary format is part of the CLI contract; downstream parsers (editor integrations, CI log readers) rely on stable column shape. _(Source: watch/S01-F05)_

**Flags**:

| Flag              | Type    | Default | Description                                                    |
| ----------------- | ------- | ------- | -------------------------------------------------------------- |
| `--debounce <ms>` | number  | 300     | Debounce window for coalescing rapid-fire edits. Minimum 50ms. |
| `--no-color`      | boolean | false   | Disable ANSI colors in compile summaries.                      |

**Exit codes**:

- `0` -- Ctrl-C received after clean shutdown
- `130` -- terminated by SIGINT without completing shutdown (reserved for watcher leaks — must never occur under the cleanup MUST)

**Output contract** (per-change line):

```
$ claws watch
  claws watch -- debouncing 300ms, watching 9 inputs
  09:14:22  SOUL.md           compile  142ms  cacheHit 8/9  diagnostics 0
  09:14:41  skills/ingest/SKILL.md  compile  218ms  cacheHit 7/9  diagnostics 1 [MEDIUM]
  ^C  watcher stopped, no orphan processes
```

Implementation lands in pulse TBD of Ra CP-4 (Publish).

### `claws cache` (Cache group)

The `claws cache` subcommand surfaces operator control over the compilation cache. It shares the same `CompilationCache` API used by the compile path (see CL-04 cache key derivation).

#### Shared contract (all cache subcommands)

- **MUST** resolve the cache directory through a **single shared function** (e.g. `resolveCacheDir(workspaceRoot)`) used by both the CLI path and the compile path. Two separate resolvers (CLI reads one location, compile writes another) would pass the round-trip test in isolation but break real operator workflows. _(Source: cache-cli/S01-F01)_
- **MUST** treat "cache directory does not exist" and "cache directory exists but empty" as **identical states** for all read commands (`stats`, `list`). Read paths MUST NOT fail with ENOENT on a fresh checkout; they report zero-state. _(Source: cache-cli/S02-F01)_
- **MUST** emit stable JSON shapes. Each subcommand's JSON output schema is a versioned contract (field names, types, required-vs-optional). Additions are backwards-compatible; renames or removals are a breaking change requiring a major version bump. Dashboards and CI pipelines parse by field name. _(Source: cache-cli/S01-F02)_
- Read commands (`stats`, `list`) **MUST NOT** create the cache directory. Only write paths (compile, `clear`) may lazily create the directory. An operator running `cache stats` before any compile reads a zero-state without provisioning an empty directory on a read-only system. _(Source: cache-cli/S02-F06)_
- Any lazily-created cache directory **MUST** use deterministic, umask-respecting permissions. A dir created 0700 on one invocation and 0755 on another (mixed sudo/non-sudo) breaks cross-user access. _(Source: cache-cli/S02-F10)_
- No-op paths (empty cache, zero matches) **MUST** exit `0`. A CI pre-clean step like `claws cache clear` must not need defensive `|| true`. _(Source: cache-cli/S02-F03)_

```bash
claws cache stats                     # print cache statistics as JSON
claws cache prune --older-than 7d     # prune entries older than duration
claws cache clear                     # empty the cache directory
claws cache list                      # list entries (table format)
claws cache list --json               # list entries (JSON, one entry per line)
```

#### `claws cache stats`

- **MUST** print a single JSON object to stdout with exactly these keys:
  - `sizeBytes` (number) -- total on-disk size of cache entries
  - `entryCount` (number) -- count of cache entries
  - `hitCount` (number) -- cumulative cache-hit count since last explicit counter reset (see `cache clear --reset-counters` below)
  - `missCount` (number) -- cumulative cache-miss count since last explicit counter reset
  - `version` (string) -- cache schema version (tracks `CompilationCache` contract)
- On an empty cache (no entries, missing dir, or post-clear), **MUST** emit the full schema with zero values (`entryCount: 0`, `sizeBytes: 0`), never an empty object `{}`. Dashboards charting cache size over time rely on field presence. _(Source: cache-cli/S02-F05)_
- Exit `0` on success, `1` on unreadable cache directory.

#### `claws cache prune --older-than <duration>`

- **MUST** accept a duration string matching `/^\d+(s|m|h|d)$/` (e.g., `30s`, `15m`, `24h`, `7d`).
- **MUST** remove cache entries whose `lastAccess` is older than the provided duration.
- **MUST** print a summary line: `pruned <N> entries (<M> bytes)`.
- **MUST** exit `0` when zero entries match (no-op is not an error).

#### `claws cache clear`

- **MUST** empty the cache directory (delete all entries; directory itself remains).
- **MUST** exit `0` even if the cache was already empty.
- **MUST NOT** touch `.claws/audit/`, `.claws/secrets/`, or `.claws/snapshots/` -- only compile/boost/eval caches.
- **MUST** be tolerant of concurrent callers. If two processes run `claws cache clear` simultaneously (e.g., parallel CI jobs), ENOENT from a file disappearing mid-traversal is NOT an error. The implementation MUST handle race-free "directory already empty" states. _(Source: cache-cli/S02-F02)_
- **MUST NOT** reset `hitCount` / `missCount` counters by default. Clearing entries and zeroing telemetry are separate concerns — operators may want to clear entries (e.g., after an emit format change) while retaining hit-rate trends. `claws cache clear --reset-counters` is the explicit opt-in for counter reset. _(Source: cache-cli/S01-F07)_
- For interactive use, `claws cache clear` **MUST** require explicit `--yes` (or a confirmation prompt) to prevent accidental wipes when the command is mistyped. On an empty cache, the confirmation prompt SHOULD short-circuit — there is nothing to lose. _(Source: cache-cli/S01-F05, S02-F09)_

#### `claws cache list [--json]`

- Default output: human-readable table with columns `key`, `sizeBytes`, `created`, `lastAccess`.
- `--json`: emits one JSON object per line (newline-delimited JSON) with the same fields plus `stage` and `inputHash`. Machine-readable for pipelines.
- **MUST** sort output by a stable key (default: `lastAccess` descending; alternatively `key` lexicographic). Filesystem directory traversal order varies across filesystems and between runs; relying on it produces spurious diffs for operators comparing two `cache list` outputs. The chosen sort order MUST be documented. _(Source: cache-cli/S01-F06)_
- Timestamps (`created`, `lastAccess`) **MUST** be emitted as **ISO 8601 UTC** strings (e.g. `2026-04-16T14:23:00Z`), never Unix epoch seconds or locale-sensitive strings. ISO 8601 sorts lexicographically, is unambiguous, and standard for JSON APIs. _(Source: cache-cli/S01-F10)_
- On an empty cache, `cache list` (with or without `--json`) **MUST** produce `0` bytes on stdout and exit `0`. A human-readable "(no entries)" string would break ndjson consumers parsing "one JSON object per line". _(Source: cache-cli/S02-F04)_
- Exit `0` on success.

**Output contract** (`claws cache stats`):

```json
{ "sizeBytes": 184221, "entryCount": 47, "hitCount": 312, "missCount": 18, "version": "1" }
```

Implementation lands in pulse TBD of Ra CP-3 (Package Split).

### `claws fleet compile <fleet-dir>` (Fleet group)

`claws fleet compile` compiles every workspace under `<fleet-dir>` in parallel. It is the batch counterpart to `claws build`.

```bash
claws fleet compile /path/to/fleet                       # compile all workspaces, default concurrency
claws fleet compile /path/to/fleet --max-concurrency 4   # cap at 4 in-flight compiles
```

**Semantics**:

- **MUST** discover workspaces by walking immediate child directories of `<fleet-dir>` in **lexicographic order**. Deterministic traversal is required so repeated runs produce byte-stable aggregate output; filesystem readdir order varies and masks real regressions. _(Source: fleet/S01-F09)_
- **MUST** run compiles in parallel. Per-workspace cache state **MUST** be isolated -- concurrent compiles **MUST NOT** share any in-process cache mutable state. Each workspace uses its own `.claws/cache/` directory.
- **MUST** write per-workspace cache entries **atomically** (write-to-tempfile + rename, or equivalent). A failed workspace MUST leave NO cache residue — no partial entries, no corrupted lock files — so subsequent fleet runs do not observe phantom hits. _(Source: fleet/S01-F03)_
- **MUST NOT** short-circuit on per-workspace failure. Each failure is reported in the aggregate output; the remaining workspaces complete. Implementation MUST use `Promise.allSettled`-style semantics (or per-task `try`/`catch`) — never `Promise.all`, which cancels sibling promises on first rejection. _(Source: fleet/S01-F01)_
- **MUST** cap concurrent compiles to the value of `--max-concurrency` using a **real bounded semaphore or task queue**, not a runtime hint. A `Promise.all` with 10 promises ignores the flag entirely. The executor MUST acquire a permit before starting each compile and release it on completion. _(Source: fleet/S02-F01)_
- **MUST** validate `--max-concurrency` arguments at parse time: values `0`, negative integers, and non-integers MUST produce a clear error (`"--max-concurrency must be a positive integer"`) and exit with code `1`, not silently fall through. `--max-concurrency 1` MUST function as serial execution without deadlock. _(Source: fleet/S02-F04, S02-F06)_
- **MUST** handle SIGINT / SIGTERM gracefully: cancel pending compiles, report in-flight state (completed, cancelled, not-started) per-workspace, and leave no half-written plugin output on disk. _(Source: fleet/S01-F07)_

**Default concurrency tradeoff** _(Source: fleet/S02-F05)_: The default `--max-concurrency` value is `os.cpus().length`. On a 64-core build machine with a 1000-workspace fleet this spawns 64 parallel compiles, each potentially consuming hundreds of MB of memory. Operators running on memory-constrained CI runners SHOULD set `--max-concurrency` explicitly. The `--help` text MUST document the default and advise on memory budgeting.

**Structured diagnostic contract** _(Source: fleet/S01-F02, S01-F06)_: Per-workspace failures surface as structured `CompileDiagnostic` records, NOT free-form error strings. The diagnostic is a discriminated union with these required fields:

- `kind` (string) — one of `MissingSoulFile`, `MalformedLobsterYaml`, `MissingFrontmatterField`, `PermissionDenied`, `CompileFailed`, `EmitFailed`, `ValidationFailed` (extensible — new kinds additive-only per major version)
- `workspace` (string) — workspace-relative path under `<fleet-dir>`
- `stage` (string) — which pipeline stage failed (`parse`, `enforce`, `emit`, `validate`) so operators can route to the right remediation flow
- `message` (string) — human-readable explanation
- `path` (string, optional) — the specific file inside the workspace that failed, when known
- `exitCode` (number, optional) — if the failure was a subprocess crash

Consumers (CI dashboards, Horus hot-reload gateway) route by `kind` and `stage`; string-stringified errors break this routing.

**Observability output** _(Source: fleet/S02-F02, S01-F10)_: `--json` output MUST emit newline-delimited JSON (ndjson), one `FleetWorkspaceResult` per line, followed by a final aggregate `FleetSummary` line containing: `totalWorkspaces`, `succeeded`, `failed`, `skipped`, `wallClockMs`, `peakConcurrency`, `parallelismRatio`, `maxConcurrency`. Aggregate metrics exposed via `--stats` (text mode) or embedded in the final ndjson line (`--json` mode) let operators confirm the parallelism they requested actually happened — a fleet reporting `peakConcurrency: 1` with `--max-concurrency 3` is a silent concurrency bug the text output alone would not surface.

**Flags**:

| Flag                    | Type    | Default            | Description                                                     |
| ----------------------- | ------- | ------------------ | --------------------------------------------------------------- |
| `--max-concurrency <N>` | number  | `os.cpus().length` | Cap in-flight compiles.                                         |
| `--json`                | boolean | false              | Emit structured JSON aggregate instead of human-readable table. |

**Exit codes** (follows the P-174 fleet exit-code contract above):

- `0` -- every workspace compiled successfully
- `2` -- partial success (at least one workspace succeeded, at least one failed)
- `1` -- total failure (zero workspaces succeeded, or the fleet-dir itself could not be scanned)

**Output contract** (human-readable):

```
$ claws fleet compile ./fleet --max-concurrency 2
  claws fleet compile -- 3 workspaces, concurrency 2
  ✓  fleet/alpha       ok      312ms
  ✓  fleet/bravo       ok      284ms
  ✗  fleet/charlie     failed  OC-POLICY-E201 missing SOUL.md

  3 workspaces: 2 ok, 1 failed in 618ms
```

Implementation lands in pulse TBD of Ra CP-7 (Lobster Collaboration).

### `CLAWS_BYPASS=1` Emergency Override

Setting `CLAWS_BYPASS=1` in the environment disables all claws governance enforcement. This is the emergency escape hatch.

```bash
CLAWS_BYPASS=1 claws build      # Build without governance checks
CLAWS_BYPASS=1 claws check      # Check exits 0 with warning: "BYPASS active"
```

**Behavior**:

- All governance rules are skipped
- Audit chain records a `BYPASS` event (the bypass itself is audited)
- Terminal prints a prominent warning: `⚠ CLAWS_BYPASS=1 — governance disabled`
- Cannot be set in `claws.json` — environment variable only, for emergency use
- Fleet policies can prohibit bypass via `fleet.allowBypass: false`

## Constraints

- **One CLI**: Two CLIs (claws + clawops) were evaluated and rejected. `--fleet` scope flag replaces the second CLI.
- **Product-native naming**: `claws.json` + `.claws/` are per-workspace. The name `claws` signals cross-platform governance, not OpenClaw-specific tooling.
- **Schema backwards-compatibility**: V1 configs (from Q12a era) work indefinitely. `claws doctor --fix` migrates automatically.
- **V2 schema versioning is additive**: New fields are optional. No removals. At most one rename per version.
- **Target trustTier can only raise**: Per-target trustTier overrides core but cannot weaken governance. Per-target policies append, never replace.
- **Auto-detection must not require config**: A workspace with SOUL.md and no claws.json can still be detected and governed.
- **trustTier defaults to T2**: If `trustTier` is omitted from claws.json, the pipeline uses T2 as the default. The field must never be undefined at compile time -- downstream G-CLASS evaluation depends on it. _(Source: CP-S01-F02)_
- **claws.json parse error handling**: If claws.json contains invalid JSON, the pipeline must produce a distinct parse error (not a SOUL.md parse error). The required config file being unparseable is a critical path with dedicated diagnostics. _(Source: CP-S05-F04)_
- **Trust tier to risk level mapping (authoritative)**: T0=R1-max, T1=R2-max, T2=R3-max, T3=R4-max, T4=R5-max. This mapping must be defined in both CL-01 and CL-02 and kept consistent. _(Source: CFC-S02-F01)_
- **Strict mode in claws.json**: The strict/advisory mode flag belongs in claws.json configuration (`strict: boolean`), not as a CLI-only flag. This ensures strictness is part of the workspace configuration, not a per-invocation choice. _(Source: CFC-S03-F04)_
- **Per-target trust tier in ceiling check**: Per-target `trustTier` overrides in `targets.<platform>.trustTier` must be used when evaluating trust-ceiling violations for platform-specific artifacts. If the core trustTier is T2 but the OpenClaw target has trustTier: T4, R5 tools are allowed for OpenClaw but not for other platforms. _(Source: SCV-S11-F02)_
- **Default trustTier in ceiling error message**: When trustTier is omitted from claws.json and the default T2 produces a ceiling violation, the error message must explain the default: "trustTier not set -- defaulting to T2 (R3-max). Set trustTier: T4 in claws.json to allow R5 tools." _(Source: SCV-S11-F05)_
- **failMode schema fields**: The `failMode` section in claws.json v2 schema must define the full precedence hierarchy: `failMode.perTool: Record<string, "fail-open" | "fail-closed">`, `failMode.r3r4: "fail-open" | "fail-closed"`, `failMode.global: "fail-open" | "fail-closed"`. The schema must document the default value for r3r4 as "fail-closed". _(Source: SCV-S04-F05)_
- **hookTimeoutMs in performance config**: `claws.json#performance.hookTimeoutMs` must be in the schema with type number, default 50, minimum 1, maximum 500. Values above 500 are clamped at config load time with a warning. _(Source: SCV-S15-F01)_

## Anubis-Thoth Amendments

### Platform Detection (from platform-detection scenarios)

**Structural validation of marker file content** _(Source: PD-S01-F01)_: SOUL.md is also a common filename for non-OC projects (mission statements, philosophy documents). The detection logic must look for structural markers inside SOUL.md (frontmatter, constraint keywords like "never", "always", "must") to distinguish an OC governance file from an arbitrary SOUL.md. Without structural validation, false-positive detection is possible.

**Cross-platform precedence when targets map and marker file disagree** _(Source: PD-S01-F02)_: If `claws.json` has `targets: { cursor: { ... } }` but no `platform` field, and SOUL.md is present, the targets map takes precedence per the detection priority (targets map > platform field > auto-detect). The workspace is treated as Cursor despite SOUL.md being present. This cross-platform workspace scenario must be explicitly documented.

**Platform detection result must be available throughout pipeline** _(Source: PD-S01-F03)_: The detection result must propagate from PARSE to EMIT to configure the correct artifact set. If detection happens in PARSE but is not available in EMIT, the emit phase defaults to a generic artifact set that may miss platform-specific features (e.g., exec-approvals.json is OC-specific).

**Trust tier default source hierarchy** _(Source: PD-S01-F04)_: The default trust tier T2 is applied when `trustTier` is omitted from claws.json, but platform detection also sets a per-platform default (OpenClaw=T2, Cursor=T1). When these diverge, the trust tier must come from exactly one source: the claws.json default (T2), overridden by the platform-specific default only if explicitly specified in the platform detection table.

**Zero-config mode with synthetic defaults** _(Source: PD-S01-F05)_: A workspace with SOUL.md and no claws.json can be detected and governed. Without claws.json the pipeline must synthesize a minimal effective configuration: `platform=openclaw`, `trustTier=T2`, `enabled=true`, `policies=[]`. This synthetic config must be documented as the "zero-config governance" mode.

**Multi-platform detection and primary selection** _(Source: PD-S01-F06)_: Multiple marker files may coexist (e.g., SOUL.md and CLAUDE.md). The detection logic must detect all platforms, not just the first match. The primary platform (for default trust tier and enforcement) should be the one with the highest enforcement capability -- OpenClaw (runtime) over Claude Code (semi-enforced) over Cursor (advisory).

**Enforcement capability vs detection are independent** _(Source: PD-S01-F08)_: Detecting a platform (SOUL.md present) does not guarantee the enforcement runtime is available (OC Gateway may not be installed). A warning should be emitted if the generated governance plugin cannot be loaded by the current installation. Detection identifies the platform; enforcement depends on the runtime.

**Case-sensitive marker file matching on Linux** _(Source: PD-S01-F10)_: On Windows and macOS (case-insensitive FS), "soul.md" and "SOUL.md" are the same file. On Linux (case-sensitive FS), only "SOUL.md" matches. The detection logic must use the canonical filename with exact case on Linux and case-insensitive comparison on Windows/macOS. A Linux workspace with "soul.md" (lowercase) should not be detected as OpenClaw.

**T1 ceiling violation messaging for advisory platforms** _(Source: PD-S02-F02)_: The T1 default trust tier (R2-max) means any R3+ tools produce G-CLASS violations on Cursor. The error message for T1 ceiling violations must explain that advisory platforms default to T1 and suggest raising the trust tier explicitly in claws.json if the developer accepts unenforceable governance for higher-risk tools.

**Cursor marker forward-compatibility** _(Source: PD-S02-F04)_: Cursor may update its workspace file format (e.g., from `.cursorrules` to `.cursor/config.json`). The detection should also check for alternative Cursor markers (e.g., `.cursor/` directory structures) as a forward-compatibility measure.

**Delimiter-based section management for .cursorrules injection** _(Source: PD-S02-F03)_: The `.cursorrules` file has no formal schema -- it is plain text read as system prompt instructions. The governance section injected by claws must be clearly delimited (e.g., `<!-- claws governance start -->` ... `<!-- claws governance end -->`) so that re-compilation can replace the section without affecting user-authored content.

**Multi-platform ambiguity resolution** _(Source: PD-S02-F07)_: A workspace with both `.cursorrules` and `CLAUDE.md` is a multi-platform workspace. `claws build` must warn about multiple detected platforms and require explicit target selection rather than silently choosing one based on detection priority.

**Claude Code dual-surface emission** _(Source: PD-S03-F01)_: Claude Code has a dual enforcement model: CLAUDE.md is advisory (LLM instructions) while `.claude/settings.json` provides machine-enforced tool restrictions (allow/deny lists). The compiler must emit to both surfaces. If only CLAUDE.md is emitted, enforcement degrades to advisory-only.

**Delimiter safety for CLAUDE.md section injection** _(Source: PD-S03-F02)_: CLAUDE.md is both a source file for detection and a target for emission. Unlike `.cursorrules`, CLAUDE.md often contains extensive project-specific instructions. The emission must use delimiter-based section management with particular care since CLAUDE.md files tend to be larger and more structured (headings, code blocks).

**settings.json merge strategy with governance-first conflict resolution** _(Source: PD-S03-F03)_: `.claude/settings.json` already exists in many Claude Code workspaces with user-configured tool restrictions. The emit phase must merge claws-generated restrictions with existing user restrictions, not overwrite the file. When user settings and governance disagree, governance-first priority applies (deny wins over allow).

**Claude Code settings.json schema version tracking** _(Source: PD-S03-F04)_: Claude Code `settings.json` has a specific schema controlled by Anthropic. The emit phase must validate generated settings.json entries against the known schema version and warn if the schema version is unrecognized.

**Root-only marker file scanning** _(Source: PD-S03-F06)_: The detection logic must scan for marker files at the workspace root only, not recursively. A CLAUDE.md in a subdirectory (e.g., `docs/CLAUDE.md`) should not trigger Claude Code detection. The OC workspace concept is rooted at a specific directory.

**Nested path support in marker file scanning** _(Source: PD-S04-F01)_: The marker file `.github/copilot-instructions.md` is nested in a subdirectory. The detection logic must check subdirectory paths, not just root-level files. The scan must be path-aware, not just filename-aware.

**Copilot directory-form marker detection** _(Source: PD-S04-F03)_: GitHub Copilot supports `.github/copilot-instructions/` (directory with multiple `.md` files) as an alternative to the single file. The detection logic must handle both the single-file form (`.github/copilot-instructions.md`) and the directory form (`.github/copilot-instructions/`).

**Proportional governance injection for Copilot** _(Source: PD-S04-F04)_: Copilot instructions files are typically shorter than CLAUDE.md files. The governance section must be proportional -- a 50-line governance section in a 10-line instructions file overwhelms the original content. The injection must be calibrated to the file size context.

**No-platform-detected warning and guidance** _(Source: PD-S05-F01)_: Bedrock is the only platform that requires explicit configuration, creating an asymmetry (6 platforms auto-detect, 1 requires config). When no platform is detected and no explicit platform field exists, the pipeline must compile the IR but warn that no emission target is configured and suggest adding a `platform` field or creating a marker file.

**Bedrock guardrail API version targeting** _(Source: PD-S05-F02)_: Bedrock guardrail policies have a specific JSON schema defined by AWS. The emit phase must target a specific Bedrock API version and warn when emitting for an unknown version. If AWS updates the guardrail API, claws's Bedrock emission must degrade gracefully.

**LangGraph JS vs Python distinction from config content** _(Source: PD-S06-F08)_: LangGraph supports both Python and JavaScript (`langgraph.js`). If the workspace uses `langgraph.js` (with a `langgraph.json` that references JS files), the emit phase must generate JavaScript/TypeScript decorators instead of Python. The `langgraph.json` content (not just its presence) determines the output language.

**CrewAI config filename variants** _(Source: PD-S07-F05)_: CrewAI may use alternative config filenames: `crew.yaml`, `crew_config.yaml`, or `pyproject.toml` with CrewAI sections. The detection should check a list of known CrewAI config filenames and be configurable for custom names via claws.json.

**Enforcement capability versioned per framework release** _(Source: PD-S07-F06)_: CrewAI's semi-enforced model depends on the guard API capabilities available in the installed CrewAI version. If CrewAI adds new guard APIs (e.g., budget guards, output validators), claws's emission should evolve to use them. The enforcement capability must be versioned per framework release.

**targets.bedrock.guardrailId for update workflow** _(Source: PD-S05-F08)_: Bedrock guardrail policies support versioning. The emitted guardrail JSON should support both "create new guardrail" and "update existing guardrail" workflows. The `targets.bedrock.guardrailId` field in claws.json enables the update path.

**targets.crewai.version for version-targeted emission** _(Source: PD-S07-F08)_: CrewAI is actively maintained with frequent API changes. A generated guard config that works with CrewAI 0.28 may break with 0.30. The `targets.crewai.version` field in claws.json enables version-targeted emission.

### OBO Elicitation (from obo-elicitation scenarios)

**Standing approval condition validation in claws.json schema** _(Source: OE-S05-F01)_: The compiler must validate standing approval conditions at compile time: time window format (24h, valid range), day list (enum), recipient format (email regex). Invalid conditions (e.g., `timeWindow: "25:00-09:00"`) must produce a parse error, not silently pass through to runtime where they would either always-match or never-match.

**USER.md structured OBO scope format** _(Source: OE-S04-F09)_: For enterprise deployments, structured YAML frontmatter in USER.md is more reliable than free-text pre-authorization: `obo_scope: [{tool: send-email, scope: internal-only, expires: 2026-12-31}]`. Free-text parsing is best-effort; structured format is machine-verifiable. The compiler should support both and prefer structured when available.

### Lossless Round-Trip (from lossless-roundtrip scenarios)

**Accept JSON with BOM on Windows for claws.json** _(Source: LR-S02-F06)_: JSON with BOM is technically invalid per RFC 8259 (which says JSON text shall be encoded in UTF-8 without BOM). However, many Windows tools produce JSON with BOM. The claws.json parser must accept and preserve BOM silently rather than rejecting the file as invalid JSON. Strict RFC compliance would break Windows workflows.

## Pitfall Scenario Amendments (P-162 through P-249)

**P-174: Partial broadcast exit code** _(Sources: PA-S13-F04)_: The CLI surface must document a formal exit code contract for all fleet commands. Broadcast operations must return exit 0 only for full success, exit 2 for partial success (some workspaces failed), and exit 1 for total failure. Exit code semantics are part of the automation API -- CI pipelines and monitoring tools depend on consistent exit codes to gate deployments and detect fleet drift. Undocumented exit codes lead to inconsistent interpretation across organizations.

**P-177: Kill switch disable vs halt** _(Sources: PA-S16-F07)_: The CLI must not offer a "disable governance" command -- only `kill` (deny-all) and `unkill` (resume enforcement). Operators who confuse disable (remove governance, leaving agents ungoverned) with kill (deny all tool calls) may inadvertently make a security incident worse. The CLI help text must prominently explain that kill activates deny-all mode, not governance removal, and no separate disable verb should exist in the command surface.

**P-243: False-positive OpenClaw detection** _(Sources: PT2-S18-F01, PT2-S18-F02, PT2-S18-F03, PT2-S18-F04, PT2-S18-F06)_: Platform detection must use structural content validation, not filename-only matching. SOUL.md is a common filename outside the OC ecosystem (mission statements, philosophy documents), so the detector must check for OC-specific keywords (deny:, allow:, tool:, OC frontmatter) within the first 50 lines of each marker file. Detection should require a quorum of 2+ marker files from the OC file set (SOUL.md AND at least one of TOOLS.md, RULES.md, or claws.json) to reduce false-positive probability. The presence of claws.json must be weighted as the strongest detection signal -- a project with SOUL.md but no claws.json should be classified as "uncertain" and require explicit `claws init` before compilation. The detection phase must produce a confidence score (high/medium/low) rather than a binary result, and the compiler must refuse to compile low-confidence workspaces without `--force`. Structural validation must be fast, reading only the first 50 lines of each candidate marker file to avoid latency on frequent detection runs.

**P-244: Advisory R5 silently unenforced** _(Sources: PT2-S19-F01, PT2-S19-F05, PT2-S19-F06)_: The CLI surface must expose a platform enforcement capability matrix that classifies each target platform as mandatory-enforcement (Claude Code with tool use control), semi-enforced (CrewAI, LangGraph), or advisory-only (Cursor, Copilot). R5 tools require mandatory enforcement -- if the target platform is advisory-only, the compiler must emit a hard error, not a warning. Multi-platform compilations must evaluate enforcement capability per platform independently; a tool that is R5-enforced on Claude Code may be advisory-only on Cursor, and the output must clearly present the per-platform enforcement matrix. The platform capability database must be versioned and updatable via claws.json (`platform-capabilities-version`) so compilations remain reproducible as platforms evolve their enforcement features.

**P-248: LangGraph Python/TS language mismatch** _(Sources: PT2-S23-F02)_: The detection phase must perform an early language compatibility check before entering the compilation pipeline. Each target platform maps to required output language(s) -- LangGraph and CrewAI require Python, Claude Code requires TypeScript. If the target language has no available code generator, the compiler must report an error at the detection/validation stage (before PARSE), not after full IR construction. Failing late wastes compilation time and gives developers a misleading sense that their configuration is valid.

**P-249: CrewAI config format evolution** _(Sources: PT2-S24-F01, PT2-S24-F02, PT2-S24-F03, PT2-S24-F04, PT2-S24-F05, PT2-S24-F06, PT2-S24-F08)_: Platform detection must maintain a list of known config filenames per framework rather than hardcoding a single name. For CrewAI the list is [crewai.yaml, crew.yaml, pyproject.toml], ordered by recency so the most current format is checked first. For pyproject.toml, the detector must parse TOML and verify the [tool.crewai] or [tool.crew] section exists -- pyproject.toml alone must not trigger CrewAI detection. The detected config format must be recorded in the detection result so downstream phases dispatch to the correct schema reader. When multiple config files coexist (e.g., both crewai.yaml and crew.yaml during a migration), the most recent format takes precedence with a warning guiding the developer to clean up. The config filename list must be updatable without a full claws release via a platform-signatures registry that `claws update` can refresh. The detector should extract the CrewAI framework version from the config or dependency files and warn if it falls below the minimum supported by claws. The detection test suite must include fixtures for every known config format, including transition states and edge cases, with each new format accompanied by a corresponding test fixture.

## Praetor Integration Amendments

**InputResolver in claws.json** _(CL-07 §1)_: The `inputs` section in claws.json uses the InputResolver source format to declare governance input files. The default 9 workspace files (SOUL.md, TOOLS.md, etc.) are represented as `file` sources. Additional source types (`package`, `url`) extend governance to external input resolution, enabling enterprise registries and remote policy distribution. The claws.json schema must validate source type, path format, and optional SRI hashes for each input entry.

**Package output in claws.json** _(CL-07 §2)_: The `packages` section in claws.json declares publishable governance artifacts produced by `claws build`. Each package entry specifies name, scope (@openclaw/* or @claws/_), output format, and distribution target. The schema must validate package names against npm naming rules and prevent @craftworks/_ scope in output declarations.

**Loss-aware --strict-loss flag** _(CL-07 §5)_: `claws build --strict-loss` blocks emission for any platform classified as advisory-only when the workspace contains R5 tools. Without this flag, advisory-only platforms (Cursor, Copilot) emit with a warning. With `--strict-loss`, advisory-only emission for R5 tools is a hard error. This flag complements the existing `strict: boolean` in claws.json by specifically targeting loss-aware governance fidelity.

**Loss report flag** _(CL-07 §5)_: `claws build --loss-report` generates a per-platform governance fidelity report showing which rules are fully enforced, semi-enforced, or advisory-only on each target platform. The report format follows the Spec 108 loss matrix structure. The flag can be combined with `--strict-loss` to both report and block lossy emission.

**Ontology input flag** _(CL-07 §3)_: `claws compile --ontology path.onto.yaml` accepts ontology files that define compliance domain models (SOC2, HIPAA, EU AI Act). The ontology file is compiled into OntologyIR and merged with the governance IR during the FUSE phase. Multiple `--ontology` flags can be specified. The flag supplements the `inputs` section in claws.json for ad-hoc ontology loading.

**Fleet context scan flag** _(CL-07 §4)_: `claws fleet scan --context` uses compiled context collections to perform structural fleet scanning. Instead of scanning raw workspace files, the scan operates on pre-compiled context IR, enabling faster fleet-wide governance assessments and consistent cross-workspace comparison.

**Fleet context diff** _(CL-07 §4)_: `claws fleet diff` uses context diff for structural comparison between workspaces or between fleet snapshots. The diff operates on compiled context IR rather than raw files, producing governance-aware structural differences (trust tier changes, policy additions, rule modifications) instead of textual diffs.

**claws.json schema extension** _(CL-07 §1,2)_: Two new top-level keys in the claws.json v2 schema: `inputs` (InputResolver source declarations) and `packages` (publishable artifact declarations). Both keys are optional and additive -- existing claws.json files without these keys remain valid. The `inputs` key defaults to the standard 9 workspace file sources when omitted. The `packages` key defaults to empty (no package output).

## Integration Scenario Amendments

**URL policy SRI validation** _(INT-IR-S01)_: When `inputs` entries use `url` source type, the InputResolver must validate Subresource Integrity (SRI) hashes before accepting remote policy files. Missing or mismatched SRI hashes produce OC-POLICY-E301 diagnostics. The SRI algorithm must support SHA-256 and SHA-384. Expired or unreachable URLs fall back to cached versions with a staleness warning.

**INPUT-RESOLVE diagnostics** _(INT-IR-S02)_: Input resolution failures must produce structured diagnostics with source type, attempted path/URL, resolution strategy, and suggested fixes. The diagnostic code namespace OC-POLICY-E3xx is reserved for InputResolver errors. Each diagnostic must include the claws.json line number where the failing input was declared.

**Package manifest format** _(INT-PO-S01)_: The `packages` output section must generate a `.claws-manifest.json` for each declared package containing build provenance (source hash, compiler version, build timestamp, signer identity). The manifest format must be stable across claws versions for registry verification.

**Loss-aware flag interaction** _(INT-LA-S01)_: The `--strict-loss` and `--loss-report` flags must interact correctly with per-target trust tier overrides. A workspace with core trustTier T2 but a Bedrock target at T4 must evaluate loss separately per platform. The loss report must show per-platform rows even when `--strict-loss` blocks only some platforms.

**Platform versioning in loss matrix** _(INT-LA-S02)_: The loss matrix must include platform version information so that governance fidelity assessments are reproducible. As platforms evolve enforcement capabilities, the same workspace may have different loss profiles across platform versions. The `--loss-report` output must include the platform-capabilities-version used for assessment.

**claws.json validation ordering** _(INT-IR-S03)_: Schema validation for the new `inputs` and `packages` keys must run before InputResolver execution. A malformed `inputs` entry must produce a schema validation error (OC-POLICY-E101 namespace), not an InputResolver runtime error (OC-POLICY-E3xx namespace). This ordering ensures consistent diagnostic experiences.

## Open Questions

1. Should `claws.json` support custom platform plugins via a `"custom"` target type for proprietary agent frameworks?
2. Should the `$schema` URL support version ranges or pinning? `latest.json` vs `v2.json` as the default for `claws init`?
3. How should `claws.json` interact with monorepo structures where multiple agent workspaces share a root config?
4. Should `claws --help` adapt to workspace context (graying out fleet commands when no fleet config exists)?
5. Should `claws` support custom verb aliases, or is one verb per action the correct approach?
6. ~~Should claws.json gain a `strict: boolean` field to control advisory-vs-strict mode at the config level?~~ **Resolved**: Yes, `strict: boolean` belongs in claws.json. Note: OBO-WITHOUT-ELICIT is immune to advisory mode -- it remains error severity regardless of strict/advisory setting. _(Source: CFC-S03-F04, SCV-S03-F06)_

## Research References

| Source | What it contributed                                                                              |
| ------ | ------------------------------------------------------------------------------------------------ |
| Q12a   | One CLI decision, product-native naming (.claws/), workspace layout, config schema v1            |
| Q12c   | 35-command verb surface, progressive disclosure (4/18/35), crustacean naming rule (check + snap) |
| Q12d   | Name change from `claws` to `claws`, cross-platform positioning, collision analysis              |
| Q12g   | Three-layer schema (core/targets/detection), platform detection matrix, v1-to-v2 migration       |
