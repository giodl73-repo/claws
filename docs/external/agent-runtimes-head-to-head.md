# Agent Runtimes Head-to-Head: Managed Agents, OpenClaw, and CraftWorks

**Date**: 2026-04-10
**Purpose**: A balanced, thorough comparison of three approaches to building and deploying AI agents. This document gives each platform genuine credit for its innovations and explains how CraftWorks functions as a compilation and governance layer above both runtimes.
**Sources**: `managed-agents-vs-openclaw.md`, `managed-agents-landscape.md`, `openclaw-enterprise-craftworks-alignment.md`, WorkIQ sandbox architecture docs

---

## TL;DR

Three products. Three philosophies. One compilation layer.

**Anthropic Managed Agents** solved the hardest infrastructure problem in agent deployment: making agents as reliable as cloud databases. Their Brain/Hands/Session architecture decouples execution state from compute in a way that enables automatic crash recovery, horizontal scaling, and a 60% improvement in time-to-first-token. If you want agents as managed cloud infrastructure with zero operational burden, this is the state of the art.

**OpenClaw** created a movement. 100K GitHub stars in its first week. A Lex Fridman interview with creator Peter Steinberger (#491). The concept of a "programmable soul" -- where an agent's personality, boundaries, and autonomous behavior are all version-controlled Markdown files you can read, edit, diff, and review in a PR. If you want an agent that feels like a digital companion you truly own, OpenClaw defined the category.

**CraftWorks** is neither a cloud runtime nor a local daemon. It is the compilation and governance layer that sits above both. CraftWorks compiles optimized, governed, sealed agent definitions and deploys them to Managed Agents, OpenClaw, or 27 other targets. Combined with the WorkIQ sandbox platform, it enables enterprise-grade agent hosting with OpenClaw-style expressiveness and Managed Agents-style isolation.

**The key insight**: Managed Agents and OpenClaw are runtimes. CraftWorks is the layer that compiles, optimizes, and governs before deployment -- and it deploys to both.

---

## Part 1: What Makes Each Platform Great

### Managed Agents: Infrastructure-Grade Reliability

Anthropic's Managed Agents, launched in public beta on April 8, 2026, represents the most thoughtful approach to agent-as-a-service architecture to date. The engineering team solved problems that most agent frameworks have not even identified yet.

**The Brain/Hands/Session architecture** is the breakthrough. By decoupling the agent into three virtualized components -- Brain (Claude model + stateless harness), Hands (sandboxed containers provisioned on demand), and Session (durable append-only event log) -- Anthropic achieved something genuinely difficult: a system where the orchestrator carries no state.

```
Your Application
  +-- REST API calls
       +-- Anthropic Cloud
            |-- Brain    (Claude + stateless harness -- reconstructed from session log)
            |-- Hands    (sandboxed containers -- ephemeral, provisioned per session)
            +-- Session  (durable append-only event log -- survives everything)
```

Why this matters:

1. **Crash recovery is automatic.** If the Brain crashes, a new harness instance replays the Session log and resumes exactly where it left off. No developer intervention. No data loss. This is the session-sourced recovery pattern -- the Session IS the agent's memory, and the Brain is disposable.

2. **60% p50 TTFT improvement.** Anthropic's engineering blog documents a 60% reduction in time-to-first-token from their tight integration between model and infrastructure. When the model vendor owns the runtime, they can optimize the entire path from API call to first token in ways that a third-party framework cannot.

3. **Millisecond billing.** You pay $0.08/session-hour, but only for actual compute time. Idle time is excluded. This is more honest than most cloud pricing models.

4. **Seven language SDKs.** Python, TypeScript, Go, Java, C#, Ruby, PHP. The broadest SDK coverage of any agent platform -- even broader than OpenAI's Agents SDK (Python and JS only at launch).

**Progressive skill disclosure (L1/L2/L3)** is the other standout feature. Skills are filesystem-based modular capability packages:

| Level | Content | Size | Loading |
|-------|---------|------|---------|
| L1 | YAML frontmatter metadata | ~100 tokens | Always loaded |
| L2 | SKILL.md instructions | <5K tokens | Triggered on match |
| L3 | Resources, scripts, data | Unlimited | Loaded via bash on demand |

This three-tier model means skills can be enormous (L3 resources) without polluting the context window. Only metadata is loaded until the skill is actually needed. No other platform does this.

**The callable_agents primitive** enables multi-agent orchestration. An agent can reference other agents by ID and invoke them within a session. While still in beta and limited to single-hop delegation (no formal supervisor/worker patterns built into the API), this is the foundation for sophisticated multi-agent systems. The developer owns the coordination loop -- which is both a strength (maximum flexibility) and a limitation (no built-in patterns like Google ADK's 3 workflow agent types).

**What Managed Agents does not do** (and this is not a criticism -- it is a design choice): no model flexibility (Claude only), no self-hosted option, no scheduled/autonomous behavior, no heartbeat scheduler, no guardrail API in the beta. Anthropic chose depth over breadth: do cloud-hosted Claude agents extraordinarily well rather than trying to do everything.

---

### OpenClaw: The Programmable Soul

OpenClaw did not just build a product. It started a cultural movement around the idea that your AI agent should be as transparent and personal as your dotfiles.

**The numbers speak for themselves**: 100K GitHub stars in the first week. The fastest-growing open source project in GitHub's history at that point. A Lex Fridman interview with creator Peter Steinberger (episode #491) that introduced millions of people to the concept of agent workspaces. When Steinberger later joined OpenAI, governance transitioned to an independent foundation -- ensuring the project's community-first DNA survives regardless of corporate interests.

**The "programmable soul" concept** is OpenClaw's deepest contribution. Where Managed Agents defines an agent as a set of API parameters, OpenClaw defines an agent as a collection of Markdown files that together form a complete specification language:

```
Your Machine
  +-- OpenClaw Gateway (persistent daemon)
       |-- LLM Providers     (Claude, GPT, DeepSeek, Ollama, Kimi, Llama...)
       |-- Channel Connectors (WhatsApp, Slack, Discord, Telegram, +20 more)
       |-- Workspace Files    (SOUL.md, AGENTS.md, MEMORY.md, +9 more)
       |-- Heartbeat Scheduler(cron-like autonomous tasks)
       |-- Lobster Engine     (multi-step, multi-agent workflows)
       +-- Tool Executors     (shell, browser, email, calendar...)
```

**The 12-file workspace** is the heart of OpenClaw. Each file serves a specific purpose, and together they form a complete agent identity:

| File | Purpose | Why it matters |
|------|---------|---------------|
| **SOUL.md** | Persona, tone, boundaries | The "programmable soul" -- personality as version-controlled code |
| **AGENTS.md** | Standard operating procedures, priorities | Behavioral rules that are reviewable in PRs |
| **HEARTBEAT.md** | Scheduled autonomous tasks | Agents that act without being asked |
| **USER.md** | User context (name, timezone, preferences) | Agents that know their human |
| **IDENTITY.md** | Agent's self-model | Agents that understand their own capabilities |
| **TOOLS.md** | Available tools and permissions | Explicit capability declarations |
| **BOOTSTRAP.md** | First-run interview/onboarding | Agents that learn about new users |
| **MEMORY.md** | Long-term durable memory | Transparent, editable, diffable memory |
| **BOOT.md** | Startup checklist | Deterministic initialization on every restart |
| **skills/** | Skill packages (SKILL.md each) | Modular capabilities shared via ClawHub |
| **canvas/** | Structured output templates | Reusable generation formats |
| **openclaw.json** | Runtime configuration | Provider routing, model selection, auth |

**Why this design is powerful**:

SOUL.md is more than a system prompt. It is a structured document with sections for persona, tone, and hard boundaries. When someone changes a boundary rule -- say, removing "I will never delete files without confirmation" -- that change shows up in `git diff`. You can review it in a PR. You can `git blame` it. You can revert it. In Managed Agents, personality and safety constraints are buried in a single system prompt string. Changes are invisible unless you build your own versioning.

**Model freedom** is genuine, not theoretical. OpenClaw's Gateway routes to any LLM provider via `openclaw.json`:

```json
{
  "providers": {
    "anthropic": { "model": "claude-sonnet-4-20250514" },
    "openai": { "model": "gpt-4o" },
    "deepseek": { "model": "deepseek-coder" },
    "ollama": { "model": "kimi-2.5:latest" }
  },
  "routing": {
    "default": "anthropic",
    "fallback": ["openai", "deepseek"],
    "code_tasks": "deepseek"
  }
}
```

Multi-provider routing, automatic fallback chains, auth profile rotation for rate limits, local models via Ollama for fully offline operation, and cost optimization by routing simple tasks to cheaper models. The LLM landscape moves fast -- today's best model may not be tomorrow's -- and OpenClaw's architecture means you are never locked in.

**HEARTBEAT.md** transforms agents from passive tools into proactive assistants:

```markdown
## Every 30 Minutes
- [ ] Check #alerts channel for new incidents

## Every Morning (8:00 AM)
- [ ] Summarize overnight emails
- [ ] Review today's calendar and flag conflicts
- [ ] Check GitHub for PRs awaiting my review

## Every Friday (5:00 PM)
- [ ] Generate weekly activity summary
- [ ] Archive completed Jira tickets
```

The Gateway's heartbeat scheduler wakes the agent at configured intervals. No external cron jobs. No separate orchestration layer. The agent's schedule IS a file in its workspace.

**The Lobster workflow engine** enables multi-step, multi-agent workflows via YAML definitions. While not as battle-tested as LangGraph's graph-based orchestration or CraftWorks' compiled DAGs, Lobster gives OpenClaw users a way to compose agents into pipelines without writing code.

**25+ messaging connectors** -- WhatsApp, Telegram, Signal, iMessage, Slack, Discord, Microsoft Teams, Google Chat, LINE, Matrix, IRC, and community-built integrations for a dozen more -- mean the agent meets you where you already communicate. No new app to install, no new interface to learn.

**ClawHub marketplace** is the npm of agent skills. Community-built, shared via a registry, installable with a single command. The ecosystem effect is real: thousands of pre-built skills covering everything from email management to code review to calendar optimization.

**MIT license** means truly free. No usage-based fees, no telemetry requirements, no license audits. You pay your LLM provider directly and keep everything else.

**Transparent memory** is perhaps the most underappreciated feature. Memory is Markdown files on disk:

```markdown
## User Preferences
- Prefers morning meetings (before 11 AM)
- Uses TypeScript for new projects, Python for data work

## Project Context
- Working on authentication overhaul (deadline: April 15)
- Team lead: Sarah (prefers async communication)
```

You can read exactly what your agent remembers. You can correct mistakes with a text editor. You can review memory changes in pull requests. You can encrypt it, back it up, or delete it entirely. This level of memory transparency does not exist in any cloud-hosted agent platform.

**What OpenClaw does not do** (by design): no sandboxing (the agent has full system access -- CVE-2026-25253 at CVSS 8.8 demonstrated the real risk here), no built-in governance, no compile-time validation, no enterprise fleet management. OpenClaw chose maximum user freedom and expressiveness over enterprise safety controls. The community is actively working on optional container isolation post-CVE, but it is not GA yet.

---

## Part 2: The Capability Matrix

A fair comparison requires honest scoring. Both OpenClaw and Managed Agents have genuine strengths that CraftWorks does not replicate at the runtime level.

| Dimension | Managed Agents | OpenClaw | CraftWorks |
|-----------|:-:|:-:|:-:|
| **Compilation** | - | ~ | **Y (29 targets)** |
| **Multi-target deploy** | - | ~ | **Y (29 targets)** |
| **Token optimization** | - | - | **Y (PRESS + Competitive)** |
| **Budget management** | - | - | **Y (MCKP solver, org caps)** |
| **DAG workflows** | ~ (callable_agents beta) | **Y** (Lobster DSL) | **Y** (5-pattern, prose-compiled) |
| **Cloud runtime** | **Y** (Brain/Hands/Session) | - | ~ (via WorkIQ sandbox) |
| **Local runtime** | - | **Y** (Gateway daemon) | ~ (via deploy targets) |
| **Crash recovery** | **Y** (session replay) | - | ~ (Fleet + snapshot) |
| **Model freedom** | - (Claude only) | **Y** (any LLM) | **Y** (multi-model DAG) |
| **Messaging connectors** | - | **Y** (25+) | - |
| **Scheduled/autonomous** | - | **Y** (HEARTBEAT.md) | ~ (Pipeline + Fleet) |
| **Governance** | ~ (sandbox only) | - | **Y** (Guard + Fleet + pass^k) |
| **Sealed deployment** | - | - | **Y** (SHA-256 + CGR + rollback) |
| **Skill marketplace** | **Y** (Skills API, L1/L2/L3) | **Y** (ClawHub) | **Y** (semver + lockfiles) |
| **Sandbox isolation** | **Y** (containers) | - (community WIP) | ~ (via WorkIQ) |
| **Memory transparency** | - (opaque) | **Y** (Markdown files) | **Y** (Context DAG, versioned) |

**Legend**: Y = native strength, ~ = partial/indirect, - = absent

OpenClaw earns genuine Y marks for DAG workflows (Lobster), local runtime (Gateway), model freedom, messaging, scheduling, skill marketplace, and memory transparency. Managed Agents earns genuine Y marks for cloud runtime, crash recovery, sandbox isolation, and skills. CraftWorks occupies a different architectural position -- compilation and governance -- which is why the Y marks cluster in optimization, budgeting, multi-target deployment, and governance.

---

## Part 3: Architecture Comparison

### The Philosophies

| | Managed Agents | OpenClaw | CraftWorks |
|---|---|---|---|
| Core metaphor | Agents as cloud infrastructure | Agents as personal companions | Agents as compiled, governed artifacts |
| Target user | Developers building agent-powered apps | Individuals automating their digital lives | Platform teams managing agent fleets |
| Deployment model | API call --> running in seconds | Install daemon, write workspace files | Compile --> seal --> deploy to any target |
| Data location | Anthropic's cloud | Your machine | Your infrastructure (target decides) |
| Pricing | $0.08/session-hour + tokens | Free (MIT, pay LLM costs) | SDK license + LLM costs |

### Agent Definition

| Aspect | Managed Agents | OpenClaw | CraftWorks |
|--------|---------------|----------|------------|
| Format | JSON/YAML API parameters | 12 Markdown files | OLET roles + skills (compiled) |
| Persona | System prompt (single string) | SOUL.md (sections: persona, boundaries, tone) | Orientation + Lens + Expertise + Tension |
| Behavioral rules | System prompt | AGENTS.md (procedures, priorities) | Compiled role pipeline |
| Hard boundaries | System prompt | SOUL.md `## Boundaries` (dedicated section) | Guard policies (compile-time enforced) |
| User context | Not built-in | USER.md (name, timezone, preferences) | Compiled into context assembly |
| Memory | Platform-managed (opaque) | MEMORY.md + memory/*.md (transparent) | Context DAG (compiled, versioned, forkable) |
| Startup behavior | None | BOOT.md + BOOTSTRAP.md | Pipeline stage initialization |
| Scheduled tasks | Not supported | HEARTBEAT.md | Pipeline stages + Fleet scheduler |
| Skills | Zip upload (L1/L2/L3) | skills/*/SKILL.md (ClawHub) | Packages with semver + lockfiles |
| Version control | API versioning | git (every file diffable) | git + sealed snapshots + CGR audit trail |

### Model Support

| | Managed Agents | OpenClaw | CraftWorks |
|---|---|---|---|
| Models | Claude only | Any (Claude, GPT, DeepSeek, Ollama, local) | Any -- multiple models in one DAG |
| Multi-model | No | Task-type routing + fallback chains | Native: Claude Stage 1 --> GPT Stage 2 --> Gemini Stage 3 |
| Offline | No (cloud-dependent) | Yes (Ollama for local models) | Depends on deploy target |

### Runtime

| | Managed Agents | OpenClaw | CraftWorks |
|---|---|---|---|
| Architecture | Brain/Hands/Session (decoupled) | Gateway (single persistent daemon) | Dispatch engine + Fleet supervisor |
| Crash recovery | Automatic (session replay from event log) | Manual restart (systemd/supervisor) | Fleet intervention + snapshot rollback |
| Scaling | Automatic (Anthropic cloud) | Single machine (manual) | CompilationForest (20 workspaces, topo sort) |
| Scheduling | None (reactive only) | HEARTBEAT.md (cron-like) | Pipeline stages + Fleet intervention ladder |

### Workflows

| | Managed Agents | OpenClaw | CraftWorks |
|---|---|---|---|
| Orchestration | callable_agents (beta, single-hop) | Lobster DSL (YAML, multi-step, multi-agent) | 5-pattern DAG (sequential, fan-out, conditional, diamond, review loop) |
| Definition | API parameter | YAML workflow files | Prose (Markdown) --> compiled to validated DAG |
| Validation | Runtime only | Schema validation | Compile-time: cycles, unreachable nodes, type mismatches |
| Multi-agent | Beta (callable_agents) | Community (ClawTeam, Mission Control) | Native: dispatch engine with typed ports |

### Security

| | Managed Agents | OpenClaw | CraftWorks |
|---|---|---|---|
| Execution model | Sandboxed containers | Full local system access | Compiled skills + Fleet intervention gates |
| Known CVEs | None published | CVE-2026-25253 (CVSS 8.8, RCE) | N/A (compilation layer) |
| Data sovereignty | Anthropic cloud | Your machine | Your infrastructure |
| Secret management | Env vars (never embedded) | Local config files | Guard secret scan + seal-time final pass |
| Isolation | Container-level (Anthropic managed) | None (community sandboxing WIP) | Per-agent Landlock isolation (via WorkIQ) |

### Governance

| | Managed Agents | OpenClaw | CraftWorks |
|---|---|---|---|
| Compile-time | None | None | Guard: trust boundary, secret scan, budget cap, EU AI Act |
| Runtime | Container sandbox | None | Fleet: L0 observe --> L5 terminate, per-dispatch audit |
| Trust model | Anthropic manages sandbox | You manage security | pass^k scope graduation (Private --> Certified) |
| Audit trail | Session event log | None | CGR: every guard check, seal, deploy, gate eval |
| Sealed deployment | No | No | SHA-256 integrity, snapshot rollback in 2 seconds |

### Optimization

| | Managed Agents | OpenClaw | CraftWorks |
|---|---|---|---|
| Token optimization | None | None | NATIVE (44%) + CRUSH + PRESS (L0-L5 density) |
| Competitive profiling | None | None | 3 profiles x 3 targets, data-driven selection |
| Budget management | Per-session metering | None | MCKP solver, per-skill per-stage, org cap enforcement |
| Cost impact | N/A | N/A | $10,800 --> $5,400/mo across 50 skills |

---

## Part 4: The Enterprise Story -- CraftWorks + WorkIQ Sandbox

This is where the three platforms converge into something larger than any of them alone.

### The Problem

Enterprises need three things that no single platform provides:

1. **OpenClaw-style expressiveness** -- rich agent definitions, model freedom, transparent memory, file-based configuration
2. **Managed Agents-style isolation** -- sandboxed containers, crash recovery, no full-system-access risk
3. **Compile-time governance** -- policy enforcement, budget management, audit trails before the agent ever runs

Managed Agents provides (2) but not (1) or (3). OpenClaw provides (1) but not (2) or (3). CraftWorks provides (3) but needs a runtime for (1) and (2).

### The WorkIQ Sandbox

The WorkIQ sandbox (`C:\src\workiq-sandbox`, Eduardo Piva's team at Microsoft) provides Docker containers running Claude CLI as a subprocess, with a gRPC bidirectional stream (`sandbox.proto`, 507 lines) for all host-container communication.

```
 Host Machine                              Docker Container
+---------------------------+           +-------------------------------------------+
|                           |           |                                           |
|  WorkIQ CLI               |           |  Claude CLI (subprocess)                  |
|  (workiq create/execute)  |           |    |                                      |
|    |                      |   gRPC    |    | HTTP (Anthropic API)                  |
|    +-- ContainerClient ---+---:9001---+--  |                                      |
|    |   ContainerSession   |           |  YARP frontend (0.0.0.0:9001)             |
|    |                      |           |    +-- /extension/mcpplatform/* -> strip   |
|    +-- FileTransferClient |           |    +-- /* -> passthrough                  |
|    |                      |           |    v                                      |
|  SessionOrchestrator      |           |  gRPC backend (localhost:9002)             |
|    +-- LlmProxy ----------+-HTTPS-----+-> api.anthropic.com / Azure AI            |
|    +-- OrchestratorCBs    |           |                                           |
|                           |           |  HTTP interceptor (localhost:8000)         |
|                           |           |    /v1/messages + /health                 |
+---------------------------+           +-------------------------------------------+
```

The key components:

- **SessionOrchestrator** routes LLM, tool, and trace signals between host and container. It owns the bidirectional gRPC stream and manages session lifecycle.
- **LlmCallBroker** and **ToolCallBroker** serialize concurrent writes to the gRPC stream, using channel-per-call patterns with `SemaphoreSlim` and `Channel<T>` for thread safety.
- **ContainerSignal** (container-to-host) and **RuntimeSignal** (host-to-container) are the two message types on the bidirectional stream. Every LLM request, tool invocation, health check, pause/resume, and lifecycle event travels as a signal.
- **Heartbeat protocol** detects unresponsive containers. Any ContainerSignal proves liveness -- not just explicit health checks.
- **NDJSON reconnection** -- every ContainerSignal is persisted to a loop file on disk, enabling replay after disconnection.

### The Structural Mapping: CraftWorks + WorkIQ

The alignment between CraftWorks agent specs and WorkIQ sandbox architecture is structural, not metaphorical:

| CraftWorks Concept | WorkIQ Concept | Relationship |
|-------------------|----------------|-------------|
| **WorkAgent** (CS-15) | **SessionSlot** | 1:1 mapping -- each CraftWorks agent process maps to exactly one WorkIQ session |
| **Signal bus** (CS-35, DCR-CS-12) | **ToolCallBroker socket** | CraftWorks signals transport over WorkIQ's gRPC bidirectional stream |
| **Agent isolation** (CS-34) | **Container + Landlock** | Per-agent filesystem isolation via Landlock within Docker containers |
| **Event schema** (CS-12, 27 event types) | **ContainerSignal/RuntimeSignal** | CraftWorks events are a typed overlay on WorkIQ's signal protocol |
| **WorkAgentWorkspace** (CS-34) | **Workspace lifecycle** (init/push/execute/pull) | CraftWorks workspace governance maps to WorkIQ workspace operations |
| **Guard policies** | **YARP + interceptor** | Compile-time policies enforced at the container boundary |

The 6-entity hierarchy in CS-34 (WorkAgent --> WorkAgentWorkspace --> WorkAgentWorkspaceBinding --> WorkAgentWorkspaceInstance --> WorkAgentWorkspaceSession --> WorkAgentWorkspaceInstanceConnection) maps directly to the WorkIQ lifecycle: a published agent template is installed into a governance blueprint, bound to a container instance, and runs sessions that are tracked by the SessionOrchestrator.

### The 3-Layer Enterprise Architecture

```
 Layer 1: CraftWorks (Compile + Govern)
 +---------------------------------------------------------------+
 |  Author (CREST / OpenClaw / any format)                       |
 |    +-- Compiler (ProgramIR, 40+ passes)                       |
 |         |-- Optimize (NATIVE 44% + CRUSH + PRESS L0-L5)       |
 |         |-- Govern (Guard policies, budget caps, EU AI Act)    |
 |         +-- Seal (SHA-256 + CGR audit trail)                   |
 +---------------------------------------------------------------+
                            |
                            v
 Layer 2: WorkIQ Sandbox (Host + Isolate)
 +---------------------------------------------------------------+
 |  SessionOrchestrator                                          |
 |    +-- Docker containers (per-agent isolation)                |
 |    +-- Landlock filesystem boundaries                         |
 |    +-- gRPC bidirectional stream (507-line proto)             |
 |    +-- LlmProxy (Anthropic / Azure AI / any provider)        |
 |    +-- Crash recovery (NDJSON reconnection + session replay)  |
 |    +-- Heartbeat monitoring (stuck-container detection)       |
 +---------------------------------------------------------------+
                            |
                            v
 Layer 3: Any LLM (Execute)
 +---------------------------------------------------------------+
 |  Claude (via Anthropic API or Azure AI)                       |
 |  GPT (via OpenAI API or Azure OpenAI)                         |
 |  Gemini (via Google AI)                                       |
 |  DeepSeek, Llama, Kimi (via Ollama or direct API)             |
 +---------------------------------------------------------------+
```

**What this combination achieves**:

- **OpenClaw-style flexibility**: Any model, file-based configuration, transparent workspace files. CraftWorks can compile OpenClaw workspaces (all 12 files) and deploy them into WorkIQ containers.
- **Managed Agents-style sandboxing**: Container isolation, crash recovery via session replay, heartbeat monitoring, no full-system-access risk.
- **Governance that neither platform provides**: Compile-time policy enforcement, budget management, sealed deployment, CGR audit trail, pass^k scope graduation.
- **Per-agent compilation within Landlock-isolated worktrees**: Each agent gets its own filesystem boundary. A compromised agent cannot access another agent's data, configuration, or tools.

This is the "Enterprise OpenClaw" story: CraftWorks compile + govern, WorkIQ sandbox + host, any LLM execute. The expressiveness of OpenClaw's workspace model, the isolation guarantees of Managed Agents' containers, and the compile-time governance that enterprises require -- all in one stack.

---

## Part 5: CraftWorks as Compilation Layer

CraftWorks is not a competitor to Managed Agents or OpenClaw. It is the compilation and governance layer that makes both better.

### Compiling TO Managed Agents

CraftWorks compiles agent definitions into Managed Agents-ready artifacts:

| CraftWorks Concept | Managed Agents Concept | Fidelity |
|-------------------|----------------------|----------|
| CompiledRole | Agent YAML | Lossless (1:1) |
| FLASH Skill | Skill zip (L1/L2/L3) | Lossless |
| collaborates_with | callable_agents | Lossless |
| maxTurns | max_turns | Lossless |
| criticalSystemReminder | system field (appended) | Partial (loses compaction resistance) |
| Hooks (canBlock) | -- | Lossy (ERROR diagnostic emitted) |
| Cron/scheduled | -- | Lossy (INFO diagnostic) |

When compiling to Managed Agents, CraftWorks:
1. Optimizes token budgets (PRESS L0-L5) before deployment
2. Validates against Guard policies at compile time
3. Packages skills as zip archives for the Skills API
4. Tracks every lossy translation with structured diagnostics
5. Seals the deployment with SHA-256 integrity and CGR audit trail

### Compiling TO OpenClaw

CraftWorks compiles agent definitions into OpenClaw 12-file workspaces with 95%+ fidelity:

- **12 reader modules** parse every OpenClaw workspace file into typed IR
- **11 emitter modules** generate every OpenClaw workspace file from typed IR
- **11 PEG grammars** provide machine-readable format specifications
- **32 test files** with unit, integration, e2e, and stress tests for round-trip fidelity
- **Spec 103** (35 pages) is the most rigorous documentation of the OpenClaw workspace format that exists -- including more detail than OpenClaw's own repository

When compiling to OpenClaw, CraftWorks:
1. Generates SOUL.md with structured persona and boundary sections
2. Generates HEARTBEAT.md for scheduled autonomous behavior
3. Generates openclaw.json with provider routing configuration
4. Generates all 12 workspace files from the same IR used for every other target
5. Tracks field-level losses (e.g., CraftWorks governance rules that OpenClaw cannot enforce)

### Compiling FROM OpenClaw

CraftWorks can import existing OpenClaw workspaces:

```
craft import ./my-openclaw-agent/
  --> Reader parses all 12 files into typed IR
  --> Optimizer applies PRESS (44% token reduction)
  --> Guard validates against enterprise policies
  --> Emitter deploys to any of 29 targets
```

An OpenClaw workspace authored for personal use can be imported, optimized, governed, and redeployed as a Managed Agents cloud service, a Cursor workspace, a Claude Code configuration, or any other supported target -- with a loss matrix showing exactly what degraded in translation.

### The Cross-Compilation Triangle

```
                   CraftWorks IR (typed, validated, 40+ passes)
                  /              |               \
                 /               |                \
    OpenClaw <--> IR    Managed Agents <--> IR    +27 other targets
    (12 readers,        (Concordia wave           (Claude Code, Cursor,
     11 emitters,        F1-F6)                    Copilot, Codex, Gemini,
     95%+ fidelity)                                OpenAI, Bedrock, ADK...)
         |                                              |
         +---------- Cross-compile directly ------------+
```

---

## Part 6: The Convergence Narrative

Despite their different starting points, both platforms are moving toward each other. CraftWorks bridges the gap.

### Managed Agents Moving Toward OpenClaw's Strengths

Anthropic is adding features that bring structured identity and expressiveness:

- **`criticalSystemReminder_EXPERIMENTAL`** (TypeScript Agent SDK v0.2.96) -- instructions that survive context compaction. This is a step toward OpenClaw's SOUL.md boundaries: safety-critical rules that persist no matter how much context is compressed. It validates the architectural insight that some instructions are more important than others.
- **Skills API with progressive disclosure** -- directory-based skill packages with Markdown instructions. This independently converged with the same skill-as-directory model that OpenClaw's ClawHub uses.
- **Multi-agent callable_agents** -- moving from single-agent sessions toward the multi-agent workflows that OpenClaw's community has built through ClawTeam and Mission Control.

### OpenClaw Moving Toward Managed Agents' Strengths

The OpenClaw community is addressing the security and enterprise gaps:

- **Post-CVE sandboxing** -- after CVE-2026-25253 (CVSS 8.8, RCE) demonstrated the real danger of full system access, the community is actively building optional container isolation for tool execution.
- **Enterprise interest** -- the viral adoption brought enterprise attention, but enterprises need governance, SLAs, and isolation that community OpenClaw does not yet provide.
- **Foundation governance** -- Steinberger's move to OpenAI and the transition to an independent foundation provides the governance stability that enterprises require.

### Where CraftWorks Fits in the Convergence

CraftWorks does not wait for either platform to evolve. It bridges the gap today:

| Gap | How CraftWorks Bridges It |
|-----|--------------------------|
| OpenClaw lacks sandboxing | Compile OpenClaw workspaces --> deploy into WorkIQ containers |
| Managed Agents lacks expressiveness | Compile rich OLET roles --> deploy as Managed Agents with optimized system prompts |
| Neither has compile-time governance | Guard validates policies before deployment to either runtime |
| Neither optimizes token budgets | PRESS reduces costs 44%+ regardless of deployment target |
| Neither tracks cross-platform losses | Loss matrix shows exactly what degrades when moving between platforms |
| Neither seals deployments | SHA-256 integrity + CGR audit trail for compliance |

The convergence trajectory suggests that in 12-18 months, Managed Agents will have richer agent identity features and OpenClaw will have better sandboxing. But neither will have a compilation layer. Compilation -- the act of transforming authored intent into optimized, validated, governed deployment artifacts -- is an architectural layer that neither runtime is building toward. It is CraftWorks' structural position.

---

## Part 7: When to Use What

### Use Managed Agents when:
- Building an agent-powered SaaS product that needs API integration
- Zero-ops deployment is a hard requirement
- Sandboxed execution is a security mandate
- Claude-only is acceptable (and the 60% TTFT improvement justifies it)
- Session durability and automatic crash recovery are critical
- You need 7-language SDK support

### Use OpenClaw when:
- Building a personal AI assistant or digital companion
- Data sovereignty is non-negotiable
- Model freedom matters (switch providers, use local models, optimize cost by routing)
- Messaging-first interface (WhatsApp, Slack, Discord, Telegram)
- Autonomous scheduled behavior (heartbeat) is a core requirement
- You want transparent, editable, version-controlled agent memory
- MIT license and community ecosystem matter to your organization

### Use CraftWorks when:
- Managing 10+ skills across multiple tools and teams
- Token budget optimization matters ($5K+/month spend)
- Governance is required (policy enforcement, audit trail, sealed deployment)
- Multi-model dispatch in production DAGs
- Deploying the same agent to multiple runtimes simultaneously
- Compliance requires compile-time validation (EU AI Act, internal policies)

### Use CraftWorks + Managed Agents when:
- Compile and optimize with CraftWorks, deploy to Managed Agents via Skills API
- Best of both: CraftWorks governance + Anthropic's infrastructure reliability
- Monitor with Fleet, audit with CGR, benefit from 60% TTFT on Anthropic's cloud

### Use CraftWorks + OpenClaw when:
- Compile and optimize with CraftWorks, deploy to OpenClaw 12-file workspace
- Self-hosted, model-agnostic runtime with compile-time governance
- Best of both: CraftWorks compilation + OpenClaw's expressiveness and community

### Use CraftWorks + WorkIQ Sandbox when:
- Enterprise deployment requiring all three: expressiveness + isolation + governance
- Per-agent Landlock isolation in Docker containers
- Crash recovery via NDJSON reconnection + session replay
- The "Enterprise OpenClaw" story: file-based agent config with container sandboxing

---

## Part 8: The Positioning

```
  +---------------------------------------------------------------------+
  |                         CraftWorks                                   |
  |            Compile --> Optimize --> Govern --> Seal                   |
  |                                                                      |
  |  OLET roles, PRESS budgets, Guard policies, CGR audit, 29 targets   |
  +----------+------------------------+---------------------------------+
             |                        |
    +--------v--------+      +--------v---------+
    | Managed Agents   |      |    OpenClaw       |
    | (cloud runtime)  |      | (local runtime)   |
    |                  |      |                    |
    | Brain/Hands/     |      | Gateway/Lobster/   |
    | Session          |      | Heartbeat/Soul     |
    | Zero ops         |      | Model freedom      |
    | 60% TTFT         |      | 25+ connectors     |
    | 7 SDKs           |      | 100K+ stars        |
    | Crash recovery   |      | MIT license        |
    +------------------+      +--------------------+
    + 27 other targets (Claude Code, Cursor, Copilot, Codex, Gemini...)

  +---------------------------------------------------------------------+
  |                      WorkIQ Sandbox                                  |
  |          Docker containers + gRPC + Landlock isolation               |
  |                                                                      |
  |  SessionOrchestrator, LlmProxy, ToolCallBroker, Heartbeat,          |
  |  NDJSON reconnection -- Enterprise OpenClaw hosting                  |
  +---------------------------------------------------------------------+
```

**CraftWorks is the compilation layer above.** We compile skills, optimize token budgets, enforce governance policies, and seal for deployment. Then we ship to whichever runtime fits: Managed Agents for cloud API workloads, OpenClaw for self-hosted assistants, WorkIQ for enterprise-sandboxed hosting, or any of 27 other targets.

**The respect is genuine.** Managed Agents solved crash recovery and session durability at the infrastructure level -- hard engineering problems that most frameworks have not even attempted. OpenClaw created a cultural movement around agent transparency and personal ownership -- a design philosophy that resonated with 100K developers in a week.

**CraftWorks does not replace either.** It compiles to both. It optimizes for both. It governs for both. And with WorkIQ, it can host agents with the expressiveness of OpenClaw and the isolation of Managed Agents -- giving enterprises the best of both worlds without waiting for either platform to evolve.

---

## Ecosystem and Community

| | Managed Agents | OpenClaw | CraftWorks |
|---|---|---|---|
| Open source | No (closed API service) | Yes (MIT) | SDK packages (MIT) |
| GitHub stars | N/A (API product) | 100,000+ (fastest to 100K) | Internal (enterprise) |
| SDKs | 7 languages (Python, TS, Go, Java, C#, Ruby, PHP) | JavaScript/TypeScript | TypeScript (compiler-sdk, agent-sdk, craftworks-sdk) |
| Skill marketplace | Skills API (L1/L2/L3 upload/download) | ClawHub (community-built, registry-based) | Packages with semver + lockfiles |
| Pricing | $0.08/session-hour + token rates | Free (MIT, pay LLM costs only) | SDK license + LLM costs |
| Documentation | Comprehensive API docs | Community-driven (wiki, blog posts, tutorials) | Design specs (122 numbered) |
| Enterprise support | Anthropic SLAs | Community + foundation | Craftworks team |
| Key personality | Anthropic engineering team | Peter Steinberger (now at OpenAI), foundation | -- |
| Cultural impact | Professionalized agent deployment | Democratized agent ownership | Professionalized agent compilation |

---

## Sources

| Source | Key Takeaway |
|--------|-------------|
| [Anthropic Managed Agents Overview](https://platform.claude.com/docs/en/managed-agents/overview) | Brain/Hands/Session architecture, API surface |
| [Anthropic Engineering: Scaling Managed Agents](https://www.anthropic.com/engineering/managed-agents) | 60% TTFT improvement, session replay, design rationale |
| [Anthropic Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) | L1/L2/L3 progressive disclosure model |
| [TypeScript Agent SDK v0.2.96](https://github.com/anthropics/anthropic-sdk-typescript) | criticalSystemReminder_EXPERIMENTAL, maxTurns, Agent Teams |
| [OpenClaw GitHub](https://github.com/openclaw/openclaw) | 100K+ stars, MIT license, workspace specification |
| [OpenClaw Official Site](https://openclaw.ai/) | Gateway architecture, workspace file documentation |
| [Peter Steinberger -- Lex Fridman #491](https://lexfridman.com/peter-steinberger-transcript/) | Design philosophy, "programmable soul" concept |
| [Peter Steinberger joins OpenAI -- Fortune](https://fortune.com/2026/02/19/openclaw-who-is-peter-steinberger-openai-sam-altman-anthropic-moltbook/) | Governance transition to foundation |
| [OpenClaw Explained -- KDnuggets](https://www.kdnuggets.com/openclaw-explained-the-free-ai-agent-tool-going-viral-already-in-2026) | 100K stars in first week, viral adoption story |
| [OpenClaw Workspace Files -- Medium](https://capodieci.medium.com/ai-agents-003-openclaw-workspace-files-explained-soul-md-agents-md-heartbeat-md-and-more-5bdfbee4827a) | 12 file types, SOUL.md structure, HEARTBEAT.md |
| [OpenClaw vs Claude Code -- DataCamp](https://www.datacamp.com/blog/openclaw-vs-claude-code) | Feature comparison, use case segmentation |
| [What is OpenClaw -- DigitalOcean](https://www.digitalocean.com/resources/articles/what-is-openclaw) | Managed hosting options, architecture overview |
| [CVE-2026-25253](https://nvd.nist.gov/vuln/detail/CVE-2026-25253) | RCE vulnerability, CVSS 8.8, Palo Alto Networks analysis |
| WorkIQ Sandbox Architecture (internal) | sandbox.proto (507 lines), SessionOrchestrator, LlmCallBroker, Landlock isolation |
| CraftWorks CS-15 (Agent Process Model) | 14-state lifecycle, WorkAgent 1:1 SessionSlot mapping |
| CraftWorks CS-34 (WorkAgent Runtime) | 6-entity hierarchy, workspace governance, drain protocol |
| CraftWorks CS-35 (Signal Bus Protocol) | Signal envelope, transport layers, TTL, rate limiting |
| CraftWorks CS-12 (Event Schema) | 27 event types, common envelope, schema evolution |
