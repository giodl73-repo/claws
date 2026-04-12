# Experiment d: OpenClaw CLI Today — Relationship to claws

**Method**: web-search + design analysis
**Date**: 2026-04-11

---

## OpenClaw CLI: Current State

OpenClaw ships as a **single npm package** (`npm install -g openclaw@latest`, currently v2026.4.9). The CLI is the primary interface. ~100+ subcommands organized by noun groups.

### Command Groups

| Group | Commands | Purpose |
|-------|----------|---------|
| `openclaw gateway` | run, start, stop, restart, status | Daemon lifecycle (persistent local Gateway) |
| `openclaw agents` | add, list, delete, acp add/list/remove, config set | Multi-agent management + channel routing |
| `openclaw config` | get, set, unset, file, validate | Configuration management |
| `openclaw skills` | install, list, info, check | ClawHub skill marketplace |
| `openclaw plugins` | install | SaaS integrations (850+ via Composio) |
| `openclaw memory` | status, index, search | Workspace memory (embedding + BM25 hybrid) |
| `openclaw cron` | list, status, add, run, enable, disable | Scheduled tasks (HEARTBEAT.md automation) |
| `openclaw security` | audit, audit --deep, audit --fix | Diagnostic security scanning |
| `openclaw channels` | — | Channel connector management |
| `openclaw sessions` | — | Conversation session management |
| `openclaw secrets` | — | Credential store |
| `openclaw nodes` / `devices` | — | Multi-device management |
| `openclaw approvals` | — | Exec approval management |
| `openclaw browser` | — | Browser automation config |
| `openclaw onboard` | — | First-run wizard |
| `openclaw doctor` | — | Diagnostics |
| `openclaw dashboard` | — | Open Control UI |
| `openclaw send` | — | Programmatic messaging |
| `openclaw models` | auth paste-token | Provider authentication |

### What OpenClaw CLI Is

A **runtime management CLI**. Every command controls the Gateway daemon or the resources it manages:
- Start/stop the Gateway
- Add/remove agents and channel bindings
- Install skills from ClawHub
- Index and search memory
- Schedule cron tasks
- Run diagnostic security audits
- Manage sessions, credentials, browser automation

### What OpenClaw CLI Is NOT

- Not a compiler or build tool
- Not a policy engine
- Not a governance tool
- Not a fleet manager
- No `openclaw build`, `openclaw compile`, `openclaw check`, `openclaw broadcast`
- No policy language, compliance IR, or governance compilation
- No audit chain, SIEM integration, or artifact signing

---

## Directory Architecture

### Global State: `~/.openclaw/`

`~/.openclaw/` is a **global state directory** — user-level, not per-workspace:

```
~/.openclaw/                    ← USER HOME, not workspace
  openclaw.json                 ← global config (providers, channels, networking)
  credentials/                  ← auth tokens
  sessions/                     ← conversation state
```

- Mode 700 (not group/world readable)
- `openclaw.json` here controls Gateway-level settings: model providers, channel bindings, agent routing, security policies, cron, networking, UI preferences
- Gateway **hot-reloads** this file — most changes apply without restart

### Per-Workspace: Flat Layout (NO `.openclaw/` directory)

OpenClaw workspaces are **flat** — all files live in the workspace root:

```
~/my-agent/                     ← workspace root
  SOUL.md                       ← persona, tone, boundaries (REQUIRED)
  AGENTS.md                     ← agent config, behavioral rules
  USER.md                       ← user profile
  TOOLS.md                      ← tool guidance
  IDENTITY.md                   ← display name, emoji, creature type
  BOOTSTRAP.md                  ← first-run interview
  MEMORY.md                     ← durable long-term memory
  memory/                       ← daily memory logs
  skills/                       ← workspace-specific skills
  lobster.yaml                  ← Lobster workflow DSL
  workflows/                    ← multi-flow workflows
  canvas/                       ← UI templates (A2UI protocol)
  BOOT.md                       ← startup checklist
  HEARTBEAT.md                  ← periodic task checklist
```

**Critical finding**: There is NO per-workspace `.openclaw/` directory. The workspace is entirely flat files. The `.openclaw/` directory only exists at `~/.openclaw/` (global).

---

## Governance Posture

OpenClaw's security model is **runtime guardrails**, not compiled governance:

| Mechanism | Type | What it does |
|-----------|------|-------------|
| Exec Approvals | Runtime | Two-layer gate: tool policy + host approval state. `requireApproval` in `before_tool_call` hooks |
| `openclaw security audit` | Diagnostic | Scans for Docker/sandbox escapes, legacy models, permissions, skill safety |
| Allowlist Governance | Community skill | Identity-gated access (Discord IDs, emails, LDAP, SSO) against allowlists |
| Docker Sandbox | Runtime | Containers with `network: 'none'` by default |
| Tool policies | Runtime | Per-tool allow/deny in workspace config |

**None of these are**:
- Policy-as-code (no YAML policy language)
- Compile-time enforcement (no policy compiler)
- Auditable (no hash-chained audit trail)
- Fleet-aware (single Gateway, single operator)
- Compliance-generating (no SOC2/HIPAA/EU AI Act artifacts)

---

## claws Relationship: Complement, Not Replacement

### Zero Command Overlap

| OpenClaw CLI | claws | Overlap |
|-------------|--------|---------|
| `openclaw gateway start` | — | None |
| `openclaw agents add` | — | None |
| `openclaw skills install` | — | None |
| `openclaw memory search` | — | None |
| `openclaw cron add` | — | None |
| `openclaw security audit` | `claws check` | **Partial** — audit is diagnostic, check is prescriptive |
| — | `claws build` | None |
| — | `claws compile` | None |
| — | `claws check` | None |
| — | `claws broadcast` | None |
| — | `claws snapshot save` | None |
| — | `claws scan` | None |

The only point of contact is `openclaw security audit` vs `claws check` — and they're different layers. `security audit` finds runtime problems (exposed ports, missing sandbox, dangerous permissions). `claws check` validates compiled policies (trust tier violations, budget overruns, compliance gaps).

### Layer Separation

```
┌─────────────────────────────────────────────┐
│  OpenClaw CLI (openclaw)                     │
│  Runtime management layer                    │
│  Gateway · Agents · Channels · Memory · Cron │
└─────────────┬───────────────────────────────┘
              │ workspace files
┌─────────────▼───────────────────────────────┐
│  OpenClaw Workspace                          │
│  SOUL.md · AGENTS.md · TOOLS.md · etc.       │
└─────────────┬───────────────────────────────┘
              │ reads/writes workspace
┌─────────────▼───────────────────────────────┐
│  claws (governance layer)                   │
│  Build · Check · Scan · Broadcast · Snapshot │
│  Policy compilation · Audit · Compliance     │
│  Fleet management · Cross-compilation        │
└─────────────────────────────────────────────┘
```

claws operates **on** OpenClaw workspaces, not **within** the OpenClaw runtime. It reads workspace files, compiles governance policies, emits enforcement artifacts, and manages fleet-wide policy. The Gateway never knows claws exists — it just sees the workspace files.

### Integration Points

Compiled governance policies could be injected into OpenClaw workspaces as:
1. **Skills**: A governance skill in `skills/governance/SKILL.md` that enforces policies
2. **Tool hooks**: `before_tool_call` hooks that implement FE5 trust-tier enforcement
3. **AGENTS.md amendments**: Policy-derived behavioral constraints injected via FORMA amendments

---

## Directory Naming Implications

### `.openclaw/` Cannot Be Extended (per-workspace)

Experiment b proposed extending `.openclaw/governance/` for per-workspace governance artifacts. This was based on a false premise — `.openclaw/` is a **global user directory**, not a per-workspace directory. OpenClaw workspaces have no hidden directories at all.

This eliminates Option B (OC-native) for per-workspace governance:

| Option | Viable? | Why |
|--------|---------|-----|
| A (.craft/) | No | Brand leakage — user doesn't know Craftworks |
| B (.openclaw/governance/) | **No** | `.openclaw/` is global, not per-workspace |
| C (.claws/) | **Yes** | Product-native, no collision with OC layout |
| D (.governance/) | Yes | Generic, portable, but unbranded |

### .claws/ Is the Right Answer

1. **No collision**: OpenClaw workspaces are flat — `.claws/` doesn't conflict with any existing OC directory
2. **Clear ownership**: "claws created .claws/. Makes sense."
3. **Separate concern**: Governance artifacts are claws's responsibility, not OpenClaw's
4. **Discoverable**: `.claws/` next to SOUL.md tells the developer "this workspace has governance"
5. **Portable**: Works for any workspace format (OC, Claude Code, Cursor) — not tied to `.openclaw/`

### claws.json Is Per-Workspace

Since `openclaw.json` is the **global** config at `~/.openclaw/`, a per-workspace `claws.json` makes perfect sense:

```
~/my-agent/                     ← OpenClaw workspace
  SOUL.md                       ← OC workspace file
  AGENTS.md                     ← OC workspace file
  ...                           ← other OC files
  claws.json                   ← governance config (per-workspace)
  .claws/                      ← governance artifacts
    policies/
      soc2-baseline.yaml
    audit/
      chain.jsonl
    cache/
      compile/
      boost/
      eval/
    secrets/
      vault.enc
    compliance/
      soc2-2026-04-11.json
  build/                        ← cross-compilation output (gitignored)
    cursor/
    claude/
```

The user installs two tools:
- `openclaw` — runtime management (Gateway, agents, channels, memory)
- `claws` — governance compilation (policies, audit, compliance, fleet)

They complement each other. One manages the runtime. The other compiles governance.

---

## Key Findings

1. **OpenClaw CLI is a runtime management tool** — 100+ commands for Gateway, agents, channels, memory, cron. Zero governance compilation.
2. **`.openclaw/` is global (`~/.openclaw/`), not per-workspace** — eliminates Option B (extend .openclaw/) for workspace governance
3. **OpenClaw workspaces are flat** — no hidden directories. `.claws/` introduces no collision.
4. **Zero command overlap** — claws and openclaw operate on different layers (governance vs runtime)
5. **claws COMPLEMENTS openclaw** — it's not a replacement, not a fork, not an extension. It's a new layer.
6. **`.claws/` is the right directory** — product-native, no collision, clear ownership, portable across workspace formats
7. **Integration via workspace files** — compiled policies inject into OC workspaces as skills, tool hooks, or AGENTS.md amendments
