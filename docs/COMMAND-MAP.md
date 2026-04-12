# COMMAND-MAP — Cross-Platform Agent Governance Command Surface

**Version**: v1.0
**Date**: 2026-04-11
**Status**: Authoritative
**Purpose**: Single source of truth for the `claws` CLI command surface — the cross-platform agent governance compiler. Maps every claws command to its craft/guard/fleet SDK equivalent. All design docs reference this table for the external-facing command surface.
**Lineage**: Q12 → Q12a (one CLI) → Q12c (verb surface) → Q12d (name: claws)

---

## Overview

`claws` is a cross-platform governance compiler for AI agents. It compiles governance policies into enforceable artifacts for any agent runtime — OpenClaw, Claude, Cursor, GitHub Copilot, AWS Bedrock, LangGraph, CrewAI, or custom.

- **40 commands** across 8 groups + maker + meta
- **2 crustacean verbs**: `pinch` (governance enforcement), `snap` (snapshot)
- **Progressive disclosure**: Maker (4) → Developer (18) → Advanced (40)
- **Scope model**: workspace-default, `--fleet` for fleet escalation, `--confirm` for destructive ops
- **Config**: `claws.json` (per-workspace), `.claws/` (artifacts)
- **Package**: `@craftworks/claws`

---

## How to Use This Table

When editing or authoring design docs:
1. Use `claws` for all external-facing command references
2. Use the SDK mapping (column 4) to trace commands to implementation
3. Persona column determines progressive disclosure tier
4. Scope column determines `--fleet` availability

### Name History

| Era | CLI name | Config | Directory | Killed by |
|-----|----------|--------|-----------|-----------|
| Q12 | `clawsc` + `clawops` | `clawsc.json` | `.clawsc/` | Q12a: one CLI wins |
| Q12a-Q12c | `claws` | `claws.json` | `.claws/` | Q12d: cross-platform positioning |
| Q12d (current) | **`claws`** | **`claws.json`** | **`.claws/`** | *(current)* |

---

## Bare Invocation

```
$ claws

  claws — governance for every agent
  Compile, govern, and operate AI agents across any platform.

  Quick start:
    claws init                   Set up governance for your workspace
    claws build                  Compile and emit your agent
    claws pinch                  Check against your org's policies
    claws build cursor           Cross-compile to another platform

  Run 'claws --help' for all commands.
```

---

## Command Surface (40 commands)

> **Note**: The tables below number items sequentially (1-53) for reference, but many numbered items are flag variants of the same command (e.g., `pinch`, `pinch --fix`, `pinch --watch` are 1 command with flags). The canonical count is **40 distinct commands** as shown in the [Command Count Summary](#command-count-summary).

### 1. BUILD — Compile and emit (always workspace-scoped)

| # | Command | Synopsis | Maps to (SDK) | Persona | Notes |
|---|---------|----------|---------------|---------|-------|
| 1 | `claws init` | Set up governance in agent workspace | guard init + platform quickstart | Maker | Creates claws.json + .claws/ |
| 2 | `claws build` | Compile + emit to platform output | craft build | Maker | Auto-triggers pinch via H1 handshake |
| 3 | `claws build <target>` | Cross-compile to target platform | craft build \<target\> | Maker | Targets: `openclaw`, `cursor`, `claude`, `github`, `bedrock`, `langgraph`, `crewai` |
| 4 | `claws compile` | Compile to IR only (no emit) | craft compile | Developer | Inspect-oriented |
| 5 | `claws optimize` | Run boost passes (quality/cost) | craft optimize | Developer | --crush, --guard, --probe flags |
| 6 | `claws test` | Run scenario validation | craft test | Developer | |
| 7 | `claws diff` | Semantic diff between versions | craft diff | Developer | |
| 8 | `claws import` | Reverse-compile workspace to prose | craft import | Developer | |
| 9 | `claws inspect` | Show compiled IR and registry | craft inspect | Developer | |
| 10 | `claws doctor` | Workspace + toolchain diagnostics | craft doctor | Developer | Checks platform runtime compatibility |

**Verb choices**: All standard compiler/build verbs. Universal across every agent platform.

**Cross-compile targets**: Every managed platform is a first-class build target. `claws build` (no target) defaults to the platform detected from workspace files.

---

### 2. PINCH — Governance enforcement (scope-sensitive)

| # | Command | Synopsis | Maps to (SDK) | Persona | Scope |
|---|---------|----------|---------------|---------|-------|
| 11 | `claws pinch` | Validate workspace against policies | guard check | Maker | workspace |
| 12 | `claws pinch --fix` | Auto-fix violations | guard check --fix | Developer | workspace |
| 13 | `claws pinch --watch` | Re-check on file changes | guard check --watch | Developer | workspace |
| 14 | `claws pinch --strict` | Warnings become errors | guard check --strict | Developer | workspace |
| 15 | `claws pinch --staged` | Check only git-staged files | guard check --staged | Developer | workspace |
| 16 | `claws pinch --fleet` | Enforce governance across all workspaces | fleet guard --scan + guard check | Advanced | fleet |
| 17 | `claws pinch --fleet --fix` | Auto-fix fleet-wide | fleet guard --scan + guard check --fix | Advanced | fleet |

**Why `pinch`**: The signature verb. "Pinch your workspace through the governance fences." Short, memorable, unmistakable. Every governance check goes through `pinch`. The `--fleet` flag scales it to fleet scope.

**Pre-commit hook**: `claws pinch --staged --quiet`

---

### 3. COMPLY — Compliance and risk (scope-sensitive)

| # | Command | Synopsis | Maps to (SDK) | Persona | Scope |
|---|---------|----------|---------------|---------|-------|
| 18 | `claws comply` | Generate compliance evidence package | guard comply | Developer | workspace |
| 19 | `claws comply soc2` | SOC 2 evidence package | guard comply soc2 | Developer | workspace |
| 20 | `claws comply eu-ai-act` | EU AI Act compliance | guard comply eu-ai-act | Developer | workspace |
| 21 | `claws assess` | Risk classification (EU AI Act tiers) | guard assess | Developer | workspace |
| 22 | `claws comply --fleet` | Fleet-wide compliance report | fleet guard --report | Advanced | fleet |

**Why separate from `pinch`**: `pinch` is fast enforcement (pass/fail, 0.3s). `comply` produces signed artifacts for auditors. Different audience, different cadence.

---

### 4. AUDIT — Audit trail operations (workspace + fleet-inherent)

| # | Command | Synopsis | Maps to (SDK) | Persona | Scope |
|---|---------|----------|---------------|---------|-------|
| 23 | `claws audit` | Show audit trail summary | guard audit | Developer | workspace |
| 24 | `claws audit verify` | Verify hash chain integrity | guard audit verify | Developer | workspace |
| 25 | `claws audit export` | Export events (CEF/JSON/syslog) | guard audit export --format | Developer | workspace |
| 26 | `claws audit history` | Compliance trend over time | fleet guard --history | Advanced | fleet (inherent) |

**Why `audit`**: Enterprise term of art. CISOs expect "audit."

---

### 5. SNAP — Snapshots (scope-sensitive)

| # | Command | Synopsis | Maps to (SDK) | Persona | Scope |
|---|---------|----------|---------------|---------|-------|
| 27 | `claws snap save <name>` | Save three-tier cache state | cache snapshot save | Advanced | workspace |
| 28 | `claws snap restore <name>` | Restore to snapshot state | cache snapshot restore | Advanced | workspace |
| 29 | `claws snap diff <a> <b>` | Show changes between snapshots | cache snapshot diff | Advanced | workspace |
| 30 | `claws snap save <name> --fleet` | Save all workspace caches | fleet snapshot save | Advanced | fleet |
| 31 | `claws snap restore <name> --fleet` | Restore fleet cache state | fleet snapshot restore | Advanced | fleet |
| 32 | `claws snap promote <name>` | Promote workspace snapshot to fleet | fleet promote | Advanced | fleet (inherent) |

**Why `snap`**: 4 chars vs 8 for "snapshot." Earned brevity. `claws snap save v2` is fast to type.

---

### 6. FLEET — Fleet-only operations (always fleet-scoped)

| # | Command | Synopsis | Maps to (SDK) | Persona |
|---|---------|----------|---------------|---------|
| 33 | `claws scan` | Discover all agent workspaces | guard scan | Advanced |
| 34 | `claws broadcast` | Push policies to all workspaces | fleet guard --scan | Advanced |
| 35 | `claws drift` | Detect policy drift (hash-based) | fleet guard --drift | Advanced |
| 36 | `claws report` | Fleet compliance dashboard | fleet guard --report | Advanced |
| 37 | `claws push` | Deploy compiled artifacts from snapshot | fleet push | Advanced |
| 38 | `claws kill` | Emergency stop (agent or fleet) | fleet kill | Advanced |
| 39 | `claws kill --fleet --confirm` | Emergency stop ALL agents | fleet kill --all | Advanced |

**Why bare verbs**: These are inherently fleet-scoped. `claws scan` only makes sense across workspaces.

**`push` vs `broadcast` semantics**:
- `claws broadcast` pushes **policy YAML files** to all workspaces. It updates what the governance rules SAY. Each workspace must then recompile (`claws build`) to apply the new policies. Broadcast is declarative: "here are the new rules."
- `claws push` deploys **compiled artifacts** (from a promoted snapshot) to workspaces. It updates the built output directly, skipping recompilation. Push is imperative: "here is the new enforcement code."
- Use `broadcast` for policy updates (new SOC2 template, updated risk thresholds). Use `push` for deploying a known-good compiled state across the fleet.

---

### 7. PROTECT — Identity, secrets, budget (scope-sensitive)

| # | Command | Synopsis | Maps to (SDK) | Persona | Scope |
|---|---------|----------|---------------|---------|-------|
| 40 | `claws budget` | Show/set workspace token budget | guard budget | Advanced | workspace |
| 41 | `claws budget --fleet` | Fleet token budget management | fleet budget | Advanced | fleet |
| 42 | `claws secrets init` | Create encrypted vault | guard secrets init | Advanced | workspace |
| 43 | `claws secrets set <key>` | Add/rotate secret | guard secrets set | Advanced | workspace |
| 44 | `claws identity` | Configure SSO/RBAC | identity-bridge | Advanced | workspace |

---

### 8. LIVE — Live compilation (always workspace-scoped)

| # | Command | Synopsis | Maps to (SDK) | Persona |
|---|---------|----------|---------------|---------|
| 45 | `claws watch` | Auto-recompile + pinch on file change | craft build --session (watch) | Developer |
| 46 | `claws session` | Interactive compilation session (stdin) | craft build --session | Advanced |
| 47 | `claws amend` | Add/remove/modify workspace concept | FORMA amendment pipeline | Developer |

---

### 9. MAKER — Skill creation (always workspace-scoped)

| # | Command | Synopsis | Maps to (SDK) | Persona |
|---|---------|----------|---------------|---------|
| 48 | `claws new skill <name>` | Scaffold typed skill with governance | claws-sdk maker/scaffold | Developer |
| 49 | `claws publish` | Governed publish to ClawHub | claws-sdk maker/publish | Developer |
| 50 | `claws annotate` | Auto-suggest governance frontmatter | claws-sdk maker/annotate | Developer |
| 51 | `claws import` | Migrate existing skill to claws | claws-sdk maker/import | Developer |

**Why separate group**: Maker commands are about creating governance-aware skills, not enforcing governance on existing workspaces.

---

### 10. META — Workspace management

| # | Command | Synopsis | Maps to (SDK) | Persona | Scope |
|---|---------|----------|---------------|---------|-------|
| 52 | `claws uninstall` | Clean removal of all claws artifacts | claws-sdk meta/uninstall | Advanced | workspace |
| 53 | `claws uninstall --global` | Remove global claws config | claws-sdk meta/uninstall | Advanced | global |

**`claws uninstall` behavior**:
- Backs up `.claws/` to `~/.claws-backups/<workspace>-<timestamp>/` before deletion
- Removes `claws.json` + `.claws/` from the workspace
- Does NOT modify platform files (SOUL.md, .cursorrules, etc.)
- `--keep-audit` preserves the audit chain; `--keep-secrets` preserves the vault
- `--global` removes `~/.claws/` global config

---

## Progressive Disclosure

### Maker Tier (4 commands — "5 minutes to governed")

```
$ claws

  Quick start:
    claws init                   Set up governance for your workspace
    claws build                  Compile and emit your agent
    claws pinch                  Check against your org's policies
    claws build cursor           Cross-compile to another platform
```

### Developer Tier (18 commands — full build + governance)

```
$ claws --help

  Build:
    init          Set up governance              build         Compile + emit
    compile       Compile to IR                  optimize      Boost passes
    test          Scenario validation            diff          Semantic diff
    import        Reverse-compile                inspect       Show IR
    watch         Auto-recompile                 amend         Modify workspace
    doctor        Diagnostics

  Govern:
    pinch         Policy enforcement             comply        Compliance evidence
    assess        Risk classification            audit         Audit trail

  Run 'claws --help-all' for fleet and advanced commands.
```

### Advanced Tier (40 commands — fleet + snapshots + protect + maker + meta)

```
$ claws --help-all

  Build:        init build compile optimize test diff import inspect watch amend doctor session
  Govern:       pinch comply assess audit [verify|export|history]
  Snapshot:     snap [save|restore|diff|promote]
  Fleet:        scan broadcast drift report push kill
  Protect:      budget secrets [init|set] identity
  Maker:        new skill, publish, annotate, import
  Meta:         uninstall
```

---

## Scope Model

| Command | Default scope | --fleet? | --confirm? |
|---------|--------------|----------|-----------|
| build, compile, optimize, test, diff, import, inspect, watch, session, amend, doctor | workspace | No | No |
| **pinch** | **workspace** | **Yes** | No |
| **comply** | **workspace** | **Yes** | No |
| assess | workspace | No | No |
| audit, audit verify, audit export | workspace | No | No |
| audit history | fleet (inherent) | No | No |
| **snap save/restore** | **workspace** | **Yes** | No |
| **snap diff** | **workspace** | **Yes** | No |
| snap promote | fleet (inherent) | No | No |
| **budget** | **workspace** | **Yes** | No |
| secrets, identity | workspace | No | No |
| scan, broadcast, drift, report, push | fleet (inherent) | No | No |
| **kill** | **workspace** | **Yes** | **Yes (--fleet)** |
| new skill, publish, annotate, import | workspace | No | No |
| uninstall | workspace | No | No |

**Scope-sensitive commands (6)**: pinch, comply, snap save/restore/diff, budget, kill

---

## Cross-Cutting Flags

| Flag | Commands | Description |
|------|----------|-------------|
| `--fleet` | pinch, comply, snap, budget, kill | Scope escalation to fleet-wide |
| `--confirm` | kill --fleet, broadcast, push | Double gate for destructive fleet ops |
| `--template <name>` | init, pinch | Policy template (soc2, hipaa, eu-ai-act, minimal) |
| `--target <platform>` | build | Cross-compile target |
| `--format <fmt>` | pinch, audit export, comply, report | Output format (sarif, github, cef, json, syslog, csv) — sarif/github added for CI (Q12f) |
| `--dry-run` | build, amend, pinch | Validate without writing output |
| `--debug` | all | Debug IR dump |
| `--json` | all | JSON output mode |
| `--no-cache` | compile, build | Bypass all cache tiers |
| `--skip-pinch` | build | Suppress auto governance check after build |
| `--optimize` | build | Run boost passes during build |
| `--pinch` | build, snap | Run governance check as part of operation |
| `--reason <text>` | kill, broadcast | Required for destructive operations |
| `--only <rules>` | pinch | Run only specified rules (e.g., `--only G2,G4`) |
| `--skip <rules>` | pinch | Skip specified rules (e.g., `--skip G1`) |
| `--post-upgrade` | doctor | Run upgrade-specific checks: version gap, config migration, skill compat (Q12e) |
| `--pre-upgrade` | snap save | Tag snapshot for easy restore reference after platform upgrade (Q12e) |
| `--diff <ref>` | pinch | Scan only files changed since ref — for PR diff scanning in CI (Q12f) |
| `--fail-on <sev>` | pinch | Severity gating: fail only on specified levels (critical, high, medium, low, all) (Q12f) |
| `--warn-only` | pinch | Soft-fail mode: all findings are warnings, exit 0 — for gradual CI adoption (Q12f) |
| `--sign` | comply | Sign compliance evidence with HMAC-SHA256 for CD gates (Q12f) |
| `--ci` | pinch | Auto-detect CI environment (GitHub Actions, GitLab CI), set format/diff defaults (Q12f) |

### The `--pinch` / `--skip-pinch` model

Governance is the default. `claws build` auto-triggers a pinch check via H1 handshake.

```bash
claws build                              # build + auto-pinch (default)
claws build --skip-pinch                 # build without governance
claws build cursor --optimize --pinch    # explicit: build + optimize + pinch
claws snap save v2 --pinch              # snapshot with governance validation
```

---

## Cross-Compile Targets

| Target | Platform | Output format | Notes |
|--------|----------|---------------|-------|
| `openclaw` | OpenClaw | SOUL.md + skills/ + tool hooks | Default when OC workspace detected |
| `cursor` | Cursor | .cursorrules | |
| `claude` | Claude Code | CLAUDE.md | |
| `github` | GitHub Copilot | .github/copilot-instructions.md | |
| `bedrock` | AWS Bedrock | Guardrail policy JSON | |
| `langgraph` | LangGraph | Python guard decorators | |
| `crewai` | CrewAI | YAML guard config | |
| _(auto)_ | _(detected)_ | _(best match)_ | Default: detect from workspace files |

`claws build` with no target auto-detects the platform from workspace files. `claws build <target>` cross-compiles explicitly.

---

## Workspace Layout

After `claws init --template soc2`:

```
my-agent/
  [platform workspace files]           ← existing (SOUL.md, .cursorrules, etc.)
  claws.json                           ← governance config
  .claws/                              ← governance artifacts
    policies/
      soc2-baseline.yaml               ← from template
    audit/
      chain.jsonl                      ← hash-chained append-only log
    cache/
      compile/                         ← compiled IR cache
      boost/                           ← optimization cache
      eval/                            ← evaluation cache
      snapshots/                       ← named snapshots
    secrets/
      vault.enc                        ← AES-256-GCM encrypted secrets
    compliance/
      soc2-2026-04-11.json             ← signed compliance artifact
  build/                               ← cross-compilation output (gitignored)
    cursor/
    claude/
    openclaw/
```

---

## The claws Experience

### Developer daily workflow

```bash
# Morning: start working
claws watch                           # auto-recompile + auto-pinch on save

# Edit SOUL.md, AGENTS.md, TOOLS.md, .cursorrules...
# Terminal: ✓ Built (847 tokens) ✓ Pinched (0 violations)

# Add a new capability
claws amend add skill "web-search" --tier T2

# Check before committing
claws pinch --staged
  All 15 policy checks passed in 0.3s

# Cross-compile for a teammate using Cursor
claws build cursor
  → build/cursor/.cursorrules
```

### Platform engineer fleet workflow

```bash
# Discover what's out there
claws scan
  Found 47 agent workspaces (23 OpenClaw, 15 Claude, 9 Cursor)

# Check governance across the fleet
claws pinch --fleet
  47 workspaces checked. 3 violations in 2 workspaces.
  Run 'claws pinch --fleet --fix' to auto-fix 2 of 3 findings.

# Push updated policies
claws broadcast --confirm
  Pushed soc2-v2 to 47 workspaces. 0 violations.

# Check for drift weekly
claws drift
  2 workspaces modified since last broadcast.
```

### CISO compliance workflow

```bash
# Generate SOC 2 evidence package
claws comply soc2
  Generated: .claws/compliance/soc2-2026-04-11.json
  Signed: .claws/compliance/manifest.sig (HMAC-SHA256)

# Fleet-wide compliance report
claws comply --fleet
  47 workspaces. 45 compliant. 2 need remediation.

# Verify audit integrity
claws audit verify
  Chain verified: 1,247 events, no breaks.

# Export to SIEM
claws audit export --format cef > /var/log/siem/claws.log
```

### Emergency response

```bash
# Kill a specific agent
claws kill agent-research --reason "data exfiltration detected"

# Kill everything
claws kill --fleet --confirm --reason "active incident IR-2026-0411"
  Killed 47 agents across fleet. Event logged.
```

---

## Command Count Summary

| Group | Count | Scope |
|-------|-------|-------|
| Build | 11 | Always workspace |
| Pinch | 2 + flags | Scope-sensitive |
| Comply | 3 | Scope-sensitive |
| Audit | 4 | Workspace + 1 fleet-inherent |
| Snap | 4 | Scope-sensitive |
| Fleet | 6 | Always fleet |
| Protect | 4 | Scope-sensitive |
| Live | 3 | Always workspace |
| Maker | 4 | Always workspace |
| Meta | 1 | Workspace / global |
| **Total** | **40** | |

---

## SDK Mapping Summary

All commands route through `claws-sdk`, which is a sibling to `craftworks-sdk` built on `compiler-sdk` + `agent-sdk`. `claws-sdk` does NOT import `craftworks-sdk`. (See CL-04 sibling architecture.)

| claws group | SDK package | Module | Underlying SDK |
|-------------|-----------|--------|----------------|
| Build | claws-sdk | build/* | compiler-sdk (astro/*) |
| Pinch | claws-sdk | guard/* | agent-sdk (GovernanceManager) |
| Comply | claws-sdk | guard/comply | agent-sdk (compliance) |
| Audit | claws-sdk | audit/* | agent-sdk (audit chain) |
| Snap | claws-sdk | cache/snapshot | compiler-sdk (cache) |
| Fleet | claws-sdk | fleet/* | agent-sdk (fleet) |
| Protect | claws-sdk | guard/budget, guard/secrets, identity | agent-sdk (budget, secrets, identity) |
| Live | claws-sdk | session/* | compiler-sdk (astro/session) |
| Maker | claws-sdk | maker/* | compiler-sdk (skill compilation) |
| Meta | claws-sdk | meta/* | (self-contained) |

---

## References

| Document | Purpose |
|----------|---------|
| `design/suite/specs/SU-04-craft-cli.md` | craft CLI spec (build commands) |
| `design/suite/specs/SU-05-guard-cli.md` | guard CLI spec (governance commands) |
| `design/suite/specs/SU-06-fleet-cli.md` | fleet CLI spec (fleet commands) |
| `design/suite/COMMAND-MAP.md` | Internal phantom-to-shipped mapping |
| `design/agent/focus/Q12d.md` | Name decision (claws → claws) |
| `design/agent/focus/Q12c.md` | Verb surface design |
| `design/agent/focus/Q12a.md` | One CLI + config/directory naming |
| `design/agent/focus/Q12b.md` | Upstream contribution strategy |
