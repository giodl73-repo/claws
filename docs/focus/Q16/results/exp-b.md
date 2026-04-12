# exp-b: Tension Analysis for Governance Conflicts

**Status**: Complete
**Method**: Design analysis — read tension model source files (`agent-sdk/src/runtime/tension-*.ts`) and role-md-reader tension validation, then mapped to Q12j's 7 cross-file conflict categories

---

## Tension Model Source Analysis

### Core Types (`tension-types.ts` — 43 lines)

The tension model operates on 7 clusters (A-G) with a priority ordering:

```
ClusterId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
DEFAULT_CLUSTER_PRIORITY = ['A', 'C', 'B', 'D', 'F', 'E', 'G']
```

Each `TensionInfo` has:
- `agentId` — which agent holds this tension
- `cluster` — which OLET cluster (A-G)
- `favors` — what the tension prioritizes (e.g., "safety")
- `over` — what it deprioritizes (e.g., "speed")
- `statement` — human-readable trade-off description

### Negotiation (`tension-negotiation.ts` — 62 lines)

`negotiateTension(a, b, priorityOverride?)` resolves cross-cluster conflicts:

- **Same cluster**: Always escalate to human (no automated intra-cluster resolution)
- **Cross cluster**: Higher priority wins (lower index in priority array)
- Returns `NegotiationResult` with `outcome: 'resolved' | 'escalate'`, winner, and audit trail

### Query (`tension-query.ts` — 18 lines)

`queryTension(agentId, roleMap)` looks up an agent's tension from a pre-built map. Simple O(1) lookup.

### Validation in ROLE.md Reader (`role-md-reader.ts` — lines 282-337)

The role reader validates tension declarations at parse time:
- **Synonym detection**: Curated deny-list of 10 synonym pairs (speed/velocity, safety/security, etc.)
- **Duplicate detection**: `favors === over` (case-insensitive) is rejected
- **Schema validation**: `TensionSchema.safeParse()` ensures all 3 fields are present
- **Diagnostic codes**: RL-014 (missing tension, warning), RL-015 (invalid tension, error)

---

## Mapping to Q12j's 7 Cross-File Conflict Categories

### Category 1: DENY-vs-TOOL

**Definition**: SOUL.md declares a boundary ("never access production databases") but TOOLS.md grants a tool that enables exactly that action.

**Tension mapping**: This is a cross-cluster conflict between:
- Cluster A (governance/safety): SOUL.md boundary → `favors: "data-protection"`, `over: "operational-access"`
- Cluster D (execution/tooling): TOOLS.md tool grant → `favors: "operational-access"`, `over: "restriction"`

**Concrete example**:
```yaml
# SOUL.md boundary (compiled to TensionInfo)
agentId: "soul-boundary-001"
cluster: "A"
favors: "data-protection"
over: "direct-database-access"
statement: "Never access production databases directly"

# TOOLS.md tool grant (compiled to TensionInfo)
agentId: "tool-grant-postgres"
cluster: "D"
favors: "database-query"
over: "data-isolation"
statement: "Grant postgres-cli tool for database operations"
```

**Resolution**: Cross-cluster A > D. The boundary wins. `claws pinch` emits diagnostic: `GOV-DENY-TOOL: boundary "never access production databases" conflicts with tool grant "postgres-cli". Resolution: DENY wins (cluster A > D).`

### Category 2: TRUST-ESCALATION

**Definition**: AGENTS.md declares an agent with trust tier T2 (supervised), but TOOLS.md grants T4-level tools (autonomous, destructive).

**Tension mapping**:
- Cluster B (organization/authority): Agent trust tier → `favors: "supervised-operation"`, `over: "autonomous-action"`
- Cluster D (execution/tooling): Tool tier → `favors: "autonomous-action"`, `over: "supervision-overhead"`

**Concrete example**:
```yaml
# AGENTS.md trust tier
agentId: "agent-deploy-bot"
cluster: "B"
favors: "supervised-operation"
over: "autonomous-action"
statement: "deploy-bot operates at T2 (requires approval for destructive ops)"

# TOOLS.md grants rm -rf, kubectl delete
agentId: "tool-grant-kubectl-delete"
cluster: "D"
favors: "autonomous-deletion"
over: "approval-overhead"
statement: "kubectl-delete granted without approval gate"
```

**Resolution**: Cross-cluster C > B > D. B wins over D. `claws pinch` diagnostic: `GOV-TRUST-ESCALATION: agent "deploy-bot" (T2/supervised) granted tool "kubectl-delete" requiring T4 clearance. Resolution: escalation blocked.`

### Category 3: OBO-WITHOUT-ELICIT

**Definition**: AGENTS.md allows an agent to act on-behalf-of (OBO) another entity, but SOUL.md has no elicitation gate requiring confirmation before OBO actions.

**Tension mapping**:
- Cluster A (governance): Soul intent → `favors: "explicit-consent"`, `over: "assumed-consent"`
- Cluster F (social/communication): OBO capability → `favors: "efficient-delegation"`, `over: "consent-overhead"`

**Concrete example**:
```yaml
# SOUL.md (no explicit OBO policy)
agentId: "soul-consent-default"
cluster: "A"
favors: "explicit-user-consent"
over: "assumed-delegation"
statement: "Agent should confirm before acting on behalf of user"

# AGENTS.md OBO capability
agentId: "agent-email-sender-obo"
cluster: "F"
favors: "send-on-behalf"
over: "approval-delay"
statement: "email-sender can send emails as user without confirmation"
```

**Resolution**: Cross-cluster A > F. Consent wins. Diagnostic: `GOV-OBO-ELICIT: agent "email-sender" has OBO capability but SOUL.md has no explicit elicitation policy. Resolution: require elicitation gate.`

### Category 4: DATA-LABEL-MISMATCH

**Definition**: MEMORY.md contains entries labeled as "internal" scope but TOOLS.md grants tools that can externalize data (send-email, webhook, file-upload).

**Tension mapping**:
- Cluster A (governance): Data classification → `favors: "data-containment"`, `over: "data-sharing"`
- Cluster D (execution): Externalization tool → `favors: "data-sharing"`, `over: "containment-overhead"`

**Concrete example**:
```yaml
# MEMORY.md data scope
agentId: "memory-internal-secrets"
cluster: "A"
favors: "data-containment"
over: "external-access"
statement: "API keys and credentials stored in MEMORY.md are project-scoped, never externalize"

# TOOLS.md webhook tool
agentId: "tool-webhook-sender"
cluster: "D"
favors: "data-transmission"
over: "scope-restriction"
statement: "webhook tool can POST arbitrary payloads to external endpoints"
```

**Resolution**: A > D. Containment wins. Diagnostic: `GOV-DATA-LABEL: MEMORY.md entry "api-keys" (scope: project) is accessible by tool "webhook-sender" which can externalize data. Resolution: block external transmission of project-scoped memory.`

### Category 5: CIRCULAR-DELEGATION

**Definition**: AGENTS.md agent A delegates to agent B, which delegates back to agent A (or through a chain).

**Tension mapping**: This is a **same-cluster** conflict (both in cluster E: expertise/execution).
- Agent A → `cluster: "E"`, delegates to B
- Agent B → `cluster: "E"`, delegates to A

**Same-cluster resolution**: Always escalate. No automated resolution for intra-cluster conflicts.

**Concrete example**:
```yaml
agentId: "agent-reviewer"
cluster: "E"
favors: "code-review"
over: "direct-implementation"
statement: "reviewer delegates fixes to implementer"

agentId: "agent-implementer"
cluster: "E"
favors: "implementation"
over: "review-overhead"
statement: "implementer delegates review back to reviewer"
```

**Resolution**: Same cluster E = escalate. Diagnostic: `GOV-CIRCULAR-DELEGATION: agents "reviewer" and "implementer" form a delegation cycle. Resolution: escalate to human — circular delegation cannot be automatically resolved.`

### Category 6: SKILL-TOOL-GHOST

**Definition**: A skill in skills/ references a tool that is not declared in TOOLS.md.

**Tension mapping**: This is not a cluster tension — it's a referential integrity check. However, it can be modeled as:
- Cluster G (meta/self-reference): Skill declaration → `favors: "tool-availability"`, `over: "tool-restriction"`
- Missing tool → no corresponding tension entry

**Detection**: Graph analysis during ANALYZE phase. For each skill's `tools: [...]` array, verify every tool name exists in the compiled ToolIR[]. Missing entries emit `GOV-SKILL-TOOL-GHOST`.

**Enhancement from tension model**: Not a natural tension fit. Better handled as a referential integrity assertion (see exp-c eval framework). However, the audit trail from `NegotiationResult` could record the ghost detection.

### Category 7: SCHEDULE-NO-APPROVAL

**Definition**: HEARTBEAT.md or lobster.yaml defines a scheduled/recurring task but no approval gate exists for its execution.

**Tension mapping**:
- Cluster B (organization/authority): Governance policy → `favors: "approval-before-execution"`, `over: "autonomous-scheduling"`
- Cluster D (execution): Scheduled task → `favors: "autonomous-execution"`, `over: "approval-latency"`

**Concrete example**:
```yaml
# lobster.yaml scheduled step (no approval: true)
agentId: "flow-nightly-cleanup"
cluster: "D"
favors: "autonomous-nightly-cleanup"
over: "human-approval"
statement: "nightly-cleanup runs every 24h without approval gate"

# Governance default (implied by SOUL.md "be cautious")
agentId: "soul-caution-default"
cluster: "B"
favors: "gated-execution"
over: "autonomous-scheduling"
statement: "Destructive scheduled tasks require approval gates"
```

**Resolution**: Cross-cluster C > B > D. B wins. Diagnostic: `GOV-SCHEDULE-NO-APPROVAL: scheduled flow "nightly-cleanup" contains destructive step "cleanup-old-data" without approval gate. Resolution: require approval.`

---

## Tension-to-Conflict Mapping Summary

| Q12j Conflict | Tension Clusters | Cross/Same | Auto-Resolve? | Resolution |
|---------------|-----------------|------------|---------------|------------|
| DENY-vs-TOOL | A vs D | Cross | Yes | A wins (boundary > tool) |
| TRUST-ESCALATION | B vs D | Cross | Yes | B wins (trust tier > tool tier) |
| OBO-WITHOUT-ELICIT | A vs F | Cross | Yes | A wins (consent > delegation) |
| DATA-LABEL-MISMATCH | A vs D | Cross | Yes | A wins (containment > sharing) |
| CIRCULAR-DELEGATION | E vs E | Same | No | Escalate to human |
| SKILL-TOOL-GHOST | G vs (missing) | N/A | N/A | Referential integrity check |
| SCHEDULE-NO-APPROVAL | B vs D | Cross | Yes | B wins (approval > autonomy) |

**5 of 7 categories** map to cross-cluster tensions that the existing `negotiateTension()` function can auto-resolve. 1 maps to same-cluster escalation. 1 is a referential integrity check better handled by assertions.

---

## Design: How Tension Powers `claws pinch` Cross-File Conflict Detection

### Phase 1: Compile Tensions from OC Workspace Files

Each OC file produces `TensionInfo[]` during compilation:

```
SOUL.md → boundaries → TensionInfo[] (cluster A, one per boundary)
TOOLS.md → tool grants → TensionInfo[] (cluster D, one per tool)
AGENTS.md → agent defs → TensionInfo[] (cluster B/E, one per agent)
MEMORY.md → scope rules → TensionInfo[] (cluster A, one per scope boundary)
HEARTBEAT.md → scheduled tasks → TensionInfo[] (cluster D, one per recurring task)
lobster.yaml → flow steps → TensionInfo[] (cluster D, one per ungated step)
skills/ → tool references → TensionInfo[] (cluster G, one per skill-tool binding)
```

### Phase 2: Cross-File Negotiation

Run every boundary-tension against every tool-tension, every agent-trust against every tool-tier, etc:

```typescript
for (const boundaryTension of soulTensions) {
  for (const toolTension of toolTensions) {
    const result = negotiateTension(boundaryTension, toolTension);
    if (result.outcome === 'escalate') {
      diagnostics.push(/* same-cluster escalation */);
    } else if (/* loser is the tool */) {
      diagnostics.push(/* DENY-vs-TOOL conflict detected */);
    }
  }
}
```

### Phase 3: Diagnostic Emission

Each detected conflict emits a structured diagnostic with:
- Conflict category (DENY-vs-TOOL, TRUST-ESCALATION, etc.)
- Source files involved (SOUL.md line X, TOOLS.md line Y)
- Resolution (auto-resolved via priority, or escalated)
- Audit trail (from `NegotiationResult.audit`)

### Enhancement: Custom Priority Ordering

`negotiateTension()` accepts `priorityOverride` — enterprise admins can override the default cluster priority via `openclaw.json`:

```json
{
  "governance": {
    "tension_priority": ["A", "B", "C", "D", "F", "E", "G"]
  }
}
```

This lets organizations tune whether safety (A) or authority (B) takes precedence in their governance model.

---

## Key Finding: Synonym Detection is the First Governance Lint

The `role-md-reader.ts` already does tension validation that is governance-relevant:
- Rejects `favors === over` (trivially incoherent)
- Rejects synonym pairs from curated deny-list (10 pairs)
- Validates schema completeness

For claws, this means the SOUL.md reader already catches incoherent boundary declarations. When SOUL.md says "be cautious" (favors: safety) and also "move fast" (favors: speed, which is synonymous with velocity/pace), the tension validator catches it at compile time.

**The tension model is not just a runtime negotiation tool — it's a compile-time governance lint.**
