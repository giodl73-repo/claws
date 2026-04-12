# Experiment b: The Three-Ring Continuous Governance Model

**Method**: design analysis
**Date**: 2026-04-11

---

## The Model

Governance runs at three concentric rings. Each ring has different triggers, latency, scope, and output. The inner ring catches most issues; the outer rings catch what slips through.

```
┌─────────────────────────────────────────────────────────────────┐
│                    OUTER RING — FLEET                           │
│  Trigger: scheduled / on-demand / post-broadcast               │
│  Latency: minutes (fleet-wide scan)                            │
│  Scope: all workspaces in fleet                                │
│  Commands: glint drift, glint pinch --fleet, glint broadcast   │
│  Output: fleet compliance report, drift alerts, remediation    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              MIDDLE RING — UPGRADE                      │   │
│  │  Trigger: platform upgrade / glint upgrade / on-demand  │   │
│  │  Latency: seconds (single workspace)                    │   │
│  │  Scope: one workspace                                   │   │
│  │  Commands: glint doctor, glint snap, glint diff         │   │
│  │  Output: migration report, pre/post diff, rollback      │   │
│  │                                                         │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │           INNER RING — LIVE                     │   │   │
│  │  │  Trigger: file save / git commit / build        │   │   │
│  │  │  Latency: <1s (incremental)                     │   │   │
│  │  │  Scope: changed files                           │   │   │
│  │  │  Commands: glint watch, glint pinch --staged    │   │   │
│  │  │  Output: pass/fail, inline violations, auto-fix │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Ring 1: LIVE (Inner Ring)

### Purpose
Catch governance violations as they happen — on every file save, every git commit, every build. The developer's companion.

### Trigger Matrix

| Trigger | Command | What runs | Latency target |
|---------|---------|-----------|---------------|
| File save (watch mode) | `glint watch` | Incremental compile + pinch on changed files | <1s |
| Git commit (pre-commit hook) | `glint pinch --staged` | Full pinch on staged files only | <2s |
| Build | `glint build` | Compile + auto-pinch (H1 handshake) | <5s |
| Manual check | `glint pinch` | Full workspace pinch | <3s |
| Amend workspace | `glint amend` | FORMA pipeline + auto-pinch | <3s |

### Output

```
$ glint watch
  Watching my-agent/ for changes...

  [14:32:01] SOUL.md changed
  ✓ Built (847 tokens) ✓ Pinched (0 violations) — 0.3s

  [14:32:45] TOOLS.md changed
  ✓ Built (923 tokens) ✗ Pinched (1 violation) — 0.4s
    G3: Tool 'file-system' exceeds T2 trust tier (requires T3)
    → Run 'glint pinch --fix' or set trustTier: 3 in glint.json

  [14:33:12] AGENTS.md changed
  ✓ Built (1,102 tokens) ✓ Pinched (0 violations) — 0.5s
```

### What it catches

| Vector | Example | Detection |
|--------|---------|-----------|
| User changes a permission | Added T3 tool to T2 workspace | G3 trust tier rule |
| User adds a skill | New skill with no governance metadata | G2 skill policy rule |
| User modifies SOUL.md | Changed behavioral constraint | Semantic diff, G1 identity rule |
| User removes a guard | Deleted safety instruction from AGENTS.md | G4 guard removal detection |
| Config drift | Changed glint.json manually | Schema validation |

### Key design decisions

1. **Incremental, not full**: `glint watch` only re-processes changed files. Full workspace pinch runs on commit, not on save.
2. **Non-blocking by default**: Watch mode shows violations but doesn't prevent saving. `--strict` mode makes violations block.
3. **Auto-fix available**: `glint pinch --fix` in watch mode auto-remediates on save (opt-in).
4. **Audit trail**: Every watch-mode pinch result is appended to `.glint/audit/chain.jsonl`. Even the inner ring produces evidence.

---

## Ring 2: UPGRADE (Middle Ring)

### Purpose
Handle platform upgrades, glint self-upgrades, and major configuration changes. The boss's upgrade script, built-in.

### Trigger Matrix

| Trigger | Command | What runs | Latency target |
|---------|---------|-----------|---------------|
| Pre-upgrade snapshot | `glint snap save pre-upgrade --pinch` | Full snapshot + governance validation | <10s |
| Post-platform-upgrade | `glint doctor --post-upgrade` | Migration + health check + re-pinch | <15s |
| Post-glint-upgrade | `glint doctor` (auto-detects) | Config schema migration + cache invalidation | <5s |
| Pre/post comparison | `glint diff pre-upgrade HEAD` | Semantic diff of IR state | <5s |
| Rollback | `glint snap restore pre-upgrade` | Restore governance state | <5s |

### The `glint doctor` Upgrade Flow

`glint doctor` already exists in the command surface (GLINT-MAP #10). For upgrade scenarios, it gains context awareness:

```
$ glint doctor --post-upgrade

  Platform Detection
  ✓ OpenClaw v2026.4.9 detected (was v2026.4.5 in last snapshot)
  ✓ 4 version gap — checking for breaking changes...

  Config Migration
  ✓ glint.json schema: current (no migration needed)
  ✗ Platform config: 2 migrations required
    → allow → enabled (openclaw.json key rename)
    → tts.provider nested under audio section
    Run 'glint doctor --fix' to apply migrations

  Governance Re-validation
  ✗ 1 policy violation introduced by upgrade:
    G5: Plaintext WebSocket to LAN IP now blocked (new security default)
    → Run 'glint pinch --fix' to remediate

  Skill Compatibility
  ✓ 12/12 skills compatible with v2026.4.9
  ⚠ 1 deprecation warning: skill 'legacy-search' uses v1 API (sunset Q3 2026)

  Health Summary
  ┌──────────────────────────┬────────┐
  │ Check                    │ Status │
  ├──────────────────────────┼────────┤
  │ Platform version         │ ✓      │
  │ Config schema            │ ✗ fix  │
  │ Governance policies      │ ✗ fix  │
  │ Skill compatibility      │ ✓ warn │
  │ Cache integrity          │ ✓      │
  │ Audit chain integrity    │ ✓      │
  │ Secrets vault            │ ✓      │
  └──────────────────────────┴────────┘

  2 issues require attention. Run 'glint doctor --fix' then 'glint pinch --fix'.
```

### The Dead Man's Switch

```bash
# One-liner: snapshot → upgrade → doctor → pinch → or rollback
glint snap save pre-upgrade --pinch && \
  npm install -g openclaw@latest && \
  glint doctor --post-upgrade --fix && \
  glint pinch || \
  glint snap restore pre-upgrade
```

If any step fails, auto-restore. This is what the community asked for (#14526, #21488).

### What it catches that the inner ring misses

| Issue | Why inner ring misses it | Middle ring catches it |
|-------|-------------------------|----------------------|
| Platform config migration | New config keys don't exist until upgrade | doctor detects version gap + schema changes |
| New security defaults | Stricter rules only apply after upgrade | doctor + pinch re-validate against new defaults |
| Skill API deprecation | Skill worked yesterday, API removed today | doctor checks skill API compatibility |
| Cache invalidation | Compiled IR may be stale after platform change | doctor invalidates affected cache tiers |
| Gateway compatibility | New platform version may need new gateway config | doctor checks platform runtime compatibility |

### Key design decisions

1. **`glint doctor` NOT `glint upgrade`**: Doctor already means "diagnostics + fix." Adding `--post-upgrade` is a flag, not a new command. Keeps count at 35.
2. **Doctor detects version gaps**: Compares platform version in last snapshot to current installed version. If gap > 0, runs upgrade-specific checks automatically.
3. **Doctor + pinch are separate steps**: Doctor handles platform migration. Pinch handles policy compliance. They compose: `glint doctor --fix && glint pinch --fix`.
4. **Snapshots are governance-validated**: `glint snap save --pinch` validates before saving. You don't snapshot a broken state.

---

## Ring 3: FLEET (Outer Ring)

### Purpose
Catch drift across all workspaces, push policy updates, generate fleet-wide compliance evidence. The platform engineer's view.

### Trigger Matrix

| Trigger | Command | What runs | Latency target |
|---------|---------|-----------|---------------|
| Scheduled drift scan | `glint drift` | Hash-based drift detection across fleet | <60s for 50 workspaces |
| Fleet governance sweep | `glint pinch --fleet` | Full pinch on every workspace | <120s for 50 workspaces |
| Policy broadcast | `glint broadcast --confirm` | Push updated policies to all workspaces | <30s for 50 workspaces |
| Fleet compliance report | `glint comply --fleet` | Generate fleet-wide evidence package | <120s for 50 workspaces |
| Fleet upgrade | `glint doctor --post-upgrade --fleet` | Run doctor on every workspace | <180s for 50 workspaces |
| Fleet emergency stop | `glint kill --fleet --confirm` | Kill all agents | <10s |

### Output

```
$ glint drift
  Scanning 47 workspaces...

  43 workspaces: no drift detected
   2 workspaces: policy drift
     → agents/research-bot/: TOOLS.md modified since last broadcast (3 days ago)
     → agents/customer-support/: glint.json trustTier changed from T2 to T3
   2 workspaces: version drift
     → agents/legacy-bot/: OpenClaw v2026.3.22 (fleet standard: v2026.4.9)
     → agents/test-bot/: OpenClaw v2026.4.2 (fleet standard: v2026.4.9)

  Run 'glint pinch --fleet' to validate all workspaces.
  Run 'glint broadcast --confirm' to push current policies.
```

### What it catches that inner + middle rings miss

| Issue | Why other rings miss it | Outer ring catches it |
|-------|------------------------|----------------------|
| Teammate changed something | Their workspace, their inner ring | Fleet drift scan detects cross-workspace changes |
| Version skew across fleet | Each workspace upgrades independently | Fleet version drift detection |
| Policy propagation lag | New policy published but not broadcast | Fleet governance sweep shows non-compliant workspaces |
| Time-based drift | Config diverges slowly over weeks | Scheduled drift scan catches gradual divergence |
| Compliance evidence | Each workspace has local evidence | Fleet-wide evidence package for auditors |

### Key design decisions

1. **Drift is hash-based**: Compare SHA-256 of governance-relevant files against last-known-good state. Fast (no full pinch needed for detection).
2. **Fleet doctor**: `glint doctor --post-upgrade --fleet` runs the full upgrade flow on every workspace. The platform engineer's "I just upgraded the fleet" command.
3. **Broadcast creates drift baseline**: After `glint broadcast`, the broadcast hash becomes the drift baseline. Any change after broadcast is drift.

---

## Ring Interactions

### Escalation pattern

```
Inner ring detects     →  Developer fixes locally     →  Done (99% of cases)
Inner ring can't fix   →  Middle ring (doctor/snap)   →  Migration or rollback
Middle ring detects    →  Platform-specific issue      →  Doctor --fix or snap restore
Fleet drift detected   →  Outer ring escalates        →  Broadcast or fleet pinch --fix
```

### Information flow

```
         ┌──── glint watch ────┐
         │  (continuous)        │
         │  violations → audit  │──→ .glint/audit/chain.jsonl
         │  chain               │
         └──────────┬───────────┘
                    │ (on upgrade)
         ┌──────────▼───────────┐
         │  glint doctor        │
         │  (per-upgrade)       │──→ migration report + re-pinch
         │  version gap →       │
         │  migration + pinch   │
         └──────────┬───────────┘
                    │ (on schedule / demand)
         ┌──────────▼───────────┐
         │  glint drift         │
         │  (fleet-wide)        │──→ fleet compliance report
         │  hash comparison →   │
         │  drift alerts        │
         └──────────────────────┘
```

### The "governance temperature" model

Each ring produces a governance temperature reading:

| Ring | Temperature | Meaning |
|------|------------|---------|
| Inner (watch) | **Hot** — real-time | "Your workspace is compliant right now" |
| Middle (doctor) | **Warm** — per-event | "Your workspace survived this upgrade" |
| Outer (drift) | **Cool** — periodic | "Your fleet is consistent as of last scan" |

The boss's upgrade script only takes a "warm" reading. Glint adds "hot" (continuous) and "cool" (fleet-wide).

---

## Command Surface Impact

### No new commands needed

The three-ring model uses EXISTING commands from GLINT-MAP:

| Ring | Commands (already in GLINT-MAP) |
|------|-------------------------------|
| Inner (live) | `glint watch` (#45), `glint pinch --staged` (#15), `glint build` (#2) |
| Middle (upgrade) | `glint doctor` (#10), `glint snap save/restore` (#27-31), `glint diff` (#7), `glint pinch --fix` (#12) |
| Outer (fleet) | `glint drift` (#35), `glint pinch --fleet` (#16), `glint broadcast` (#34), `glint comply --fleet` (#22) |

### New flags (minor additions)

| Flag | Command | Purpose |
|------|---------|---------|
| `--post-upgrade` | `glint doctor` | Run upgrade-specific checks (version gap detection, config migration, skill compat) |
| `--pre-upgrade` | `glint snap save` | Tag snapshot as pre-upgrade for easy restore reference |

These are flags, not commands. Command count stays at 35.

---

## Key Finding

The three-ring model requires zero new commands. Everything maps to existing GLINT-MAP entries. The only additions are 2 flags (`--post-upgrade` on doctor, `--pre-upgrade` tag on snap). The real innovation is not the commands — it's the model: governance runs at three concentric rings with different triggers, latency, and scope, and the inner ring eliminates most issues before they reach the upgrade checkpoint.
