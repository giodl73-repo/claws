# Three-Engine Model

<!-- atom:three-engine-model (C06) -->

Governance has a cost problem. Every governance instruction injected into the system prompt burns tokens. Tokens cost money and consume context window. If governance doubles the prompt, you halve the agent's working memory. claws solves this with three engines that divide the work across different resource budgets.

## The three engines

```
PRESS                        Context DAG                    Plugin
(prompt compression)         (structural sharing)           (zero-token enforcement)
     |                            |                              |
     v                            v                              v
L1: SKILL.md                Compile-time assembly          L2-L4: Gateway hooks
Token budget: reduced       Token budget: reduced          Token budget: ZERO
When: prompt build          When: compilation              When: every tool call
```

Each engine operates on a different resource: PRESS compresses text, the Context DAG eliminates duplication, and the Plugin enforces rules without consuming any tokens at all.

## Engine 1: PRESS (prompt compression)

PRESS is the token optimizer. It takes verbose governance prose and compresses it into terse, model-readable directives that fit within the token budget of L1 advisory skills.

**What it does**: Transforms natural-language governance rules (from SOUL.md, claws.json) into PRESS-compressed instructions for the SKILL.md advisory prompt. Verbose policies like "Under no circumstances should the agent access production databases or execute commands that modify production state" become compressed directives the model can still follow.

**Where it runs**: At compile time, during EMIT (Phase 5). The PRESS output is baked into `skills/claws-governance/SKILL.md`.

**Token impact**: Reduced. PRESS minimizes the token cost of advisory governance but cannot eliminate it -- L1 is inherently prompt-based.

**Craftworks lineage**: PRESS was built for the astro compiler's token optimization (see CL-04 PRESS-to-pinch mapping). claws reuses 5 of 7 PRESS modules with type-parametric interfaces, adding governance-specific `pinch` profiles (soc2, hipaa, minimal) for policy-aware compression. Policy expressions in claws.json use RELAX (Spec 139) tiered bindings for compile-time type checking; RELAX evaluates at compile time only -- the runtime receives pre-compiled rule tables, not RELAX expressions.

## Engine 2: Context DAG (structural sharing)

The Context DAG eliminates duplicated governance context across multi-agent sessions. When 4 subagents share the same tool policy, the DAG stores it once and references it structurally.

**What it does**: During compilation, the Context DAG identifies shared governance subgraphs -- policy fragments that repeat across agents in a delegation tree. Instead of embedding the same rules in every agent's context, it builds a shared structure that feeds into L1 prompt assembly.

**Where it runs**: At compile time, during ANALYZE and OPTIMIZE (Phases 3-4). The shared structure informs how SKILL.md content is organized.

**Token impact**: Reduced. By deduplicating policy fragments across agents, the total governance token overhead for multi-agent sessions drops. A 5-agent delegation tree with identical R5 policies pays the token cost once, not five times.

**Why it matters for multi-agent**: OC workspaces increasingly use delegation (AGENTS.md). Without structural sharing, governance context grows linearly with agent count. The Context DAG keeps it sublinear.

## Engine 3: Plugin (zero-token enforcement)

This is the key insight: **L2 and L4 enforcement consumes zero tokens.** L3 enforcement hooks are also zero-token, with one caveat: the `before_prompt_build` hook CAN inject advisory governance context into the prompt for context assembly purposes, which does consume tokens. However, this injection is compile-time optimized by the Context DAG engine to minimize duplication, and all enforcement decisions (block/allow/approve) are zero-token.

**What it does**: The governance plugin intercepts tool calls at the Gateway level via `before_tool_call` and lifecycle hooks. It classifies tools, checks budgets, enforces elicitation gates, validates A2A delegation, filters inputs, and audits outputs. All of this happens in TypeScript, in the Gateway process, before the LLM ever sees the tool call.

**Where it runs**: At runtime, inside the OC Gateway. The plugin can register handlers on any of the 28 available lifecycle hooks (as of OC v2.x). In practice, it registers on a subset determined by the compiled governance rules. The primary hook is `before_tool_call`, which evaluates every tool invocation against compiled governance rules.

**Token impact**: Zero for enforcement hooks (L2 `before_tool_call`, L4 exec-approvals). L3's `before_prompt_build` hook may inject governance context into the prompt for advisory purposes, consuming a small number of tokens. All enforcement decisions (block, allow, require approval) are zero-token.

**Latency impact**: 50ms budget per `before_tool_call` evaluation. Pre-allocated lookup tables, no dynamic allocation during evaluation, async-only I/O. If evaluation exceeds 50ms, the handler aborts and applies fail-mode by risk level.

## How they work together

```
Compile time                                    Runtime
+------------------+                           +------------------+
|                  |                           |                  |
| Context DAG      |    shared subgraphs       | Plugin           |
| (deduplication)  |--.                        | (enforcement)    |
|                  |  |                        |                  |
+------------------+  |                        | before_tool_call |
                      v                        | lifecycle hooks  |
+------------------+                           | exec-approvals   |
|                  |    compressed prompt       |                  |
| PRESS            |--------------------------->| SKILL.md (L1)    |
| (compression)    |                           |                  |
|                  |                           +------------------+
+------------------+                             Token cost: ZERO
  Token cost: reduced                            (except L1 advisory)
```

1. The Context DAG identifies shared governance fragments at compile time
2. PRESS compresses the advisory prompt for the L1 SKILL.md
3. The Plugin enforces rules at runtime with zero token overhead

The division means governance overhead is primarily compute (hook evaluation latency), not token budget. For most deployments, the L1 advisory SKILL.md is the only token cost -- and PRESS minimizes that.

## Why enforcement costs zero tokens

In most governance systems, enforcement is done by injecting rules into the system prompt and hoping the model follows them. This is fragile (models ignore instructions) and expensive (rules consume tokens).

claws takes a different approach. The Gateway plugin sits between the model and the tools. When the model decides to call `send-email`, the Gateway's `before_tool_call` hook fires. The governance plugin evaluates the call against compiled rules -- tool classification, budget check, OBO elicitation, A2A delegation validation. If the call fails governance, it returns `{ block: true }` and the model never executes the tool.

The model does not need to know the governance rules to be governed by them. The plugin is the bouncer at the door, not a sign on the wall.

## For the gateway-eng

The Plugin engine is the one that runs in your process. It has a 50ms latency budget per hook, pre-allocated lookup tables, and fail-mode semantics that ensure the Gateway never crashes from governance. If the plugin throws, R1-R2 tools are configurable (default: fail-open, don't break reads), R3-R4 are configurable (default: fail-closed), and R5 always fails closed. Governance is a guest in the Gateway, not the owner.

## For the founder

The three-engine model means governance does not make agents slower or more expensive for the 98.4% of skills that need only basic classification. L1 advisory adds a small PRESS-compressed prompt. L2-L4 enforcement is invisible to token budgets. The user's agent does not get stupider because governance was added.
