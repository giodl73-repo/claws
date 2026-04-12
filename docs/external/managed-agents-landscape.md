# Managed Agent Platforms: Deep Competitive Landscape

**Date**: 2026-04-09
**Purpose**: Comprehensive analysis of hosted/managed agent platforms — architecture, tradeoffs, and positioning for Astro's managed-agents compilation target
**Wave**: Concordia the Harmonizer (LXXXVI)
**Plan**: astro-managed-agents-emitter (F1-F6)

---

## Executive Summary

The managed agent market has consolidated around seven major platforms, each occupying a distinct architectural niche. This analysis compares Anthropic's Claude Managed Agents against OpenAI Agents SDK/Responses API, Google Vertex AI Agent Builder/ADK, AWS Bedrock Agents, Microsoft Agent Framework, LangGraph Cloud, and CrewAI across ten dimensions. The goal is to inform Astro's cross-compilation strategy: understanding what each platform offers and lacks tells us what the managed-agents emitter must produce, what it can skip, and where compilation adds unique value.

**Key finding**: No platform provides a compilation layer. All seven define agents via configuration (YAML, JSON, code decorators, console wizards). Astro's compiler — which optimizes, validates, and cross-compiles workspace definitions — is architecturally unique. The managed-agents emitter is not merely a format adapter; it is the bridge between authored intent and deployment-ready artifacts, with loss tracking that no other tool provides.

**Verdict matrix** (10 dimensions, 7 platforms):

| Dimension | Anthropic | OpenAI | Google | AWS | Microsoft | LangGraph | CrewAI |
|-----------|:---------:|:------:|:------:|:---:|:---------:|:---------:|:------:|
| Agent definition model | A | A | A | B | A | B | B |
| Multi-agent orchestration | C | B | A | B | A | B | B |
| Tool/skill system | A | A | A | B | B | B | B |
| Memory & context | A | A | B | B | B | A | C |
| Hooks & guardrails | D | B | B | A | B | C | C |
| Deployment flexibility | D | C | A | D | B | A | B |
| Pricing transparency | A | A | C | C | A | C | C |
| API maturity | C | B | A | A | B | A | B |
| Self-hosted option | F | C | A | F | A | A | A |
| Ecosystem lock-in risk | B | B | C | D | C | A | A |

**Legend**: A = best-in-class, B = strong, C = adequate, D = weak, F = absent

---

## 1. Anthropic Claude Managed Agents

**Status**: Public Beta (April 8, 2026)
**API Version**: `managed-agents-2026-04-01`
**CLI**: `ant` (Go binary)
**SDKs**: Python, TypeScript, Go, Java, C#, Ruby, PHP

### Architecture

Managed Agents decouples agents into three virtualized components:

| Component | Role | Persistence |
|-----------|------|-------------|
| **Brain** | Claude model + harness (stateless orchestration) | None — reconstructed from session log |
| **Hands** | Sandboxed containers + tools | Ephemeral — provisioned per session |
| **Session** | Durable append-only event log | Persistent — survives disconnections |

The harness is stateless and invokes all external resources through a uniform `execute(name, input) -> string` interface, remaining agnostic to whether the target is a container, MCP server, or custom tool. This is architecturally elegant — crash recovery simply replays the session log through a fresh harness instance via `wake(sessionId)`.

Four foundational API objects:

```
Agent    → model + system prompt + tools + MCP servers + skills
Environment → cloud container template (packages, network, files)
Session  → running instance of an agent performing a task
Events   → SSE stream (user.message, agent.message, agent.tool_use, session.status_idle)
```

API surface: `/v1/agents`, `/v1/environments`, `/v1/sessions`, `/v1/sessions/{id}/events`, `/v1/sessions/{id}/stream`.

### Multi-Agent Support

**Research preview** (separate access required). In Anthropic's published multi-agent research system, a LeadResearcher (Opus) spawns specialized Subagents (Sonnet) with specific tasks. Each subagent independently performs web searches and returns findings. Demonstrated >90% improvement over single-agent on research tasks.

The `callable_agents` field enables inter-agent references within a session, mapping directly to Astro's `collaborates_with` declarations on compiled roles. This is the primary multi-agent primitive for the managed-agents emitter.

**Gap**: No formal orchestration patterns (supervisor, sequential, parallel) are built into the API. The calling application owns the coordination loop. This contrasts sharply with Google ADK (3 workflow agent types) and Microsoft (5 named patterns).

### Tool/Skill System

Built-in tools via `agent_toolset_20260401`: bash, file operations (read/write/edit/glob/grep), web search, URL fetch, MCP server connections.

**Agent Skills** are the standout feature — filesystem-based modular capability packages with progressive disclosure:

| Level | Content | Size | Loading |
|-------|---------|------|---------|
| L1 | YAML frontmatter metadata | ~100 tokens | Always loaded |
| L2 | SKILL.md instructions | <5K tokens | Triggered on match |
| L3 | Resources, scripts, data | Unlimited | Loaded via bash on demand |

Pre-built skills: PowerPoint, Excel, Word, PDF. Custom skills via `/v1/skills` API or filesystem upload (zip archives).

**Astro alignment**: FLASH specs 80-86 independently converged on the same skill-as-directory model. The managed-agents emitter packages FLASH-compiled skills as zips for the Skills API — a lossless translation.

### Memory & Context Management

Context compaction and prompt caching are built into the harness layer. The session event log functions as an external context object — `getEvents()` supports positional slices, rewinding, and rereading. Transformations happen in the harness before passing to Claude's context window.

Persistent cross-session memory is in research preview. Production sessions are limited to 8 memory stores.

### Hooks & Guardrails

**No public hook/guardrail API** in the beta. The harness handles error recovery internally — container failures are caught as tool-call failures and passed to Claude for retry. Failed containers are replaced via `provision({resources})`.

This is the primary lossy dimension for Astro compilation. Workspaces with `canBlock: true` hooks lose security enforcement when compiled to managed-agents. The emitter must emit ERROR-severity diagnostics for security hooks (not silent omission) with 3-part remediation: (a) agent_toolset restrictions, (b) MCP middleware, (c) `--allow-lossy-security` flag.

### Pricing

| Resource | Cost |
|----------|------|
| Token input/output | Standard rates (Sonnet: $3/$15 per M; Opus: $5/$25 per M) |
| Session runtime | $0.08/session-hour (millisecond billing, idle excluded) |
| Web search | $10/1,000 searches |
| Platform fee | None |

### Strengths

1. **Deepest managed infrastructure** — brain/hands/session decoupling enables crash recovery, horizontal scaling, and 60% p50 TTFT improvement
2. **Skills with progressive disclosure** — only platform with L1/L2/L3 loading tiers
3. **Session durability** — append-only event log survives disconnections and harness crashes
4. **Simple pricing** — tokens + session-hours, no hidden multipliers

### Weaknesses

1. **No self-hosted option** — fully cloud-dependent, not ZDR-eligible
2. **No guardrail API** — security enforcement must be rebuilt via toolset restrictions or MCP middleware
3. **Multi-agent in research preview** — callable_agents is the only GA primitive
4. **Beta maturity** — API may change before GA

### Astro Emitter Implications

The managed-agents emitter targets this platform as a new output format. Key mappings:

| Astro Concept | Managed Agents Concept | Fidelity |
|---------------|----------------------|----------|
| CompiledRole | Agent YAML | Lossless (1:1) |
| FLASH Skill | Skill zip | Lossless |
| collaborates_with | callable_agents | Lossless |
| maxTurns | max_turns | Lossless |
| criticalSystemReminder | system field (appended) | Partial (loses compaction resistance) |
| Hooks (canBlock) | — | Lossy (ERROR diagnostic) |
| Hooks (observability) | — | Lossy (INFO diagnostic) |
| Cron/scheduled | — | Lossy (INFO diagnostic) |
| MCP stdio | — | Lossy (WARNING diagnostic) |
| Memory (>8 stores) | — | Partial (budget limit) |

---

## 2. OpenAI Agents SDK / Responses API

**Status**: Agents SDK GA (open-source); Responses API hosted features launched Feb-March 2026
**Repos**: `openai/openai-agents-python` (19K stars), `openai/openai-agents-js`

### Architecture

Two-tier approach separating self-hosted orchestration from hosted execution:

**Agents SDK** (self-hosted): Minimal primitives — `Agent` (LLM + instructions + tools), `Handoff` (agent-to-agent delegation), `Guardrails` (input/output validation). The developer owns the orchestration loop. This is the production successor to the experimental Swarm framework.

**Responses API** (hosted): Adds managed infrastructure — shell tool (full Debian 12 terminal), hosted containers (persistent filesystem, network policy), skills (reusable workflow packages), context compaction (server-side compression for multi-day agents), and tool_search (deferred tool loading for large tool surfaces).

```
Developer Code (Agents SDK)
  └─ Agent definition + orchestration loop
       └─ Responses API (hosted execution)
            ├─ Shell tool (Debian 12: Python, Node, Java, Go, Ruby)
            ├─ Container (persistent FS, network rules)
            ├─ Context compaction (server-side)
            └─ Skills (metadata + instructions + API specs)
```

### Multi-Agent Support

Handoffs enable peer-to-peer agent delegation — Agent A hands control to Agent B with context. No formal supervisor pattern; developers compose their own orchestration using handoffs as the primitive.

**Comparison with Anthropic**: OpenAI's handoff is peer-to-peer (Agent A → Agent B, B takes over). Anthropic's callable_agents is reference-based (Agent A can call B, but A retains control). The handoff model is more flexible for complex workflows but harder to compile to statically.

### Tool/Skill System

Richer than Anthropic's in some dimensions:

| Feature | OpenAI | Anthropic |
|---------|--------|-----------|
| Function tools | Automatic schema from Python annotations + Pydantic | Manual tool definition |
| MCP integration | Native | Native |
| Shell tool | Full Debian 12 terminal | Bash in sandbox |
| Code interpreter | Sandboxed execution | Via tool |
| File search | Vector-based RAG | Not built-in |
| Web search | Built-in | Built-in |
| Skills | Metadata + instructions + API specs + UI assets | SKILL.md + references/ |
| Tool search | Deferred loading at runtime | Not available |

OpenAI's **tool_search** is notable — it allows large tool surfaces (100+ tools) to be loaded on-demand at runtime rather than included in every prompt. This solves a context budget problem that Astro addresses at compile time via L1/L2/L3 progressive disclosure.

### Memory & Context Management

Sessions provide persistent memory within agent loops with multiple storage backends (SQLAlchemy, SQLite, Redis). Server-side **context compaction** via `compact_threshold` — when token count crosses threshold, the server compresses prior steps while preserving critical information. This enables agents to run for hours or days.

**Comparison with Anthropic**: Both have compaction. OpenAI exposes it as a tunable threshold; Anthropic handles it internally in the harness. OpenAI's approach gives developers more control; Anthropic's is simpler but less configurable.

### Hooks & Guardrails

Guardrails run **in parallel** with agent execution and fail fast when checks don't pass. This is architecturally superior to sequential guardrails — the agent doesn't wait for validation to start working, but execution is halted immediately if a guardrail trips. Built-in tracing integrates with OpenAI's evaluation, fine-tuning, and distillation tools.

**Comparison with Anthropic**: OpenAI has a real guardrail system; Anthropic has none in the beta. This is the single biggest functional gap for Anthropic's platform. For Astro compilation, OpenAI would preserve more hook semantics than Anthropic's managed-agents target.

### Pricing

| Resource | Cost |
|----------|------|
| Container session | $0.03/20-minute session |
| File search storage | $0.10/GB/day (first GB free) |
| File search calls | $2.50/1,000 calls |
| Token costs | Model-dependent |
| Platform fee | None |

**Comparison**: Anthropic ($0.08/hr, millisecond billing) is cheaper per hour than OpenAI ($0.09/hr effective at 3x $0.03/20min). However, OpenAI's flat $0.03 minimum is simpler to budget for short sessions. Both are competitive; the cost difference is marginal compared to token costs.

### Strengths

1. **Most mature SDK** — production upgrade of Swarm with 19K+ stars
2. **Parallel guardrails** — architecturally superior to sequential validation
3. **Simple container pricing** — flat $0.03/20min, easy to budget
4. **Context compaction** — tunable, server-side, enables multi-day agents
5. **Tool search** — runtime deferred loading for massive tool surfaces

### Weaknesses

1. **No managed orchestration loop** — developer owns coordination (SDK path)
2. **20-minute billing granularity** — short sessions waste money
3. **Voice agents SDK-only** — not available in Agent Builder
4. **No formal multi-agent supervisor** — handoffs are peer-to-peer only

### Cross-Compilation Potential

If Astro were to add an OpenAI emitter, the mapping would be:

| Astro Concept | OpenAI Concept | Fidelity |
|---------------|---------------|----------|
| CompiledRole | Agent (SDK) | Lossless |
| collaborates_with | Handoff definitions | Partial (different semantics) |
| Hooks (canBlock) | Guardrails | Partial (parallel, not blocking) |
| Skills | Skills (metadata + instructions) | Partial (different format) |
| maxTurns | max_turns (Runner param) | Lossless |

---

## 3. Google Vertex AI Agent Builder / ADK

**Status**: ADK open-source GA; Vertex AI Agent Builder GA; A2A protocol (50+ partners)
**Repo**: `google/adk-python` (Agent Development Kit)

### Architecture

Two complementary layers providing the broadest deployment flexibility:

**Agent Development Kit (ADK)**: Open-source, code-first framework. Three agent types:
- `LlmAgent` — model-powered reasoning agent
- Workflow agents — `SequentialAgent`, `ParallelAgent`, `LoopAgent` (deterministic control flow)
- Custom agents — extend `BaseAgent` for arbitrary logic

**Vertex AI Agent Builder**: Managed platform with Agent Engine (serverless hosting), visual editors, and enterprise features. Handles deployment, scaling, monitoring.

```
ADK (open-source, anywhere)
  ├─ LlmAgent (dynamic, LLM-driven)
  ├─ SequentialAgent → ParallelAgent → LoopAgent (deterministic)
  └─ Runner (orchestration engine, event-driven)

Vertex AI Agent Builder (managed)
  ├─ Agent Engine (serverless hosting)
  ├─ Cloud Run (containerized)
  ├─ GKE (Kubernetes)
  └─ Visual editors + monitoring
```

### Multi-Agent Support

**Best-in-class**. Three dimensions of multi-agent orchestration:

1. **Workflow agents**: `SequentialAgent` (pipeline), `ParallelAgent` (fan-out/fan-in), `LoopAgent` (iterative refinement). These are deterministic — the execution order is explicit, not LLM-decided.

2. **LLM-driven delegation**: Agents can transfer control to sub-agents based on runtime reasoning. Hierarchical nesting with parent-child isolation.

3. **Agent2Agent (A2A) protocol**: Open standard for cross-framework, cross-vendor agent communication. Agents publish capability "agent cards", negotiate interaction modalities (text, forms, audio/video), and exchange messages across platforms. 50+ partners including Salesforce, ServiceNow, UiPath. Native quickstarts in Python, Go, Java.

**Comparison with Anthropic**: Google's A2A protocol is the only cross-vendor agent communication standard with real traction. Anthropic's callable_agents is intra-platform only. For workspaces with mixed-vendor agent ecosystems, Google's approach is strictly more general.

**Comparison with Astro**: Our `collaborates_with` declarations map naturally to both callable_agents (Anthropic) and A2A agent cards (Google). The cross-compilation potential is high.

### Tool/Skill System

| Feature | Google ADK | Anthropic |
|---------|-----------|-----------|
| Function tools | `FunctionTool` wrapper with confirmations | Manual definition |
| Agent-as-tool | `AgentTool` (use other agents as tools) | callable_agents |
| OpenAPI tools | Auto-generated from specs | Not built-in |
| MCP tools | Native integration | Native |
| Code execution | Built-in sandbox | Via tool |
| Authentication | Built-in mechanisms | Environment vars only |
| Long-running ops | Native async support | Not documented |

Google's **AgentTool** concept — wrapping an entire agent as a callable tool — is a powerful abstraction that blurs the line between tools and agents. Astro's role compilation could emit this pattern for Google targets.

### Memory & Context Management

Two-tier persistence:
- **Sessions/State**: Short-term conversational context. `SessionService` manages session lifecycle with `Events` forming conversation history. Session rewind and migration supported.
- **Memory**: Long-term cross-session user recall. Separate from session state.
- **Artifacts**: File/binary data handling (images, PDFs) with session-scoped storage.

### Hooks & Guardrails

Callbacks at agent lifecycle points for checks, logging, behavior modification. **Enhanced Tool Governance** in Vertex AI Agent Builder (recently announced). Google's responsible AI filters apply by default. Comprehensive evaluation framework with criteria-based evaluation, user simulation, environment simulation, and custom metrics.

### Pricing

| Resource | Cost |
|----------|------|
| Agent Engine compute | $0.00994/vCPU-hour + $0.0105/GiB-hour |
| Search queries | $1.50-$4.00/1,000 queries |
| Session events/memories | $0.25/1,000 |
| Data storage | ~$1.00/GB/month |
| Token costs | Gemini model-dependent |
| Free tier | 10,000 queries/month for many configs |

Pricing is the most complex of all platforms — multiple billing dimensions make cost prediction difficult.

### Strengths

1. **A2A protocol** — only cross-vendor agent communication standard with 50+ partners
2. **Most deployment flexibility** — Agent Engine, Cloud Run, GKE, local, any cloud
3. **Deterministic workflow agents** — Sequential, Parallel, Loop for explicit control
4. **Self-hosted + managed** — ADK works anywhere, Agent Builder adds managed features
5. **Agent-as-tool** — elegant composition primitive

### Weaknesses

1. **Gemini-optimized** — other models via `BaseLlm` interface but less polished
2. **Pricing complexity** — compute + memory + storage + queries + tokens
3. **Visual editor limitations** — less flexible than code-first ADK
4. **A2A still maturing** — protocol is growing but not yet universal

### Cross-Compilation Potential

If Astro were to add a Google ADK emitter, the mapping would be:

| Astro Concept | Google Concept | Fidelity |
|---------------|---------------|----------|
| CompiledRole | LlmAgent | Lossless |
| collaborates_with | Sub-agents + AgentTool | Partial (agent-as-tool ≠ peer reference) |
| Hooks | Callbacks | Partial (different model) |
| Skills | Not directly equivalent | Lossy |
| maxTurns | Not built-in | Lossy |
| Workflow IR | SequentialAgent/ParallelAgent | High potential |

---

## 4. AWS Bedrock Agents

**Status**: GA (multi-agent collaboration now GA)

### Architecture

Fully managed serverless. Agents are defined by four components:

```
Foundation Model (reasoning engine)
  + Instructions (natural language)
  + Action Groups (OpenAPI schema → Lambda function)
  + Knowledge Bases (managed RAG: chunk → embed → vector store)
```

Runtime process: Pre-processing (validate/categorize) → Orchestration loop (rationale → action prediction → invocation → observation → loop decision) → Post-processing (format response). The orchestration loop is fully managed by AWS.

Four customizable prompt templates: pre-processing, orchestration, knowledge base response, post-processing. This is the closest any competitor gets to "compilation" — prompt templates shape how the agent reasons. But they're static templates, not optimized through a compilation pipeline.

### Multi-Agent Support

**Supervisor-collaborator model**: A supervisor agent breaks down tasks, creates execution plans, and routes to specialized collaborator agents. Each collaborator has its own tools, action groups, knowledge bases, and guardrails. The supervisor coordinates and synthesizes results.

**Comparison with Anthropic**: AWS's supervisor pattern is more structured than Anthropic's callable_agents. The supervisor explicitly decomposes and routes; callable_agents allows peer-to-peer invocation. AWS's model is more predictable; Anthropic's is more flexible.

### Hooks & Guardrails

**Best-in-class guardrails** — six safeguard policies:

| Policy | Function |
|--------|----------|
| Content moderation | Filter harmful content by category |
| Prompt attack detection | Detect prompt injection attempts |
| Topic classification | Block off-topic conversations |
| PII redaction | Detect and redact personally identifiable information |
| Hallucination detection | Ground-truth validation |
| **Policy guardrails** (Cedar) | Intercept every tool call in real-time via Cedar policy language |

**Cedar policy guardrails** (launched December 2025) are the standout feature. They intercept every tool call in real-time, applying fine-grained authorization policies. This is the closest any platform comes to Astro's `canBlock` hook semantics.

**Comparison with Anthropic**: AWS has the guardrail system that Anthropic lacks. For workspaces with security hooks, Bedrock preserves more enforcement semantics. However, Cedar policies are AWS-specific — they don't translate to other platforms.

### Pricing

| Resource | Cost |
|----------|------|
| Agent invocation | **Free** (no per-invocation charge) |
| Model token costs | Standard Bedrock FM pricing |
| Lambda execution | $0.20/1M requests + compute |
| Guardrails | $0.15/1,000 text units |
| Knowledge base queries | Retrieval costs |

**Warning**: A single user query can consume 5-10x estimated tokens due to internal reasoning chains. The "free invocation" headline is misleading — token costs are the real expense and they're multiplied by the agent's internal thinking.

### Strengths

1. **Strongest guardrails** — 6 policy types including Cedar real-time tool interception
2. **Free agent invocation** — no per-call charge
3. **Managed RAG** — knowledge bases with automatic chunking and embedding
4. **Enterprise AWS integration** — IAM, VPC, CloudWatch, Lambda

### Weaknesses

1. **AWS lock-in** — Lambda functions, IAM policies, CloudFormation required
2. **Hidden token costs** — 5-10x multiplier from internal reasoning chains
3. **No self-hosted option** — fully AWS-managed
4. **OpenAPI-only actions** — no inline execution, every tool needs a Lambda
5. **No code-first agent definition** — console or CloudFormation, not SDK-first

### Cross-Compilation Potential

Bedrock would require the most lossy compilation:

| Astro Concept | Bedrock Concept | Fidelity |
|---------------|----------------|----------|
| CompiledRole | Agent (console/CFN) | Partial (different definition model) |
| collaborates_with | Supervisor-collaborator | Partial (different orchestration) |
| Hooks (canBlock) | Cedar guardrails | Partial (platform-specific) |
| Skills | Action groups | Lossy (OpenAPI + Lambda required) |
| MCP servers | Not supported | Lossy |

---

## 5. Microsoft Agent Framework

**Status**: Version 1.0 GA (April 2026)
**Languages**: .NET (primary), Python
**Predecessor**: Unifies AutoGen + Semantic Kernel (both now in maintenance mode)

### Architecture

Two capability categories:

**Agents**: Individual LLM-powered workers with tools, MCP servers, and model clients. Support multiple providers: Microsoft Foundry, Anthropic, Azure OpenAI, OpenAI, Ollama.

**Workflows**: Graph-based multi-step orchestration with type-safe routing, checkpointing, and human-in-the-loop. Explicit control flow: branching, fan-out, convergence, pause/resume.

```
Agent Framework
  ├─ Agents (model + tools + MCP + middleware)
  │    ├─ Microsoft Foundry provider
  │    ├─ Anthropic provider
  │    ├─ Azure OpenAI provider
  │    └─ Ollama provider (local)
  └─ Workflows (graph-based orchestration)
       ├─ Type-safe state routing
       ├─ Checkpointing + resume
       └─ Human-in-the-loop gates
```

### Multi-Agent Support

Five named orchestration patterns from Microsoft Research:

| Pattern | Description | Astro Equivalent |
|---------|-------------|-----------------|
| Sequential | Pipeline: A → B → C | Wave pulse sequence |
| Concurrent | Fan-out: A → [B, C, D] → merge | Parallel pulse agents |
| Handoff | Peer delegation: A → B (B takes over) | Not directly mapped |
| Group chat | Multi-agent conversation with moderator | Review panel |
| Magentic-One | Autonomous team with specialized roles | Wave with governing roles |

The **Magentic-One** pattern is particularly relevant — it describes an autonomous team of specialized agents that self-organize around a task, which maps closely to Astro's wave execution model with governing role lenses.

### Hooks & Guardrails

The **middleware pipeline** is the primary extensibility point — it intercepts at every execution stage. Content safety, logging, compliance, and custom logic plug in without modifying prompts. No built-in guardrail library (unlike AWS Bedrock), but middleware makes guardrails composable.

**Comparison with Astro hooks**: The middleware pipeline is architecturally closer to Astro's hook system than any other platform. Both intercept at lifecycle points; both support blocking and observability modes. A Microsoft Agent Framework emitter could preserve more hook semantics than the Anthropic managed-agents target.

### Pricing

**No charge** for Microsoft Foundry Agent Service itself. Pay only for underlying models and tools consumed. Pre-purchase option via Agent Commit Units (ACUs) for volume discounts.

This is the most cost-effective hosted option for organizations already in the Azure ecosystem.

### Strengths

1. **Most orchestration patterns** — 5 named patterns covering all common topologies
2. **Free platform cost** — pay only for models and tools
3. **Multi-provider support** — Anthropic, OpenAI, Azure, Ollama from one framework
4. **Middleware pipeline** — closest to Astro's hook system
5. **Enterprise Azure integration** — VS Code Extension, Foundry, Durable Functions

### Weaknesses

1. **Migration required** — AutoGen and Semantic Kernel are now maintenance-mode
2. **.NET-first** — Python support present but ecosystem thinner
3. **Azure dependency for hosting** — Foundry requires Azure account
4. **Graph workflow learning curve** — complex orchestration requires expertise

---

## 6. LangChain / LangGraph Cloud

**Status**: LangGraph Platform GA (rebranded to "LangSmith Deployment" Oct 2025)
**Repo**: `langchain-ai/langgraph` (8K+ stars)

### Architecture

Graph-based execution engine:

- **Nodes**: Computation steps (LLM calls, tool execution, data transforms, routing)
- **Edges**: Standard (fixed), conditional (dynamic), cyclic (loops)
- **State**: Shared dictionary flowing through the graph, read/updated by each node

Three API primitives: **assistants** (configurations), **threads** (state persistence), **runs** (workload execution). Durable execution with built-in persistence.

### Multi-Agent Support

Multi-agent via graph composition: specialized sub-agents as nodes, conditional routing between them, supervisor patterns via conditional edges. Agent loops via cyclic edges (route back to LLM after tool execution). Human-in-the-loop via graph pause/resume.

**Comparison**: LangGraph offers the most explicit control over execution flow — every routing decision is visible in the graph. Other platforms use implicit orchestration (LLM decides routing). The tradeoff is complexity: LangGraph requires the developer to specify the complete execution graph.

### Memory & Context Management

**Checkpointing** is the core persistence system. After each node execution, complete graph state is saved. This enables:
- Conversation memory across sessions
- Time-travel debugging (inspect/replay from any checkpoint)
- Fault tolerance (resume from last checkpoint)
- Human-in-the-loop (pause at any node, review, continue)

Thread-based conversation persistence across runs.

### Deployment Model

Most flexible deployment options:

| Option | Description | Cost |
|--------|-------------|------|
| Cloud | Fully managed, push from git | Dev: $0.005/run; Prod: $0.0036/min |
| Hybrid | Runs in your cloud, LangSmith control plane | Custom |
| Self-Hosted | Fully self-managed | Free (Lite: up to 1M nodes) |

### Pricing

| Resource | Cost |
|----------|------|
| Developer (free) | 1 seat, 5,000 traces/month, 50 Fleet runs |
| Plus | $39/seat/month, 10,000 traces, 500 Fleet runs |
| Enterprise | Custom, hybrid/self-hosted, SSO/RBAC |
| Dev deployments | $0.005/run + $0.0007/min |
| Production deployments | $0.0036/min |
| Base traces | $2.50/1,000 (14-day retention) |
| Extended traces | $5.00/1,000 (400-day retention) |

Pricing is the most complex of all platforms — seats + traces + deployment minutes + runs.

### Strengths

1. **Most explicit control** — graph model makes all routing visible
2. **Best observability** — LangSmith tracing and time-travel debugging
3. **Self-hosted option** — Lite tier is free up to 1M nodes
4. **Model-agnostic** — works with any LLM provider
5. **Checkpoint persistence** — fault-tolerant, resumable execution

### Weaknesses

1. **Steep learning curve** — graph-based model requires expertise
2. **Pricing complexity** — multiple billing dimensions
3. **No hosted tool execution** — unlike Anthropic/OpenAI containers
4. **Python-first** — TypeScript has reached parity but thinner ecosystem

---

## 7. CrewAI

**Status**: v1.10.1 (45,900+ GitHub stars, 12M+ daily agent executions)
**Language**: Python only

### Architecture

Two complementary patterns:

**Crews**: Teams of role-playing autonomous AI agents collaborating on tasks. Each agent has a specific role, expertise, and backstory. The mental model is explicitly anthropomorphic — agents are described as team members with specializations.

**Flows**: Thin code layer with decorators, state management, and programmatic control over execution order. Added later to complement the declarative Crews model with imperative control flow.

```python
@CrewBase
class ResearchCrew:
    agents_config = 'config/agents.yaml'
    tasks_config = 'config/tasks.yaml'

    @agent
    def researcher(self) -> Agent:
        return Agent(config=self.agents_config['researcher'])

    @task
    def research_task(self) -> Task:
        return Task(config=self.tasks_config['research'])

    @crew
    def crew(self) -> Crew:
        return Crew(agents=[self.researcher], tasks=[self.research_task])
```

### Multi-Agent Support

Role-based collaboration is the core value proposition. Supports:
- Task delegation between agents
- Sequential and parallel task execution
- Hierarchical process models (manager agent delegates to workers)
- MCP and A2A protocol support (native)

**Comparison with Astro**: CrewAI's role-based model is the closest to Astro's compiled roles. Both define agents by specialization, tools, and collaboration patterns. The main difference: CrewAI roles are Python classes; Astro roles are compiled from workspace-level declarations.

### Pricing

| Tier | Cost | Executions | Crews | Seats |
|------|------|-----------|-------|-------|
| Free | $0 | 50/month | 1 | 1 |
| Professional | $25/month | 100/month | - | 2 |
| Enterprise | $60,000/year | 10,000/month | 50 | Unlimited |
| Ultra | $120,000/year | 30,000/month | - | Unlimited |

**Warning**: Hard execution quotas per tier with no overage billing. Enterprise pricing ($60K-$120K/year) is steep compared to usage-based alternatives.

### Strengths

1. **Simplest mental model** — role-based agents with human-like specializations
2. **Proven scale** — 12M daily executions in production
3. **MCP + A2A native** — cross-platform interoperability
4. **Low learning curve** — YAML config + Python decorators

### Weaknesses

1. **Python-only** — no TypeScript/JavaScript
2. **Hard execution quotas** — no overage, must upgrade tier
3. **Expensive enterprise** — $60K-$120K/year
4. **Less granular control** — compared to LangGraph's explicit graph model
5. **No hosted tool execution** — tools run in your infrastructure

---

## Cross-Platform Comparative Analysis

### Architecture Models Compared

The seven platforms represent three distinct architectural philosophies:

**1. Managed Runtime** (Anthropic, AWS): The platform owns the agent execution loop. You define the agent; the platform runs it. Simplest developer experience but least control.

**2. SDK + Hosted Infrastructure** (OpenAI, Google, Microsoft): You write the orchestration code using the SDK; the platform provides hosted execution environments (containers, serverless). Maximum flexibility but requires more code.

**3. Framework + Optional Hosting** (LangGraph, CrewAI): Open-source framework runs anywhere; optional managed hosting for production. Most portable but requires operational expertise for self-hosting.

| Philosophy | Platforms | Astro Emitter Complexity |
|------------|-----------|------------------------|
| Managed Runtime | Anthropic, AWS | Low (emit config, platform runs it) |
| SDK + Hosted | OpenAI, Google, Microsoft | Medium (emit code + config) |
| Framework + Hosting | LangGraph, CrewAI | High (emit framework-specific code) |

**Astro's position**: The managed-agents emitter targets the simplest emitter complexity (emit YAML config, platform runs it). Future emitters for OpenAI or Google would need to emit runnable code, not just configuration.

### Multi-Agent Orchestration Compared

| Pattern | Anthropic | OpenAI | Google | AWS | Microsoft | LangGraph | CrewAI |
|---------|-----------|--------|--------|-----|-----------|-----------|--------|
| Peer-to-peer | callable_agents | Handoffs | Transfer | — | Handoff | Graph edges | Delegation |
| Supervisor | Preview | — | LlmAgent hierarchy | Supervisor-collab | Group chat | Conditional edges | Hierarchical |
| Sequential | — | — | SequentialAgent | — | Sequential | Standard edges | Sequential process |
| Parallel | — | — | ParallelAgent | — | Concurrent | Fan-out nodes | Parallel process |
| Loop | — | — | LoopAgent | — | — | Cyclic edges | — |

**Key observation**: Google ADK and Microsoft Agent Framework have the richest multi-agent primitives. Anthropic has the simplest (callable_agents only in GA). For Astro, this means the managed-agents emitter produces the simplest multi-agent output, while future Google/Microsoft emitters could preserve more orchestration semantics from the workspace IR.

### Guardrail Systems Compared

| Feature | Anthropic | OpenAI | Google | AWS | Microsoft | LangGraph | CrewAI |
|---------|-----------|--------|--------|-----|-----------|-----------|--------|
| Input validation | — | Parallel guardrails | Callbacks | Content mod + prompt attack | Middleware | Graph nodes | Events |
| Output validation | — | Parallel guardrails | Callbacks | Hallucination detection | Middleware | Graph nodes | Events |
| Tool interception | — | — | Tool governance | **Cedar policies** | Middleware | — | SSRF protection |
| PII handling | — | — | — | PII redaction | — | — | — |
| Real-time enforcement | — | — | — | **Every tool call** | Every stage | — | — |
| Custom policies | — | Via code | Via code | **Cedar language** | Via code | Via code | Via code |

**Key observation**: AWS Bedrock has the strongest guardrail story. Anthropic has the weakest (none in beta). This makes the managed-agents emitter the **most lossy target for hook-heavy workspaces**. The loss matrix must clearly communicate this: security hooks emit ERROR diagnostics, not silent omission.

### Pricing Compared (Normalized to 1 Hour of Agent Execution)

Assuming a single agent session running for 1 hour with ~100K tokens consumed:

| Platform | Session Cost | Token Cost (est.) | Total |
|----------|-------------|-------------------|-------|
| Anthropic (Sonnet) | $0.08 | $0.45 | ~$0.53 |
| OpenAI (GPT-4o) | $0.09 (3x $0.03/20min) | $0.38 | ~$0.47 |
| Google (Gemini Pro) | ~$0.02 | $0.11 | ~$0.13 |
| AWS (Claude on Bedrock) | $0.00 | $0.45+ (5x multiplier) | ~$2.25 |
| Microsoft (Foundry) | $0.00 | Model-dependent | Model cost only |
| LangGraph (Plus) | ~$0.22 | Model-dependent | $0.22 + model |
| CrewAI (Enterprise) | ~$0.17/exec | Model-dependent | $0.17 + model |

**Key observation**: Google is cheapest for pure execution cost. AWS is most expensive due to hidden token multipliers from internal reasoning chains. Anthropic and OpenAI are competitive at similar price points. Microsoft Foundry is free for the platform — you pay only model costs.

### Self-Hosted vs Cloud-Only

| Platform | Self-Hosted | Cloud-Only | Hybrid |
|----------|:-----------:|:----------:|:------:|
| Anthropic | — | Full | — |
| OpenAI | SDK only | Containers | — |
| Google | ADK anywhere | Agent Builder | ADK + Cloud Run |
| AWS | — | Full | — |
| Microsoft | Framework | Foundry | Framework + Azure |
| LangGraph | Full (Lite free) | Cloud | LangSmith control plane |
| CrewAI | Framework | AMP | On-prem AMP |

**Key observation for Astro**: The managed-agents emitter targets a cloud-only platform. Organizations requiring self-hosted deployment cannot use this target. Astro's local `.claude/` workspace format remains the universal self-hosted option. The cross-compilation story is: develop locally, deploy to managed-agents (or any other target) via compilation.

---

## Implications for Astro's Managed-Agents Emitter

### What the Landscape Confirms

1. **YAML/config-based agent definition is the norm**. Every platform defines agents via structured configuration (YAML, JSON, Python decorators, console wizards). Astro's emitter producing agent YAML is the right output format — it matches how the platform expects to receive definitions.

2. **No other tool compiles agent workspaces**. All seven platforms treat agent definition as a one-shot configuration task. No platform has a compilation pipeline that optimizes, validates, or cross-compiles workspace definitions. Astro is architecturally unique. The managed-agents emitter doesn't just translate — it optimizes (context budget enforcement, deduplication, progressive disclosure) before emitting.

3. **Hook/guardrail loss is the primary fidelity gap**. Anthropic's Managed Agents has no guardrail API. The loss matrix must prominently flag this. AWS Bedrock has the strongest guardrail story — if hook preservation is critical, Bedrock is a better target (though more lossy in other dimensions).

4. **Skills are a competitive advantage**. Anthropic's progressive disclosure (L1/L2/L3) is unique. OpenAI has skills but without loading tiers. Google, AWS, Microsoft, LangGraph, and CrewAI have no equivalent. The managed-agents emitter's skill zip packaging preserves Astro's FLASH compilation — this is a **lossless** path that no other target achieves as cleanly.

5. **Multi-agent is still immature everywhere**. No platform has a complete multi-agent story. Google is closest (A2A + workflow agents). Anthropic's callable_agents is the simplest primitive. The emitter should focus on correctness of the basic callable_agents mapping and not over-invest in complex orchestration patterns that the platform can't execute.

### What the Landscape Suggests for Future Work

1. **OpenAI emitter would preserve more hooks**. OpenAI's parallel guardrails can express some of Astro's hook semantics that Anthropic's managed-agents target loses entirely. Priority: medium (when demand exists).

2. **Google ADK emitter would preserve more orchestration**. Google's SequentialAgent/ParallelAgent/LoopAgent could compile from Astro's workflow IR more faithfully than any other target. Priority: medium-high (A2A momentum).

3. **Microsoft Agent Framework emitter maps best to Astro's architecture**. The middleware pipeline, multi-provider support, and named orchestration patterns are architecturally closest to what Astro produces. Priority: medium (enterprise demand).

4. **AWS Bedrock emitter would preserve the most security semantics**. Cedar policy guardrails can express `canBlock` enforcement. But the emitter complexity is high (CloudFormation, Lambda wiring). Priority: low (heavy platform coupling).

5. **LangGraph/CrewAI emitters would require code generation, not config emission**. Both are framework-based — the emitter would need to produce runnable Python code, not YAML configuration. This is a fundamentally different emitter architecture. Priority: low (niche demand).

### Loss Matrix Cross-Reference

| Feature | Anthropic MA | OpenAI | Google | AWS | Microsoft | LangGraph | CrewAI |
|---------|:----------:|:------:|:------:|:---:|:---------:|:---------:|:------:|
| Roles → Agents | Lossless | Lossless | Lossless | Partial | Lossless | Lossless | Lossless |
| collaborates_with | Lossless | Partial | Partial | Partial | Lossless | Lossless | Partial |
| Skills | Lossless | Partial | Lossy | Lossy | Lossy | Lossy | Lossy |
| maxTurns | Lossless | Lossless | Lossy | Lossy | Partial | Lossy | Lossy |
| criticalSystemReminder | Partial | N/A | N/A | N/A | N/A | N/A | N/A |
| Hooks (canBlock) | Lossy | Partial | Partial | Partial | Partial | Lossy | Lossy |
| Hooks (observability) | Lossy | Partial | Partial | Lossy | Partial | Lossy | Lossy |
| Cron/scheduled | Lossy | Lossy | Lossy | Lossy | Lossy | Lossy | Lossy |
| MCP stdio | Lossy | Lossy | Lossy | Lossy | Partial | Lossy | Lossy |
| Memory (unlimited) | Partial | Partial | Partial | Partial | Partial | Partial | Lossy |

**Note**: The Anthropic MA column is grounded in scenario FINDINGS and the emitter guide. All other columns are **projected fidelity** based on platform capability analysis — no emitter implementation or tests exist for those targets. Projected cells may shift when emitters are built.

**Key insight**: Anthropic Managed Agents is the best target for **skill-heavy, role-based workspaces** (lossless skills, lossless roles, lossless collaboration). It is the worst target for **hook-heavy, security-critical workspaces** (no guardrail API). The emitter's loss matrix and decision guide should make this tradeoff explicit.

---

## Conclusion

The managed agent landscape in April 2026 is fragmented across seven major platforms, each with distinct strengths. No platform dominates all dimensions. Anthropic's Managed Agents excels at infrastructure abstraction and skill management but lags on guardrails and multi-agent orchestration. OpenAI offers the most mature SDK. Google has the broadest multi-agent story. AWS has the strongest security posture. Microsoft offers the best enterprise integration. LangGraph provides the most control. CrewAI has the simplest mental model.

For Astro, this fragmentation is an **opportunity, not a problem**. The compiler's cross-compilation architecture (Spec 73, Spec 108) means workspaces are authored once and compiled to the best target for each deployment scenario. The managed-agents emitter (F1-F6) is the first hosted-platform target, but the loss matrix framework (Spec 108) and the emitter architecture are designed to scale to additional targets as demand materializes.

The managed-agents emitter should focus on what Anthropic's platform does best: lossless role-to-agent mapping, lossless skill packaging, and clear diagnostic communication for lossy features. The decision guide should steer users toward the right target based on their workspace characteristics — not push managed-agents as the universal answer.

---

## Sources

| Source | Date | Key Takeaway |
|--------|------|-------------|
| [Anthropic Managed Agents Overview](https://platform.claude.com/docs/en/managed-agents/overview) | 2026-04 | Brain/Hands/Session architecture, public beta |
| [Anthropic Engineering: Scaling Managed Agents](https://www.anthropic.com/engineering/managed-agents) | 2026-04 | 60% p50 TTFT improvement, crash recovery via session replay |
| [Anthropic Agent Skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview) | 2026-04 | L1/L2/L3 progressive disclosure, Skills API |
| [Anthropic Pricing](https://www.anthropic.com/pricing) | 2026-04 | $0.08/session-hour, no platform fee |
| [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) | 2026-03 | Agent/Handoff/Guardrails primitives, Swarm successor |
| [OpenAI Responses API](https://developers.openai.com/api/docs/guides/agents) | 2026-03 | Shell tool, containers, skills, context compaction |
| [OpenAI Pricing](https://developers.openai.com/api/docs/pricing) | 2026-04 | $0.03/20min container sessions |
| [Google ADK](https://adk.dev/get-started/about/) | 2026-04 | Sequential/Parallel/Loop agents, Runner orchestration |
| [Google A2A Protocol](https://google.github.io/adk-docs/a2a/) | 2026-04 | 50+ partners, cross-vendor agent communication |
| [Vertex AI Agent Builder Pricing](https://cloud.google.com/products/agent-builder) | 2026-04 | vCPU-hour + query-based pricing |
| [AWS Bedrock Agents](https://aws.amazon.com/bedrock/agents/) | 2026-04 | Supervisor-collaborator, free invocation |
| [AWS Bedrock Guardrails](https://aws.amazon.com/bedrock/guardrails/) | 2026-04 | Cedar policies, 6 safeguard types |
| [Microsoft Agent Framework 1.0](https://devblogs.microsoft.com/agent-framework/microsoft-agent-framework-version-1-0/) | 2026-04 | 5 patterns, middleware pipeline, multi-provider |
| [Foundry Agent Service Pricing](https://azure.microsoft.com/en-us/pricing/details/foundry-agent-service/) | 2026-04 | Free platform, ACU pre-purchase |
| [LangGraph Platform GA](https://blog.langchain.com/langgraph-platform-ga/) | 2025-10 | Graph execution, checkpointing, Self-Hosted Lite |
| [LangGraph Pricing](https://www.langchain.com/pricing-langgraph-platform) | 2026-04 | Seats + traces + deployment minutes |
| [CrewAI Documentation](https://docs.crewai.com/) | 2026-04 | 45K stars, 12M daily executions, Crews + Flows |
| [CrewAI Pricing](https://crewai.com/pricing) | 2026-04 | Hard execution quotas, $60K-$120K enterprise |
| [Claude Managed Agents Analysis](https://www.lowcode.agency/blog/claude-managed-agents) | 2026-04 | Third-party deep dive, architecture analysis |

---

## Appendix A: Platform Feature Matrix (Detailed)

| Feature | Anthropic | OpenAI | Google | AWS | Microsoft | LangGraph | CrewAI |
|---------|-----------|--------|--------|-----|-----------|-----------|--------|
| Agent definition format | YAML | Python/TS | Python | Console/CFN | .NET/Python | Python/TS | Python/YAML |
| Max agents per session | Undocumented | Unlimited (SDK) | Unlimited | 5 collaborators | Unlimited | Unlimited | Unlimited |
| Tool execution | Managed sandbox | Managed container | Agent Engine | Lambda | Foundry/local | Self-managed | Self-managed |
| MCP support | Native | Native | Native | — | Native (hosted) | — | Native |
| A2A support | — | — | Native | — | — | — | Native |
| Streaming | SSE events | SSE events | Events | WebSocket | Streaming | Streaming | — |
| Human-in-the-loop | Events | SDK callback | Graph pause | Return control | Workflow gates | Graph pause | HITL hooks |
| Context window management | Harness compaction | Server compaction | Session service | Managed | Session state | Checkpointing | Sliding window |
| Skill/plugin system | Skills API (L1/L2/L3) | Skills | — | Knowledge bases | MCP servers | — | — |
| CLI tool | `ant` (Go) | `openai` (Python/TS) | `gcloud` | `aws` | `az` | `langgraph` | `crewai` |
| Min language | Any (REST API) | Python or TS | Python | Any (REST/SDK) | .NET or Python | Python or TS | Python |
| Open source | No | SDK only | ADK (full) | No | Framework (full) | Full | Full |
| SOC2/compliance | Enterprise | Enterprise | Google Cloud | AWS compliance | Azure compliance | Enterprise tier | Enterprise tier |

## Appendix B: Astro Cross-Compilation Target Prioritization

Based on this analysis, recommended emitter priority for future Astro targets:

| Priority | Target | Rationale | Emitter Type |
|----------|--------|-----------|-------------|
| **1 (Active)** | Anthropic Managed Agents | Concordia F1-F6, public beta, lossless skills | Config (YAML) |
| **2** | Google ADK | A2A momentum, workflow agent mapping, self-hosted | Code (Python) |
| **3** | Microsoft Agent Framework | Enterprise demand, middleware ≈ hooks, multi-provider | Code (.NET/Python) |
| **4** | OpenAI Agents SDK | Guardrail preservation, mature SDK, large community | Code (Python/TS) |
| **5** | AWS Bedrock | Cedar guardrails for security-critical workspaces | Config (CFN/JSON) |
| **6** | LangGraph | Niche demand, explicit graph control | Code (Python) |
| **7** | CrewAI | Niche demand, Python-only, role-based overlap | Code (Python) |

Note: Priorities 2-7 are speculative. Actual prioritization should be driven by user demand and workspace characteristics analysis.
