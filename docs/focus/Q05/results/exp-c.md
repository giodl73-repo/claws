# Experiment c: Day-in-the-Life Persona Scenarios

**Method**: design analysis
**Date**: 2026-04-11

---

## Five Personas × Four Break Vectors

Each scenario shows: what happens today (pain), what happens with glint (solution), which ring catches it, and the exact commands.

---

## Persona 1: The Boss (Senior Engineering Manager)

**Profile**: Runs OpenClaw for personal productivity. 3 agents (research, drafting, scheduling). Upgrades regularly because new features matter. Has a custom upgrade script. Technically capable but doesn't want to babysit agents.

### Scenario 1a: Platform upgrade breaks skill loading

**Vector**: Platform upgrade
**Today**:
```
$ npm install -g openclaw@latest
$ openclaw gateway restart
# 20 minutes later: "Why isn't my research bot responding?"
$ openclaw skills list
# skill 'web-research' shows [LOAD ERROR]
# google the error → GitHub issue #8290 → manually fix skill config
# 45 minutes lost
```

**With glint**:
```
$ glint snap save pre-upgrade --pinch
  ✓ Snapshot 'pre-upgrade' saved. All 15 checks passed.

$ npm install -g openclaw@latest

$ glint doctor --post-upgrade
  ✗ Skill compatibility: 'web-research' uses deprecated v1 Skill API
    → Run 'glint pinch --fix' to migrate to v2 API

$ glint pinch --fix
  Fixed: web-research/SKILL.md migrated to v2 API
  ✓ All 15 checks passed.
```
**Ring**: Middle (upgrade). **Time saved**: ~40 minutes. **Commands**: 3 (snap, doctor, pinch --fix).

### Scenario 1b: Boss adds a new tool, doesn't realize it needs higher trust tier

**Vector**: User changes
**Today**:
```
# Boss adds file-system tool to research bot's TOOLS.md
# No validation. Bot now has filesystem access at whatever trust level.
# Discovered 2 weeks later during manual security review.
```

**With glint**:
```
# Boss adds file-system tool to TOOLS.md
# glint watch (running in terminal):
  [14:32:45] TOOLS.md changed
  ✗ Pinched (1 violation)
    G3: Tool 'file-system' requires trust tier T3 (workspace is T2)
    → Either: set trustTier: 3 in glint.json
    → Or: remove 'file-system' from TOOLS.md

# Boss decides immediately: bump to T3 or remove the tool.
```
**Ring**: Inner (live). **Time saved**: 2 weeks of exposure. **Commands**: 0 (watch catches it automatically).

---

## Persona 2: Solo Developer

**Profile**: Building a Claude Code agent for their startup. Uses `.cursorrules` and Claude `CLAUDE.md`. Not an OpenClaw user. Installed glint because a blog post said "lint your agents."

### Scenario 2a: Cursor updates their rules format

**Vector**: Platform upgrade
**Today**:
```
# Cursor ships v0.48 with new .cursorrules schema
# Developer's agent silently loses custom instructions
# Noticed 3 days later when code quality drops
# "What changed?" → git log → nothing → Cursor release notes → "oh"
# Manually rewrites .cursorrules to new format
```

**With glint**:
```
$ glint doctor
  Platform: Cursor v0.48 detected (was v0.47 in last build)
  ⚠ .cursorrules schema changed — 2 fields deprecated
    → Run 'glint build cursor' to recompile for v0.48 format

$ glint build cursor
  ✓ Built → build/cursor/.cursorrules (v0.48 format)
```
**Ring**: Middle (upgrade). **Time saved**: 3 days of degraded quality. **Commands**: 2 (doctor, build).

### Scenario 2b: Developer accidentally removes a safety guardrail

**Vector**: User changes
**Today**:
```
# Developer edits CLAUDE.md, removes "never access production databases" line
# No one notices. Agent starts querying prod. Incident in week 3.
```

**With glint**:
```
# Developer edits CLAUDE.md
# glint pinch --staged (pre-commit hook):
  ✗ G4: Safety guardrail removed — 'production database' constraint
    deleted from CLAUDE.md line 47
  Commit blocked. Run 'glint pinch --fix' or restore the guardrail.
```
**Ring**: Inner (live, pre-commit). **Time saved**: potential incident. **Commands**: 0 (pre-commit hook).

---

## Persona 3: Platform Engineer

**Profile**: Manages 47 agent workspaces across the company. Mix of OpenClaw (23), Claude (15), Cursor (9). Responsible for governance compliance across the fleet. Runs drift checks weekly.

### Scenario 3a: Org updates SOC2 policy, some workspaces don't get the memo

**Vector**: Policy update
**Today**:
```
# Security team updates SOC2 requirements
# Platform engineer emails all teams: "update your agent configs"
# 3 weeks later: 12 of 47 workspaces still non-compliant
# Manual audit of each workspace. 2 days of work.
```

**With glint**:
```
$ glint broadcast --confirm
  Pushed soc2-v3 to 47 workspaces. 0 violations.

# One week later:
$ glint drift
  2 workspaces modified since broadcast:
    agents/marketing-bot/: TOOLS.md changed (new tool added)
    agents/data-bot/: glint.json trustTier changed T2→T3

$ glint pinch --fleet
  47 checked. 1 violation:
    agents/marketing-bot/: G2 — new tool 'social-media-post' not in approved skill list
  Run 'glint pinch --fleet --fix' to remediate.
```
**Ring**: Outer (fleet). **Time saved**: 2 days. **Commands**: 3 (broadcast, drift, pinch --fleet).

### Scenario 3b: Platform engineer upgrades the fleet

**Vector**: Platform upgrade (fleet-wide)
**Today**:
```
# OpenClaw v2026.4.9 is out. Platform engineer must upgrade 23 OC workspaces.
# SSH into each server/workspace. Run upgrade script. Check each one.
# 2 workspaces break on config migration. 1 skill fails to load.
# Full day of work. Some workspaces still on old version weeks later.
```

**With glint**:
```
# Before fleet upgrade:
$ glint snap save pre-upgrade --fleet
  47 snapshots saved. All governance-validated.

# After upgrading OpenClaw on each host:
$ glint doctor --post-upgrade --fleet
  47 workspaces checked.
  23 OpenClaw workspaces: 21 clean, 2 need config migration
  15 Claude workspaces: no platform change detected
  9 Cursor workspaces: no platform change detected

  Run 'glint doctor --fix --fleet' to apply 2 migrations.

$ glint doctor --fix --fleet
  ✓ agents/research-bot/: migrated allow→enabled
  ✓ agents/analytics-bot/: migrated tts config nesting
  All 47 workspaces healthy.
```
**Ring**: Middle + Outer (fleet upgrade). **Time saved**: ~6 hours. **Commands**: 3 (snap --fleet, doctor --fleet, doctor --fix --fleet).

---

## Persona 4: CISO (Chief Information Security Officer)

**Profile**: Doesn't use the CLI directly. Receives compliance reports. Cares about: audit trails, SOC2 evidence, incident response, fleet-wide compliance posture.

### Scenario 4a: Auditor asks "prove your AI agents are governed"

**Vector**: Compliance (not a break — a demand)
**Today**:
```
# CISO asks platform engineer to produce SOC2 evidence
# Platform engineer manually reviews each workspace
# Exports openclaw security audit output to a spreadsheet
# No hash chain, no signed artifacts, no fleet-wide view
# Auditor: "This is a point-in-time snapshot. How do I know it hasn't changed?"
# No answer.
```

**With glint**:
```
$ glint comply soc2 --fleet
  47 workspaces. 45 compliant. 2 need remediation.
  Fleet report: .glint/compliance/fleet-soc2-2026-04-11.json
  Signed: .glint/compliance/manifest.sig (HMAC-SHA256)

$ glint audit verify
  Chain verified: 12,847 events across 47 workspaces. No breaks.
  Oldest event: 2026-01-15T09:00:00Z
  Latest event: 2026-04-11T14:32:00Z

$ glint audit export --format cef > /var/log/siem/glint-fleet.log
  Exported 12,847 events in CEF format.
```
Auditor gets: signed compliance artifacts, tamper-proof audit chain, fleet-wide evidence, SIEM-ready export.
**Ring**: Outer (fleet compliance). **Commands**: 3 (comply, audit verify, audit export).

### Scenario 4b: Security incident — agent data exfiltration

**Vector**: Drift (accumulated permissions)
**Today**:
```
# Agent accumulated permissions over 6 months
# No one reviewed trust tier changes
# Agent exfiltrates customer data via file-system tool
# CISO: "How did this agent get file-system access?"
# No audit trail. No record of when the change was made.
```

**With glint**:
```
# Inner ring caught it 6 months ago:
  [Oct 15] TOOLS.md changed
  ✗ G3: Tool 'file-system' requires trust tier T3 (workspace is T2)

# But if inner ring wasn't running, outer ring caught it at next drift scan:
$ glint drift
  agents/compromised-bot/: TOOLS.md modified — trust tier escalation detected

# Audit chain has the full history:
$ glint audit history
  2025-10-15T14:32:00Z  TOOLS.md modified — file-system tool added
  2025-10-15T14:32:01Z  G3 violation detected — T3 tool in T2 workspace
  2025-10-15T14:35:00Z  [no remediation recorded]  ← THIS IS THE GAP

# Post-incident: emergency stop
$ glint kill compromised-bot --reason "data exfiltration IR-2026-0411"
```
The audit chain proves WHEN the permission changed and THAT the violation was detected. The gap in remediation is itself evidence for the incident report.
**Ring**: All three (inner caught it, outer confirmed it, audit chain recorded it).

---

## Persona 5: New Hire

**Profile**: First week. Told to "set up governance for your agent." Has never used glint. Needs progressive disclosure — 4 commands max.

### Scenario 5a: First-time setup

**Vector**: N/A (onboarding)
**Today**:
```
# "How do I set up governance?"
# Read a 40-page internal wiki
# Install openclaw-governance-scripts repo
# Run setup.sh (breaks on Windows)
# Ask a teammate for help
# 2 hours to "governed"
```

**With glint**:
```
$ npm install -g @craftworks/glint
$ cd my-agent/
$ glint init --template soc2
  Detected Claude Code workspace (CLAUDE.md)
  Created glint.json with SOC2 baseline
  Created .glint/ with policies and audit chain
  
  Next steps:
    glint build        Compile your agent
    glint pinch        Check governance
    glint watch        Auto-check on save

$ glint pinch
  2 violations found:
    G3: Tool 'code-execution' requires T3 (workspace is T2)
    G4: No data retention policy in CLAUDE.md
  Run 'glint pinch --fix' to auto-fix.

$ glint pinch --fix
  ✓ Set trustTier: 3 in glint.json
  ✓ Added data retention guardrail to CLAUDE.md
  All 15 checks passed.
```
**Ring**: Inner (first-time setup → immediate governance). **Time**: 5 minutes. **Commands**: 4 (install, init, pinch, pinch --fix). Progressive disclosure: the new hire sees exactly 4 commands.

### Scenario 5b: New hire accidentally breaks team's shared agent

**Vector**: User changes (accidental)
**Today**:
```
# New hire edits shared AGENTS.md, removes a subagent config
# Team's CI doesn't check governance
# Subagent stops responding. Teammate notices 2 hours later.
# "Who changed AGENTS.md?" → git blame → new hire
# Awkward conversation. No prevention mechanism.
```

**With glint**:
```
# New hire edits AGENTS.md
# Pre-commit hook (glint pinch --staged):
  ✗ G4: Subagent 'data-processor' removed from AGENTS.md
    This subagent is referenced by 3 other workspaces in the fleet.
  Commit blocked.

# New hire: "Oh, I didn't realize that was shared. Let me undo."
```
**Ring**: Inner (pre-commit). **Time saved**: 2 hours of outage + awkward conversation. **Commands**: 0 (hook runs automatically).

---

## Summary Matrix

| Persona | Vector | Today (pain) | With glint (ring) | Time saved |
|---------|--------|-------------|-------------------|-----------|
| Boss | Platform upgrade | 45 min manual fix | Middle: doctor + pinch --fix | ~40 min |
| Boss | User changes | 2 weeks exposure | Inner: watch catches instantly | 2 weeks |
| Solo dev | Platform upgrade | 3 days degraded | Middle: doctor + build | 3 days |
| Solo dev | User changes | Potential incident | Inner: pre-commit blocks | Incident prevention |
| Platform eng | Policy update | 2 days manual audit | Outer: broadcast + drift + pinch --fleet | 2 days |
| Platform eng | Fleet upgrade | Full day per fleet | Middle+Outer: doctor --fleet | ~6 hours |
| CISO | Compliance demand | No evidence | Outer: comply + audit verify + export | Audit readiness |
| CISO | Security incident | No audit trail | All rings: audit chain records everything | Forensic capability |
| New hire | Onboarding | 2 hours setup | Inner: init + pinch + fix | ~1.5 hours |
| New hire | Accidental break | 2h outage + blame | Inner: pre-commit blocks | Outage prevention |

### The pattern

**Inner ring handles 7 of 10 scenarios.** The boss's upgrade script (middle ring) handles 2. Fleet governance (outer ring) handles 1 fleet-specific scenario. The CISO scenarios use all three rings via the audit chain.

This confirms the hypothesis: continuous governance (inner ring) eliminates most of the pain that today gets caught only at upgrade checkpoints.
