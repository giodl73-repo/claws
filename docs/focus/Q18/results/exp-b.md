# exp-b: Governed Context Assembly + Composition Patterns

**Question**: Q12r -- How does claws map to OC Gateway runtime contracts?
**Experiment**: Design how governance rules constrain context assembly and which composition patterns OC workflows need for governed multi-step execution.
**Method**: Design analysis (read context assembly atoms, composition patterns, GovernanceManager, WorkAgentSupervisor)
**Date**: 2026-04-11
**Result**: 4-layer governed context assembly model, 6 composition patterns mapped to OC workflows, governance injection points per pattern.

---

## Part 1: Governed Context Assembly

### The Problem

Context assembly (atom:context-assembly, A152) constructs the prompt that an agent sees.
In ungoverned platforms, context is assembled from memories + skills + tools + conversation.
Nothing prevents tool output from being treated as instructions, memory entries from
containing injected commands, or sensitive data from reaching unauthorized agents.

The G-CONTEXT rules from Q12h define what governance requires:

| Rule | What it requires |
|------|-----------------|
| G-CONTEXT-1 | Boundary markers between context sections |
| G-CONTEXT-2 | Tool output isolation (data, not instructions) |
| G-CONTEXT-3 | Memory isolation (data, not instructions) |
| G-CONTEXT-4 | Skill isolation (prevent cross-skill leakage) |
| G-INPUT-1 | System prompt isolation |
| G-INPUT-2 | Trust labeling on all inputs |
| G-INPUT-3 | Input sanitization patterns |
| G-INPUT-4 | URL validation |

### 4-Layer Governed Context Model

Context assembly produces a system prompt with 4 layers, each with explicit boundaries.
The layers are ordered by trust level (highest to lowest), separated by boundary markers
that the agent is instructed to respect.

```
+----------------------------------------------------------+
| LAYER 1: GOVERNANCE (trust: SYSTEM)                       |
|   - Compiled governance policy (from SKILL.md)            |
|   - Tool classification table                             |
|   - A2A trust boundaries                                  |
|   - Budget constraints                                    |
|   Boundary: <<<GOVERNANCE_END>>>                          |
+----------------------------------------------------------+
| LAYER 2: ROLE + SKILLS (trust: SYSTEM)                    |
|   - Role instructions (if role-based)                     |
|   - Active skill instructions                             |
|   - Each skill isolated: <<<SKILL:{name}:START/END>>>     |
|   Boundary: <<<SKILLS_END>>>                              |
+----------------------------------------------------------+
| LAYER 3: TOOL DESCRIPTIONS (trust: SYSTEM)                |
|   - Available tools (filtered by G-CLASS/G-PERM)          |
|   - Tool parameter schemas                                |
|   - R5 tools marked with approval requirement             |
|   Boundary: <<<TOOLS_END>>>                               |
+----------------------------------------------------------+
| LAYER 4: DATA (trust: DATA)                               |
|   - Conversation history                                  |
|   - Memory entries (each labeled <<<MEMORY:DATA>>>)       |
|   - Tool results (each labeled <<<TOOL_RESULT:DATA>>>)    |
|   - External inputs (each labeled <<<INPUT:UNTRUSTED>>>)  |
|   Boundary: <<<DATA_END>>>                                |
+----------------------------------------------------------+
```

### Assembly Algorithm

```
function assembleGovernedContext(request: ContextAssemblyRequest): GovernedContext {
  // Step 1: Budget allocation
  // Governance layer gets fixed allocation (typically 500-2000 tokens).
  // Remaining budget split: 30% skills, 10% tools, 60% data (configurable).
  allocateBudget(request.maxContextTokens)

  // Step 2: Governance layer (always first, always included)
  // Source: compiled artifacts from .glint/compiled/
  // This layer cannot be truncated or omitted.
  sections.push(governanceSection)

  // Step 3: Skills layer (filtered by G-CONTEXT-4)
  // Each skill wrapped in isolation markers.
  // Skills that reference tools above the agent's tier are excluded.
  for (skill of request.skills) {
    if (violatesSkillIsolation(skill, compiledPolicy)) {
      diagnostics.push({ ruleId: 'G-CONTEXT-4', ... })
      excludedSkills.push(skill)
      continue
    }
    sections.push(wrapSkillSection(skill))
  }

  // Step 4: Tool descriptions (filtered by G-CLASS/G-PERM)
  // Tools above the agent's trust tier are excluded.
  // R5 tools include approval instructions.
  for (tool of request.toolDescriptions) {
    classification = lookupClassification(tool, compiledPolicy)
    if (classification.riskLevel > agentTrustTier) {
      excludedTools.push({ tool: tool.name, reason: 'risk level exceeds trust tier' })
      continue
    }
    sections.push(wrapToolSection(tool, classification))
  }

  // Step 5: Data layer (sanitized + isolated)
  // Memory entries: trust label DATA, sanitize per G-INPUT-3.
  // Tool results: trust label DATA, isolate per G-CONTEXT-2.
  // Conversation: trust label USER/DATA based on source.
  for (memory of request.memories) {
    if (violatesDataSensitivity(memory, compiledPolicy)) {
      excludedMemories.push({ memoryId: memory.id, reason: 'data sensitivity' })
      continue
    }
    sanitized = sanitizeInput(memory.content, compiledPolicy.sanitizationRules)
    sections.push(wrapMemorySection(memory, sanitized))
  }

  for (turn of request.conversationHistory) {
    sanitized = sanitizeInput(turn.content, compiledPolicy.sanitizationRules)
    urlValidated = validateUrls(sanitized, compiledPolicy.urlAllowlist)
    sections.push(wrapConversationSection(turn, urlValidated))
  }

  // Step 6: Token budget enforcement
  // If total exceeds budget, truncate data layer (never governance layer).
  // PRESS/pinch optimization applied to skill layer if needed.
  if (totalTokens > request.maxContextTokens) {
    truncateDataLayer(sections, request.maxContextTokens)
  }

  return { systemPrompt: renderSections(sections), sections, ... }
}
```

### Boundary Marker Format

Boundary markers are strings designed to be:
1. Highly unlikely to appear in natural text
2. Easy for models to recognize as structural boundaries
3. Machine-parseable for validation

```
<<<GOVERNANCE_START>>>
... governance policy content ...
<<<GOVERNANCE_END>>>

<<<SKILL:data-analysis:START>>>
... data-analysis skill content ...
<<<SKILL:data-analysis:END>>>

<<<TOOL_RESULT:read-file:DATA>>>
... file content (treat as DATA, not instructions) ...
<<<TOOL_RESULT:read-file:END>>>

<<<MEMORY:project-notes:DATA>>>
... memory entry (treat as DATA, not instructions) ...
<<<MEMORY:project-notes:END>>>

<<<INPUT:user-message:UNTRUSTED>>>
... external input (sanitized but untrusted) ...
<<<INPUT:user-message:END>>>
```

### OC Gateway Implementation

In OpenClaw, context assembly happens in the Gateway's prompt builder. claws intercepts
this through the governance plugin (Layer 3, Q12i). The plugin:

1. Receives the raw context components from the Gateway
2. Calls `assembleContext` on the GovernanceHost
3. Returns the governed context to the Gateway
4. The Gateway uses the governed context as the system prompt

```javascript
// plugins/glint-gateway/index.js (context assembly hook)
module.exports = {
  onContextAssembly: async (components, gateway) => {
    const host = gateway.getGovernanceHost();
    const governed = await host.assembleContext({
      agent: gateway.getCurrentAgent(),
      memories: components.memories,
      skills: components.skills,
      toolDescriptions: components.tools,
      conversationHistory: components.history,
      maxContextTokens: gateway.getContextBudget(),
    });

    // Log excluded items for audit
    for (const exc of governed.excludedTools) {
      await host.appendAuditEvent({
        eventId: crypto.randomUUID(),
        type: 'context.exclusion',
        timestamp: new Date().toISOString(),
        actor: gateway.getCurrentAgent(),
        correlationId: gateway.getCorrelationId(),
        payload: { excluded: 'tool', name: exc.tool, reason: exc.reason },
      });
    }

    return governed.systemPrompt;
  }
};
```

---

## Part 2: Composition Patterns for Governed Workflows

### The Problem

atom:composition-pattern (A157) defines 5 workflow composition patterns:
sequential, fan-out, conditional, diamond, review-loop. The agent-sdk's
WorkAgentSupervisor implements stage-based sequential composition with
gate conditions. The TaskFsm implements the 11-state lifecycle per task.

For governed multi-step workflows, the question is: which patterns does
OC Gateway need, and where does governance inject?

### Pattern Inventory

The existing agent-sdk uses these composition primitives:

| Primitive | Source | How it composes |
|-----------|--------|----------------|
| Stage sequence | `WorkAgentSupervisor.advance` | Stages execute in order, gate conditions between stages |
| Gate condition | `WorkAgentSupervisor.setGate` | allTasksComplete + requireReview before advancing |
| Task dispatch | `WorkAgentSupervisor.dispatch` | Tasks within a stage, dependency validation |
| Dependency chain | `task.depends_on` | Tasks wait for named dependencies to complete |
| Fan-out | `AgentOrchestrator.submit` | Multiple agents running concurrently (maxConcurrent) |
| Review loop | `WorkAgentSupervisor.submitReview` | Human review decision gates stage advancement |
| Tension resolution | `resolveGate(reviewers[])` | Multi-reviewer pairwise reduction for gate decisions |

### 6 Governed Composition Patterns

#### Pattern 1: Governed Sequential

The simplest pattern. Steps execute in order. Governance checks run between each step.

```
[Step A] --guard--> [Step B] --guard--> [Step C]
            |                    |
            v                    v
        audit event          audit event
```

**Governance injection points**:
- Pre-step: `onBeforeToolCall` for each tool the step uses
- Post-step: `onAfterToolCall` + `appendAuditEvent`
- Between-step: budget check (`GovernanceManager.checkBudget`)
- Context refresh: `assembleContext` if step changes available tools/data

**OC Gateway mapping**: Standard agent execution. Each user message is a "step."
Governance hooks fire on every tool call within the step. Budget checks between
turns.

**When to use**: Simple task execution, single-agent workflows, linear pipelines.

#### Pattern 2: Governed Fan-Out

Multiple agents or tasks execute concurrently. Governance runs independently per branch.
A barrier gate collects results.

```
            +--guard--> [Agent A] --audit-->+
            |                               |
[Dispatch]--+--guard--> [Agent B] --audit-->+--[Barrier Gate]
            |                               |
            +--guard--> [Agent C] --audit-->+
```

**Governance injection points**:
- Dispatch: validate each agent against A2A trust boundaries (`onAgentMessage`)
- Per-branch: independent budget tracking per agent
- Barrier: aggregate budget usage, collect audit events
- Context: each agent gets governed context assembly independently
- Delegation: `DelegationContext.decrementDepth` per fan-out level

**OC Gateway mapping**: Multi-agent orchestration (SOUL.md defines multiple agents).
Each agent has its own governance context. The orchestrating agent's fan-out is
governed by A2A rules.

**Budget semantics**: Each branch has a budget slice. Total budget = sum of slices.
If any branch exceeds its slice, it is throttled independently. The barrier gate
checks total spend.

```typescript
// Budget slicing for fan-out
interface FanOutBudget {
  totalTokens: number;
  perBranchTokens: number;
  reserveTokens: number;     // held for barrier gate + aggregation
  enforcement: 'hard' | 'soft';
}

function sliceBudget(total: number, branches: number): FanOutBudget {
  const reserve = Math.ceil(total * 0.1);  // 10% reserve
  const perBranch = Math.floor((total - reserve) / branches);
  return { totalTokens: total, perBranchTokens: perBranch, reserveTokens: reserve, enforcement: 'hard' };
}
```

**When to use**: Research tasks, parallel data collection, multi-perspective analysis.

#### Pattern 3: Governed Conditional

A decision node routes to one of several branches based on runtime conditions.
Governance constrains which branches are available.

```
                   +--guard--> [Branch A: Low Risk]
                   |
[Decision Node]----+--guard--> [Branch B: Medium Risk]
                   |
                   +--DENY---> [Branch C: High Risk] (blocked by policy)
```

**Governance injection points**:
- Decision: governance rules can eliminate branches entirely (tool tier > agent tier)
- Branch entry: `onBeforeToolCall` on the branch's first tool
- Audit: record which branch was taken AND which were blocked
- Context: conditional context assembly (only tools for the selected branch)

**OC Gateway mapping**: Agent decides which tool to use. Governance hook blocks
tools that exceed the agent's tier. The agent sees only allowed tools in its
context (via context governance).

**When to use**: Risk-adaptive workflows, tier-based routing, fallback chains.

#### Pattern 4: Governed Diamond

Fan-out followed by convergence. Two or more branches produce results that are
merged by a synthesis step. Governance ensures the merge respects data sensitivity.

```
            +--guard--> [Gather A] --+
            |                        |
[Split]-----+                        +--guard--> [Merge] --audit-->
            |                        |
            +--guard--> [Gather B] --+
```

**Governance injection points**:
- Split: same as fan-out dispatch
- Branches: independent governance per branch
- Merge: **data flow governance** -- G-DATA labels checked on merge
  - If Branch A has CONFIDENTIAL data, Merge must have CONFIDENTIAL clearance
  - If branches have different sensitivity levels, merge inherits the highest
- Audit: convergence event records all input branches + resulting sensitivity

**Data sensitivity propagation**:

```typescript
interface DataFlowLabel {
  level: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';
  source: string;
}

// Diamond merge: highest sensitivity wins
function mergeDataLabels(branches: DataFlowLabel[]): DataFlowLabel {
  const ranking = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];
  let highest = branches[0]!;
  for (const branch of branches) {
    if (ranking.indexOf(branch.level) > ranking.indexOf(highest.level)) {
      highest = branch;
    }
  }
  return { level: highest.level, source: `merged(${branches.map(b => b.source).join(',')})` };
}
```

**OC Gateway mapping**: Multi-agent research patterns where agents gather different
information and a synthesis agent merges results. The synthesis agent's context
assembly must respect data labels from all contributing agents.

**When to use**: Multi-source research, cross-team data aggregation, report synthesis.

#### Pattern 5: Governed Review Loop

An agent produces work, a reviewer evaluates it, and the loop repeats until
approved. Governance constrains the loop: iteration limits, budget caps,
tension resolution for conflicting reviews.

```
[Produce] --guard--> [Review Gate] --approved--> [Complete]
    ^                     |
    |                     | rejected (with feedback)
    +-----guard-----------+
          (budget check + iteration count)
```

**Governance injection points**:
- Review gate: `resolveGate(reviewers[])` for multi-reviewer tension resolution
- Iteration limit: G-BOUND-1 (max reasoning steps) applied to review cycles
- Budget: each iteration consumes budget; throttle at 95% (from GovernanceManager)
- Audit: record each review decision with approval/rejection reason
- Tension: if reviewers disagree, cross-cluster priority resolves; same-cluster escalates

**Mapping to agent-sdk**:

```typescript
// Review loop with governance
async function governedReviewLoop(
  supervisor: WorkAgentSupervisor,
  executionId: string,
  governanceHost: GovernanceHost,
  maxIterations: number,
): Promise<void> {
  let iteration = 0;

  while (iteration < maxIterations) {
    // Produce step
    const budgetCheck = governanceManager.checkBudget({ tokens: estimatedCost });
    if (!budgetCheck.ok) {
      await governanceHost.appendAuditEvent({
        type: 'budget.throttle',
        payload: { iteration, reason: budgetCheck.error.message },
        ...eventBase,
      });
      break;
    }

    // ... agent produces work ...

    // Review gate
    const gate = supervisor.advance(executionId);
    if (!gate.ok && gate.error.code === 'GATE_NOT_SATISFIED') {
      // Review required but not yet approved
      // Tension resolution if multiple reviewers
      const outcome = await governanceHost.resolveTension(reviewers);
      if (outcome.resolved) {
        // Winner's decision applies
      } else {
        // Escalate to human
        const approval = await governanceHost.requestApproval({
          action: { type: 'review_escalation', description: outcome.reason },
          riskLevel: 'R3',
          timeoutMs: 300_000,
          ...requestBase,
        });
      }
    }

    iteration++;
  }
}
```

**OC Gateway mapping**: Agent self-review or multi-agent review patterns. The review
gate is implemented as a governance checkpoint between agent turns.

**When to use**: Code review, document drafting, quality-gated output production.

#### Pattern 6: Governed Escalation Chain

A hierarchical pattern where tasks escalate through increasing authority levels.
Each level has higher trust tier and budget authority.

```
[Agent L1 (R2)] --cannot handle--> [Agent L2 (R3)] --cannot handle--> [Human (R5)]
      |                                   |                                |
    guard:R2                            guard:R3                       approval
```

**Governance injection points**:
- Escalation trigger: agent detects it needs tools above its tier
- A2A governance: `onAgentMessage` validates escalation path is in trust group
- Delegation: `DelegationContext` tracks depth through escalation chain
- Context: each level gets context appropriate to its tier (fewer tools at L1, more at L2)
- Audit: complete escalation chain recorded for compliance

**OC Gateway mapping**: Hierarchical agent orchestration (SOUL.md with `orchestrator`
and `worker` agent types). Escalation follows the orchestrator -> worker -> human path.

**When to use**: Tiered support, approval chains, risk-escalated operations.

---

## Composition + Governance Matrix

| Pattern | A2A Governance | Budget Model | Context Assembly | Audit Events | Tension Resolution |
|---------|---------------|-------------|-----------------|-------------|-------------------|
| Sequential | N/A (single agent) | Linear tracking | Once at start + refresh on tool change | Per-tool-call | N/A |
| Fan-out | Validate trust groups | Budget slicing per branch | Independent per branch | Per-branch + barrier | N/A |
| Conditional | N/A (single agent) | Per-branch tracking | Branch-specific tools only | Decision + branch events | N/A |
| Diamond | Validate merge clearance | Sum of branches + merge | Data label propagation at merge | Convergence event | N/A |
| Review loop | Reviewer trust validation | Per-iteration cap | Refresh per iteration | Per-review decision | Multi-reviewer pairwise |
| Escalation | Validate escalation path | Tier-based caps | Tier-appropriate filtering | Escalation chain | Cross-tier priority |

---

## OC Gateway Workflow File Integration

OC Gateway workflows are defined in `workflows/` as YAML files that compose agents.
claws-generated governance injects into these workflows at specific points.

```yaml
# workflows/research-pipeline.yaml (OC Gateway format)
name: research-pipeline
steps:
  - name: gather
    type: fan-out
    agents: [agent-web, agent-docs, agent-code]
    # claws injects: budget slice, A2A trust validation
    governance:
      budgetSlice: equal
      trustGroup: research-team

  - name: synthesize
    type: merge
    agent: agent-synthesis
    # claws injects: data label propagation, context assembly
    governance:
      dataFlowCheck: true
      sensitivityCeiling: INTERNAL

  - name: review
    type: review-loop
    agent: agent-reviewer
    maxIterations: 3
    # claws injects: iteration limit, tension resolution
    governance:
      tensionCluster: C  # quality cluster
      budgetCap: 50000   # tokens per iteration

  - name: publish
    type: sequential
    agent: agent-publisher
    # claws injects: R5 approval for publish action
    governance:
      requireApproval: [send-email, post-slack]
```

The `governance:` section in each step is emitted by `claws build` based on the
compiled policy. It is not hand-authored by the user. The user writes governance
policy in `claws.json`/`SOUL.md`; claws compiles it to workflow-level governance
annotations.

---

## Key Design Decisions

**D1: Governance layer is always the first context section.** It cannot be truncated.
If the governance layer alone exceeds the context budget, that is a build-time error
(claws emits a diagnostic). PRESS/pinch optimization can compress the governance layer.

**D2: Data layer has explicit trust downgrade.** Everything in Layer 4 (memories, tool
results, conversation) is labeled `DATA` or `UNTRUSTED`, never `SYSTEM`. The model
is instructed to treat boundary-marked DATA sections as information, not instructions.
This is the core defense against indirect prompt injection.

**D3: Budget slicing is governance-enforced, not advisory.** When fan-out patterns
split budget across branches, the `GovernanceManager.checkBudget` call in each branch
uses the slice, not the total. This prevents a single runaway branch from exhausting
the total budget.

**D4: Data sensitivity propagates upward through composition.** The diamond pattern's
merge step inherits the highest sensitivity label from all input branches. A
PUBLIC-cleared merge agent cannot receive CONFIDENTIAL branch results.

**D5: Iteration limits are budget-enforced.** Review loops have both an explicit
iteration count limit (from workflow config) AND a budget limit (from governance).
The budget limit catches cases where each iteration is expensive but the count
limit is generous.

**D6: Composition patterns are composable.** A governed review loop can contain
a governed fan-out. Governance contexts nest. Budget slicing is recursive.
Audit events carry parent correlation IDs for tree reconstruction.
