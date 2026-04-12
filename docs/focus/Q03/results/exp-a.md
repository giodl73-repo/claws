# Experiment a: claws Verb Audition — Full Command Surface

**Method**: design analysis
**Date**: 2026-04-11

---

## Design Constraints

1. **One CLI** (`claws`) — no clawops, no collision redirects
2. **`--fleet` flag** for scope-sensitive commands; inherently-scoped commands don't need it
3. **Progressive disclosure** — Maker (5 min), Developer (full build), Advanced (fleet + snapshots)
4. **Crustacean flavor where it earns its place** — never force a metaphor; clarity wins over theme
5. **`pinch` is the governance verb** — established in the naming bakeoff
6. **Maps to craft/guard/fleet SDK** — claws is a thin UI adapter, not new business logic

---

## Verb Philosophy

Not every command needs a crustacean name. The rule:

| When | Naming strategy |
|------|----------------|
| Standard compiler action | Use the industry verb: `build`, `compile`, `test`, `diff`, `init` |
| Governance action | Use `pinch` (the signature verb): `pinch`, `pinch --fix`, `pinch --fleet` |
| Novel action unique to claws | Consider crustacean metaphor: `molt`, `snap`, `shell` |
| Fleet action | Use clear ops verb: `scan`, `broadcast`, `drift`, `kill` |

The goal: an OpenClaw developer reads `claws --help` and immediately understands every command. Crustacean names are seasoning, not the main course.

---

## The claws Command Surface (35 commands)

### Bare Invocation

```
$ claws

  claws — the claw compiler
  Compile, govern, and operate OpenClaw agents.

  Quick start:
    claws init                   Set up governance for your workspace
    claws build                  Compile and emit your agent
    claws pinch                  Check against your org's policies
    claws build cursor           Cross-compile to another platform

  Run 'claws --help' for all commands.
```

### Command Groups

#### 1. BUILD — Compile and emit (always workspace-scoped)

| # | Command | Synopsis | Maps to | Persona | Notes |
|---|---------|----------|---------|---------|-------|
| 1 | `claws init` | Set up governance in OC workspace | guard init + OC quickstart | Maker | Creates claws.json + .claws/ |
| 2 | `claws build` | Compile + emit to OC output | craft build | Maker | The primary command |
| 3 | `claws build <target>` | Cross-compile to target platform | craft build <target> | Maker | `cursor`, `claude`, `github`, etc. |
| 4 | `claws compile` | Compile to IR only (no emit) | craft compile | Developer | Inspect-oriented |
| 5 | `claws optimize` | Run boost passes (quality/cost) | craft optimize | Developer | --crush, --guard, --probe flags |
| 6 | `claws test` | Run scenario validation | craft test | Developer | |
| 7 | `claws diff` | Semantic diff between versions | craft diff | Developer | |
| 8 | `claws import` | Reverse-compile workspace to prose | craft import | Developer | |
| 9 | `claws inspect` | Show compiled IR and registry | craft inspect | Developer | |
| 10 | `claws doctor` | Workspace + toolchain diagnostics | craft doctor | Developer | Also checks OC Gateway compat |

**Verb choices**: All standard compiler/build verbs. No crustacean theming needed — these are universal.

---

#### 2. PINCH — Governance enforcement (workspace default, --fleet for fleet)

| # | Command | Synopsis | Maps to | Persona | Scope |
|---|---------|----------|---------|---------|-------|
| 11 | `claws pinch` | Validate workspace against policies | guard check | Maker | workspace |
| 12 | `claws pinch --fix` | Auto-fix violations | guard check --fix | Developer | workspace |
| 13 | `claws pinch --watch` | Re-check on file changes | guard check --watch | Developer | workspace |
| 14 | `claws pinch --strict` | Warnings become errors | guard check --strict | Developer | workspace |
| 15 | `claws pinch --staged` | Check only git-staged files | guard check --staged | Developer | workspace |
| 16 | `claws pinch --fleet` | Enforce governance across all workspaces | fleet guard --scan + guard check | Advanced | fleet |
| 17 | `claws pinch --fleet --fix` | Auto-fix fleet-wide | fleet guard --scan + guard check --fix | Advanced | fleet |

**Why `pinch`**: "Pinch your workspace through the governance fences." It's the signature verb. Every governance check goes through `pinch`. The --fleet flag scales it to fleet scope without a second command.

**Pre-commit hook**: `claws pinch --staged --quiet` — clean, memorable.

---

#### 3. COMPLY — Compliance and risk (workspace default, --fleet for fleet)

| # | Command | Synopsis | Maps to | Persona | Scope |
|---|---------|----------|---------|---------|-------|
| 18 | `claws comply` | Generate compliance evidence package | guard comply | Developer | workspace |
| 19 | `claws comply soc2` | SOC 2 evidence package | guard comply soc2 | Developer | workspace |
| 20 | `claws comply eu-ai-act` | EU AI Act compliance | guard comply eu-ai-act | Developer | workspace |
| 21 | `claws assess` | Risk classification (EU AI Act tiers) | guard assess | Developer | workspace |
| 22 | `claws comply --fleet` | Fleet-wide compliance report | fleet guard --report | Advanced | fleet |

**Why separate from `pinch`**: `pinch` is fast enforcement (pass/fail). `comply` produces artifacts for auditors. Different audience, different cadence.

---

#### 4. AUDIT — Audit trail operations (workspace default, --fleet for fleet)

| # | Command | Synopsis | Maps to | Persona | Scope |
|---|---------|----------|---------|---------|-------|
| 23 | `claws audit` | Show audit trail summary | guard audit | Developer | workspace |
| 24 | `claws audit verify` | Verify hash chain integrity | guard audit verify | Developer | workspace |
| 25 | `claws audit export` | Export events (CEF/JSON/syslog) | guard audit export --format | Developer | workspace |
| 26 | `claws audit history` | Compliance trend over time | fleet guard --history | Advanced | fleet (inherent) |

**Why `audit` not a crustacean name**: Audit is an enterprise term of art. Renaming it would confuse the CISO persona. "claws audit verify" is exactly what they expect.

---

#### 5. SNAP — Snapshots (workspace default, --fleet for fleet)

| # | Command | Synopsis | Maps to | Persona | Scope |
|---|---------|----------|---------|---------|-------|
| 27 | `claws snap save <name>` | Save three-tier cache state | cache snapshot save | Advanced | workspace |
| 28 | `claws snap restore <name>` | Restore to snapshot state | cache snapshot restore | Advanced | workspace |
| 29 | `claws snap diff <a> <b>` | Show changes between snapshots | cache snapshot diff | Advanced | workspace |
| 30 | `claws snap save <name> --fleet` | Save all workspace caches | fleet snapshot save | Advanced | fleet |
| 31 | `claws snap restore <name> --fleet` | Restore fleet cache state | fleet snapshot restore | Advanced | fleet |
| 32 | `claws snap promote <name>` | Promote workspace snapshot to fleet | fleet promote | Advanced | fleet (inherent) |

**Why `snap`**: "Snapshot" is 8 characters as a subcommand. `snap` is 4. Claw snap = quick capture. `claws snap save v2` is fast to type and evokes the claw action. This is where crustacean theming earns its place — short, vivid, memorable.

---

#### 6. FLEET — Fleet-only operations (always fleet-scoped, no --fleet needed)

| # | Command | Synopsis | Maps to | Persona |
|---|---------|----------|---------|---------|
| 33 | `claws scan` | Discover all OC workspaces | guard scan | Advanced |
| 34 | `claws broadcast` | Push policies to all workspaces | fleet guard --scan | Advanced |
| 35 | `claws drift` | Detect policy drift (hash-based) | fleet guard --drift | Advanced |
| 36 | `claws report` | Fleet compliance dashboard | fleet guard --report | Advanced |
| 37 | `claws push` | Deploy compiled artifacts from snapshot | fleet push | Advanced |
| 38 | `claws kill` | Emergency stop (agent or fleet) | fleet kill | Advanced |
| 39 | `claws kill --fleet --confirm` | Emergency stop ALL agents | fleet kill --all | Advanced |

**Why bare verbs**: These are inherently fleet-scoped. `claws scan` only makes sense across workspaces. No --fleet needed — the action implies the scope.

---

#### 7. PROTECT — Identity, secrets, budget (workspace default, --fleet for fleet)

| # | Command | Synopsis | Maps to | Persona | Scope |
|---|---------|----------|---------|---------|-------|
| 40 | `claws budget` | Show/set workspace token budget | guard budget | Advanced | workspace |
| 41 | `claws budget --fleet` | Fleet token budget management | fleet budget | Advanced | fleet |
| 42 | `claws secrets init` | Create encrypted vault | guard secrets init | Advanced | workspace |
| 43 | `claws secrets set <key>` | Add/rotate secret | guard secrets set | Advanced | workspace |
| 44 | `claws identity` | Configure SSO/RBAC | identity-bridge | Advanced | workspace |

---

#### 8. LIVE — Live compilation (always workspace-scoped)

| # | Command | Synopsis | Maps to | Persona |
|---|---------|----------|---------|---------|
| 45 | `claws watch` | Auto-recompile + pinch on file change | craft build --session (watch) | Developer |
| 46 | `claws session` | Interactive compilation session (stdin) | craft build --session | Advanced |
| 47 | `claws amend` | Add/remove/modify workspace concept | FORMA amendment pipeline | Developer |

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

### Advanced Tier (47 commands — fleet + snapshots + protect)

```
$ claws --help-all

  Build:        init build compile optimize test diff import inspect watch amend doctor session
  Govern:       pinch comply assess audit [verify|export|history]
  Snapshot:     snap [save|restore|diff|promote]
  Fleet:        scan broadcast drift report push kill
  Protect:      budget secrets [init|set] identity
```

---

## Scope Summary

| Command | Default scope | --fleet available? | --confirm required? |
|---------|--------------|-------------------|-------------------|
| `build` | workspace | No | No |
| `compile` | workspace | No | No |
| `optimize` | workspace | No | No |
| `test` | workspace | No | No |
| `diff` | workspace | No | No |
| `import` | workspace | No | No |
| `inspect` | workspace | No | No |
| `watch` | workspace | No | No |
| `session` | workspace | No | No |
| `amend` | workspace | No | No |
| `doctor` | workspace | No | No |
| **`pinch`** | **workspace** | **Yes** | No |
| **`comply`** | **workspace** | **Yes** | No |
| `assess` | workspace | No | No |
| `audit` | workspace | No | No |
| `audit history` | fleet (inherent) | No | No |
| **`snap save/restore`** | **workspace** | **Yes** | No |
| **`snap promote`** | fleet (inherent) | No | No |
| `snap diff` | workspace | Yes | No |
| **`budget`** | **workspace** | **Yes** | No |
| `secrets` | workspace | No | No |
| `identity` | workspace | No | No |
| `scan` | fleet (inherent) | No | No |
| `broadcast` | fleet (inherent) | No | No |
| `drift` | fleet (inherent) | No | No |
| `report` | fleet (inherent) | No | No |
| `push` | fleet (inherent) | No | No |
| **`kill`** | **workspace** | **Yes** | **Yes (--fleet)** |

**Scope-sensitive (need --fleet)**: pinch, comply, snap save/restore/diff, budget, kill — **6 commands** (matches Q12a prediction exactly)

---

## Verb Audition Notes

### Verbs that earned crustacean names

| Verb | Why crustacean | Alternative considered | Why alternative lost |
|------|---------------|----------------------|---------------------|
| `pinch` | Governance enforcement = squeezing through fences | `check`, `guard`, `lint` | `check` is generic; `guard` collides with internal CLI; `lint` is too weak |
| `snap` | Quick cache capture = claw snap | `snapshot` | 8 chars vs 4; `snap` is a real claw action |

### Verbs that stayed standard

| Verb | Why standard | Crustacean alternative considered | Why crustacean lost |
|------|-------------|----------------------------------|-------------------|
| `build` | Universal compiler verb | `forge`, `shell` | Build is instantly understood; forge/shell add cognitive load |
| `compile` | Universal compiler verb | `molt` | Molt implies transformation but confuses compiler users |
| `test` | Universal dev verb | — | No contest |
| `diff` | Universal dev verb | — | No contest |
| `audit` | Enterprise term of art | `trail`, `track` | CISOs expect "audit" |
| `comply` | Enterprise term of art | `certify`, `seal` | Compliance teams expect "comply" |
| `scan` | Standard ops verb | `reef` | Scan is instantly understood; reef requires explanation |
| `broadcast` | Standard ops verb | — | No contest |
| `kill` | Standard ops verb | — | No contest |
| `drift` | Standard ops verb | — | No contest |

### The "molt" decision

`molt` was considered for `evolve`/`amend` (shedding the old shell, growing a new one). But:
1. `amend` is precise — it means "structured modification via FORMA pipeline"
2. `molt` implies the whole agent transforms, not a targeted change
3. OpenClaw users coming from git understand "amend" immediately
4. Reserved for possible future use (major version migration?)

### The "shell" decision

`shell` was considered for `protect` (hardening, armoring). But:
1. `shell` collides with "shell" (terminal, bash, etc.) — massive confusion
2. The protection verbs (budget, secrets, identity) are already clear
3. `shell` would be a group name, not a command — groups don't need branding

---

## Key Flags (Cross-Cutting)

| Flag | Commands | Description |
|------|----------|-------------|
| `--fleet` | pinch, comply, snap, budget, kill | Scope escalation to fleet-wide |
| `--confirm` | kill --fleet, broadcast, push | Double gate for destructive fleet ops |
| `--template <name>` | init, pinch | Policy template (soc2, hipaa, eu-ai-act, minimal) |
| `--target <platform>` | build | Cross-compile target (cursor, claude, github, ...) |
| `--format <fmt>` | audit export, comply, report | Output format (cef, json, syslog, sarif, csv) |
| `--dry-run` | build, amend, pinch | Validate without writing output |
| `--debug` | all | Debug IR dump |
| `--json` | all | JSON output mode |
| `--no-cache` | compile, build | Bypass all cache tiers |
| `--skip-pinch` | build | Suppress auto governance check after build |
| `--optimize` | build | Run boost passes during build |
| `--pinch` | build, snap | Run governance check as part of operation |
| `--reason <text>` | kill, broadcast | Required for destructive operations |

### The `--pinch` and `--skip-pinch` flags

By default, `claws build` auto-triggers a `pinch` check (via H1 handshake). Two flags control this:

```bash
claws build                          # build + auto-pinch (default)
claws build --skip-pinch             # build without governance check
claws build cursor --optimize --pinch  # explicit: build + optimize + pinch
claws snap save v2 --pinch           # snapshot with governance validation
```

`--pinch` is explicit opt-in (on commands that don't auto-pinch). `--skip-pinch` is explicit opt-out (on commands that do auto-pinch). This makes governance the default.

---

## The claws Experience

### Developer daily workflow

```bash
# Morning: start working on my agent
claws watch                           # auto-recompile + auto-pinch on save

# Edit SOUL.md, AGENTS.md, TOOLS.md...
# Terminal shows: ✓ Built (847 tokens) ✓ Pinched (0 violations) on each save

# Add a new capability
claws amend add skill "web-search" --tier T2
  Added skill 'web-search' at tier T2

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
  Found 47 OpenClaw workspaces across /home/team/agents/

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
  Run 'claws pinch --fleet' to re-validate.
```

### CISO compliance workflow

```bash
# Generate SOC 2 evidence package
claws comply soc2
  Generated compliance evidence: .claws/compliance/soc2-2026-04-11.json
  Signed: .claws/compliance/manifest.sig (HMAC-SHA256)

# Fleet-wide compliance report
claws comply --fleet
  47 workspaces. 45 compliant. 2 need remediation.
  Report: .claws/compliance/fleet-report-2026-04-11.json

# Verify audit integrity
claws audit verify
  Chain verified: 1,247 events, no breaks. Last event: 2026-04-11T14:32:00Z

# Export to SIEM
claws audit export --format cef > /var/log/siem/claws.log
```

### Emergency response

```bash
# Kill a specific agent
claws kill agent-research --reason "data exfiltration detected"
  Killed agent-research. Event logged to audit chain.

# Kill everything
claws kill --fleet --confirm --reason "active incident IR-2026-0411"
  Killed 47 agents across fleet. Event logged.
```

---

## Command Count Summary

| Group | Commands | Scope |
|-------|----------|-------|
| Build | 11 (init, build, compile, optimize, test, diff, import, inspect, watch, amend, doctor) | Always workspace |
| Govern (pinch) | 2 (pinch, pinch --fleet) + flags | Scope-sensitive |
| Comply | 3 (comply, comply <framework>, assess) | Scope-sensitive |
| Audit | 4 (audit, audit verify, audit export, audit history) | Workspace + 1 fleet-inherent |
| Snapshot | 4 (snap save/restore/diff/promote) | Scope-sensitive |
| Fleet | 6 (scan, broadcast, drift, report, push, kill) | Always fleet |
| Protect | 4 (budget, secrets init, secrets set, identity) | Scope-sensitive |
| Live | 1 (session) | Always workspace |
| **Total** | **35 commands** | |

Down from 40 (two CLIs) to 35 (one CLI) — 5 commands eliminated by removing collision redirects and deduplicating scope-sensitive commands.

---

## Key Findings

1. **Only 2 verbs earned crustacean names**: `pinch` (governance) and `snap` (snapshot). Everything else is clearer with standard verbs. Forcing the metaphor hurts clarity.
2. **`pinch` is the signature verb** — it carries the entire governance identity. `claws pinch` is what you type 10x/day. It needs to be short, memorable, and unmistakable.
3. **`snap` earns its place** — 4 chars vs 8 for `snapshot`. Claw snap = quick capture. Used less frequently but still benefits from brevity.
4. **`--pinch` as a build flag is the power move** — `claws build cursor --optimize --pinch` reads as "compile for Cursor, optimize, and squeeze through governance." It makes governance feel like a compiler pass, not a separate tool.
5. **35 commands is the right size** — fewer than either CLI alone, because scope-sensitive commands absorb their fleet variants via --fleet. No collision redirects needed.
6. **Progressive disclosure works at 4/18/35** — Maker sees init+build+pinch+build<target>. Developer adds the full build and governance toolkit. Advanced adds fleet and snapshots.
7. **`--skip-pinch` makes governance default** — build auto-pinches. You opt OUT, not in. This is the shift-left enforcement model from SU-05.
