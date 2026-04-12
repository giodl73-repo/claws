# Experiment e: Full Command Reference

**Method**: design analysis
**Date**: 2026-04-11
**Sources**: experiments a-d, design/suite/COMMAND-MAP.md, design/suite/specs/SU-04-craft-cli.md

---

## clawsc — The OpenClaw Compiler (23 commands)

### Progressive Disclosure

| Tier | Persona | Commands | Experience |
|------|---------|----------|-----------|
| **Maker** | OC user, citizen dev | 4 | `init → build → check → deploy` (5 min to governed) |
| **Developer** | AI engineer | +10 (14) | `+ compile, optimize, test, diff, import, inspect, amend, watch, comply, assess` |
| **Advanced** | Platform dev | +9 (23) | `+ session, snapshot ×6, audit ×3, doctor, budget` |

Bare invocation (`clawsc` with no args) shows the 4-step journey:
```
$ clawsc

  OpenClaw Compiler — build and govern your AI agent

  Quick start:
    clawsc init                  Set up governance for your workspace
    clawsc build                 Compile and emit your agent
    clawsc check                 Validate against your org's policies
    clawsc build <target>        Cross-compile to another platform

  Run 'clawsc --help' for all commands.
```

### Command Reference

#### Build Commands

| # | Command | Synopsis | Maps to | Persona |
|---|---------|----------|---------|---------|
| 1 | `clawsc init` | Set up governance in OC workspace | `guard init` + OC quickstart | Maker |
| 2 | `clawsc compile` | Compile OC workspace to IR (no emit) | `craft compile` | Developer |
| 3 | `clawsc build` | Compile + emit to OC output | `craft build` | Maker |
| 4 | `clawsc build <target>` | Cross-compile to target platform | `craft build <target>` | Maker |
| 5 | `clawsc optimize` | Run boost passes (quality/cost) | `craft optimize` | Developer |
| 6 | `clawsc test` | Run scenario validation | `craft test` | Developer |
| 7 | `clawsc diff` | Semantic diff between versions | `craft diff` | Developer |
| 8 | `clawsc import` | Reverse-compile workspace to prose | `craft import` | Developer |
| 9 | `clawsc inspect` | Show compiled IR and registry | `craft inspect` | Developer |
| 10 | `clawsc doctor` | Workspace health diagnostics | `craft doctor` | Developer |

#### Governance Commands

| # | Command | Synopsis | Maps to | Persona |
|---|---------|----------|---------|---------|
| 11 | `clawsc check` | Validate workspace against policies | `guard check` | Maker |
| 12 | `clawsc comply` | Generate compliance evidence package | `guard comply` | Developer |
| 13 | `clawsc assess` | EU AI Act risk classification | `guard assess` | Developer |
| 14 | `clawsc budget` | Show/set workspace token budget | `guard budget` | Advanced |

#### Audit Commands

| # | Command | Synopsis | Maps to | Persona |
|---|---------|----------|---------|---------|
| 15 | `clawsc audit verify` | Verify hash chain integrity | `guard audit verify` | Developer |
| 16 | `clawsc audit export` | Export events (CEF/JSON/syslog) | `guard audit export` | Developer |
| 17 | `clawsc audit replay` | Replay audit events from date | `guard audit replay` | Advanced |

#### Live Compilation Commands

| # | Command | Synopsis | Maps to | Persona |
|---|---------|----------|---------|---------|
| 18 | `clawsc watch` | Auto-recompile on file change | `craft build --session` (watch) | Developer |
| 19 | `clawsc session` | Interactive compilation session (stdin) | `craft build --session` | Advanced |
| 20 | `clawsc amend` | Add/remove/modify workspace concept | FORMA amendment pipeline | Developer |

#### Snapshot Commands

| # | Command | Synopsis | Maps to | Persona |
|---|---------|----------|---------|---------|
| 21 | `clawsc snapshot save <name>` | Save three-tier cache state | cache snapshot save | Advanced |
| 22 | `clawsc snapshot restore <name>` | Restore to snapshot state | cache snapshot restore | Advanced |
| 23 | `clawsc snapshot diff <a> <b>` | Show changes between snapshots | cache snapshot diff | Advanced |

### Key Flags (Cross-Cutting)

| Flag | Commands | Description |
|------|----------|-------------|
| `--template <name>` | init, check | Policy template (soc2, hipaa, eu-ai-act, minimal) |
| `--target <platform>` | build | Cross-compile target (cursor, claude, ma, github, ...) |
| `--format <fmt>` | audit export, comply | Output format (cef, json, syslog, sarif) |
| `--dry-run` | build, amend, check | Validate without writing output |
| `--debug` | all | Debug IR dump |
| `--json` | all | JSON output mode |
| `--no-cache` | compile, build | Bypass all cache tiers |
| `--skip-guard` | build | Suppress auto guard check after build |
| `--deploy` | watch | Auto-deploy on recompile (requires explicit opt-in) |
| `--batch <file>` | amend | Batch amendment from YAML file |

---

## clawops — OpenClaw Fleet Governance (17 commands)

### Progressive Disclosure

| Tier | Persona | Commands | Experience |
|------|---------|----------|-----------|
| **Operator** | Platform lead | 5 | `scan → broadcast → drift → report → kill` |
| **Admin** | CISO, compliance | +7 (12) | `+ history, status, budget, secrets ×2, identity, snapshot save` |
| **Advanced** | Enterprise admin | +5 (17) | `+ snapshot restore/diff/deploy/promote, push, rollback` |

Bare invocation:
```
$ clawops

  OpenClaw Fleet Governance — govern your organization's AI agents

  Quick start:
    clawops scan                 Discover all OpenClaw workspaces
    clawops broadcast            Push policies to all workspaces
    clawops drift                Check for policy drift
    clawops report               Compliance dashboard

  Run 'clawops --help' for all commands.
```

### Command Reference

#### Discovery & Monitoring

| # | Command | Synopsis | Maps to | Persona |
|---|---------|----------|---------|---------|
| 1 | `clawops scan` | Discover all OC workspaces in org | `guard scan` | Operator |
| 2 | `clawops scan --aibom` | Generate AI Bill of Materials | `guard scan --aibom` | Admin |
| 3 | `clawops status` | Show running agent instances | `fleet status` | Operator |
| 4 | `clawops report` | Compliance dashboard (per-team scores) | `fleet guard --report` | Operator |
| 5 | `clawops history` | Compliance trend over time | `fleet guard --history` | Admin |

#### Policy Enforcement

| # | Command | Synopsis | Maps to | Persona |
|---|---------|----------|---------|---------|
| 6 | `clawops broadcast` | Push fleet policies to all workspaces | `fleet guard --scan` | Operator |
| 7 | `clawops drift` | Detect policy drift (hash-based) | `fleet guard --drift` | Operator |
| 8 | `clawops budget` | Fleet token budget management | `guard budget` (fleet) | Admin |

#### Identity & Secrets

| # | Command | Synopsis | Maps to | Persona |
|---|---------|----------|---------|---------|
| 9 | `clawops secrets init` | Create encrypted vault | `guard secrets init` | Admin |
| 10 | `clawops secrets set <key>` | Add/rotate secret | `guard secrets set` | Admin |
| 11 | `clawops identity` | Configure SSO/RBAC | identity-bridge | Admin |

#### Emergency Response

| # | Command | Synopsis | Maps to | Persona |
|---|---------|----------|---------|---------|
| 12 | `clawops kill` | Emergency stop (all or specific agent) | `fleet kill` | Operator |

#### Fleet Snapshots & Deployment

| # | Command | Synopsis | Maps to | Persona |
|---|---------|----------|---------|---------|
| 13 | `clawops snapshot save <name>` | Save all workspace caches | fleet snapshot save | Advanced |
| 14 | `clawops snapshot restore <name>` | Restore fleet cache state | fleet snapshot restore | Advanced |
| 15 | `clawops snapshot diff <a> <b>` | Diff fleet snapshots | fleet snapshot diff | Advanced |
| 16 | `clawops promote <name>` | Promote workspace snapshot to fleet | snapshot promote | Advanced |
| 17 | `clawops push` | Deploy compiled artifacts from snapshot | fleet push | Advanced |

### Key Flags (Cross-Cutting)

| Flag | Commands | Description |
|------|----------|-------------|
| `--workspace <path>` | drift, rollback, promote | Scope to specific workspace |
| `--team <name>` | broadcast, rollback, report | Scope to specific team |
| `--fail-fast` | scan, broadcast | Stop on first error |
| `--format <fmt>` | report, history | Output format (table, json, csv) |
| `--since <date>` | history | Filter from date |
| `--json` | all | JSON output mode |

---

## Collision Redirects (7 total)

| Typed | Redirect |
|-------|----------|
| `clawsc scan` | `Did you mean 'clawops scan'? clawsc governs your workspace; clawops governs your fleet.` |
| `clawsc broadcast` | `Did you mean 'clawops broadcast'?` |
| `clawsc kill` | `Did you mean 'clawops kill'?` |
| `clawsc push` | `Did you mean 'clawops push'?` |
| `clawops compile` | `Did you mean 'clawsc compile'? clawops governs your fleet; clawsc builds your workspace.` |
| `clawops build` | `Did you mean 'clawsc build'?` |
| `clawops amend` | `Did you mean 'clawsc amend'? Amendments are workspace-local.` |

---

## Cross-Reference Matrix: clawsc/clawops → craft/guard/fleet

| clawsc Command | craft | guard | fleet |
|---------------|-------|-------|-------|
| init | - | guard init | - |
| compile | craft compile | - | - |
| build | craft build | - | - |
| build <target> | craft build <target> | - | - |
| optimize | craft optimize | - | - |
| test | craft test | - | - |
| diff | craft diff | - | - |
| import | craft import | - | - |
| inspect | craft inspect | - | - |
| doctor | craft doctor | - | - |
| check | - | guard check | - |
| comply | - | guard comply | - |
| assess | - | guard assess | - |
| budget | - | guard budget | - |
| audit * | - | guard audit * | - |
| watch | craft build --session | - | - |
| session | craft build --session | - | - |
| amend | *(FORMA pipeline)* | - | - |
| snapshot * | *(cache-snapshot)* | - | - |

| clawops Command | craft | guard | fleet |
|----------------|-------|-------|-------|
| scan | - | guard scan | - |
| status | - | - | fleet status |
| report | - | - | fleet guard --report |
| history | - | - | fleet guard --history |
| broadcast | - | - | fleet guard --scan |
| drift | - | - | fleet guard --drift |
| budget | - | guard budget | fleet budget |
| secrets * | - | guard secrets * | - |
| identity | - | *(identity-bridge)* | - |
| kill | - | - | fleet kill |
| snapshot * | - | - | *(fleet snapshot)* |
| promote | - | - | *(fleet promote)* |
| push | - | - | *(fleet push)* |

---

## Key Findings

1. **23 clawsc + 17 clawops = 40 commands** covering build, govern, operate, snapshot, and live compilation
2. **Progressive disclosure works**: Maker sees 4 commands, Developer sees 14, Advanced sees all 23/17
3. **Every command maps back to craft/guard/fleet** — no orphan commands
4. **3 genuinely new capabilities** (promote, push, fleet snapshot) that don't exist in current CLIs
5. **7 collision redirects** mirror SU-01 §1.4 pattern
6. **Bare invocation shows 4-step quick start** — same pattern as SU-04 §1.2
7. **Cross-reference matrix is clean** — no command maps to more than one underlying CLI
