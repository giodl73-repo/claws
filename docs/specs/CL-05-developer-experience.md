# CL-05: Developer Experience

**Status**: Draft
**Source**: Q12e, Q12f, Q12o, Q12q
**Reviewers**: ux-designer, platform-engineer, devrel-engineer

---

## Overview

This spec defines the developer experience across four surfaces: continuous governance (three-ring model), CI/CD pipeline integration, maker tools for skill creation, and VS Code editor integration. Together these surfaces ensure governance is not a checkpoint but a companion -- running on every save, every commit, every PR, and every deploy.

The three-ring model replaces the manual upgrade script pattern. The inner ring (live) catches 70% of issues on every file save. The middle ring (upgrade) handles platform migration with snapshot/restore safety. The outer ring (fleet) ensures fleet-wide consistency. Zero new commands were needed -- the model composes from the existing 35-command surface.

The maker experience ensures claws is a power tool, not just a security guard. `@bic/claws-skill-kit` and `@bic/claws-test` give skill developers typed handlers, governance annotations, scenario testing, and governed publishing. Three adoption tiers (DECLARED/TYPED/VERIFIED) let existing skills adopt governance incrementally.

## Scope

**In scope**:
- Three rings of continuous governance (watch/doctor/drift)
- CI/CD pipeline (pre-commit -> PR check -> CD gate -> fleet scan)
- `@bic/claws-action` GitHub Action design
- `@bic/claws-skill-kit` + `@bic/claws-test` maker libraries
- `claws new skill` scaffolding and 4 maker commands
- ClawHub governance badges (DECLARED/TYPED/VERIFIED)
- VS Code extension (claws-lsp, claws-vscode, compilation host)
- Incremental compilation (<200ms diagnostics)

**Out of scope**:
- Security rule specifics (CL-02)
- Runtime enforcement internals (CL-03)
- Compilation pipeline internals (CL-04)
- Package ecosystem details (CL-06)

**Depends on**: CL-01 (command surface), CL-04 (compilation pipeline)

## Design

### Three-Ring Continuous Governance

```
+-----------------------------------------------------------+
|                OUTER -- FLEET (periodic)                    |
|  drift . pinch --fleet . broadcast . comply --fleet        |
|                                                            |
|  +-----------------------------------------------------+  |
|  |          MIDDLE -- UPGRADE (per-event)               |  |
|  |  doctor --post-upgrade . snap save/restore . diff    |  |
|  |                                                      |  |
|  |  +-----------------------------------------------+  |  |
|  |  |       INNER -- LIVE (continuous)               |  |  |
|  |  |  watch . pinch --staged . build (auto-pinch)   |  |  |
|  |  |  <1s latency . handles 70% of scenarios        |  |  |
|  |  +-----------------------------------------------+  |  |
|  +-----------------------------------------------------+  |
+-----------------------------------------------------------+
```

| Ring | Trigger | Latency | Scope | Commands |
|------|---------|---------|-------|----------|
| Inner (live) | File save, git commit | <1s | Changed files | watch, pinch --staged, build |
| Middle (upgrade) | Platform/claws upgrade | <15s | One workspace | doctor --post-upgrade, snap save/restore, diff |
| Outer (fleet) | Scheduled, on-demand | <120s | All workspaces | drift, pinch --fleet, broadcast |

**The dead man's switch** (upgrade workflow):

```bash
claws snap save pre-upgrade --pinch && \
  npm install -g openclaw@latest && \
  claws doctor --post-upgrade --fix && \
  claws pinch || \
  claws snap restore pre-upgrade
```

If any step fails, auto-restore. Two new flags (not new commands): `--post-upgrade` on doctor, `--pre-upgrade` tag on snap save. Command count stays at 35.

### CI/CD Pipeline (4 Stages)

| Stage | Trigger | Command | Latency | Output |
|-------|---------|---------|---------|--------|
| 0: Pre-commit | git commit | `claws pinch --staged --quiet` | <1s | Pass/fail + audit event |
| 1: PR check | Push to PR | `claws pinch --diff $BASE --format sarif` | <30s | SARIF + PR annotations |
| 2: CD gate | Push to main/tag | `claws comply <fw> --sign` | <30s | Signed compliance evidence |
| 3: Fleet scan | Weekly cron | `claws pinch` (matrix) + `claws drift` | <300s | Fleet report + drift alerts |

CI/CD is not a fourth ring -- it is the enforcement mechanism for the existing three rings. Stage 0 IS the inner ring. Stage 1 is its backstop. Stage 2 is the middle ring's enforcement. Stage 3 IS the outer ring.

**CI-specific flags** (added to GLINT-MAP):

| Flag | Command | Purpose |
|------|---------|---------|
| `--format sarif` | pinch, comply | SARIF 2.1.0 for code scanning |
| `--format github` | pinch | Native `::error`/`::warning` annotations |
| `--diff <ref>` | pinch | Scan only files changed since ref |
| `--fail-on <sev>` | pinch | Severity gating (critical, high, medium, low, all) |
| `--warn-only` | pinch | Soft-fail: all findings are warnings, exit 0 |
| `--sign` | comply | Sign evidence with HMAC-SHA256 |
| `--ci` | pinch | Auto-detect CI environment, set defaults |

**Gradual adoption path**:

```
Week 1:  CI only, warn-only: true          -> Visibility
Week 2:  CI only, fail-on: critical        -> Start blocking critical
Week 4:  Pre-commit + CI, fail-on: high    -> Local enforcement
Week 8:  Full pipeline, fail-on: all       -> Complete governance
```

### Maker Experience: @bic/claws-skill-kit + @bic/claws-test

**4 new maker commands** (raises total to 39):

| Command | Purpose |
|---------|---------|
| `claws new skill <name>` | Scaffold typed skill with governance annotations |
| `claws publish` | Governed publish to ClawHub (wraps `clawhub publish`) |
| `claws annotate` | Auto-suggest governance frontmatter for existing skills |
| `claws import` | Migrate existing skill to full claws compilation |

**@bic/claws-skill-kit** (~35KB): skill() factory + 6 decorators (@obo, @audit, @classify, @validate, @budget, @timeout). Decorators are metadata -- claws reads them at build time and generates governance wrapper code. The developer writes business logic; claws writes plumbing.

**@bic/claws-test** (~45KB): 4 testing layers:
- Scenario runner: plays SKILL.md scenarios against the built skill
- Governance validator: 12 checks verifying declared vs actual behavior
- Security scanner: 16 rules (injection, secret, eval, input categories)
- Custom vitest matchers for governance assertions

**SKILL.md compilation pipeline**:

```
SKILL.md -> PARSE -> EXTRACT -> ANALYZE -> GENERATE -> EMIT
                                             |          |
                                             |          +-> src/types.ts
                                             |          +-> dist/governance-guard.ts
                                             |          +-> tests/scenarios.test.ts
                                             |          +-> .claws-manifest
                                             |
                                             +-> Type generator
                                             +-> Governance generator
                                             +-> Test generator
                                             +-> Manifest generator
```

Build time: ~10-20ms per skill. Incremental via content hashing.

**Build output location**: `claws build --skill` writes all generated files to `.claws/dist/`, NOT to the skill project root. The skill project root remains clean:

```
my-skill/
  SKILL.md                         -- source (user-owned)
  src/handler.ts                   -- source (user-owned)
  .claws/dist/                     -- generated (gitignored)
    types.ts                       -- generated types
    governance-guard.ts            -- generated governance wrapper
    scenarios.test.ts              -- generated tests
    .claws-manifest                -- build provenance
  package.json                     -- existing (unchanged)
```

Only `.claws/dist/` is modified by the build. The skill project root is never polluted with generated files.

### Three-Tier Adoption for Existing Skills

| Tier | Label | Effort | What changes | Benefit |
|------|-------|--------|-------------|---------|
| 1 | DECLARED | 2-5 min | Add 3 lines of YAML frontmatter | Badge + fleet scan + risk visibility |
| 2 | TYPED | 15-30 min | Import @bic/claws-skill-kit, use decorators | Type safety + build-time validation |
| 3 | VERIFIED | 30-60 min | Full `claws build` with generated tests | Max enterprise trust + signed manifest |

Enterprise install policies can require: DECLARED for R1-R2 skills, TYPED for R3, VERIFIED for R4-R5.

#### Tier 1 DECLARED — Concrete Specification

**What the user types**: Add 3 lines of YAML frontmatter to SKILL.md:

```yaml
---
governance:
  risk: R3
  obo: none
  data: INTERNAL
---
# My Skill

A skill that does things.
```

**Required fields** (minimum viable governance declaration):
- `governance.risk`: R1-R5 risk classification
- `governance.obo`: OBO type (`none`, `email`, `message`, `calendar`, `social`, `purchase`, `transact`)
- `governance.data`: Data sensitivity (`PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`)

**What happens after adding frontmatter**:

```bash
$ claws pinch
  ✓ Governance frontmatter found in SKILL.md
  ✓ Risk: R3 (TRANSFORM)
  ✓ OBO: none
  ✓ Data: INTERNAL
  Tier: DECLARED — visible to fleet scan and ClawHub badges

  1 skill declared in 0.1s
```

**What happens with WRONG frontmatter**:

```bash
$ claws pinch
  ✗ SKILL.md:3 — governance.risk "R6" is not a valid risk level
    Valid values: R1, R2, R3, R4, R5
    Fix: change to a valid risk level (R1=READ, R2=LIST, R3=TRANSFORM, R4=EXECUTE, R5=TRANSACT)
    Docs: https://claws.dev/tiers/declared

  ✗ SKILL.md:4 — governance.obo "email-send" is not a valid OBO type
    Valid values: none, email, message, calendar, social, purchase, transact
    Fix: use "email" (not "email-send")
    Docs: https://claws.dev/tiers/declared

  2 errors in 0.1s
```

**What happens with MISSING frontmatter**:

```bash
$ claws pinch
  ⚠ SKILL.md — no governance frontmatter found
    This skill is ungoverned. Add 3 lines to get started:

    ---
    governance:
      risk: R3          # R1-R5
      obo: none         # none, email, message, calendar, social, purchase, transact
      data: INTERNAL    # PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
    ---

    Or run: claws annotate    (auto-suggest values from skill capabilities)
    Docs: https://claws.dev/tiers/declared

  1 warning in 0.1s
```

**Validation rules for DECLARED tier**:
- Frontmatter must be valid YAML
- `governance` key must be present
- All 3 required fields must be present and valid
- Values are case-insensitive on input, normalized to uppercase on read
- Extra fields are allowed (forward-compatible for Tier 2/3)
- No TypeScript, no build step, no dependencies required

### VS Code Extension

**Three components**:

1. **claws-lsp** (Language Server Protocol server): Wraps the compilation pipeline (PARSE/EXTRACT/ANALYZE). Provides diagnostics (10 categories, <200ms), completions (RELAX expressions, tool names, policy templates), hover (risk classification, OBO status), code actions (fix violations), cross-file tension detection, semantic tokens (risk-level color coding R1=green through R5=red).

2. **claws-vscode** (VS Code extension): Thin client that starts claws-lsp. Contributes tree view (governance summary), status bar (health indicator), command palette (pinch, build, test).

3. **Compilation host**: Long-lived daemon with cached GovernanceIR, incremental recompilation on file change. Embedded in LSP server for v0.1; extractable to `claws serve` daemon for v0.3+.

**Incremental compilation model**: PARSE is incremental (only changed files via SHA-256 hashing). ANALYZE runs on full workspace AST (cross-file tensions require complete context). Batch window: 300ms collects multiple saves into a single pass.

**`claws serve` API** (12 HTTP endpoints): /compile, /status, /diagnostics, /tensions, /classify/:tool, /ir, /snapshot, /diff, /invalidate, /health, plus WebSocket event stream. Serves CI/CD pipelines, OC Gateway hot-reload, and custom tooling.

**Differentiating feature**: Cross-file tension detection. Edit SOUL.md and see diagnostics appear in TOOLS.md. No existing OC VS Code extension provides governance IntelliSense -- this is blue ocean.

### Error Message Contract

Every claws error message follows the "tutorial in an error message" pattern. Every error MUST include three parts:

1. **WHAT** is wrong (the specific violation, with file:line when applicable)
2. **HOW** to fix it (actionable command or code change)
3. **WHERE** to learn more (documentation URL)

**Format**:

```
✗ <RULE-ID>  <description>                         FAIL  [SEVERITY]
    → <file>:<line> — <what is wrong>
      Fix: <how to fix it>
      Docs: <url>
```

**Examples**:

```
✗ G-CLASS    Tool risk exceeds workspace tier       FAIL  [HIGH]
    → TOOLS.md:23 — tool "send-email" is R5 but workspace is T2 (max R3)
      Fix: raise trust tier to T3 in claws.json, or remove the tool
      Docs: https://claws.dev/rules/G-CLASS

✗ SCHEMA     Invalid claws.json                     FAIL  [CRITICAL]
    → claws.json:7 — "trustTier" must be 0-4, got "high"
      Fix: change "trustTier": "high" to "trustTier": 3
      Docs: https://claws.dev/config/trust-tier
```

**Rules**:
- No error without a fix suggestion. If no auto-fix exists, suggest the manual resolution.
- No error without a docs URL. If no specific docs exist yet, link to the rule category page.
- Error messages are the primary onboarding surface. Treat every error as a teaching moment.
- Respect `--json` flag: JSON output includes `what`, `fix`, and `docsUrl` fields.

### ClawHub Governance Badges

ClawHub displays governance metadata when present. Badges show factual governance status:

- **Risk level**: R1-R5 classification
- **OBO status**: whether the skill acts on behalf of the user
- **Supply chain**: signed, scanned, dependency audit status
- **Tier**: DECLARED / TYPED / VERIFIED

Governance badges display risk level, OBO status, and supply chain verification. Value proposition is TBD via user research -- we do not make unsubstantiated claims about badge impact on adoption or trust.

### Skill vs Gateway Plugin Terminology

claws governance enforcement runs as a **Gateway plugin** (TypeScript, with `execute()` handler, loaded by the OC Gateway runtime). It is NOT a "skill" for enforcement purposes:

- **Skill** (SKILL.md): Prompt-only advisory content. No `execute()`. Cannot enforce governance at runtime.
- **Gateway plugin**: TypeScript code with `execute()`, loaded by the Gateway. CAN enforce governance (deny tool calls, require approval, emit audit events).

Throughout this spec and all claws documentation: enforcement = "Gateway plugin," advisory = "skill." Never describe enforcement as a "TypeScript skill."

## Constraints

- **Zero new commands for three-ring model**: The continuous governance model composes from existing commands. Only 2 new flags (--post-upgrade, --pre-upgrade).
- **4 new maker commands**: new, publish, annotate, import are standard compiler verbs. No new crustacean verbs.
- **SARIF is non-negotiable**: All 6 surveyed CI tools (ESLint, Semgrep, Snyk, Trivy, Checkov, Ruff) support SARIF. It is the universal CI format.
- **LSP-first**: All intelligence in the language server, not the VS Code extension. Enables JetBrains, Neovim, Zed with zero rewrite.
- **Decorators are metadata, not behavior**: @obo, @audit, @classify annotate handlers but do not execute at runtime. claws reads them at build time.
- **SKILL.md is the contract**: Everything flows from SKILL.md. Two files to own (SKILL.md + handler.ts), everything else generated.
- **Fleet scan: ungoverned vs compliant distinction**: Fleet scans must distinguish workspaces with zero intents (ungoverned) from workspaces with zero violations (compliant). Vacuously true compliance (no intents = 100% pass) is misleading. *(Source: CP-S05-F02)*
- **Fleet-level inherited elicitation policy resolution**: OBO-WITHOUT-ELICIT conflict detection must check fleet-level inherited configuration in addition to workspace-level files. A fleet template providing elicitation policy resolves the conflict. *(Source: CFC-S03-F06)*
- **Cross-workspace delegation cycle detection**: Cycles in the delegation graph may span workspaces (Agent A in workspace 1 delegates to Agent B in workspace 2, and B delegates to A). Fleet-level cycle detection is required for cross-workspace cycles invisible within a single workspace compilation. *(Source: CFC-S05-F07)*
- **Three-ring tool removal impact detection**: When TOOLS.md removes a tool, the inner ring should re-check skill dependencies to detect new SKILL-TOOL-GHOST conflicts, not just check at compile time. *(Source: CFC-S06-F05)*

## Anubis-Thoth Amendments

### Three-Ring Governance (38 constraints)

**Inner ring file-save vs git-stage trigger distinction** *(Source: TR-S01-F01)*: The inner ring runs on file save, but `--staged` is a git concept (staged files in the index). A file save in the editor is NOT a git stage. The inner ring needs a distinct mode: pinch on the saved file (working tree diff), not `pinch --staged` (git index diff). These are different file sets and the spec must not conflate them.

**Incremental IR cache invalidation policy** *(Source: TR-S01-F02)*: Incremental pinch on a single file requires a cached GovernanceIR from the last full compile. If the cache is stale (workspace modified outside the editor), the inner ring evaluates against outdated context and may miss cross-file conflicts. The spec must define cache invalidation rules including invalidation on any out-of-band workspace modification.

**Cross-file conflict detection in incremental mode** *(Source: TR-S01-F03)*: If TOOLS.md changes and a new tool introduces an OBO boundary, detecting OBO-WITHOUT-ELICIT requires checking SOUL.md and USER.md, which are not in the changed set. The inner ring must load the cached IR for cross-file conflict detection, and the deserialization cost must fit within the <1s latency budget.

**Rapid file-save batch window (300ms)** *(Source: TR-S01-F04)*: The file system watcher must handle rapid successive saves. The 300ms batch window from the compilation host spec should also apply to inner ring watch mode. Without batching, 5 rapid saves produce 5 redundant pinch runs, wasting resources and flooding output with duplicates.

**Watch-mode output format (append vs overwrite)** *(Source: TR-S01-F05)*: In watch mode, pinch output must be appended, not overwritten. The developer needs the history of checks, not just the latest result. The spec must define the output format for watch-mode results.

**Cascading re-checks after fix edits** *(Source: TR-S01-F06)*: When a G-CLASS violation requires editing claws.json to raise the trust tier, the inner ring must re-check TOOLS.md against the new trust tier. This creates a cascading re-check: change A triggers check, fix triggers re-check of the original violation. The spec must address cascading check semantics.

**Windows file watcher event deduplication** *(Source: TR-S01-F09)*: On Windows, file system watchers fire multiple events for a single save (write + rename for atomic saves in VS Code). The inner ring must deduplicate events for the same file within the batch window to prevent a single save triggering 2-3 pinch runs.

**Dead man's switch explicit per-step error handling** *(Source: TR-S02-F01)*: The dead man's switch uses bash `&&` and `||` chaining, but `||` only triggers on the last command's exit code. If `snap save` fails, the chain may attempt restore with no snapshot. The spec must define explicit error handling for each step with a proper error propagation model, not rely on bash operator precedence.

**snap save --pinch abort-on-violation semantics** *(Source: TR-S02-F02)*: The `--pinch` flag on snap save runs pinch before saving. If pinch finds violations, saving a snapshot with known violations means restore brings back a broken state. The semantics must be defined: `--pinch` is informational (shows violations but saves anyway) for the dead man's switch use case.

**doctor --fix atomicity (all-or-nothing vs partial progress)** *(Source: TR-S02-F03)*: If `doctor --fix` partially succeeds (claws.json migrated but AGENTS.md failed), the workspace is inconsistent. Snap restore reverts everything including successful migrations. Doctor must either be fully atomic (all-or-nothing) or report partial progress with a resume path.

**snap save must capture all 9 workspace files** *(Source: TR-S02-F04)*: The snapshot must capture ALL 9 workspace files, not just governance-related subsets. A platform upgrade may change TOOLS.md format, SOUL.md constraint syntax, or AGENTS.md delegation format. Capturing only IR + config leaves workspace files in the new format on restore.

**doctor --post-upgrade trigger on version mismatch** *(Source: TR-S02-F05)*: Platform upgrades can arrive via VS Code extension update, fleet broadcast, or manual file replacement, not just npm install. `doctor --post-upgrade` should detect WHAT changed (schema version, syntax deprecations) regardless of HOW the upgrade arrived. The trigger is version mismatch detection, not npm events.

**doctor routine vs upgrade diagnostic rule sets** *(Source: TR-S02-F06)*: Doctor without `--post-upgrade` runs routine diagnostics. With `--post-upgrade`, it enables schema migration checks. These are different diagnostic rule sets, not just a flag that enables additional checks. The spec must clarify the distinction.

**snap restore platform vs workspace version mismatch** *(Source: TR-S02-F07)*: After a failed upgrade where npm install succeeded but doctor failed, snap restore reverts workspace files to old format while the platform remains at the new version. This creates a version mismatch: new platform reading old-format files. The restore must warn about manual platform rollback or handle the mismatch.

**Middle ring latency sub-budget per operation** *(Source: TR-S02-F08)*: The <15s latency target for the middle ring must include both doctor diagnostics and snap operations. The budget should be broken down: snap save (<2s) + doctor (<10s) + pinch (<3s) = 15s. Large workspaces with 50+ tool definitions could exceed the doctor sub-budget alone.

**snap save overwrite protection for named snapshots** *(Source: TR-S02-F10)*: Running the dead man's switch twice without clearing the "pre-upgrade" snapshot overwrites the original known-good snapshot. `snap save` should refuse to overwrite an existing named snapshot without `--force`, or use timestamped names by default.

**Fleet baseline source definition (promoted snapshot)** *(Source: TR-S03-F01)*: The spec does not define what the fleet baseline IS for drift detection. The baseline must be defined as the promoted snapshot (from `snap promote`) stored in the fleet configuration. Without a defined baseline source, drift has no reference point.

**Workspace discovery and IR retrieval protocol** *(Source: TR-S03-F02)*: Drift detection across workspaces requires access to each workspace's GovernanceIR, potentially across machines or CI environments. The spec must define the workspace discovery mechanism and IR retrieval protocol for fleet operations.

**Broadcast lossless conflict resolution via fleet overlay** *(Source: TR-S03-F03)*: Broadcast pushes policy updates to workspaces, which modifies files and contradicts the lossless guarantee. Broadcast must operate through a fleet config overlay that workspaces inherit, rather than direct file modification.

**Parallel workspace scanning requirement** *(Source: TR-S03-F04)*: The <120s latency target for the outer ring covering all workspaces requires parallel scanning. Sequential requests to remote workspaces at 2s each exceed the budget for fleets of 12+. The spec must specify parallel scanning with concurrency controls.

**Drift report divergence classification by remediation ring** *(Source: TR-S03-F05)*: The drift report must classify divergences by which ring can fix them. Schema version drift requires `doctor --post-upgrade` (middle ring), not broadcast (outer ring). The outer ring detects issues it cannot fix, so the report must route remediation to the correct ring.

**Broadcast schema version compatibility check** *(Source: TR-S03-F06)*: Broadcast must validate that the pushed policy is compatible with each workspace's schema version before applying. Pushing a policy designed for schema v3 to a workspace on schema v2 may be incompatible. Incompatible workspaces must be skipped with a warning.

**Three-state drift classification (compliant/drifted/ungoverned)** *(Source: TR-S03-F07)*: Drift must distinguish three states: (a) workspace with baseline-matching IR (compliant), (b) workspace with diverged IR (drifted), (c) workspace with no IR (ungoverned). Treating ungoverned as drifted misrepresents the situation.

**Broadcast partial failure semantics** *(Source: TR-S03-F08)*: If broadcast fails on some workspaces (network error, permission denied), the spec must define partial failure behavior. Fleet operations should use continue-and-report semantics with a manifest tracking successes and failures for later retry.

**Inter-ring escalation protocol** *(Source: TR-S04-F01)*: When the inner ring detects an issue it cannot resolve (schema staleness), it must signal the middle ring. The spec must define the escalation mechanism: structured diagnostic suggestions that recommend specific middle-ring commands, not automatic cross-ring triggers.

**Inner ring diagnostic scope (governance rules only vs infrastructure)** *(Source: TR-S04-F02)*: Schema staleness is not a governance rule but an infrastructure concern. The inner ring's diagnostic scope must be clarified: does it check only governance rules, or also schema health, version compatibility, and configuration validity?

**Permission boundaries across ring escalation** *(Source: TR-S04-F04)*: Escalation crosses permission boundaries (developer to workspace admin to fleet admin). The escalation path must acknowledge RBAC boundaries: a developer receiving an escalation suggestion to broadcast may not have fleet admin permissions.

**Escalation UX deduplication of cross-ring diagnostics** *(Source: TR-S04-F05)*: When both inner and middle ring diagnostics are visible simultaneously (e.g., in VS Code), the user sees two messages for the same root cause. Once escalation is suggested, the original inner-ring diagnostic should reference the escalation rather than standing alone.

**Human-initiated escalation safety constraint** *(Source: TR-S04-F06)*: Cross-ring escalation must be ALWAYS human-initiated, never automatic. Every ring transition requires human action. The spec must explicitly state this safety constraint to prevent automated cascade across rings.

**Cross-ring cache invalidation protocol** *(Source: TR-S04-F07)*: When the middle ring modifies workspace files via `doctor --fix`, the inner ring's cached GovernanceIR becomes stale. Cache invalidation must propagate across rings: middle-ring file modifications must invalidate the inner ring's cache.

**IR file concurrency model (atomic write or locking)** *(Source: TR-S05-F01)*: Concurrent read/write from inner ring (write after pinch) and outer ring (read for drift) creates a TOCTOU race on the GovernanceIR file. The spec must define a concurrency model: atomic write via write-to-temp-then-rename, file locking, or IR versioning.

**Point-in-time vs eventual consistency for fleet scans** *(Source: TR-S05-F02)*: During the outer ring's scan (up to 120s), the inner ring may update the IR multiple times. The outer ring must either snapshot all IRs at scan start (point-in-time consistency) or accept eventual consistency with documented trade-offs.

**Audit trail concurrent write safety** *(Source: TR-S05-F03)*: All three rings write audit events concurrently. On Windows, file append is NOT atomic by default. The audit writer must use a mutex or write-ahead log to prevent interleaved, corrupt JSON lines.

**Pause inner ring during middle-ring operations** *(Source: TR-S05-F04)*: While `doctor --fix` runs, the inner ring's watcher detects file changes and triggers pinch on partially-modified workspace, producing false violations. The inner ring watcher must be paused during middle-ring operations to avoid evaluating intermediate states.

**Rings semi-independent with ordering constraints** *(Source: TR-S05-F05)*: Rings are NOT fully independent -- they have ordering constraints when operating on the same workspace. The middle ring must signal completion so the inner ring can restart, establishing a coordination protocol between rings.

**Fleet scan skip for active middle-ring workspaces** *(Source: TR-S05-F06)*: If a workspace is mid-upgrade (middle ring active), the outer ring reading its IR gets pre-upgrade state. Fleet scans should skip workspaces with active middle-ring operations and flag them as "in-progress" rather than reporting stale drift.

**Single-instance watcher enforcement via PID file** *(Source: TR-S05-F08)*: Multiple terminal sessions may each start `claws watch`, accumulating orphaned watcher processes on Windows. The watcher must use a PID file and refuse to start if another watcher is already running for the same workspace.

**Tool-skill dependency graph in cached IR** *(Source: TR-S06-F01)*: SKILL-TOOL-GHOST detection on tool removal requires a tool-to-skill dependency mapping in the cached GovernanceIR. The dependency graph must be indexed (tool -> skills) for O(1) lookup per removed tool, not O(n) per skill, to meet the <1s latency target.

### Fleet Operations (52 constraints)

**Three-state workspace classification** *(Source: FO-S01-F01)*: Fleet scan must classify every workspace into one of three states: GOVERNED (has governance intents and has been checked), UNGOVERNED (no governance intents), or MISCONFIGURED (has governance intents but broken configuration). Vacuously true compliance (zero intents = 100% pass) must be prevented.

**Workspace discovery heuristic definition** *(Source: FO-S01-F02)*: Workspace discovery must use broad OC workspace markers (not just claws.json) and then classify governance state as a second step. Discovery relying solely on claws.json makes ungoverned workspaces invisible to the scan.

**Discovery scope limits and fleet registry alternative** *(Source: FO-S01-F03)*: The spec must define discovery scope (directory depth, network mounts, symlink following) and provide a fleet registry file as an alternative to filesystem traversal. Network share discovery may exceed the <120s latency budget.

**Scan fault tolerance and partial results** *(Source: FO-S01-F04)*: Misconfigured workspaces (invalid claws.json) must not halt the scan. The scan must be fault-tolerant: record the error for the broken workspace, continue scanning the rest, and include per-workspace status with error details in the output.

**Scan output format specification** *(Source: FO-S01-F05)*: The scan output format must support the `--format` flag (JSON, SARIF) for CI/CD integration and machine-readable fleet dashboards. Without structured output, fleet dashboards cannot aggregate scan results.

**Per-workspace metadata in scan inventory** *(Source: FO-S01-F06)*: The scan must record metadata per workspace: last compile time, last pinch time, governance hash, trust tier, agent count, and tool count. This metadata enables drift detection without recompiling every workspace on each scan.

**fleet.requireGovernance policy escalation** *(Source: FO-S01-F07)*: Ungoverned workspaces may be intentional (sandboxes) or accidental (incomplete setup). A fleet policy `fleet.requireGovernance: true` should escalate ungoverned workspaces from warnings to errors, making the policy configurable.

**Scan idempotency and workspace immutability** *(Source: FO-S01-F08)*: The scan must be idempotent and never modify individual workspace state. Scan results must be written to a fleet-level directory only, preserving the lossless principle at fleet scope.

**INACCESSIBLE workspace state for permission errors** *(Source: FO-S01-F09)*: Workspaces where the operator lacks read access should be reported as INACCESSIBLE (fourth state), not silently skipped. Silent skip makes the fleet appear smaller than it is.

**Broadcast-to-build stale enforcement window** *(Source: FO-S02-F01)*: Between broadcast and the next build, the workspace's compiled governance plugin enforces the OLD policy while the policy YAML contains the NEW policy. The spec must define whether `claws pinch` checks the compiled plugin or the policy YAML during this window.

**--reason required for broadcast** *(Source: FO-S02-F02)*: The `--reason` flag must be required (not optional) for broadcast. Without a reason, the audit trail shows "policy pushed" but not "why." For SOC2 CC7.2 change management evidence, the reason is mandatory.

**Pre-broadcast policy validation gate** *(Source: FO-S02-F03)*: Before pushing a policy to the fleet, the broadcast command must validate the policy template against the schema in a sandbox. Broadcasting a template with errors creates N broken workspaces simultaneously.

**Per-workspace trust tier compatibility check before broadcast** *(Source: FO-S02-F04)*: Broadcast must check that the policy being pushed is compatible with each workspace's trust tier. A policy requiring T3 capabilities pushed to a T2 workspace creates an unresolvable violation.

**Broadcast atomicity semantics (best-effort with manifest)** *(Source: FO-S02-F05)*: Broadcast should be best-effort with mandatory manifest tracking, not all-or-nothing. The manifest records which workspaces received the update, enabling `--retry` for failed workspaces.

**Post-broadcast build trigger workflow** *(Source: FO-S02-F06)*: After broadcast, each workspace must run `claws build` to apply the new policy. The spec should recommend a post-broadcast workflow: inner ring watch detects the policy file change and auto-builds, or the fleet operator runs a fleet-wide build.

**Broadcast version tracking in fleet manifest** *(Source: FO-S02-F07)*: Broadcasts must be versioned in the fleet manifest. Two broadcasts in quick succession require version, timestamp, and hash tracking so `claws drift` can detect version skew, not just hash differences.

**Broadcast merge semantics (fleet override vs local merge)** *(Source: FO-S02-F08)*: When broadcast policy conflicts with workspace-local overrides, the spec must define merge semantics. Fleet policy overrides local for security, but this reduces flexibility. Conflict detection should be explicit.

**Automatic pre-broadcast snapshot for rollback** *(Source: FO-S02-F09)*: A bad broadcast requires rollback. `claws broadcast` should automatically run `snap save pre-broadcast --fleet` before pushing. If the snapshot fails, broadcast proceeds but warns that manual recovery will be needed.

**Drift hash composition specification** *(Source: FO-S03-F01)*: The drift hash must include claws.json, all policy YAML files, and the GovernanceIR hash. Hashing only policy YAML misses trust tier drift in claws.json; hashing only GovernanceIR misses uncompiled policy modifications.

**Drift severity classification (CRITICAL/HIGH/LOW)** *(Source: FO-S03-F02)*: Trust tier escalation drift is CRITICAL (workspace allows higher-risk tools than fleet permits). Policy hash mismatch is HIGH. Missing governance rule is HIGH. Cosmetic divergence is LOW. The spec must define severity per drift type.

**Fleet baseline definition and manifest storage** *(Source: FO-S03-F03)*: The baseline must be defined as the state recorded after the most recent broadcast or promote, stored in a fleet manifest file with per-workspace expected hashes. Without a versioned baseline definition, "drift" is undefined.

**Drift exception registration for intentional overrides** *(Source: FO-S03-F04)*: Deliberate workspace divergence (approved trust tier raise) should be registerable as an exception. Without exception registration, every intentional override triggers a drift alert on every scan. Exceptions require a reason and approver.

**Configuration drift vs build drift distinction** *(Source: FO-S03-F05)*: Missing-rule drift means the compiled plugin is incomplete, which is build drift, not configuration drift. The drift detector must distinguish configuration drift (claws.json/policy changed) from build drift (stale compiled artifacts). Each requires different remediation.

**Drift detection frequency and real-time option** *(Source: FO-S03-F06)*: Weekly drift detection may miss a trust tier escalation for up to 7 days. High-security fleets may need daily or real-time drift detection. The sidecar could monitor for configuration file changes and trigger drift alerts.

**Drift timeline via scan history comparison** *(Source: FO-S03-F07)*: The drift report should indicate when drift occurred by comparing current scan against previous scan's workspace hashes. "Drifted since last scan" is more actionable than "currently drifted."

**Per-drift-type remediation in drift report** *(Source: FO-S03-F08)*: Remediation differs per drift type: trust tier drift requires reverting claws.json or registering an exception; policy hash drift requires re-broadcasting or accepting the override; build drift requires recompilation. The report must include per-type remediation following the error message contract.

**Drift findings as SARIF results** *(Source: FO-S03-F09)*: For `--format sarif`, each drift finding maps to a SARIF result with workspace path as artifact location and drift type as rule ID (e.g., CLAWS-DRIFT-TIER, CLAWS-DRIFT-HASH). This enables fleet drift in GitHub code scanning dashboards.

**Broadcast partial failure semantics and retry mechanism** *(Source: FO-S04-F01)*: Broadcast must be best-effort with mandatory manifest tracking plus a `--retry` subcommand that reattempts only failed workspaces from the manifest. Partial failure creates a split-policy fleet that requires tracked reconciliation.

**Infrastructure drift vs policy drift classification** *(Source: FO-S04-F02)*: Workspaces that never received a broadcast (network failure) represent infrastructure drift, not policy drift. The broadcast manifest provides this distinction so drift reports can separate deliberate policy changes from delivery failures.

**Broadcast exit code for partial success (exit 2)** *(Source: FO-S04-F03)*: Partial success must return a dedicated exit code (exit 2), not exit 0 (hides failures in CI) or exit 1 (fails pipeline despite 80% success). CI can distinguish full success, partial success, and full failure.

**Broadcast manifest schema and storage location** *(Source: FO-S04-F04)*: The broadcast manifest must be persisted in a defined location (fleet-level `.claws/broadcast-manifest.json`) with schema including broadcast ID, timestamp, policy version, per-workspace status, and error details.

**Stale broadcast failure alerting threshold** *(Source: FO-S04-F05)*: If a broadcast manifest has unresolved failures older than a configurable threshold (default: 24 hours), `claws scan` should flag the unresolved failures as warnings. Forgotten retries create permanent drift.

**Write access requirement and read-only workaround** *(Source: FO-S04-F06)*: Broadcast requires write access to each workspace's policy directory. Workspaces in read-only environments (CI build mounts) must receive policies through alternative channels (CI pipeline copies during build).

**Retry idempotency via manifest state machine** *(Source: FO-S04-F07)*: Retry must be idempotent. The manifest's per-workspace status transitions through FAILED -> RETRYING -> SUCCESS (or FAILED again). Only workspaces in FAILED state are eligible for retry, preventing duplicate policy application.

**Per-workspace broadcast timeout configuration** *(Source: FO-S04-F08)*: A per-workspace timeout (default: 30s) prevents one slow workspace from blocking the entire broadcast. Timeout should be configurable via `claws broadcast --timeout`.

**Concurrent broadcast prevention via fleet lock** *(Source: FO-S04-F09)*: Simultaneous broadcasts could interleave policies across workspaces. A fleet-level lock file with PID and timestamp prevents concurrent broadcasts. The lock auto-expires after a configurable timeout (default: 600s) to handle crashed broadcasts.

**Kill switch semantics (deny-all not disable-governance)** *(Source: FO-S05-F01)*: Fleet kill must activate a deny-all governance policy, NOT disable governance. Disabling governance lets compromised agents run ungoverned, which is the opposite of the kill switch's intent.

**Synchronous kill with per-workspace acknowledgment** *(Source: FO-S05-F02)*: Fleet kill must be synchronous. The operator must know ALL workspaces are halted before the command returns. The command waits for acknowledgment from each workspace and reports per-workspace status.

**Kill partial failure escalation (CRITICAL alert)** *(Source: FO-S05-F03)*: If kill fails for any workspace (network unreachable), the compromised agent may still be running. Kill partial failure must return a CRITICAL alert with the unreachable workspace list for manual escalation (network isolation, etc.).

**Kill flag requirements and blast radius communication** *(Source: FO-S05-F04)*: Fleet kill requires `--confirm` and `--reason`. The error for missing flags must include the workspace count to communicate blast radius. Single-workspace kill (no `--fleet`) should not require `--confirm`.

**Automatic pre-kill snapshot with failure tolerance** *(Source: FO-S05-F05)*: `claws kill --fleet` should automatically save a pre-kill snapshot. If snapshot save fails (disk full), the kill proceeds anyway because stopping the threat takes priority. Output must warn about snapshot failure.

**Post-kill restoration command (revive or snap restore)** *(Source: FO-S05-F06)*: After kill, the fleet is halted. A dedicated restoration command (`claws revive --fleet` or `claws snap restore pre-kill --fleet`) must be defined. The command reads pre-kill snapshot metadata and restores governance automatically.

**Structured kill reason format for incident correlation** *(Source: FO-S05-F08)*: The `--reason` text should follow a structured format `IR-{year}-{number}: {description}` for incident response correlation. The reason must be immutable after recording.

**Double-kill prevention and state check** *(Source: FO-S05-F09)*: Running `claws kill --fleet` when the fleet is already killed must report "fleet already halted" rather than re-killing. Re-killing would overwrite the pre-kill snapshot with halted state, destroying the recovery point.

**Kill-to-restore latency SLA** *(Source: FO-S05-F10)*: The spec must define a restoration latency target. For enterprise incident response, governance restored within 15 minutes of incident resolution is a typical SLA. The target must account for fleet size.

**Compliance matrix (workspace x framework)** *(Source: FO-S06-F01)*: The fleet compliance report must show a matrix with workspaces as rows and frameworks as columns. Each cell is pass/fail/not-targeted. Framework-level and workspace-level compliance are orthogonal dimensions.

**Ungoverned workspace exclusion from compliance metrics** *(Source: FO-S06-F02)*: Ungoverned workspaces must be excluded from compliance percentages and shown in a separate section. Including them inflates metrics; excluding entirely hides governance gaps.

**Overall compliance requires all targeted frameworks to pass** *(Source: FO-S06-F05)*: A workspace passing SOC2 but failing HIPAA is non-compliant in the overall fleet posture. The overall compliant count requires ALL targeted frameworks to pass per workspace.

**Compliance report validity window and snapshot pairing** *(Source: FO-S06-F06)*: Compliance reports must include a validity window timestamp and be paired with the fleet snapshot hash. Point-in-time evidence is required for auditors.

**comply --fleet output format support (JSON/CSV minimum)** *(Source: FO-S06-F07)*: The fleet compliance report must support JSON and CSV formats at minimum. PDF is optional but recommended for auditor consumption.

**Cross-framework rule evaluation deduplication** *(Source: FO-S06-F08)*: SOC2 and HIPAA may check the same governance rules (e.g., access control). The compliance engine should evaluate rules once and map results to multiple frameworks, avoiding redundant evaluation for multi-framework fleets.

**Compliance history storage for trend analysis** *(Source: FO-S06-F09)*: Compliance results must be stored (not just generated on demand) so `claws audit history` can show per-workspace compliance trends across frameworks over time.

### Snapshot Lifecycle (41 constraints)

**snap save must capture source files not just compiled IR** *(Source: SL-S01-F01)*: If snap save captures the GovernanceIR but NOT source files (SOUL.md, TOOLS.md), restore puts the IR back but source files remain modified. The restored IR would be inconsistent with actual workspace files. snap save must capture ALL source files that contribute to the IR.

**snap restore lossless carve-out** *(Source: SL-S01-F02)*: Restoring workspace files means overwriting SOUL.md, TOOLS.md, and claws.json with older versions, which violates the lossless guarantee. snap restore must be explicitly carved out from lossless, or write to a staging area for user-applied revert.

**Snapshot storage location and git inclusion policy** *(Source: SL-S01-F04)*: The default storage location must be defined (e.g., `.claws/snapshots/`). The spec must state whether snapshots are gitignored. Workspace-local snapshots travel with the repo if committed; user-level snapshots are machine-specific.

**claws version metadata in snapshot** *(Source: SL-S01-F05)*: If a workspace is saved with claws v1.2 and restored under v1.5 (different schema), restored files may be incompatible. Snapshots must include claws version metadata for compatibility checking.

**Dirty working tree protection on snap restore** *(Source: SL-S01-F06)*: snap restore overwrites the working tree. If the developer has uncommitted git changes, restore is destructive. snap restore must check for uncommitted changes and refuse to run (or require `--force`) if the working tree is dirty.

**Explicit file list definition for policies in snapshot scope** *(Source: SL-S01-F07)*: The spec mentions "policies" as part of the snapshot but does not define the file list. The snapshot scope must be an explicit file list, not an ambiguous category name.

**File metadata capture policy (content-only)** *(Source: SL-S01-F09)*: Snapshots capture file content but not permissions or timestamps. Since claws is cross-platform, the spec must document that only content is captured (content-only policy), not platform-specific metadata.

**snap diff semantic governance diff engine** *(Source: SL-S02-F01)*: snap diff must compare GovernanceIRs semantically, not just files. A trust tier change from T2 to T3 has governance implications (R4 tools now allowed). The diff requires a dedicated engine that interprets IR changes in governance terms.

**snap diff delta-oriented output format** *(Source: SL-S02-F02)*: The diff report must show violation DELTAS ("+1 violation: G-CLASS on deploy-prod"), not absolute states. Deltas tell the admin exactly what changed rather than requiring manual comparison.

**snap diff cross-version IR schema normalization** *(Source: SL-S02-F03)*: If two snapshots were taken with different claws versions, the GovernanceIR schemas may differ. snap diff must normalize both to a common schema before diffing to prevent spurious changes from schema evolution.

**snap diff output format options (text/json/sarif)** *(Source: SL-S02-F04)*: snap diff must support `--format` (text, json, sarif) consistent with pinch format options. The default is human-readable text.

**snap diff directional labeling (from/to)** *(Source: SL-S02-F05)*: The diff output must clearly indicate direction: "compared [base] to [target]." Swapping order reverses additions and removals. The CLI should label arguments as `--from` and `--to` to avoid ambiguity.

**snap diff error handling for missing snapshots** *(Source: SL-S02-F06)*: `snap diff A nonexistent` must produce a clear error following the what/how/where contract, listing available snapshots and suggesting `snap list`. No opaque file-not-found errors.

**snap diff single-argument form (snapshot vs current workspace)** *(Source: SL-S02-F07)*: The most common use case is "what changed since I saved this snapshot?" A single-argument form `snap diff <name>` (implicit comparison to current workspace state) must be supported.

**snap diff risk-impact categorization** *(Source: SL-S02-F08)*: Changes must be categorized by risk impact: risk-increasing (added R4/R5 tools, lowered trust tier), risk-neutral (added R1 tool to T3 workspace), risk-decreasing (removed high-risk tool). This helps admins quickly assess governance posture change.

**snap promote fleet baseline storage backend definition** *(Source: SL-S03-F01)*: The transport mechanism for promoting a snapshot to fleet baseline is undefined. The spec must define the storage backend (central server, shared filesystem, git repository, API) or provide a pluggable storage interface.

**snap promote authentication and authorization requirement** *(Source: SL-S03-F02)*: Promoting a snapshot as fleet baseline defines the governance standard for all workspaces. A mistaken promote could lower baseline trust tier. snap promote must require authentication and authorization, not just local command execution.

**snap promote mandatory pinch validation before promotion** *(Source: SL-S03-F03)*: The promoted baseline must be pinch-clean (zero violations). Promoting a snapshot with violations makes the fleet baseline itself non-compliant. snap promote must validate and refuse to promote if violations exist.

**snap promote invalidate cached drift results on baseline change** *(Source: SL-S03-F04)*: When the baseline changes, all existing drift reports become stale. Promote must trigger fleet-wide re-scan notification or at minimum invalidate cached drift results. Without invalidation, admins see stale compliance status.

**snap promote per-environment or grouped baselines** *(Source: SL-S03-F05)*: A single baseline for all workspaces creates false drift positives for legitimate environment differences. Per-environment baselines (dev, staging, prod) or workspace-group targeting must be supported.

**snap promote baseline version history and rollback** *(Source: SL-S03-F06)*: Fleet baselines must be versioned. If a promote goes wrong, the admin needs to roll back to the previous baseline. snap promote must maintain baseline history (at least the last N baselines).

**snap promote confirmation prompt and --dry-run mode** *(Source: SL-S03-F08)*: Promote is the highest-blast-radius operation. The spec must require a confirmation prompt ("promoting baseline affects N workspaces, proceed?") and a `--dry-run` mode that shows impact without promoting.

**snap save governance-neutral vs snap promote governance-gated** *(Source: SL-S04-F01)*: snap save must be governance-neutral (save always succeeds, capturing whatever state exists) because the dead man's switch needs to save pre-upgrade state with warnings. snap promote must be governance-gated (requires pinch-clean) because the fleet baseline must be compliant.

**snap save --pinch informational semantics** *(Source: SL-S04-F02)*: The `--pinch` flag on snap save shows violations but saves anyway (informational only). This supports the dead man's switch use case where pre-upgrade state may have warnings but must still be saved.

**Governance summary in snapshot metadata** *(Source: SL-S04-F03)*: Snapshot metadata must record the governance state at save time: violation count, warning count, compliance percentage. This enables `snap list` to show state without requiring full diff.

**snap restore emit governance summary of restored state** *(Source: SL-S04-F04)*: Restoring a snapshot with violations should emit a summary: "restored snapshot 'X' -- N violations, N warnings (pre-existing in snapshot)." This prevents confusion when the inner ring reports "new" violations from restored state.

**Dead man switch abort if pre-upgrade state has critical violations** *(Source: SL-S04-F05)*: If the workspace has critical violations before the upgrade, the dead man's switch should abort. Restoring a critically broken state is not meaningful safety. The spec must define abort semantics for pre-upgrade critical violations.

**Document that rule evolution affects post-restore pinch results** *(Source: SL-S04-F06)*: If saved with claws v1.2 (29 rules) and restored under v1.5 (35 rules), post-restore pinch may produce different results than pre-save pinch. This is correct but must be documented to prevent confusion.

**snap restore re-run pinch after restore vs trust saved IR** *(Source: SL-S04-F07)*: Blind restore is faster but may restore an IR inconsistent with the current claws version. Re-running pinch after restore is safer but adds latency. The spec must define the recommended behavior.

**File content and IR must be coherent pair in snapshot** *(Source: SL-S04-F09)*: Violations reference specific file:line locations. If files are modified between save and restore, the restored violation line numbers may not match restored file content. The snapshot must capture files AND IR as a coherent pair.

**Storage limits and auto-pruning policy definition** *(Source: SL-S05-F01)*: Without storage limits, workspaces accumulate unlimited snapshots. The spec must define a default limit (e.g., 20 snapshots), configurable via claws.json, with automatic pruning when the limit is exceeded.

**Protected snapshot categories** *(Source: SL-S05-F02)*: Auto-pruning must never delete the current fleet baseline, any snapshot referenced by an active dead man's switch, or user-pinned snapshots. Protected categories prevent pruning from breaking fleet drift detection.

**snap save auto-prune semantics and --no-prune override** *(Source: SL-S05-F03)*: Auto-pruning should default to automatic on save when the limit is exceeded, with a `--no-prune` flag to prevent it. A pre-prune warning must appear in output.

**Pruning order policy (FIFO vs LRU vs time-bucketed)** *(Source: SL-S05-F04)*: The default pruning policy and whether it is configurable must be specified. Options include oldest-first (FIFO), least recently used (LRU), or time-bucketed retention (keep one per week).

**Fleet-level minimum retention override** *(Source: SL-S05-F06)*: Fleet policy may require minimum retention periods for audit purposes (e.g., keep 30 days of snapshots). Fleet baseline must be able to override workspace-level limits with a minimum retention policy.

**snap promote + pruning ordering (establish new before pruning old)** *(Source: SL-S05-F07)*: If promote creates a new baseline snapshot and the storage limit is at capacity, pruning during promote could delete the previous baseline before the new one is established. Promote must establish the new baseline before pruning the old.

**snap list pruning-relevant metadata and next-prune indicator** *(Source: SL-S05-F09)*: The snap list command must show creation date, size, protected status, and a "will be pruned next" indicator. Pruning should not be surprising to the user.

**snap save mandatory SHA-256 integrity hash per file** *(Source: SL-S06-F01)*: Every snap save must compute a SHA-256 hash of each captured file and store the hashes in a snapshot manifest. snap restore must verify hashes before applying to detect corruption.

**snap manifest sign with HMAC-SHA256** *(Source: SL-S06-F02)*: The integrity manifest itself must be signed (HMAC-SHA256), not just hashed. Without signing, an attacker can modify both snapshot files AND the manifest to make a tampered snapshot pass integrity checks.

**Dead man switch secondary fallback if snap restore fails** *(Source: SL-S06-F03)*: If snap restore fails due to corruption, the dead man's switch safety net is broken. A secondary fallback must be defined: git stash, git checkout, or a redundant snapshot copy.

**snap restore integrity failure error message contract** *(Source: SL-S06-F04)*: The error for integrity failure must follow what/how/where: "SHA-256 mismatch on claws.json" (what), "re-save from current state or restore from older snapshot" (how), docs URL (where). The error must NOT silently proceed with partial restore.

**Integrity check mandatory for restore, optional for read-only** *(Source: SL-S06-F05)*: Integrity checks must be mandatory for restore operations but optional for read-only operations like diff and list. This balances safety with performance.

**snap promote end-to-end integrity verification across transport** *(Source: SL-S06-F06)*: Fleet-promoted snapshots travel across machines. The transport layer may introduce corruption. The promote operation must verify integrity after upload, and the receiving workspace must verify after download. End-to-end integrity, not just at-rest.

**snap save read-after-write verification** *(Source: SL-S06-F07)*: The save operation must verify its own output immediately after writing (read-after-write verification). This catches save-time bugs before the snapshot is trusted.

**snap verify subcommand for non-destructive integrity check** *(Source: SL-S06-F08)*: `claws snap verify <name>` checks all hashes without restoring, providing a non-destructive health check for periodic auditing of snapshot storage integrity.

### OBO Elicitation (3 constraints)

**Standing approval expiry warning in health check** *(Source: OE-S05-F09)*: Standing approval expiry (e.g., `expires: 2026-12-31`) should trigger a warning during `claws pinch` health checks when within 30 days of expiry. Expired standing approvals must produce a clear message rather than silently reverting to per-use elicitation.

**Recompilation drift detection for standing approval currency** *(Source: OE-S05-F05)*: If a standing approval is removed from USER.md or claws.json but the compiled handler is not redeployed, the old approval remains active at runtime. `claws drift` must detect standing approval staleness by comparing compiled handlers against current configuration.

**Standing approval as SCHEDULE-NO-APPROVAL solution documentation** *(Source: OE-S05-F10)*: Conditional standing approvals are the designed escape hatch for the SCHEDULE-NO-APPROVAL problem (scheduled R5 tools perpetually denied without human presence). This must be prominently documented in the deployment guide as the enterprise solution.

### A2A Governance (5 constraints)

**Incremental identity level migration tooling** *(Source: A2A-S02-F02)*: Fleet identity migration from L0 to L2 must support incremental migration: some agents at L2 while others remain at L0, with warnings for L0 agents and errors only for agents past their migration deadline. Simultaneous enforcement of `fleet.minIdentityLevel` fails all agents at once.

**Fleet-wide minimum identity level metric** *(Source: A2A-S02-F07)*: Fleet identity compliance reporting (`claws pinch --fleet`) must highlight L0 outliers. A fleet-wide identity score (minimum across all agents) provides a single metric for fleet operators. The weakest link determines fleet security posture.

**Cross-workspace lateral movement correlation** *(Source: A2A-S06-F04)*: Cross-workspace lateral movement (alpha -> beta -> gamma) is undetectable by individual workspace handlers. Fleet-level monitoring must aggregate blocked events across workspaces to detect cross-workspace lateral movement patterns via sidecar correlation and `claws scan` post-hoc analysis.

**Cross-workspace transitive trust detection via claws scan** *(Source: A2A-S03-F06)*: Each workspace's FE6 only sees local trust declarations. Cross-workspace transitive trust chains are invisible without fleet-wide scan. `claws scan` must build the fleet-wide trust graph and detect cross-workspace transitive chains using Tarjan's SCC algorithm.

**Default delegation depth limit review** *(Source: A2A-S06-F07)*: The default delegation depth limit of 10 hops may be too permissive for security-sensitive fleets. A 10-hop chain can span 10 trust boundaries. For high-security deployments, 3-5 hops is more appropriate. The default should be reviewed and the limit must be configurable in claws.json.

### Injection Defense (1 constraint)

**G-ELICIT approval request includes data provenance context** *(Source: ID-S06-F05)*: When G-ELICIT presents an R5/OBO approval request to the user during a multi-tool chain, the approval request must include data provenance context: "This email content originated from external web content (web-search at step 1)." Without provenance, the user may approve a chain-of-tool injection attack because the email content appears legitimate.

### Skill Lifecycle (33 constraints)

#### Maker Experience (20 constraints)

**Scaffold risk level derivation from workspace trust tier** *(Source: SK-S01-F01)*: The scaffold must detect the workspace's trust tier from claws.json and set an appropriate default risk level. Scaffolding a skill with R5 in a T2 workspace creates an immediate G-CLASS violation on first pinch.

**Dependency auto-install or guided install for @bic/claws-skill-kit** *(Source: SK-S01-F02)*: The scaffolded handler imports @bic/claws-skill-kit, which must be installed. `claws new skill` must either auto-install the dependency or emit a clear installation instruction. An unresolvable import on first build blocks adoption.

**Scaffold default tier and --tier flag** *(Source: SK-S01-F03)*: `claws new skill` scaffolds at TYPED tier by default (full type safety). The command should accept `--tier declared` for minimal scaffolds with only frontmatter and no decorators.

**Version alignment between claws and @bic/claws-skill-kit** *(Source: SK-S01-F04)*: The scaffold must produce a package.json with the correct @bic/claws-skill-kit version range matching the running claws binary's major version. Hardcoded version ranges break on major version upgrades.

**.gitignore in scaffold template** *(Source: SK-S01-F05)*: The scaffold must include a `.gitignore` with `.claws/` to prevent generated files from polluting version control. Missing .gitignore means governance wrappers are committed to the repository.

**Skill name vs directory name consistency check** *(Source: SK-S01-F06)*: The `skill()` factory name parameter must match the skill directory name. If the developer renames the directory after scaffolding, the build should detect the mismatch and warn.

**OBO auto-suggestion from skill name heuristics** *(Source: SK-S01-F08)*: If the skill name contains keywords like "send", "email", "purchase", or "schedule", the scaffold should suggest a non-none OBO type. Failing to declare OBO when the skill clearly acts on behalf of the user creates false negatives in fleet scanning.

**Scaffold must produce pinch-clean output** *(Source: SK-S01-F10)*: The scaffolded skill must pass `claws pinch` at DECLARED tier immediately. Governance frontmatter must have valid values for all 3 required fields, not placeholder "TODO" values.

**Prompt-only skill tier ceiling (DECLARED or VERIFIED, skip TYPED)** *(Source: SK-S02-F01)*: A prompt-only skill (no handler.ts) can be DECLARED (frontmatter) and VERIFIED (governance tests pass) but cannot be TYPED (no code to decorate). The spec must define this tier ceiling for prompt-only skills.

**Frontmatter-to-decorator value propagation in claws import** *(Source: SK-S02-F02)*: When `claws import` upgrades from DECLARED to TYPED, it must read existing governance frontmatter and translate values into decorator arguments. Frontmatter is the source of truth, not decorator defaults.

**Enterprise tier-per-risk enforcement** *(Source: SK-S02-F03)*: Enterprise install policies requiring minimum tiers per risk level (DECLARED for R1-R2, TYPED for R3, VERIFIED for R4-R5) must be enforceable. An R4 skill at DECLARED tier should be reported as non-compliant with the install policy.

**Governance-aware test generation from frontmatter** *(Source: SK-S02-F04)*: The transition from TYPED to VERIFIED generates tests that validate declared vs actual behavior. Test generation must derive scenarios from governance frontmatter: an `obo: none` declaration generates tests that check for email API calls.

**Tier detection from workspace state, not stored metadata** *(Source: SK-S02-F05)*: Each tier transition must be reversible without data loss. Removing @bic/claws-skill-kit imports should gracefully fall back to DECLARED. `claws pinch` must detect the current tier from workspace state, not from a stored tier field.

**Signature staleness detection and tier downgrade** *(Source: SK-S02-F06)*: If the developer modifies handler.ts after VERIFIED build, the manifest signature is invalidated. The next `claws pinch` must detect stale signature and downgrade the tier display from VERIFIED to TYPED.

**claws annotate heuristic accuracy requirements** *(Source: SK-S02-F08)*: The `claws annotate` command auto-suggests governance frontmatter based on handler analysis. Heuristic accuracy must be documented with false-positive and false-negative bounds. False-positive R5 suggestions create unnecessary burden; false-negative R1 suggestions create security gaps.

**Closest-value suggestion for enum validation errors** *(Source: SK-S04-F01)*: The error for `obo: "email-send"` must suggest the closest valid value "email" using fuzzy matching or a known-alias table. The error message contract mandates specific fix suggestions.

**Collect-all-errors for frontmatter validation** *(Source: SK-S04-F02)*: Both errors must be reported simultaneously, not fail-fast on the first. The developer should not need multiple round-trips to discover all validation errors.

**YAML None/null ambiguity in obo field** *(Source: SK-S04-F04)*: `obo: None` (capitalized) is Python's None, which YAML parsers may interpret as null. The parser must treat the string "None" as the valid OBO value "none", not as YAML null.

**URL stability and versioning policy for error messages** *(Source: SK-S04-F05)*: Documentation URLs in error messages must be stable and version-specific. Broken links are broken onboarding. The URL contract requires either versioned URLs or permanent redirects.

**annotate command as remediation path in error messages** *(Source: SK-S04-F09)*: Error messages for invalid or missing frontmatter should mention `claws annotate` as an automated remediation: "Or run: claws annotate (auto-suggest values from skill capabilities)."

#### ClawHub Governance Badges (7 constraints)

**Visual distinction between DECLARED and VERIFIED badges** *(Source: SK-S03-F01)*: Badges must clearly distinguish self-declared governance (DECLARED, unverified) from compiler-verified governance (VERIFIED, signed manifest). Without visual distinction, consumers may trust DECLARED skills as if verified.

**Self-reported qualifier for DECLARED tier** *(Source: SK-S03-F02)*: At DECLARED tier, governance metadata is self-reported and unverified. Badges must include a "self-reported" qualifier. At VERIFIED tier, the qualifier is dropped because @bic/claws-test validates declarations.

**Supply chain badge independent of governance tier** *(Source: SK-S03-F03)*: Supply chain status depends on whether `claws publish` was used (signed manifest) regardless of governance tier. A VERIFIED skill published via raw `clawhub publish` shows "unsigned" supply chain.

**Badge staleness and re-validation policy** *(Source: SK-S03-F04)*: Governance state can change after publication. ClawHub must re-validate badges on download or mark them with "verified as of version X" to prevent stale VERIFIED badges on modified skills.

**Data sensitivity requires higher tier for enterprise trust** *(Source: SK-S03-F05)*: Skills declaring `data: CONFIDENTIAL` or `data: RESTRICTED` should require TYPED or VERIFIED tier for enterprise install policies, since only compiler analysis can validate data flow labels at higher tiers.

**Inconsistent governance metadata display** *(Source: SK-S03-F06)*: A skill with contradictory metadata (risk: R1 and obo: transact) must have the inconsistency flagged in the badge display rather than showing contradictory values. Badge rendering needs the risk-OBO consistency rules from CL-02.

**Per-version badge storage** *(Source: SK-S05-F09)*: Badge queries must be version-specific. A consumer installing v1.0.0 must see the DECLARED badge, not the VERIFIED badge from v1.1.0. Both versions exist on ClawHub with independent badge metadata.

#### Publish and Supply Chain (6 constraints)

**Publish distinguishes unsigned from invalid-signed** *(Source: SK-S05-F01)*: "No manifest because never built" (DECLARED tier) is a known governance gap (warn, allow). "Manifest present but signature invalid" (tampered VERIFIED) is a supply chain integrity failure (block, require rebuild). Same symptom, different severity.

**Fleet-level publish tier requirement** *(Source: SK-S05-F02)*: Enterprise fleet policies may require VERIFIED tier for publication via `fleet.requireVerifiedPublish: true` in claws.json, overriding the default warn-and-allow behavior for DECLARED-tier publishing.

**Warnings not suppressible by --quiet for security-relevant messages** *(Source: SK-S05-F03)*: The unsigned skill warning during `claws publish` must appear even with `--quiet`. Security-relevant warnings must not be suppressed by quiet mode because they affect consumer trust.

**Manifest signing key source and key management** *(Source: SK-S05-F04)*: The signing key for .claws-manifest must have a defined source: fleet-managed key, developer identity key, or CI/CD signing key from environment variable. Without a key management path, VERIFIED tier is unachievable.

**Publish atomicity and rollback on remote failure** *(Source: SK-S05-F05)*: If badge metadata injection succeeds locally but `clawhub publish` fails remotely, the publish command must not mutate local state (version numbers, manifests) until remote success is confirmed.

**Badge freshness at publish time** *(Source: SK-S05-F06)*: Badge metadata must be read from current SKILL.md frontmatter at publish time, not from cached build artifacts. If frontmatter was modified after building but before publishing, badges must reflect current state.

### Lossless Round-Trip (2 constraints)

**claws pinch --fix scope limited to non-source files** *(Source: LR-S05-F07)*: `claws pinch --fix` may auto-fix violations but must NEVER modify the 9 source workspace files. Auto-fix is limited to generated artifacts and configuration in .claws/. Source file modifications require explicit user action via `doctor --fix`.

**Mandatory snapshot before doctor --fix modifies any file** *(Source: LR-S05-F08)*: Before `doctor --fix` modifies workspace files, a snapshot must be automatically saved as a safety net. This ensures the developer can always revert if the fix produces unexpected results.

### Platform Detection (5 constraints)

**Build output reports modifications to platform config files** *(Source: PD-S03-F05)*: `claws build` must report which platform configuration files it modified or created (e.g., CLAUDE.md governance section, .cursorrules injection, settings.json merge). The developer must know exactly what changed outside the .claws/ directory.

**Post-build deployment instructions for Bedrock** *(Source: PD-S05-F03)*: Bedrock guardrail policy JSON is emitted by the build but not automatically applied. Build output must include explicit deployment instructions: "Apply this guardrail via `aws bedrock create-guardrail --cli-input-json file://guardrail.json`."

**Advisory enforcement warning for high-risk tools on Cursor/Copilot** *(Source: PD-S02-F05)*: For advisory-only platforms (Cursor, Copilot), R4+ tools cannot be enforced at runtime. The compiler must emit a prominent warning: governance is advisory and the LLM may ignore instructions for high-risk tools. This helps developers understand the enforcement gap.

**Guided trust tier selection for advisory platforms** *(Source: PD-S04-F07)*: When advisory platforms default to T1 (R2-max), the error for T1 ceiling violations must explain that advisory platforms have lower defaults and suggest raising the trust tier explicitly if the developer accepts unenforceable governance for higher-risk tools.

**Error messages as primary onboarding surface for platform differences** *(Source: PD-S01-F01)*: Error messages for platform-specific issues must teach platform differences. Each platform has different enforcement capabilities, default trust tiers, and emission targets. Every error is a teaching moment about why the platforms differ.

## Pitfall Scenario Amendments (P-162 through P-249)

### Three-Ring Coordination (P-162 through P-169)

**P-162: Inner ring cache stale** *(Sources: PA-S01-F01, PA-S01-F02, PA-S01-F03, PA-S01-F04, PA-S01-F05, PA-S01-F06, PA-S01-F07, PA-S01-F08)*: The inner ring incremental cache must validate content hashes on every read, not only on watcher events, because out-of-editor modifications (git merge, sed, external tools) bypass the watcher. A post-debounce full scan with a separate 2-second quiet window must detect batch operations that the editor debounce collapses. Cross-file dependency graphs must trigger invalidation of the full OBO analysis group when any member file changes. The `claws status` command must report cache freshness including last validated timestamp and modification detection, and Windows-specific supplemental polling (every 5 seconds) must compensate for ReadDirectoryChangesW blind spots.

**P-163: Dead man switch error propagation** *(Sources: PA-S02-F01, PA-S02-F02, PA-S02-F03, PA-S02-F04, PA-S02-F05, PA-S02-F06, PA-S02-F07, PA-S02-F08, PA-S02-F09)*: The dead man switch must use a TypeScript state machine (IDLE -> SNAP_SAVING -> SNAP_VERIFIED -> UPGRADING -> UPGRADE_VERIFIED -> DONE) with explicit per-step validation, not bash chaining. Snap save verification requires four-point checks: file exists, size > 0, SHA-256 hash recorded, and header parseable. Snap restore must verify integrity before applying, fsync must be called after snapshot writes, and the implementation must use try/finally patterns. The snap manifest must record path, timestamp, SHA-256, schema version, and upgrade target version to enable independent validation by `claws doctor`.

**P-164: Doctor fix partial snap restore** *(Sources: PA-S03-F01, PA-S03-F02, PA-S03-F03, PA-S03-F04, PA-S03-F05, PA-S03-F06, PA-S03-F07, PA-S03-F08)*: Doctor --fix must support partial progress with per-fix checkpoints rather than all-or-nothing snap restore. A per-fix manifest tracks each fix independently (pending/applied/failed/skipped), and `--resume` skips already-applied fixes. A fix dependency graph ensures topological ordering where dependent fixes are skipped on failure but independent fixes continue. The default behavior on partial failure must be to keep successful fixes, not revert all. Ambiguous fixes requiring human decisions must be separated from deterministic fixes, and `--dry-run` must flag uncertain fixes as "may fail" rather than "will apply." Resume must be idempotent.

**P-165: Snap restore version mismatch** *(Sources: PA-S04-F01, PA-S04-F03, PA-S04-F04, PA-S04-F05, PA-S04-F06, PA-S04-F07, PA-S04-F08)*: After a failed upgrade, snap restore puts back old-format workspace files while the new platform binary is already installed. The runtime must detect version divergence at startup by comparing its version with the workspace schema version and produce a hard error, not a silent default. The upgrade must install the binary last so that workspace migration failure leaves the old binary in place. A compatibility degraded mode (read-only with explicit warnings) must prevent silent field reinterpretation. The snap manifest must include schema version and binary version for post-restore verification, and fleet dashboards must flag version mismatches as CRITICAL drift.

**P-166: Broadcast lossless violation** *(Sources: PA-S05-F01, PA-S05-F02, PA-S05-F03, PA-S05-F04, PA-S05-F05, PA-S05-F06, PA-S05-F07, PA-S05-F08)*: Fleet broadcast must write policy overlays to a separate fleet-overlay.json, never to workspace source files, preserving the lossless guarantee. Overlays must be additive-only: they can restrict but not remove workspace declarations, with conflicts recorded as violations for the administrator. The compilation pipeline merges overlays at compile time with explicit precedence visible in the GovernanceIR. Pre-broadcast validation must block any code path that opens workspace files for writing. `claws status` must report lossless violations, the overlay format must be a superset of workspace policy constructs, and overlay lifecycle management (removal, version control) must leave workspace files untouched.

**P-167: Concurrent ring IR TOCTOU** *(Sources: PA-S06-F01, PA-S06-F03, PA-S06-F04, PA-S06-F05, PA-S06-F06, PA-S06-F07, PA-S06-F08)*: The inner ring must write the GovernanceIR via atomic file replacement (write to .tmp, fsync, then rename) to prevent TOCTOU races with the outer ring. Reader-side validation must verify JSON integrity and retry up to 3 times before falling back to the last known good IR in memory (stale-over-corrupt). Cross-platform file access handling is required: Windows lock contention (EACCES/EBUSY) must be retried rather than crashing, while POSIX partial reads must be detected via trailer hashes. A shared IR reader library must encapsulate the read-validate-retry logic for all consumers.

**P-168: Watcher fires during doctor** *(Sources: PA-S07-F01, PA-S07-F02, PA-S07-F04, PA-S07-F05, PA-S07-F06, PA-S07-F07, PA-S07-F08)*: The inner ring watcher must implement a pause/resume protocol with a durable pause token (.claws/watcher-pause.lock) that middle ring operations (doctor --fix, upgrade, snap restore) acquire before modifying workspace files. The pause token must auto-expire after 30 seconds if the operation crashes. On resume, all queued events are processed as a single batch recompilation using final file states. The pause protocol must be shared across all middle ring operations, with exclusive acquisition to serialize concurrent operations. Doctor --fix output must explicitly notify the user that the inner ring is paused and will recompile on completion.

**P-169: Orphaned watcher on Windows** *(Sources: PA-S08-F01, PA-S08-F02, PA-S08-F03, PA-S08-F04, PA-S08-F05, PA-S08-F06, PA-S08-F07, PA-S08-F08)*: The watcher must enforce single-instance via PID file with both PID and startup timestamp to handle PID reuse. On Windows, terminal close does not send SIGTERM, so the watcher must register for console control events (SetConsoleCtrlHandler) and process.on('SIGBREAK'). Stale PID detection must use OpenProcess on Windows. `claws watch --restart` must terminate the existing watcher before starting a new one, and `--cleanup` must scan for and terminate orphan processes. `claws status` must report watcher state including PID, uptime, and orphan detection. VS Code extension integration should manage the watcher lifecycle to eliminate the terminal-close orphan problem.

### Fleet Operations (P-170 through P-185)

**P-170: Broadcast stale governance** *(Sources: PA-S09-F01, PA-S09-F03, PA-S09-F05, PA-S09-F06, PA-S09-F07, PA-S09-F08)*: Fleet broadcast must be a two-phase operation (push policy overlay + trigger recompilation) with both phases tracked per workspace in the broadcast manifest. Two recompilation modes must be supported: trigger local `claws build` or compile centrally and push built artifacts. The fleet dashboard must show per-workspace policy version vs build version, highlighting stale enforcement windows exceeding 5 minutes. Broadcast atomicity requires rollback of the policy overlay if recompilation fails, preventing stale-but-unbuildable states. Parallel recompilation with configurable concurrency and an audit trail of the stale enforcement window are required.

**P-171: Broadcast crash partial update** *(Sources: PA-S10-F01, PA-S10-F02, PA-S10-F03, PA-S10-F04, PA-S10-F05, PA-S10-F06, PA-S10-F07, PA-S10-F08)*: Broadcast must maintain a persistent manifest tracking per-workspace update status (PENDING -> IN_PROGRESS -> APPLIED | FAILED) with synchronous fsync writes after each workspace. Policy merge operations must be idempotent (declarative desired-state, not imperative actions) so double-application produces identical results. The manifest state machine must treat IN_PROGRESS as FAILED on crash recovery. Streaming workspace processing with bounded memory prevents OOM, and post-broadcast verification via `claws fleet scan` must confirm all workspaces have the expected policy version. Batched execution with configurable batch sizes limits blast radius.

**P-172: Trust tier drift escalation** *(Sources: PA-S11-F01, PA-S11-F02, PA-S11-F03, PA-S11-F04, PA-S11-F06, PA-S11-F07, PA-S11-F08)*: Trust tier drift must be classified by direction: escalation (local > fleet) is always CRITICAL, de-escalation (local < fleet) is LOW. CRITICAL drift should trigger automatic remediation by pushing the fleet-mandated tier overlay immediately. The fleet overlay must enforce a maximum trust tier ceiling that the local configuration cannot exceed, producing a hard build error on violation. The classification must apply to all governance-relevant fields (trust tier, allowed tools, approval thresholds, fail modes), not just trust.tier. Drift scan frequency for CRITICAL-capable fields must be at minimum every 5 minutes, and a temporary escalation exception workflow must require administrator approval with expiry.

**P-173: Partial broadcast split policy** *(Sources: PA-S12-F01, PA-S12-F02, PA-S12-F03, PA-S12-F04, PA-S12-F05, PA-S12-F06, PA-S12-F07, PA-S12-F08, PA-S12-F09)*: Broadcast must use best-effort semantics (attempt every workspace, record failures) instead of fail-fast. `--retry` targets only FAILED and PENDING workspaces from the manifest. Permanently failing workspaces can be marked EXCLUDED. `claws fleet status` must show active policy versions across the fleet with workspace counts per version. Each failure must include a diagnosis (schema incompatibility, network error, permission denied). A pre-broadcast compatibility scan must flag incompatible workspaces upfront. A convergence timeout (default 24 hours) emits a CRITICAL alert for prolonged split-policy states, and `--rollback` enables reverting updated workspaces to the previous version.

**P-174: Partial broadcast exit code** *(Sources: PA-S13-F01, PA-S13-F02, PA-S13-F03, PA-S13-F05, PA-S13-F06, PA-S13-F07)*: Broadcast must use a three-level exit code scheme: exit 0 for full success, exit 2 for partial success, exit 1 for total failure. The output must include a machine-readable failure manifest with per-workspace failure reasons and retry commands. Partial broadcast must automatically schedule retries with exponential backoff (default 3 attempts). A `--strict` flag changes partial success from exit 2 to exit 1 for zero-tolerance CI pipelines. Structured JSON reports must be emitted for SIEM/monitoring integration.

**P-175: Unresolved broadcast drift** *(Sources: PA-S14-F01, PA-S14-F02, PA-S14-F03, PA-S14-F04, PA-S14-F05, PA-S14-F06, PA-S14-F07)*: A stale broadcast failure threshold (default 24 hours) must trigger escalating alerts: WARNING at 24h, CRITICAL at 48h, EMERGENCY at 72h, configurable via claws.json. Alerts must include exact retry commands. Fleet compliance must report three categories: current, drifted, and stale-failed. Failure manifests must persist across process restarts. Configurable auto-retry with exponential backoff reduces operator burden for transient failures. `claws fleet status` must show DEGRADED status when stale failures exist, and SIEM integration must export stale failure events with fleet context.

**P-176: Concurrent broadcast interleave** *(Sources: PA-S15-F01, PA-S15-F02, PA-S15-F03, PA-S15-F04, PA-S15-F05, PA-S15-F06, PA-S15-F07)*: A fleet-level mutex lock must prevent concurrent broadcast operations, with automatic timeout (default 30 minutes) to prevent deadlocks. The lock must be distributed (not PID-based) for multi-machine fleet topologies, using a lease-based mechanism. A `--force` override requires `--confirm` and logs a CRITICAL audit event. Optional queuing semantics allow the second broadcast to wait for lock release. Read-only operations (scan, drift, status) must not be blocked by the broadcast lock. Lock status must be visible via `claws fleet status`.

**P-177: Kill switch disable vs halt** *(Sources: PA-S16-F01, PA-S16-F02, PA-S16-F03, PA-S16-F04, PA-S16-F05, PA-S16-F06)*: The kill switch must implement deny-all semantics: the governance plugin remains loaded but returns DENY for every tool call request, rather than being unloaded (which leaves agents ungoverned). The kill state must be tamper-resistant, enforced at the platform level rather than via a configuration flag. The audit trail must distinguish between deny-all and governance-unloaded. Unkill must use a zero-gap sequence: load IR, register hooks, verify registration, then switch from deny-all to enforce mode. Platform-specific kill implementations must be defined for each supported platform (Claude Code, Cursor, CrewAI). Partial kill per workspace must be supported.

**P-178: Kill unreachable workspace** *(Sources: PA-S17-F01, PA-S17-F02, PA-S17-F03, PA-S17-F04, PA-S17-F05, PA-S17-F06, PA-S17-F07)*: Kill partial failure must be treated as a CRITICAL security event with exit code 1 (not exit 2), because an unkilled workspace may still be running a compromised agent. CRITICAL alerts must include explicit escalation paths ("MANUAL INTERVENTION REQUIRED: isolate at network level"). Kill must retry aggressively (3 retries, 5-second intervals, 30-second total timeout) before declaring failure. `claws fleet status` must show KILL_FAILED as a distinct status that persists until confirmed. A background reconciliation loop must continuously attempt to reach unreachable workspaces. SIEM/webhook integration must export kill failure events.

**P-179: Double kill snapshot overwrite** *(Sources: PA-S18-F01, PA-S18-F02, PA-S18-F03, PA-S18-F04, PA-S18-F05, PA-S18-F06, PA-S18-F07)*: A state check before kill must refuse execution if the workspace is already KILLED, preventing accidental double-kill that overwrites the pre-kill snapshot with the halted state. Pre-kill snapshots must be write-protected immediately after creation. Snapshot metadata must include kill timestamp, operator identity, and governance state hash, enabling unkill to verify it is restoring from a valid recovery point. Multiple pre-kill snapshots must be retained with timestamps. Force-kill must preserve the original pre-kill snapshot. Snapshot integrity must be verified on creation via SHA-256 hash.

**P-180: Ungoverned workspaces inflate compliance** *(Sources: PA-S19-F01, PA-S19-F02, PA-S19-F03, PA-S19-F04, PA-S19-F05, PA-S19-F06, PA-S19-F07)*: Strict compliance mode must be the default: ungoverned workspaces count as non-compliant in the denominator (7/10 = 70%, not 7/7 = 100%). The compliance report must show three numbers: total compliance, governed compliance, and governance coverage. Ungoverned workspaces must be listed prominently with a warning before the compliance percentage. A configurable governance coverage threshold (fleet.compliance.minCoveragePercent) prevents the "100% governed pass but only 30% governed" loophole. Fleet scan must detect and classify ungoverned workspaces, and compliance trend reporting must alert on coverage decreases.

**P-181: Delegation reference format** *(Sources: PA-S20-F03, PA-S20-F05, PA-S20-F07)*: Fleet graph construction must report all invalid cross-workspace delegation references in a single pass with suggested corrections, not fail on the first one. A migration tool (`claws fleet migrate-refs`) must help convert legacy reference formats to the canonical form. The delegation graph visualization must distinguish valid edges from broken edges rendered with error reasons, making graph incompleteness immediately obvious.

**P-182: Local policy lowers floor** *(Sources: PA-S21-F04, PA-S21-F05, PA-S21-F06, PA-S21-F07)*: Fleet scan must detect floor violations across all workspaces as CRITICAL compliance failures, catching workspaces compiled before floor enforcement was added. The fleet template must support locked (cannot be overridden at all) vs floor (can be raised but not lowered) dimensions for granular control. When a local policy attempts to lower the floor, the error must suggest the fleet exception request workflow. Development fleets may use `fleet.environment: development` to legitimately lower floors fleet-wide while still prohibiting individual workspace overrides.

**P-183: Elicitation removal cascade** *(Sources: PA-S22-F03, PA-S22-F05, PA-S22-F06, PA-S22-F07)*: Fleet template modifications that remove policies must require double-confirmation after impact analysis reveals cascade failures. Staged rollout for policy removals must be supported (`--canary N`). Affected workspaces must receive both the policy removal and a remediation notification explaining what will break and how to fix it. Fleet template changes must be versioned and reversible via `claws fleet template rollback`.

**P-185: Case-insensitive agent name collision** *(Sources: PA-S24-F06, PA-S24-F07)*: Fleet scan collision output must include resolution guidance with suggested rename commands. The fleet template should support automatic agent name namespacing (`fleet.agentNamespace: true`) that prepends workspace names to agent identities, eliminating collisions by construction rather than by detection.

### Snapshot Lifecycle (P-186 through P-196)

**P-186: Save IR not source** *(Sources: PA-S25-F01, PA-S25-F02, PA-S25-F03, PA-S25-F04, PA-S25-F05, PA-S25-F06, PA-S25-F07)*: Snap save must capture a coherent file+IR pair: all 9 workspace source files, claws.json, AND the GovernanceIR. The snapshot manifest must list all included files with SHA-256 hashes and explicitly record absent optional files. Save must be atomic (temp directory + atomic rename) so partial snapshots are discarded. Post-save coherence verification must recompile saved source files and compare against the saved IR to detect stale cache scenarios. Maximum snapshot size (default 10MB) must be defined with compression support for large files.

**P-187: Restore violates lossless** *(Sources: PA-S26-F01, PA-S26-F03, PA-S26-F04, PA-S26-F05, PA-S26-F06, PA-S26-F07)*: Snap restore must use a staging-area workflow instead of direct file overwrite: write to .claws/staging/{snapshot-name}/, show file-level and content-level diffs, and require explicit confirmation. An automatic pre-restore backup snapshot must be created before any overwrite. The `--force` flag (for dead man switch automated recovery) must still create the pre-restore backup. Selective file application (`claws snap apply --file SOUL.md`) must be supported. If the workspace is under version control, restore should recommend committing current changes first.

**P-188: Cross-version diff spurious** *(Sources: PA-S27-F01, PA-S27-F02, PA-S27-F03, PA-S27-F04, PA-S27-F05, PA-S27-F06, PA-S27-F07)*: Snap diff between snapshots from different claws versions must normalize IR schemas via a version migration table before comparison, preventing spurious changes from schema evolution. The diff output must label changes as [governance] or [schema] for transparency. Missing migration entries must produce warnings rather than silently creating spurious results. A `--governance-only` flag must filter out schema changes, and source file diffs must be available alongside IR diffs as ground truth. Cross-version comparison should suggest re-compiling old snapshots with the current compiler.

**P-189: Promote lowers baseline** *(Sources: PA-S28-F01, PA-S28-F02, PA-S28-F03, PA-S28-F04, PA-S28-F05, PA-S28-F06, PA-S28-F07)*: Snap promote must include a mandatory pinch validation gate comparing the promoted snapshot against the current fleet baseline across all governance dimensions. If any dimension is weakened, promote must be blocked. A `--lower` flag for legitimate reductions requires multi-factor confirmation (--confirm --reason) with a CRITICAL audit event. All cached drift reports must be invalidated atomically as part of the promote operation. Role-based access control should restrict promote to fleet-admin role only. A canary period (tentative for 24 hours, reporting against both old and new baselines) enables safe rollback.

**P-190: Baseline invalidates drift** *(Sources: PA-S29-F01, PA-S29-F02, PA-S29-F03, PA-S29-F04, PA-S29-F05, PA-S29-F06, PA-S29-F07)*: Snap promote must atomically invalidate all cached drift reports as part of the promotion transaction, with rollback if invalidation fails. After invalidation, all workspaces must report UNKNOWN status until re-evaluated against the new baseline. UNKNOWN must be a fourth distinct status in dashboard integrations. Workspace operators must be notified of baseline changes with instructions to re-evaluate. Compliance responses must always include the baseline version they were evaluated against. Optional automatic re-scan after promote (`--rescan`) eliminates the UNKNOWN window.

**P-191: Dead man switch critical violations** *(Sources: PA-S30-F01, PA-S30-F02, PA-S30-F03, PA-S30-F04, PA-S30-F05, PA-S30-F06, PA-S30-F07)*: The dead man switch must run pre-restore validation (pinch) on the snapshot and block restore if critical violations exist, entering deny-all mode instead. The pre-upgrade snapshot should be validated BEFORE the upgrade begins, blocking upgrades when the current state has critical violations. Violation severity classification must distinguish critical (blocks restore), major (warns), and warning (informational). The threshold is configurable. The CRITICAL alert must include remediation steps with exact commands. A migration tool (`claws migrate --fix-critical`) must resolve grandfathered critical violations before upgrades.

**P-192: Restored line numbers wrong** *(Sources: PA-S31-F01, PA-S31-F02, PA-S31-F03, PA-S31-F04, PA-S31-F05, PA-S31-F06)*: Snap restore must always re-run pinch (recompilation) on restored source files to produce fresh IR with correct line numbers. The saved IR serves only for coherence verification (comparing against recompiled IR to detect tampering). Recompilation must happen automatically as an invisible step in the restore workflow. Governance-meaningful differences between saved and recompiled IR must produce warnings. Recompilation uses the current claws version for compatibility with the running enforcement engine.

**P-193: Auto-prune deletes baseline** *(Sources: PA-S32-F01, PA-S32-F02, PA-S32-F03, PA-S32-F04, PA-S32-F05, PA-S32-F06, PA-S32-F07)*: Protected snapshot categories (fleet baseline, active dead man switch, user-pinned) must be immune to auto-pruning regardless of age or storage pressure. Protection must be set automatically for fleet baselines and dead man switch snapshots. When all snapshots are protected and storage is full, pruning must fail with a warning rather than deleting protected snapshots. Soft delete with a 7-day grace period (configurable) enables `claws snap undelete`. `claws snap list` must show protection status. When a new baseline is promoted, the previous baseline's protection downgrades to "previous-baseline" with a configurable retention period.

**P-194: Promote prune ordering** *(Sources: PA-S33-F01, PA-S33-F02, PA-S33-F03, PA-S33-F04, PA-S33-F05, PA-S33-F06)*: Promote must be atomic with strict ordering: validate, establish new baseline, then downgrade previous baseline protection. At no point can both baselines be unprotected simultaneously. Auto-pruning must be locked out during promote. The previous baseline retains protection until the new one is verified (baseline pointer updated + at least one workspace drift evaluation succeeds). A transaction log enables crash recovery and rollback. Fleet status must show "promote-in-progress" state during the operation.

**P-195: No integrity verification** *(Sources: PA-S34-F01, PA-S34-F02, PA-S34-F03, PA-S34-F04)*: Snapshots must include mandatory SHA-256 integrity hashes per file and HMAC-SHA256 manifest signing. On restore, each file's hash is recomputed and compared; any mismatch aborts the restore. The HMAC key must be derived from workspace identity, preventing an attacker from updating both the file and its hash. Integrity verification must be non-bypassable for security-critical operations (dead man switch, fleet baseline). The two-layer defense (per-file SHA-256 + manifest HMAC) detects both accidental corruption and deliberate tampering.

**P-196: Dead man switch corrupt snapshot** *(Sources: PA-S35-F01, PA-S35-F02, PA-S35-F03, PA-S35-F04, PA-S35-F05)*: When the dead man switch detects a corrupt snapshot during restore, it must enter deny-all mode rather than proceeding with corrupt governance or leaving the workspace ungoverned. The CRITICAL alert must include the corruption details (which file, expected vs actual hash) and remediation steps. A fallback snapshot chain must be maintained: if the primary pre-upgrade snapshot is corrupt, the dead man switch should try the previous snapshot. The workspace must be locked in deny-all until an operator provides a valid snapshot or runs manual recovery.

### OBO Elicitation (P-199, P-200, P-203, P-205)

**P-199: Approve on timeout override** *(Sources: PT1-S03-F03)*: When handler registration is refused due to missing AbortSignal support for deny-on-timeout, the error message must clearly state why and what to do: "R5 handler registration refused: platform version X.Y does not support deny-on-timeout. Upgrade to version X.Z or higher." Vague errors lead operators to bypass the check rather than upgrading the platform.

**P-200: Duplicate approval retry** *(Sources: PT1-S04-F08)*: The claws documentation and health check must publish the elicitation timeout value and recommend that agent framework timeouts be at least 2x the elicitation timeout. Known framework timeout defaults that are too short (LangGraph, AutoGen, CrewAI) must be detected and warned about during health checks.

**P-203: Transitive OBO relay** *(Sources: PT1-S07-F06)*: The health check must detect multi-agent topologies and warn about per-invocation approval requirements for each agent in the topology. Multi-agent orchestrators may be surprised that the supervisor cannot pre-approve R5 actions for workers; each worker must independently trigger user elicitation.

**P-205: Stale standing approval** *(Sources: PT1-S09-F01, PT1-S09-F02, PT1-S09-F04, PT1-S09-F08)*: The compiled handler must include a hash of the source configuration and periodically compare it with the current source hash at runtime (default: every 60 seconds). When drift is detected, all standing approvals must be suspended (fail-closed, non-configurable) and R5 tools revert to per-invocation elicitation. `claws doctor` must include standing approval drift as a critical check item. A git-hook integration that triggers recompilation on governance file changes closes the gap where git revert silently restores removed standing approvals.

### A2A Governance (P-208, P-212)

**P-208: Approval key exposure** *(Sources: PT1-S12-F03, PT1-S12-F08)*: The health check (`claws doctor`) must scan the workspace for exposed keys by checking files matching *.key/*.pem/*.secret, environment variables matching key patterns, and claws.json fields containing inline key values. Any detection triggers a critical health check failure with remediation instructions. In development environments, a `--dev-mode` flag generates a workspace-local key with a "DEV ONLY" marker that prevents the compiled handler from registering on production Gateways, ensuring development convenience does not leak into production.

**P-212: Cross-workspace trust** *(Sources: PT1-S16-F01, PT1-S16-F02, PT1-S16-F03, PT1-S16-F04, PT1-S16-F05, PT1-S16-F06, PT1-S16-F07, PT1-S16-F08)*: `claws scan` must construct a global trust graph from all workspace IRs as a prerequisite to fleet-level trust validation, running both Tarjan SCC detection and transitive closure enumeration. Data classification labels must propagate across workspace boundaries with high-water-mark analysis. The scan must operate on compiled IRs (with version mismatch detection), support incremental mode for large fleets, and produce actionable output showing full transitive chain paths with trust levels and data labels. Per-workspace filtered output must be available for administrators without fleet-wide access. Explicit cross-workspace trust declarations should suppress warnings for known intentional chains.

### Skill Lifecycle (P-232 through P-236)

**P-232: Scaffold risk exceeds trust** *(Sources: PT2-S07-F01, PT2-S07-F02, PT2-S07-F03, PT2-S07-F04, PT2-S07-F05, PT2-S07-F06, PT2-S07-F07)*: The skill scaffold must read the workspace trust tier and clamp the risk level to the maximum allowed (T1->R1, T2->R2, T3->R3, T4->R4, T5->R5) with an explicit notification explaining the constraint. Without `--risk`, the default must be R1 (safest), not the workspace maximum. The workspace trust tier must be discoverable via `claws workspace info`. Risk-level-specific scaffold templates must vary boilerplate (R1 minimal, R4 with approval hooks and budget tracking). G-CLASS violation messages must include actionable guidance: "Skill risk R5 requires workspace trust tier T4 or higher. Current workspace is T2."

**P-233: Declared OBO unverified** *(Sources: PT2-S08-F01, PT2-S08-F03, PT2-S08-F04, PT2-S08-F05, PT2-S08-F06)*: DECLARED tier badges must carry a visible "self-reported" qualifier on all claims. Static analysis of handler source code must detect known OBO-capable API imports (Graph SDK, SMTP, OAuth) and produce a warning that the obo: none claim may be inaccurate. The `claws skill install` command must require explicit acknowledgment for DECLARED tier skills. The three badge tiers (DECLARED, VERIFIED, CERTIFIED) must have documented semantics linked from every badge display. The scaffold must include an OBO checklist prompting the developer to consider common OBO patterns.

**P-234: Stale verified badge** *(Sources: PT2-S09-F01, PT2-S09-F02, PT2-S09-F03, PT2-S09-F04, PT2-S09-F05, PT2-S09-F07)*: The publish command must verify that the manifest signature matches current source file content hashes (SHA-256, not timestamp-based) before publishing. If any source file was modified since verification, the badge must be atomically downgraded to DECLARED at publish time. The developer must be informed of the downgrade before publish completes. The inner ring (pinch) must also detect signature staleness during local development. The manifest must define an explicit verification scope so non-handler file changes (README, docs, tests) do not invalidate the badge.

**P-235: Non-atomic publish** *(Sources: PT2-S10-F01, PT2-S10-F02, PT2-S10-F03, PT2-S10-F04, PT2-S10-F05, PT2-S10-F06, PT2-S10-F07, PT2-S10-F08)*: The publish command must not mutate local state before confirming remote success: build the package in a temp directory, upload to ClawHub, then commit local changes (version bump, badge metadata) only on success. If local state was already mutated, automatic rollback must restore the manifest from a backup copy. Publish must be idempotent via a transaction ID enabling retry detection. The version bump must be the last local mutation. Badge metadata must be regenerated on each publish attempt. Retry with exponential backoff for transient errors (5xx, timeout) and `claws skill status` must detect local-remote version divergence.

**P-236: YAML None/null OBO** *(Sources: PT2-S11-F01, PT2-S11-F02, PT2-S11-F03, PT2-S11-F04, PT2-S11-F05, PT2-S11-F06, PT2-S11-F07, PT2-S11-F08)*: The frontmatter parser must detect YAML null coercion for known string fields and produce a targeted diagnostic: "obo: None was parsed as null by YAML. Use obo: 'none' (quoted)." For unambiguous coercions where null is never valid, auto-correction with a warning is acceptable. All YAML 1.1 null aliases (null, Null, NULL, ~, None, NONE, empty) and boolean keywords (True, False, Yes, No, On, Off) must be handled across all string-typed manifest fields. The scaffold must generate defensively quoted values. A lint rule must detect unquoted YAML keywords. YAML 1.2 parsing is recommended for skill manifests.

### Lossless Round-Trip (P-238, P-240, P-242, P-245, P-246)

**P-238: Compiled workflow feedback loop** *(Sources: PT2-S13-F04)*: The PARSE phase error message when detecting compiled-output markers must explain the feedback loop risk clearly: "This file appears to be a compiled claws output. Recompiling it would inject duplicate governance rules. Use the original source files instead." The message must include the detected marker location and original compilation timestamp for traceability.

**P-240: CRLF/LF hash divergence** *(Sources: PT2-S15-F06, PT2-S15-F07)*: Source location diagnostics (line:column) must reference positions in normalized content, noting the original line ending format so developers can correlate with their editor display. The `claws diff` command must compare GovernanceIR on normalized content to report zero differences for identical logical content across platforms, preventing false positives on every cross-platform comparison.

**P-242: Error deletes working artifacts** *(Sources: PT2-S17-F03, PT2-S17-F05)*: When the developer runs `claws status` after a failed compilation, the output must clearly state: "Last successful compilation: {timestamp}. Current compilation: FAILED. Using last-known-good artifacts." On Windows, the atomic directory swap requires a three-step process (rename output to output.backup, rename staging to output, delete output.backup) with rollback if step 2 fails, because NTFS does not support atomic directory rename when the target exists.

**P-245: CLAUDE.md user content overwritten** *(Sources: PT2-S20-F06, PT2-S20-F07, PT2-S20-F08)*: The emitter should only modify the CLAUDE.md specified in claws.json as the target (defaulting to project root), preventing accidental governance injection into nested CLAUDE.md files at the wrong scope. The delimiter format must be stable across claws versions, recognizing both old and new formats during transitions to prevent duplicate governance sections. Documentation should recommend placing the governance section at the end of CLAUDE.md to minimize reference breakage when rules change.

**P-246: Settings.json merge overwrites** *(Sources: PT2-S21-F06, PT2-S21-F07, PT2-S21-F08, PT2-S21-F09)*: The settings.json merge must preserve unknown keys from future Claude Code versions. MCP server configurations must be treated as user-owned and never modified, logged, or exposed. A pre-merge backup (settings.json.claws-backup) must be created before modification. The `claws diff` command should show the settings.json merge plan before emission: which keys will be added, overridden, and preserved.

### Platform Detection (P-244, P-247, P-248, P-249)

**P-244: Advisory R5 silently unenforced** *(Sources: PT2-S19-F03, PT2-S19-F05, PT2-S19-F07)*: R4 tools on advisory platforms must produce a prominent warning: "R4 enforcement on advisory platform is best-effort. The LLM may not comply under adversarial conditions." Multi-platform compilations targeting both enforcement-capable and advisory-only platforms must evaluate enforcement capability per platform independently. The compiler's error messages for R5 enforcement gaps must use alarming language: "CRITICAL: R5 tool 'X' CANNOT be enforced on advisory platform 'Y'. Do NOT deploy this configuration for production governance."

**P-247: Bedrock guardrail API version** *(Sources: PT2-S22-F02, PT2-S22-F05, PT2-S22-F06)*: The emitter must warn when the targeted Bedrock API version is older than 6 months, with guidance to run `claws update-targets`. Per-environment API version targeting must be supported so the same source files can emit compatible guardrails for dev, staging, and prod. A `--dry-run` mode must validate emitted JSON against the target API schema without deploying, enabling CI pipelines to catch version mismatches without requiring Bedrock credentials.

**P-248: LangGraph Python TS-only** *(Sources: PT2-S23-F06, PT2-S23-F07, PT2-S23-F08)*: When the target platform requires an unsupported output language, the error message must include a migration path: "LangGraph requires Python codegen. Python support is tracked in issue #XXX. Until then, use claws compile --emit-ir-only and implement guards manually." The `--emit-ir-only` flag must be available for all platforms including unsupported ones. The platform capability matrix documentation must clearly state which platforms support which output languages with a status table (supported/planned/unsupported).

**P-249: CrewAI config format evolution** *(Sources: PT2-S24-F07)*: The "no supported platform detected" error message must include the list of checked filenames: "Checked for: crewai.yaml, crew.yaml, pyproject.toml with [tool.crewai]. None found in /path/to/workspace." This immediately tells the developer which filenames claws expects and lets them verify their setup.

## Integration Scenario Amendments

### InputResolver

**IR-S03: URL Policy Input** *(Sources: IR-S03-F05)*: URL fetches introduce network dependency into compilation. When the network is unavailable and the cache has expired, compilation fails for a reason unrelated to governance content. The cache should support a "stale-while-revalidate" mode where expired cached content is used with a warning diagnostic, preventing network outages from blocking local development workflows.

**IR-S05: Input Resolver Failure Modes** *(Sources: IR-S05-F02, IR-S05-F05)*: The INPUT-RESOLVE-PACKAGE-NOT-FOUND diagnostic must distinguish between "package declared in package.json but not installed" (fix: npm install) and "package not declared anywhere" (fix: npm install AND add to package.json), since the fix instruction changes based on root cause. When multiple resolution failures are collected, diagnostic output ordering must be deterministic -- errors should be grouped by failure type (package, then network, then integrity) or by severity, not by random resolution timing, to make triage predictable.

### Package Output

**PO-S01: Publish Delegates Craft Package** *(Sources: PO-S01-F04)*: The npm registry authentication flow for claws publish must pass through npm's standard .npmrc token without introducing claws-specific credential management. Dual credential stores (npm token + claws token) create confusion about which token is used and increase the maintenance burden for enterprise developers.

**PO-S03: Incremental Publish Skip** *(Sources: PO-S03-F04, PO-S03-F06)*: The "skipped" output for unchanged packages must be distinguishable from a successful publish in CI pipeline logs. The exit code should be 0 (success), and the output format should include a machine-readable status field (e.g., JSON with "action": "skipped") so CI gates do not misinterpret a correct skip as a failure. The published hash for content comparison should be registry-derived (query npm for the latest version's content hash) rather than locally cached, since local state is not shared across CI nodes and two nodes could both attempt to publish the same version.

**PO-S05: Publish Atomicity Rollback** *(Sources: PO-S05-F03, PO-S05-F05, PO-S05-F06)*: Publish retry must be idempotent -- running claws publish twice after a failure must not double-bump the version. The retry logic must check registry state before deciding whether to bump. Different failure modes require different retry semantics: a 409 (version exists) should verify content match rather than retry, a 502 should retry, and a 403 should not retry without credential fix. For concurrent publish from multiple CI nodes (merge queue), the losing node must handle 409 gracefully by verifying the published content matches its intent, treating it as success if content matches or flagging a genuine conflict if it differs.

**PO-S06: Multi-Artifact Package** *(Sources: PO-S06-F04)*: When the artifact slicer auto-includes dependent artifacts (roles, entities) that were not explicitly declared in the include field, it must emit a warning diagnostic listing every auto-included artifact and the dependency reason. This prevents developers from unknowingly shipping experimental content when they declared only stable artifacts.

### Ontology Governance

**OG-S05: Ontology Versioning Drift** *(Sources: OG-S05-F04)*: The fleet drift report for ontology version mismatches must be actionable: each drifted workspace needs a recompilation command (e.g., claws compile --update-ontology) alongside the workspace name. Without remediation commands, fleet operators must manually construct the update for each of the 15 drifted workspaces, which does not scale.

### Compiled Context

**CC-S02: Structural Sharing Savings** *(Sources: CC-S02-F05)*: Fleet scan should include a storage efficiency metric alongside drift detection to catch regressions. If an implementation regresses from delta-only forks to full copies, the storage measurement should detect this. The metric should report actual savings ratio and flag when it drops below a configured threshold (e.g., 90% for the reference fleet size).

**CC-S04: Context Diff Fleet Drift** *(Sources: CC-S04-F05)*: The diff output for modified rules must include before/after values, not just counts. "Rule deny:prod-access changed trust_tier_gate from 3 to 4" is actionable; "1 rule modified" is not. The modification detail enables fleet operators to assess whether drift is a tightening (acceptable) or a loosening (requires remediation) without drilling into each workspace.

**CC-S05: Cross-Workspace Context Tree** *(Sources: CC-S05-F01, CC-S05-F02, CC-S05-F04, CC-S05-F05, CC-S05-F06)*: The fleet tree command must support arbitrary depth (not just root-to-leaf) with a --depth flag to manage deep hierarchies where sub-teams create sub-forks. For enterprise-scale fleets (100+ workspaces), the tree must support filtering (--status drifted, --min-delta 1000) and sorting (--sort delta-desc) since displaying all forks in a flat list is visually overwhelming. The tree should distinguish "intentionally baseline" forks (configured, chose no overrides) from "unconfigured" forks (created but never touched) via a configuration timestamp. Multi-format output (--format tree/json/csv) is required so CI pipelines can parse structured data rather than terminal escape codes. Outlier deltas (workspaces with unusually large deltas relative to fleet average) should be flagged as potential governance fragmentation.

### Loss-Aware Emission

**LA-S01: Governance Fidelity Matrix** *(Sources: LA-S01-F06)*: When all 7 platforms are compiled simultaneously, the 35-cell matrix could produce a large volume of CROSS_LOSS_FIELD_DEGRADED advisories that overwhelm developer attention. Advisories should be grouped by platform with summary counts, not emitted per-cell, to keep the output scannable.

**LA-S03: Strict Loss R5 Advisory** *(Sources: LA-S03-F04)*: The ASTRO-ROUTE-LOSS-003 error message must suggest actionable alternatives: which platforms support lossless enforcement for the R5 tool, and whether splitting compilation (R1-R4 to one platform, R5 to another) is possible. An opaque rejection without alternatives leaves the developer stuck.

**LA-S04: Multi-Platform Loss Report** *(Sources: LA-S04-F04, LA-S04-F05)*: The loss report should include a comparison matrix showing which platform is best for each governance capability (e.g., "For audit, choose OpenClaw or Bedrock over Claude Code or Cursor"). When all targets produce artifacts without strict-loss blocking, the report should include a recommended target based on governance fidelity score. The recommendation is advisory, not enforced, but helps developers who are unsure which platform best preserves their governance intent.

**LA-S05: Platform Capability Versioning** *(Sources: LA-S05-F03)*: CROSS_LOSS_VERSION_UPGRADE advisories must only suggest version upgrades that are compatible with the workspace's runtime environment. The advisory should reference the platform's changelog or migration guide so developers can assess upgrade risk rather than blindly updating.

### Identity Bridge

**IB-S04: Section Locks FE6** *(Sources: IB-S04-F05)*: The GUARD-LOCK-001 error must include a diff showing what was changed in the locked section, not just the section name and lock level. Without the diff, the admin reviewing the lock violation cannot determine whether the change was malicious (weakening governance) or benign (fixing a typo). The diff should be generated at the section level, not the full file.

**IB-S05: Fleet Identity Operations** *(Sources: IB-S05-F05, IB-S05-F06)*: Fleet scan performance must not degrade linearly with total fleet size for scoped users. An editor scanning 5 visible workspaces should not wait proportional to the full 100-workspace fleet. Identity resolution should be the first operation (O(1) lookup), followed by scanning only visible workspaces, preventing unnecessary I/O. Cross-business-unit governance drift is invisible to scoped editors; the fleet should support delegated drift visibility where editors see drift within their assigned workspaces and optionally receive cross-unit drift summaries (without workspace details) for situational awareness.

## Open Questions

1. Should `claws watch` auto-start on terminal open (like ESLint in VS Code)?
2. Should the claws action support GitLab CI and Azure DevOps in addition to GitHub Actions?
3. Should `claws doctor --post-upgrade` detect platform upgrades automatically or require explicit invocation?
4. Should @bic/claws-skill-kit support runtime decorator resolution for skills that cannot use `claws build`?
5. How should ClawHub render governance badges for skills published without `claws publish`?
6. Should claws-lsp support multi-workspace VS Code with multiple OC agent directories?

## Research References

| Source | What it contributed |
|--------|-------------------|
| Q12e | Three-ring continuous governance model (watch/doctor/drift), dead man's switch pattern, 70/20/10 scenario split, 2 new flags |
| Q12f | Four-stage CI/CD pipeline, `@bic/claws-action` design, SARIF integration, 7 CI-specific flags, gradual adoption path |
| Q12o | @bic/claws-skill-kit + @bic/claws-test, SKILL.md compilation pipeline, three-tier adoption (DECLARED/TYPED/VERIFIED), 4 maker commands, ClawHub badges |
| Q12q | VS Code extension (claws-lsp + claws-vscode), compilation host daemon, incremental compilation model, `claws serve` API, cross-file tension detection |
